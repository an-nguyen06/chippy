import { useEffect, useRef, useState, type FormEvent } from "react";
import { MessageCirclePlus, Search, X, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InviteSuggestionList } from "@/components/newGroupChat/inviteSuggestionList";
import { SelectedUsersList } from "@/components/newGroupChat/selectedUsersList";
import type { InviteUser } from "@/lib/invite-user";
import type { ChatSummary } from "@/lib/conversation";
import { api, getApiError } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";


export function FriendListModal({onCreated}: {onCreated: (conversation: ChatSummary) => void}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const submitting = useRef(false);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"direct" | "group">("direct");
  const [friends, setFriends] = useState<InviteUser[]>([]);
  const [selected, setSelected] = useState<InviteUser[]>([]);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    async function loadFriends() {
      setLoading(true); setLoadError("");
      try {
        const loaded: InviteUser[] = [];
        let page = 1;
        let total = 0;
        do {
          const {data} = await api.get<{friends: {user: InviteUser | null}[]; total: number}>("/friends", {signal: controller.signal, params: {page, limit: 100}});
          total = data.total;
          loaded.push(...data.friends.flatMap(({user: friend}) => friend ? [friend] : []));
          // Use page count, since deleted users may be absent from the response.
          page++;
        } while ((page - 1) * 100 < total);
        if (!controller.signal.aborted) setFriends([...new Map(loaded.map((friend) => [friend._id, friend])).values()]);
      } catch (failure) {if (!controller.signal.aborted) setLoadError(getApiError(failure));}
      finally {if (!controller.signal.aborted) setLoading(false);}
    }
    void loadFriends();
    return () => controller.abort();
  }, [open, version]);

  function show() {
    setSelected([]); setSearch(""); setName(""); setMode("direct"); setError(""); setFriends([]); setLoading(true);
    setOpen(true); dialog.current?.showModal();
  }
  function close() {if (!submitting.current) dialog.current?.close();}
  function toggle(friend: InviteUser) {
    setError("");
    setSelected((previous) => previous.some((item) => item._id === friend._id) ? previous.filter((item) => item._id !== friend._id) : mode === "direct" ? [friend] : previous.length < 99 ? [...previous, friend] : previous);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || loading || loadError) return;
    if (!selected.length || (mode === "group" && selected.length < 2)) {setError(mode === "group" ? "Choose at least two friends for your group." : "Choose a friend to chat with."); return;}
    if (mode === "group" && (!name.trim() || name.trim().length > 100)) {setError("Give your group a name from 1 to 100 characters."); return;}
    submitting.current = true; setPending(true); setError("");
    try {
      const {data} = await api.post<{conversation: ChatSummary}>("/conversations", {
        type: mode, participantIds: selected.map((friend) => friend._id), ...(mode === "group" ? {name: name.trim()} : {}),
      });
      // The create endpoint returns participant IDs, so hydrate known profiles.
      const conversation = {...data.conversation, participants: [...(user ? [{_id: user._id, displayName: user.displayName, username: user.username}] : []), ...selected]};
      dialog.current?.close(); onCreated(conversation);
    } catch (failure) {setError(getApiError(failure));}
    finally {submitting.current = false; setPending(false);}
  }
  const filtered = friends.filter((friend) => `${friend.displayName} ${friend.username}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <>
    <Button onClick={show}><MessageCirclePlus /> New chat</Button>
    <dialog ref={dialog} className="friend-request-dialog new-chat-dialog" aria-labelledby="new-chat-title" onClose={() => setOpen(false)} onCancel={(event) => {if (submitting.current) event.preventDefault();}}>
      <div className="chat-window-bar"><span>✧ a fresh little conversation</span><button type="button" aria-label="Close new chat" disabled={pending} onClick={close}><X size={16} /></button></div>
      <form className="friend-dialog-body" onSubmit={submit} noValidate>
        <h2 id="new-chat-title">Gather your people</h2>

        <div className="friend-request-tabs" role="group" aria-label="Conversation type">
          <Button type="button" disabled={pending} variant={mode === "direct" ? "default" : "outline"} aria-pressed={mode === "direct"} onClick={() => {setMode("direct"); setSelected((previous) => previous.slice(0, 1)); setError("");}}>Direct chat</Button>
          <Button type="button" disabled={pending} variant={mode === "group" ? "default" : "outline"} aria-pressed={mode === "group"} onClick={() => {setMode("group"); setError("");}}><Users /> Group chat</Button>
        </div>
        {mode === "group" && <><label htmlFor="new-group-name">Group name</label><Input id="new-group-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} disabled={pending} required /></>}
        <label htmlFor="new-chat-search" className="invite-search-label"><Search size={14} /> Find a friend</label>
        <Input id="new-chat-search" value={search} onChange={(event) => setSearch(event.target.value)} disabled={pending || loading} />

        <SelectedUsersList users={selected} onRemove={(id) => {setSelected((previous) => previous.filter((friend) => friend._id !== id)); setError("");}} disabled={pending} />
        {loading ? <p role="status" className="chat-muted">Finding your people…</p> : loadError ? <div role="alert" className="friend-request-error">{loadError} <Button type="button" variant="outline" onClick={() => setVersion((value) => value + 1)}>Try again</Button></div> : !friends.length ? null : <InviteSuggestionList users={filtered} selectedIds={selected.map((friend) => friend._id)} onToggle={toggle} disabled={pending} />}
        {error && <p role="alert" className="friend-request-error">{error}</p>}
        <div className="friend-request-actions"><Button type="button" variant="outline" disabled={pending} onClick={close}>Maybe later</Button><Button type="submit" disabled={pending || loading || !!loadError || !selected.length}>{pending ? "Opening…" : mode === "group" ? "Create group ♡" : "Start chatting"}</Button></div>
      </form>

    </dialog>
  </>;
}
export default FriendListModal;




