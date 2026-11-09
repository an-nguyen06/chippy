import { LogOut, UserRound } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";

export function NavUser({onProfile}: {onProfile: () => void}) {
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const loading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const {isMobile, setOpenMobile} = useSidebar();
  if (!user) return null;
  return <><SidebarMenu><SidebarMenuItem><SidebarMenuButton size="lg" tooltip="Your profile" onClick={() => {onProfile(); if (isMobile) setOpenMobile(false);}}>
    <span className="chippy-avatar">{user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <UserRound size={18} />}</span>
    <span className="profile-label"><strong>{user.displayName}</strong><small>@{user.username}</small></span>
  </SidebarMenuButton></SidebarMenuItem><SidebarMenuItem><SidebarMenuButton tooltip="Sign out" disabled={loading} onClick={() => void signOut()}><LogOut /><span>{loading ? "Signing out…" : "Sign out"}</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu>
  {error && <p className="sidebar-note" role="status">{error}</p>}</>;
}
