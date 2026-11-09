import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { saveProfile } from "@/lib/profile";
import { getApiError } from "@/lib/api";

export function PreferencesForm({onBusyChange}: {onBusyChange?: (busy: boolean) => void}) {
  const preferences = useAuthStore((state) => state.user?.preferences);
  const [compactMode, setCompactMode] = useState(preferences?.compactMode ?? false);
  const [reduceMotion, setReduceMotion] = useState(preferences?.reduceMotion ?? false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    setBusy(true); onBusyChange?.(true); setMessage("");
    try {await saveProfile({preferences: {compactMode, reduceMotion}}); setMessage("Your preferences are saved.");}
    catch (error) {setMessage(getApiError(error));}
    finally {setBusy(false); onBusyChange?.(false);}
  }
  return <form className="profile-form" onSubmit={submit}><h3>Make yourself comfortable</h3>
    <label className="profile-toggle"><span><strong>Compact layout</strong><small>Use less space between cards and people.</small></span><input type="checkbox" checked={compactMode} onChange={(event) => setCompactMode(event.target.checked)} disabled={busy} /></label>
    <label className="profile-toggle"><span><strong>Reduce motion</strong><small>Turn off interface animations and transitions.</small></span><input type="checkbox" checked={reduceMotion} onChange={(event) => setReduceMotion(event.target.checked)} disabled={busy} /></label>
    <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save preferences"}</Button><p className="profile-feedback" role="status">{message}</p>
  </form>;
}
export default PreferencesForm;
