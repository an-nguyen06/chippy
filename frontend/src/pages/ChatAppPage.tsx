import { useEffect, useState } from "react";
import { MessageCircle, Users, Mail, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import type { SidebarView } from "@/components/sidebar/nav-main";
import { conversationName, type ChatSummary } from "@/lib/conversation";
import { useAuthStore } from "@/stores/auth-store";
import { api, getApiError } from "@/lib/api";
import { FriendRequestDialog } from "@/components/friendRequest/friendRequestDialog";
import { ReceivedRequest } from "@/components/friendRequest/receivedRequest";
import { SentRequest } from "@/components/friendRequest/sentRequest";
import { FriendListModal } from "@/components/createNewChat.tsx/friendListModal";
import { ProfileCard } from "@/components/profile/profileCard";
import { ConversationSkeleton } from "@/components/skeleton/conversationSkeleton";
import { ChatWindowSkeleton } from "@/components/skeleton/chatWindowSkeleton";
import { ChatWindow } from "@/components/chat/chatWindow";
import { socket } from "@/lib/socket";
import { KaomojiLibrary } from "@/components/kaomoji/kaomojiLibrary";
import "./signup.css";
import "./chat.css";

type Person = { _id: string; displayName: string; username: string };
type Friendship = {friendshipId: string; user: Person};

const titles: Record<SidebarView, string> = {messages: "Your messages", friends: "Your people", requests: "Little introductions", kaomoji: "Say it your way", profile: "Your profile"};

export default function ChatAppPage() {
  const user = useAuthStore((state) => state.user);
  const [view, setView] = useState<SidebarView>("messages");
  const [selected, setSelected] = useState<ChatSummary>();
  const [conversations, setConversations] = useState<ChatSummary[]>([]);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [requestTab, setRequestTab] = useState<"received" | "sent">("received");
  const [requestVersion, setRequestVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const revisions = new Map<string, number>();
    async function update({conversationId}: {conversationId: string}) {
      const revision = (revisions.get(conversationId) || 0) + 1;
      revisions.set(conversationId, revision);
      try {
        const {data} = await api.get<{conversation: ChatSummary}>(`/conversations/${conversationId}`, {signal: controller.signal});
        if (controller.signal.aborted || revisions.get(conversationId) !== revision) return;
        setConversations((previous) => [data.conversation, ...previous.filter((chat) => chat._id !== conversationId)]);
        setSelected((current) => current?._id === conversationId ? data.conversation : current);
      } catch { /* The regular list refresh remains available after transient errors. */ }
    }
    async function reconnect() {
      try {
        const {data} = await api.get<{conversations: ChatSummary[]}>("/conversations", {params: {limit: 100}, signal: controller.signal});
        if (!controller.signal.aborted) setConversations(data.conversations);
      } catch { /* Keep the last known list while offline. */ }
    }
    socket.on("conversation:updated", update);
    socket.on("connect", reconnect);
    return () => {controller.abort(); socket.off("conversation:updated", update); socket.off("connect", reconnect);};
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true); setError("");
      try {
        const options = {signal: controller.signal, params: {limit: 100}};
        const [chats, people] = await Promise.all([
          api.get<{conversations: ChatSummary[]}>("/conversations", options),
          api.get<{friends: Friendship[]}>("/friends", options),

        ]);
        if (controller.signal.aborted) return;
        setConversations(chats.data.conversations); setFriends(people.data.friends);
      } catch (failure) {
        if (!controller.signal.aborted) setError(getApiError(failure));
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [version]);

  function navigate(next: SidebarView) {setView(next); setSelected(undefined);}
  async function openChat(person: Person) {
    setBusy(true);
    try {
      const {data} = await api.post<{conversation: ChatSummary}>("/conversations", {participantIds: [person._id]});
      setSelected({...data.conversation, participants: [person]}); setView("messages"); setVersion((value) => value + 1);
    } catch (failure) {toast.error(getApiError(failure));}
    finally {setBusy(false);}
  }

  return <TooltipProvider><SidebarProvider className="chippy-workspace" data-compact={user?.preferences?.compactMode || undefined} data-reduced-motion={user?.preferences?.reduceMotion || undefined}>
    <AppSidebar view={view} onNavigate={navigate} conversations={conversations} selectedId={selected?._id} onSelect={(chat) => {setSelected(chat); setView("messages");}} loading={loading} error={error} onRetry={() => setVersion((value) => value + 1)} />
    <SidebarInset className="chippy-main">
      <header className="chat-topbar"><div><SidebarTrigger /><span>chippy.exe <span aria-hidden="true">/</span> {view}</span></div></header>
      <div className="chat-content">
        <div className="chat-page-heading"><div><h1>{titles[view]}</h1></div><FriendListModal onCreated={(conversation) => {setSelected(conversation); setView("messages"); setVersion((value) => value + 1);}} /></div>
        {loading && (view === "messages" ? selected ? <ChatWindowSkeleton /> : <ConversationSkeleton /> : view === "friends" ? <ConversationSkeleton /> : null)}
        {error && <div role="status" className="chat-error">{error} <Button variant="outline" onClick={() => setVersion((value) => value + 1)}>Try again</Button></div>}
        {!loading && !error && view === "messages" && <>
          {selected ? <ChatWindow key={selected._id} conversation={selected} onBack={() => setSelected(undefined)} onConversationUpdated={(chat) => {
            setConversations((previous) => [chat, ...previous.filter((item) => item._id !== chat._id)]);
            setSelected((current) => current?._id === chat._id ? chat : current);
          }} /> : <>
          <section className="chat-welcome"><span className="welcome-kaomoji">(づ｡•ᴗ•｡)づ</span><h2>Hello, {user?.displayName}.</h2><Button onClick={() => navigate("friends")}>Find your people <ArrowUpRight /></Button></section>
          <div className="chat-section-heading"><h2>Little conversations</h2><span>{conversations.length} conversations</span></div>
          {conversations.length ? <div className="chat-card-grid">{conversations.map((chat) => <button className="conversation-card" key={chat._id} onClick={() => setSelected(chat)}><span className="conversation-icon"><MessageCircle /></span><strong>{conversationName(chat, user?._id)}</strong><span>{chat.lastMessage?.content || "Ready for a little hello"}</span><ArrowUpRight size={16} /></button>)}</div> : <div className="chat-empty"><Mail /><p>Your inbox is a little quiet.</p><span>Start a conversation from your Friends tab.</span></div>}
          </>}
        </>}
        {!loading && !error && view === "friends" && <section className="chat-window"><div className="chat-window-bar">♡ your people · {friends.length}</div><div className="chat-window-body">{friends.length ? friends.map(({friendshipId, user: person}) => <div className="person-row" key={friendshipId}><span className="conversation-icon"><Users /></span><div><strong>{person.displayName}</strong><p>@{person.username}</p></div><Button disabled={busy} variant="outline" onClick={() => void openChat(person)}>Say hello</Button></div>) : <div className="chat-empty"><Users /><p>Your circle has room to grow.</p><span>Accepted friend requests will appear here.</span></div>}</div></section>}
        {view === "requests" && <section className="chat-window">
          <div className="chat-window-bar friend-request-heading"><span>✉ a little hello goes a long way</span><FriendRequestDialog onSent={() => {setRequestVersion((value) => value + 1); setRequestTab("sent");}} /></div>
          <div className="chat-window-body">
            <div className="friend-request-tabs" role="group" aria-label="Request direction">
              <Button variant={requestTab === "received" ? "default" : "outline"} aria-pressed={requestTab === "received"} onClick={() => setRequestTab("received")}>Received</Button>
              <Button variant={requestTab === "sent" ? "default" : "outline"} aria-pressed={requestTab === "sent"} onClick={() => setRequestTab("sent")}>Sent</Button>
            </div>
            {requestTab === "received" ? <ReceivedRequest refreshKey={requestVersion} onChanged={() => setVersion((value) => value + 1)} /> : <SentRequest refreshKey={requestVersion} />}
          </div>
        </section>}
        {view === "kaomoji" && <section className="chat-window"><div className="chat-window-bar">✧ kaomoji collection</div><div className="chat-window-body"><KaomojiLibrary /></div></section>}
        {view === "profile" && <ProfileCard />}

      </div>
    </SidebarInset>
  </SidebarProvider></TooltipProvider>;
}







