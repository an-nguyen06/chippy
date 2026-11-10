import { useRef, useState, type FormEvent } from "react";
import { Send, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KaomojiLibrary } from "@/components/kaomoji/kaomojiLibrary";
import { toast } from "sonner";
export function MessageInput({onSend, disabled = false}: {onSend: (content: string) => Promise<boolean>; disabled?: boolean}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [picker, setPicker] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const submitting = useRef(false);
  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (submitting.current || disabled || !draft.trim()) return;
    submitting.current = true; setSending(true);
    try {if (await onSend(draft.trim())) {setDraft(""); setPicker(false);}}
    finally {submitting.current = false; setSending(false); textarea.current?.focus();}
  }
  return <form className="message-composer" onSubmit={(event) => void submit(event)}>
    {picker && <div id="message-kaomoji-picker" className="message-library-picker"><KaomojiLibrary compact disabled={disabled || sending} onSelect={(face) => {
      const next = draft + (draft ? " " : "") + face;
      if (next.length > 4000) {toast.error("This expression won't fit. Shorten your message first."); return;}
      setDraft(next); textarea.current?.focus();
    }} /></div>}
    <label htmlFor="message-draft" className="sr-only">Your message</label><textarea ref={textarea} id="message-draft" rows={2} value={draft} disabled={disabled || sending} maxLength={4000} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => {
      if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {event.preventDefault(); void submit();}
    }} />
    <div className="message-composer-tools"><Button type="button" variant="ghost" size="icon" aria-label="Choose a kaomoji" aria-expanded={picker} aria-controls="message-kaomoji-picker" disabled={disabled || sending} onClick={() => setPicker(!picker)}><Smile /></Button><span>{draft.length}/4000 · Shift + Enter for a new line</span><Button type="submit" disabled={disabled || sending || !draft.trim()}><Send />{sending ? "Sending…" : "Send"}</Button></div>
  </form>;
}
export default MessageInput;

