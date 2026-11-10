import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/auth-store";
import { saveProfile } from "@/lib/profile";
import { getApiError } from "@/lib/api";

export function PersonalInfoForm({onBusyChange}: {onBusyChange?: (busy: boolean) => void}) {
  const user = useAuthStore((state) => state.user);
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    if (!displayName.trim() || displayName.trim().length > 100 || bio.length > 500 || phone.length > 30) {setMessage("Check your name, bio, and phone number lengths."); return;}
    setBusy(true); onBusyChange?.(true); setMessage("");
    try {await saveProfile({displayName: displayName.trim(), bio: bio.trim(), phone: phone.trim()}); setMessage("Your little introduction is saved.");}
    catch (error) {setMessage(getApiError(error));}
    finally {setBusy(false); onBusyChange?.(false);}
  }
  return <form className="profile-form" onSubmit={submit}>
    <label htmlFor="profile-name">Display name</label><Input id="profile-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={100} required disabled={busy} />
    <label htmlFor="profile-bio">A little about you</label><textarea id="profile-bio" value={bio} onChange={(event) => setBio(event.target.value)} maxLength={500} rows={4} disabled={busy} /><small>{bio.length}/500</small>
    <label htmlFor="profile-phone">Phone (optional)</label><Input id="profile-phone" type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={30} disabled={busy} />
    <p className="chat-muted">Username: @{user?.username}<br />Email: {user?.email}</p>
    <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save personal info"}</Button><p className="profile-feedback" role="status">{message}</p>
  </form>;
}
export default PersonalInfoForm;
