import { Check, Plus, UserRound } from "lucide-react";
import type { InviteUser } from "@/lib/invite-user";

export function InviteSuggestionList({users, selectedIds, onToggle, disabled = false, maxSelected = 99}: {
  users: InviteUser[]; selectedIds: string[]; onToggle: (user: InviteUser) => void; disabled?: boolean; maxSelected?: number;
}) {
  if (!users.length) return <p className="chat-muted" role="status">No friends match your search.</p>;
  return <ul className="invite-suggestions" aria-label="Friends to invite">{users.map((user) => {
    const selected = selectedIds.includes(user._id);
    return <li key={user._id}><button type="button" className="invite-person" aria-pressed={selected} disabled={disabled || (!selected && selectedIds.length >= maxSelected)} onClick={() => onToggle(user)}>
      <span className="chippy-avatar">{user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <UserRound size={18} />}</span>
      <span className="invite-person-name"><strong>{user.displayName}</strong><small>@{user.username}</small></span>
      <span className="invite-selection" aria-hidden="true">{selected ? <Check size={16} /> : <Plus size={16} />}</span>
    </button></li>;
  })}</ul>;
}
export default InviteSuggestionList;
