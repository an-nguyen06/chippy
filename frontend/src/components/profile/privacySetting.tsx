import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { saveProfile } from "@/lib/profile";
import { getApiError } from "@/lib/api";

export function PrivacySetting({onBusyChange}: {onBusyChange?: (busy: boolean) => void}) {
  const privacy = useAuthStore((state) => state.user?.privacy);
  const [allowFriendRequests, setAllowFriendRequests] = useState(privacy?.allowFriendRequests ?? true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    setBusy(true); onBusyChange?.(true); setMessage("");
    try {await saveProfile({privacy: {allowFriendRequests}}); setMessage("Your privacy setting is saved.");}
    catch (error) {setMessage(getApiError(error));}
    finally {setBusy(false); onBusyChange?.(false);}
  }
  return <form className="profile-form" onSubmit={submit}><h3>Your space, your pace</h3>
    <label className="profile-toggle"><span><strong>Allow new friend requests</strong><small>People with your user ID can send a request.</small></span><input type="checkbox" checked={allowFriendRequests} disabled={busy} onChange={(event) => setAllowFriendRequests(event.target.checked)} /></label>
    <p className="chat-muted">Turning this off blocks new requests. Existing friends, chats, and pending requests stay available.</p>
    <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save privacy setting"}</Button><p className="profile-feedback" role="status">{message}</p>
  </form>;
}
export default PrivacySetting;
