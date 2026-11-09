export interface ChatSummary {
  _id: string;
  type: "direct" | "group";
  name?: string;
  participants: { _id: string; displayName: string; username: string }[];
  lastMessage?: {content: string} | null;
}
export function conversationName(chat: ChatSummary, userId?: string) {
  return chat.type === "group" ? chat.name || "Group chat" : chat.participants.find((person) => person._id !== userId)?.displayName || "Chippy friend";
}

