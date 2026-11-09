import { UserRound, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { ProfileDialog } from "./profileDialog";
export function ProfileCard() {
  const user = useAuthStore((state) => state.user);
  if (!user) return null;
  return <section className="chat-window profile-card" aria-labelledby="profile-card-title"><div className="chat-window-bar">♡ all about you</div><div className="chat-window-body">
    <div className="profile-card-heading"><span className="profile-avatar">{user.avatarUrl ? <img src={user.avatarUrl} alt="Your avatar" /> : <UserRound size={32} />}</span><div><h2 id="profile-card-title">{user.displayName}</h2><p>@{user.username}</p></div><ProfileDialog /></div>
    <p className="profile-bio">{user.bio || "A little mystery, a little magic. Add a bio to introduce yourself."}</p>
    <dl className="profile-details"><dt>Email</dt><dd>{user.email}</dd>{user.phone && <><dt>Phone</dt><dd>{user.phone}</dd></>}</dl>
    <div className="profile-id-row"><div><p className="chat-muted">Your user ID · share it with a friend</p><code className="profile-user-id">{user._id}</code></div><Button variant="outline" aria-label="Copy your user ID" onClick={async () => {try {await navigator.clipboard.writeText(user._id); toast.success("User ID copied.");} catch {toast.error("Couldn't copy. Select the ID to copy it manually.");}}}><Copy size={16} /></Button></div>
  </div></section>;
}
export default ProfileCard;
