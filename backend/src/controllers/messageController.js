import mongoose from "mongoose";
import Message from "../models/message.js";
import Conversation from "../models/conversation.js";

import { PUBLIC_PROFILE, httpError, respondError, validateRequest, readContent, requireConversation, readPagination, buildMessageFilter, paginateMessages } from "../utils/messageHelper.js";

// GET /api/conversations/:conversationId/messages?limit=30&before=<messageId>
// Newest first; the cursor includes both timestamp and ID for stable pagination.
export const getMessages = async (req, res, next) => {
    try {
        validateRequest(req);
        const {limit, before} = readPagination(req.query);
        await requireConversation(req);
        const filter = await buildMessageFilter(req.params.conversationId, before);
        const messages = await Message.find(filter).sort({createdAt: -1, _id: -1}).limit(limit + 1)
            .populate("sender", PUBLIC_PROFILE).lean();
        return res.status(200).json(paginateMessages(messages, limit));
    } catch (error) {
        return respondError(error, res, next);
    }
};

// Transactions require MongoDB Atlas or a replica set.
export const sendMessage = async (req, res, next) => {
    try {
        validateRequest(req);
        const content = readContent(req);
        let message;
        await mongoose.connection.transaction(async (session) => {
            await requireConversation(req, session);
            [message] = await Message.create([{
                conversation: req.params.conversationId,
                sender: req.user._id,
                content,
            }], {session});
            await Conversation.updateOne({_id: req.params.conversationId, participants: req.user._id}, {
                $set: {lastMessage: message._id, lastMessageAt: message.createdAt},
            }, {session});
        });
        return res.status(201).json({message});
    } catch (error) {
        return respondError(error, res, next);
    }
};

export const editMessage = async (req, res, next) => {
    try {
        validateRequest(req);
        const content = readContent(req);
        await requireConversation(req);
        const message = await Message.findOneAndUpdate({
            _id: req.params.messageId,
            conversation: req.params.conversationId,
            sender: req.user._id,
        }, {$set: {content}}, {new: true, runValidators: true});
        if (!message) throw httpError(404, "Message not found or you are not its sender");
        return res.status(200).json({message});
    } catch (error) {
        return respondError(error, res, next);
    }
};

export const deleteMessage = async (req, res, next) => {
    try {
        validateRequest(req);
        await mongoose.connection.transaction(async (session) => {
            const conversation = await requireConversation(req, session);
            const deleted = await Message.findOneAndDelete({
                _id: req.params.messageId,
                conversation: req.params.conversationId,
                sender: req.user._id,
            }, {session});
            if (!deleted) throw httpError(404, "Message not found or you are not its sender");
            let lastMessage = conversation.lastMessage;
            let lastMessageAt = conversation.lastMessageAt;
            if (lastMessage?.toString() === deleted._id.toString()) {
                const latest = await Message.findOne({conversation: req.params.conversationId})
                    .sort({createdAt: -1, _id: -1}).session(session);
                lastMessage = latest?._id ?? null;
                lastMessageAt = latest?.createdAt ?? null;
            }
            // Writing the conversation also serializes this with concurrent sends.
            await Conversation.updateOne({_id: conversation._id, participants: req.user._id}, {
                $set: {lastMessage, lastMessageAt},
            }, {session});
        });
        return res.sendStatus(204);
    } catch (error) {
        return respondError(error, res, next);
    }
};

