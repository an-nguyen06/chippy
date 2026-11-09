import { useLayoutEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MessageBubble } from "./messageBubble";
import { senderId, type ChatMessage } from "@/lib/message";
export function MessageList({messages, userId, hasMore, loadingOlder, onLoadOlder, onEdit, onDelete}: {messages: ChatMessage[]; userId?: string; hasMore: boolean; loadingOlder: boolean; onLoadOlder: () => void; onEdit: (id: string, content: string) => Promise<boolean>; onDelete: (id: string) => Promise<boolean>}) {
  const viewport = useRef<HTMLDivElement>(null);
  const previous = useRef({first: "", last: "", height: 0, top: 0, nearBottom: true});
  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const first = messages[0]?._id || "";
    const last = messages.at(-1)?._id || "";
    const old = previous.current;
    if (!old.first || (last !== old.last && old.nearBottom)) element.scrollTop = element.scrollHeight;
    else if (first !== old.first && last === old.last && element.scrollHeight > old.height) element.scrollTop = old.top + element.scrollHeight - old.height;
    previous.current = {first, last, height: element.scrollHeight, top: element.scrollTop, nearBottom: element.scrollHeight - element.scrollTop - element.clientHeight < 100};
  }, [messages]);
  return <div ref={viewport} className="message-scroll" onScroll={(event) => {const element = event.currentTarget; previous.current.top = element.scrollTop; previous.current.height = element.scrollHeight; previous.current.nearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 100;}}>
    {hasMore && <div className="message-load-older"><Button variant="outline" size="sm" disabled={loadingOlder} onClick={onLoadOlder}>{loadingOlder ? "Opening older letters…" : "Load older messages"}</Button></div>}
    {!messages.length ? <div className="chat-empty"><span className="welcome-kaomoji">(｡•ᴗ•｡)ﾉ</span><p>Your first hello belongs here.</p><span>Send a message or a little kaomoji below.</span></div> : <ol className="message-list" aria-label="Messages">{messages.map((message, index) => {
      const date = new Date(message.createdAt).toLocaleDateString();
      const previousDate = index ? new Date(messages[index - 1].createdAt).toLocaleDateString() : "";
      return <MessageEntry key={message._id} date={date !== previousDate ? date : undefined} message={message} own={senderId(message) === userId} onEdit={onEdit} onDelete={onDelete} />;
    })}</ol>}
  </div>;
}
function MessageEntry({date, ...props}: Parameters<typeof MessageBubble>[0] & {date?: string}) {
  return <>{date && <li className="message-date">{date}</li>}<MessageBubble {...props} /></>;
}
export default MessageList;
