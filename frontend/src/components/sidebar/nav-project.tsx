import { Hash, MessageCircle } from "lucide-react";
import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";

import { conversationName, type ChatSummary } from "@/lib/conversation";
import { ConversationSkeleton } from "@/components/skeleton/conversationSkeleton";

export function NavProject({conversations, userId, selectedId, onSelect, loading, error, onRetry}: {
  conversations: ChatSummary[]; userId?: string; selectedId?: string; onSelect: (chat: ChatSummary) => void; loading: boolean; error: string; onRetry: () => void;
}) {
  const {isMobile, setOpenMobile} = useSidebar();
  return <SidebarGroup className="group-data-[collapsible=icon]:hidden"><SidebarGroupLabel>Little conversations</SidebarGroupLabel><SidebarMenu>
    {loading && <li><ConversationSkeleton compact count={3} /></li>}
    {error && <li className="sidebar-note" role="status">{error} <button onClick={onRetry} className="underline">Try again</button></li>}
    {!loading && !error && conversations.length === 0 && <li className="sidebar-note">No conversations yet.</li>}
    {!loading && conversations.map((chat) => <SidebarMenuItem key={chat._id}><SidebarMenuButton tooltip={conversationName(chat, userId)} isActive={selectedId === chat._id} onClick={() => {onSelect(chat); if (isMobile) setOpenMobile(false);}}>
      {chat.type === "group" ? <Hash /> : <MessageCircle />}<span>{conversationName(chat, userId)}</span>
    </SidebarMenuButton></SidebarMenuItem>)}
  </SidebarMenu></SidebarGroup>;
}


