import { Sparkles } from "lucide-react";
import { SidebarGroup, SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";
import type { SidebarView } from "./nav-main";

export function NavSecondary({view, onNavigate}: {view: SidebarView; onNavigate: (view: SidebarView) => void}) {
  const {isMobile, setOpenMobile} = useSidebar();
  return <SidebarGroup className="mt-auto"><SidebarMenu><SidebarMenuItem>
    <SidebarMenuButton tooltip="Kaomoji collection" isActive={view === "kaomoji"} onClick={() => {onNavigate("kaomoji"); if (isMobile) setOpenMobile(false);}}><Sparkles /><span>Kaomoji collection</span></SidebarMenuButton>
  </SidebarMenuItem></SidebarMenu></SidebarGroup>;
}
