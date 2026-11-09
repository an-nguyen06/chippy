import { ArrowLeft, RefreshCw, Users, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { conversationName, type ChatSummary } from "@/lib/conversation";
export function ChatHeader({conversation, userId, refreshing, onRefresh, onBack}: {conversation: ChatSummary; userId?: string; refreshing: boolean; onRefresh: () => void; onBack: () => void}) {
  return <header className="chat-window-bar message-header"><Button variant="ghost" size="icon" aria-label="Back to conversations" onClick={onBack}><ArrowLeft /></Button><span className="conversation-icon">{conversation.type === "group" ? <Users /> : <MessageCircle />}</span><div><h2>{conversationName(conversation, userId)}</h2>{conversation.type === "group" && <p>{conversation.participants.length} people in this little circle</p>}</div><Button variant="ghost" size="icon" aria-label="Refresh messages" disabled={refreshing} onClick={onRefresh}><RefreshCw className={refreshing ? "animate-spin motion-reduce:animate-none" : ""} /></Button></header>;
}
export default ChatHeader;
