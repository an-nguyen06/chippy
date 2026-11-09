import { useRef, useState, type FormEvent } from "react";
import { UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, getApiError } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";

export function FriendRequestDialog({onSent}: {onSent?: () => void}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [recipientId, setRecipientId] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const userId = useAuthStore((state) => state.user?._id);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const target = recipientId.trim();
    if (!/^[a-f\d]{24}$/i.test(target)) {setError("Enter a valid 24-character user ID."); return;}
    if (target.toLowerCase() === userId?.toLowerCase()) {setError("That's you! Try a friend's user ID."); return;}
    setPending(true); setError("");
    try {
      await api.post("/friends/requests", {recipientId: target});
      dialog.current?.close(); setRecipientId(""); toast.success("Your little hello is on its way!"); onSent?.();
    } catch (failure) {setError(getApiError(failure));}
    finally {setPending(false);}
  }
  return <>
    <Button onClick={() => {setError(""); dialog.current?.showModal();}}><UserPlus /> Add friend</Button>
    <dialog ref={dialog} className="friend-request-dialog" aria-labelledby="friend-dialog-title" aria-describedby="friend-dialog-description" onCancel={(event) => {if (pending) event.preventDefault();}}>
      <div className="chat-window-bar"><span>✧ a little introduction</span><button type="button" aria-label="Close add friend dialog" disabled={pending} onClick={() => dialog.current?.close()}><X size={16} /></button></div>
      <form className="friend-dialog-body" onSubmit={submit} noValidate>
        <h2 id="friend-dialog-title">Send a little hello</h2>
        <p id="friend-dialog-description">Ask your friend for their user ID. You'll find yours in your profile.</p>
        <label htmlFor="friend-recipient-id">Friend's user ID</label>
        <Input id="friend-recipient-id" autoFocus value={recipientId} disabled={pending} onChange={(event) => {setRecipientId(event.target.value); setError("");}} placeholder="Paste their user ID" aria-invalid={!!error || undefined} aria-describedby={error ? "friend-dialog-error" : undefined} required />
        {error && <p id="friend-dialog-error" className="friend-request-error" role="alert">{error}</p>}
        <div className="friend-request-actions"><Button variant="outline" type="button" disabled={pending} onClick={() => dialog.current?.close()}>Maybe later</Button><Button type="submit" disabled={pending}>{pending ? "Sending…" : "Send request ♡"}</Button></div>
      </form>
    </dialog>
  </>;
}
export default FriendRequestDialog;
