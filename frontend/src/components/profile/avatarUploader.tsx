import { useRef, useState, type ChangeEvent } from "react";
import { Camera, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { saveProfile } from "@/lib/profile";
import { getApiError } from "@/lib/api";

async function prepareAvatar(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Choose a JPG, PNG, or WebP image.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Choose an image smaller than 5 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser couldn't prepare this image.");
    const side = Math.min(bitmap.width, bitmap.height);
    context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 256, 256);
    const result = canvas.toDataURL("image/webp", 0.8);
    if (result.split(",")[1].length > 65536) throw new Error("Try a simpler or smaller image.");
    return result;
  } finally {bitmap.close();}
}
export function AvatarUploader({onBusyChange, disabled = false}: {onBusyChange?: (busy: boolean) => void; disabled?: boolean}) {
  const user = useAuthStore((state) => state.user);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || busy || disabled) return;
    setBusy(true); onBusyChange?.(true); setMessage("");
    try {
      const avatarUrl = await prepareAvatar(file);
      await saveProfile({avatarUrl}); setMessage("Your new look is saved.");
    } catch (error) {setMessage(error instanceof Error && !('isAxiosError' in error) ? error.message : getApiError(error));}
    finally {setBusy(false); onBusyChange?.(false); if (input.current) input.current.value = "";}
  }
  async function remove() {
    setBusy(true); onBusyChange?.(true); setMessage("");
    try {await saveProfile({avatarUrl: ""}); setMessage("Avatar removed.");}
    catch (error) {setMessage(getApiError(error));}
    finally {setBusy(false); onBusyChange?.(false);}
  }
  return <section className="profile-avatar-editor"><span className="profile-avatar">{user?.avatarUrl ? <img src={user.avatarUrl} alt="Your current avatar" /> : <UserRound size={32} />}</span><div><input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => void upload(event)} /><div className="friend-request-actions"><Button type="button" disabled={busy} onClick={() => input.current?.click()}><Camera />{busy ? "Saving…" : "Change avatar"}</Button>{user?.avatarUrl && <Button type="button" variant="outline" disabled={busy} onClick={() => void remove()}>Remove</Button>}</div><p className="chat-muted">JPG, PNG or WebP, up to 5 MB. Cropped to a square.</p><p role="status" className="profile-feedback">{message}</p></div></section>;
}
export default AvatarUploader;
