import { X } from "lucide-react";
import type { InviteUser } from "@/lib/invite-user";

export function SelectedUsersList({users, onRemove, disabled = false}: {users: InviteUser[]; onRemove: (id: string) => void; disabled?: boolean}) {
  return <div className="selected-invitees"><p className="chat-muted" aria-live="polite">{users.length ? `${users.length} ${users.length === 1 ? "friend" : "friends"} selected` : "Choose who gets a little hello."}</p>
    {users.length > 0 && <ul aria-label="Selected friends">{users.map((user) => <li key={user._id}><span>{user.displayName}</span><button type="button" disabled={disabled} aria-label={`Remove ${user.displayName}`} onClick={() => onRemove(user._id)}><X size={13} /></button></li>)}</ul>}
  </div>;
}
export default SelectedUsersList;
