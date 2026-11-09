import mongoose from "mongoose";
import Conversation from "../models/conversation.js";
import Message from "../models/message.js";

export const PUBLIC_PROFILE = "username displayName avatarUrl";
export function httpError(status, message) {
    return Object.assign(new Error(message), {status});
}
export function respondError(error, res, next) {
    if (error.status) return res.status(error.status).json({message: error.message});
    if (error.name === "ValidationError") return res.status(400).json({message: error.message});
    return next(error);
}
export function validateRequest(req) {
    if (!req.user?._id) throw httpError(401, "Please sign in first");
    if (!mongoose.isObjectIdOrHexString(req.params?.conversationId)) throw httpError(400, "Invalid conversation ID");
    if (req.params.messageId !== undefined && !mongoose.isObjectIdOrHexString(req.params.messageId)) throw httpError(400, "Invalid message ID");
}
export function readContent(req) {
    const content = req.body?.content;
    if (typeof content !== "string" || !content.trim() || content.trim().length > 4000) {
        throw httpError(400, "Message content must contain 1 to 4000 characters");
    }
    return content.trim();
}
export async function requireConversation(req, session = null) {
    const query = Conversation.findOne({_id: req.params.conversationId, participants: req.user._id});
    const conversation = await (session ? query.session(session) : query);
    if (!conversation) throw httpError(404, "Conversation not found");
    return conversation;
}



// Validate pagination before querying; cursors belong to a single conversation.
export function readPagination(query = {}) {
    const limit = Number(query.limit ?? 30);
    const before = query.before;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw httpError(400, "Limit must be between 1 and 100");
    if (before !== undefined && !mongoose.isObjectIdOrHexString(before)) throw httpError(400, "Invalid message cursor");
    return {limit, before};
}

export async function buildMessageFilter(conversationId, before) {
    const filter = {conversation: conversationId};
    if (before !== undefined) {
        const cursor = await Message.findOne({_id: before, conversation: conversationId});
        if (!cursor) throw httpError(404, "Message cursor not found");
        filter.$or = [
            {createdAt: {$lt: cursor.createdAt}},
            {createdAt: cursor.createdAt, _id: {$lt: cursor._id}},
        ];
    }
    return filter;
}

// Pass limit + 1 results from the query. Leave the original array untouched.
export function paginateMessages(results, limit) {
    const hasMore = results.length > limit;
    const messages = results.slice(0, limit);
    return {messages, hasMore, nextCursor: hasMore ? messages.at(-1)._id.toString() : null};
}
