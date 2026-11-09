export interface ChatMessage {
  _id: string;
  conversation: string;
  sender: string | {_id: string; displayName: string; username: string; avatarUrl?: string} | null;
  content: string;
  createdAt: string;
  updatedAt: string;
}
export function senderId(message: ChatMessage) {
  return typeof message.sender === "string" ? message.sender : message.sender?._id;
}
// Both POST results and overlapping history pages can contain the same message.
export function mergeMessages(...pages: ChatMessage[][]): ChatMessage[] {
  const records = new Map<string, ChatMessage>();
  for (const page of pages) for (const message of page) records.set(message._id, message);
  return [...records.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a._id.localeCompare(b._id));
}
