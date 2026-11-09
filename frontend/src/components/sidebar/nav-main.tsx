import { MessageCircle, Users, Mail, type LucideIcon } from "lucide-react";
import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";

export type SidebarView = "messages" | "friends" | "requests" | "kaomoji" | "profile";
const items: {view: SidebarView; title: string; icon: LucideIcon}[] = [
  {view: "messages", title: "Messages", icon: MessageCircle},
  {view: "friends", title: "Friends", icon: Users},
  {view: "requests", title: "Friend requests", icon: Mail},
];
export function NavMain({view, onNavigate}: {view: SidebarView; onNavigate: (view: SidebarView) => void}) {
  const {isMobile, setOpenMobile} = useSidebar();
  return <SidebarGroup><SidebarGroupLabel>Your little corner</SidebarGroupLabel><SidebarMenu>
    {items.map(({view: target, title, icon: Icon}) => <SidebarMenuItem key={target}>
      <SidebarMenuButton size="lg" tooltip={title} isActive={view === target} aria-current={view === target ? "page" : undefined} onClick={() => {onNavigate(target); if (isMobile) setOpenMobile(false);}}><Icon /><span>{title}</span></SidebarMenuButton>
    </SidebarMenuItem>)}
  </SidebarMenu></SidebarGroup>;
}
