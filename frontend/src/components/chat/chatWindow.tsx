import { useEffect, useRef, useState } from "react";
import { ChatHeader } from "./chatHeader";
import { MessageList } from "./messageList";
import { MessageInput } from "./messageInput";
import { ChatWindowSkeleton } from "@/components/skeleton/chatWindowSkeleton";
import { api, getApiError } from "@/lib/api";
import { mergeMessages, type ChatMessage } from "@/lib/message";
import type { ChatSummary } from "@/lib/conversation";
import { useAuthStore } from "@/stores/auth-store";
import { socket, type MessageEvent, type DeletedMessageEvent } from "@/lib/socket";
interface History {messages: ChatMessage[]; hasMore: boolean; nextCursor: string | null}

export function ChatWindow({conversation, onBack, onConversationUpdated}: {conversation: ChatSummary; onBack: () => void; onConversationUpdated: (chat: ChatSummary) => void}) {
  const userId = useAuthStore((state) => state.user?._id);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const mutation = useRef(false);
  const olderRequest = useRef(false);
  const liveMessages = useRef(new Map<string, ChatMessage>());
  const deletedMessages = useRef(new Set<string>());
  const [connected, setConnected] = useState(socket.connected);
  const base = `/conversations/${conversation._id}/messages`;

  useEffect(() => {
    const request = new AbortController();
    controller.current = request;
    async function load() {
      setLoading(true); setError("");
      liveMessages.current.clear();
      try {
        const {data} = await api.get<History>(base, {signal: request.signal});
        if (request.signal.aborted) return;
        setMessages(mergeMessages(data.messages, [...liveMessages.current.values()]).filter((message) => !deletedMessages.current.has(message._id))); setHasMore(data.hasMore); setCursor(data.nextCursor); setReady(true);
      } catch (failure) {if (!request.signal.aborted) setError(getApiError(failure));}
      finally {if (!request.signal.aborted) setLoading(false);}
    }
    void load();
    return () => request.abort();
  }, [base, refreshKey]);

  useEffect(() => {
    function upsert(event: MessageEvent) {
      if (event.conversationId !== conversation._id) return;
      liveMessages.current.set(event.message._id, event.message);
      setMessages((previous) => mergeMessages(previous, [event.message]).filter((message) => !deletedMessages.current.has(message._id)));
    }
    function remove(event: DeletedMessageEvent) {
      if (event.conversationId !== conversation._id) return;
      deletedMessages.current.add(event.messageId);
      liveMessages.current.delete(event.messageId);
      setMessages((previous) => previous.filter((message) => message._id !== event.messageId));
    }
    function onConnect() {
      setConnected(true);
      // Fetch missed messages after network recovery; live events aren't durable.
      if (!mutation.current && !olderRequest.current) setRefreshKey((value) => value + 1);
    }
    function onDisconnect() {setConnected(false);}
    socket.on("message:new", upsert);
    socket.on("message:updated", upsert);
    socket.on("message:deleted", remove);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    return () => {
      socket.off("message:new", upsert); socket.off("message:updated", upsert);
      socket.off("message:deleted", remove); socket.off("connect", onConnect); socket.off("disconnect", onDisconnect);
    };
  }, [conversation._id]);

  async function loadOlder() {
    if (!cursor || olderRequest.current || loading || mutation.current) return;
    olderRequest.current = true; setLoadingOlder(true); setError("");
    const signal = controller.current?.signal;
    try {
      const {data} = await api.get<History>(base, {params: {before: cursor}, signal});
      if (signal?.aborted) return;
      setMessages((previous) => mergeMessages(data.messages, previous).filter((message) => !deletedMessages.current.has(message._id))); setCursor(data.nextCursor); setHasMore(data.hasMore);
    } catch (failure) {if (!signal?.aborted) setError(getApiError(failure));}
    finally {olderRequest.current = false; if (!signal?.aborted) setLoadingOlder(false);}
  }
  async function mutate(action: "send" | "edit" | "delete", content?: string, id?: string): Promise<boolean> {
    if (mutation.current || loading || olderRequest.current || !ready) return false;
    mutation.current = true; setWorking(true); setError("");
    const signal = controller.current?.signal;
    try {
      if (action === "delete") {
        await api.delete(`${base}/${id}`, {signal});
        if (!signal?.aborted) setMessages((previous) => previous.filter((message) => message._id !== id));
      } else {
        const {data} = action === "send" ? await api.post<{message: ChatMessage}>(base, {content}, {signal}) : await api.patch<{message: ChatMessage}>(`${base}/${id}`, {content}, {signal});
        if (!signal?.aborted) setMessages((previous) => mergeMessages(previous, [data.message]));
      }
      // Refresh the sidebar preview separately: a preview error must not make a
      // successful send look failed and invite a duplicate submission.
      void api.get<{conversation: ChatSummary}>(`/conversations/${conversation._id}`, {signal}).then(({data}) => {
        if (!signal?.aborted) onConversationUpdated(data.conversation);
      }).catch(() => {});
      return true;
    } catch (failure) {if (!signal?.aborted) setError(getApiError(failure)); return false;}
    finally {mutation.current = false; if (!signal?.aborted) setWorking(false);}
  }
  if (loading && !ready) return <ChatWindowSkeleton />;
  return <section className="chat-window active-chat" aria-label="Conversation">
    <ChatHeader conversation={conversation} userId={userId} refreshing={loading || working || loadingOlder} onBack={onBack} onRefresh={() => {if (!mutation.current && !olderRequest.current) setRefreshKey((value) => value + 1);}} />
    {error && <p role="alert" className="message-error">{error}</p>}
    <MessageList messages={messages} userId={userId} hasMore={hasMore} loadingOlder={loadingOlder} onLoadOlder={() => void loadOlder()} onEdit={(id, content) => mutate("edit", content, id)} onDelete={(id) => mutate("delete", undefined, id)} />
    <MessageInput disabled={!ready || loading || working || loadingOlder} onSend={(content) => mutate("send", content)} />
    <p className="message-refresh-note" role="status">{connected ? "Connected · new hellos arrive live" : "Reconnecting · you can still send and refresh messages"}</p>
  </section>;
}
export default ChatWindow;
