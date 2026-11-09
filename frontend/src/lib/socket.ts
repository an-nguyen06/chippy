import { io } from "socket.io-client";
import { useAuthStore } from "@/stores/auth-store";
import type { ChatMessage } from "@/lib/message";
export interface MessageEvent {conversationId: string; message: ChatMessage}
export interface DeletedMessageEvent {conversationId: string; messageId: string}
export const socket = io({
  autoConnect: false,
  withCredentials: true,
  auth: (callback) => callback({token: useAuthStore.getState().accessToken}),
});
