import { useRef, useState } from "react";
import { Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvatarUploader } from "./avatarUploader";
import { PersonalInfoForm } from "./personalInfoForm";
import { PreferencesForm } from "./preferencesForm";
import { PrivacySetting } from "./privacySetting";
const tabs = ["Personal info", "Preferences", "Privacy"] as const;
export function ProfileDialog() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<typeof tabs[number]>("Personal info");
  const [busy, setBusy] = useState(false);
  return <><Button onClick={() => {setTab("Personal info"); setOpen(true); dialog.current?.showModal();}}><Pencil /> Edit profile</Button>
    <dialog ref={dialog} className="friend-request-dialog profile-dialog" aria-labelledby="profile-dialog-title" onClose={() => setOpen(false)} onCancel={(event) => {if (busy) event.preventDefault();}}>
      <div className="chat-window-bar"><span>♡ your little details</span><button type="button" disabled={busy} aria-label="Close profile settings" onClick={() => dialog.current?.close()}><X size={16} /></button></div>
      {open && <div className="friend-dialog-body"><h2 id="profile-dialog-title">Make it yours</h2><div className="friend-request-tabs" role="group" aria-label="Profile settings sections">{tabs.map((item) => <Button key={item} type="button" disabled={busy} aria-pressed={tab === item} variant={tab === item ? "default" : "outline"} onClick={() => setTab(item)}>{item}</Button>)}</div>
        {tab === "Personal info" && <><fieldset disabled={busy}><AvatarUploader onBusyChange={setBusy} disabled={busy} /></fieldset><fieldset disabled={busy}><PersonalInfoForm onBusyChange={setBusy} /></fieldset></>}
        {tab === "Preferences" && <PreferencesForm onBusyChange={setBusy} />}
        {tab === "Privacy" && <PrivacySetting onBusyChange={setBusy} />}
      </div>}
    </dialog>
  </>;
}
export default ProfileDialog;
