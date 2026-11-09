import { Server } from "socket.io";
import { socketAuth } from "../middlewares/socketMiddleware.js";
import Conversation from "../models/conversation.js";

export function setupSocket(httpServer) {
    const io = new Server(httpServer, {
        // Local development uses Vite's same-origin proxy. Set CLIENT_ORIGIN
        // to your frontend origin if the production frontend is hosted separately.
        cors: {origin: process.env.CLIENT_ORIGIN || "http://localhost:5173", credentials: true},
        maxHttpBufferSize: 100000,
    });
    io.use(socketAuth);
    io.on("connection", (socket) => {
        // Clients cannot choose rooms or impersonate another user.
        socket.join(`user:${socket.data.userId}`);
        const expiry = setTimeout(() => {
            socket.emit("auth:expired");
            socket.disconnect(true);
        }, Math.max(0, socket.data.expiresAt - Date.now()));
        expiry.unref();
        socket.on("disconnect", () => clearTimeout(expiry));
    });
    return io;
}

// Call only AFTER a successful database write/transaction. Notifications are
// best-effort; their failure must not turn a saved message into an HTTP error.
export async function publishMessage(req, event, conversationId, payload) {
    const io = req.app?.get("io");
    if (!io) return;
    try {
        const conversation = await Conversation.findById(conversationId).select("participants").lean();
        if (!conversation) return;
        if (typeof payload.message?.populate === "function") {
            await payload.message.populate("sender", "username displayName avatarUrl");
        }
        const rooms = conversation.participants.map((id) => `user:${id}`);
        io.to(rooms).emit(event, {conversationId: conversationId.toString(), ...payload});
        io.to(rooms).emit("conversation:updated", {conversationId: conversationId.toString()});
    } catch (error) {
        console.error("Could not publish message notification", error.message);
    }
}
