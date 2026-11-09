import { Sparkles } from "lucide-react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail, SidebarSeparator } from "@/components/ui/sidebar";
import { NavMain, type SidebarView } from "./nav-main";
import { NavProject } from "./nav-project";
import type { ChatSummary } from "@/lib/conversation";
import { NavSecondary } from "./nav-secondary";
import { NavUser } from "./nav-user";
import { useAuthStore } from "@/stores/auth-store";

export function AppSidebar({view, onNavigate, conversations, selectedId, onSelect, loading, error, onRetry}: {
  view: SidebarView; onNavigate: (view: SidebarView) => void; conversations: ChatSummary[]; selectedId?: string; onSelect: (chat: ChatSummary) => void; loading: boolean; error: string; onRetry: () => void;
}) {
  const userId = useAuthStore((state) => state.user?._id);
  return <Sidebar collapsible="icon" className="chippy-sidebar">
    <SidebarHeader><a href="/" className="sidebar-brand" aria-label="Chippy home"><Sparkles size={24} /><span className="group-data-[collapsible=icon]:hidden">chippy</span></a></SidebarHeader>
    <SidebarSeparator />
    <SidebarContent><NavMain view={view} onNavigate={onNavigate} /><NavProject conversations={conversations} userId={userId} selectedId={selectedId} onSelect={onSelect} loading={loading} error={error} onRetry={onRetry} /><NavSecondary view={view} onNavigate={onNavigate} /></SidebarContent>
    <SidebarSeparator /><SidebarFooter><NavUser onProfile={() => onNavigate("profile")} /></SidebarFooter><SidebarRail />
  </Sidebar>;
}


