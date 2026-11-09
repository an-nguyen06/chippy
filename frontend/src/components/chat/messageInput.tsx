import { useRef, useState, type FormEvent } from "react";
import { Send, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
const faces = ["(｡•ᴗ•｡)", "(づ｡•ᴗ•｡)づ", "(≧▽≦)", "(╥﹏╥)", "♡"];
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
    {picker && <div id="message-kaomoji-picker" className="message-kaomoji-picker" aria-label="Kaomoji picker">{faces.map((face) => <button type="button" key={face} disabled={disabled || sending} onClick={() => {setDraft((value) => (value + (value ? " " : "") + face).slice(0, 4000)); textarea.current?.focus();}}>{face}</button>)}</div>}
    <label htmlFor="message-draft" className="sr-only">Your message</label><textarea ref={textarea} id="message-draft" rows={2} value={draft} disabled={disabled || sending} maxLength={4000} placeholder="Send a little hello…" onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => {
      if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {event.preventDefault(); void submit();}
    }} />
    <div className="message-composer-tools"><Button type="button" variant="ghost" size="icon" aria-label="Choose a kaomoji" aria-expanded={picker} aria-controls="message-kaomoji-picker" disabled={disabled || sending} onClick={() => setPicker(!picker)}><Smile /></Button><span>{draft.length}/4000 · Shift + Enter for a new line</span><Button type="submit" disabled={disabled || sending || !draft.trim()}><Send />{sending ? "Sending…" : "Send"}</Button></div>
  </form>;
}
export default MessageInput;
