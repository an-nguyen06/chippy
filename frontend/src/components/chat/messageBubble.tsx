import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChatMessage } from "@/lib/message";
export function MessageBubble({message, own, onEdit, onDelete}: {message: ChatMessage; own: boolean; onEdit: (id: string, content: string) => Promise<boolean>; onDelete: (id: string) => Promise<boolean>}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [busy, setBusy] = useState(false);
  const name = typeof message.sender === "object" && message.sender ? message.sender.displayName : own ? "You" : "Chippy friend";
  return <li className={`message-row ${own ? "message-own" : "message-peer"}`}>
    <span className="message-sender">{own ? "You" : name}</span>
    {editing ? <form className="message-edit" onSubmit={async (event) => {event.preventDefault(); if (busy || !draft.trim()) return; setBusy(true); try {if (await onEdit(message._id, draft.trim())) setEditing(false);} finally {setBusy(false);}}}>
      <textarea aria-label="Edit message" value={draft} maxLength={4000} rows={3} disabled={busy} onChange={(event) => setDraft(event.target.value)} /><div><Button size="sm" type="submit" disabled={busy || !draft.trim()}>Save</Button><Button size="sm" variant="outline" type="button" disabled={busy} onClick={() => setEditing(false)}>Cancel</Button></div>
    </form> : <p className="message-bubble">{message.content}</p>}
    <div className="message-meta"><time dateTime={message.createdAt} title={new Date(message.createdAt).toLocaleString()}>{new Date(message.createdAt).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})}</time>{message.updatedAt !== message.createdAt && <span>edited</span>}
      {own && !editing && <><button type="button" disabled={busy} aria-label="Edit your message" onClick={() => {setDraft(message.content); setEditing(true); setConfirmDelete(false);}}><Pencil size={12} /></button><button type="button" disabled={busy} aria-label="Delete your message" onClick={() => setConfirmDelete(!confirmDelete)}><Trash2 size={12} /></button></>}
    </div>
    {confirmDelete && <div className="message-delete-confirm"><span>Delete this message?</span><Button size="sm" disabled={busy} onClick={async () => {setBusy(true); try {if (await onDelete(message._id)) setConfirmDelete(false);} finally {setBusy(false);}}}>{busy ? "Deleting…" : "Delete"}</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => setConfirmDelete(false)}>Keep it</Button></div>}
  </li>;
}
export default MessageBubble;
