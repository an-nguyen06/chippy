import mongoose from "mongoose";
import Conversation from "../models/conversation.js";
import Friend from "../models/friend.js";
import User from "../models/user.js";
import {publishMessage} from "../libs/socket.js";
// Register the model used by lastMessage population even outside server.js.
import "../models/message.js";

const PROFILE = "username displayName avatarUrl";
function fail(status, message) { return Object.assign(new Error(message), {status}); }
function handleError(error, res, next) {
    if (error.status) return res.status(error.status).json({message: error.message});
    if (error.name === "ValidationError") return res.status(400).json({message: error.message});
    return next(error);
}
function authenticate(req) {
    if (!req.user?._id) throw fail(401, "Please sign in first");
}
function validateId(req) {
    authenticate(req);
    if (!mongoose.isObjectIdOrHexString(req.params?.conversationId)) throw fail(400, "Invalid conversation ID");
}
function populateConversation(query) {
    return query.populate("participants", PROFILE).populate({path: "lastMessage", populate: {path: "sender", select: PROFILE}});
}

// GET /api/conversations?page=1&limit=20
export const getConversations = async (req, res, next) => {
    try {
        authenticate(req);
        const page = Number(req.query?.page ?? 1);
        const limit = Number(req.query?.limit ?? 20);
        if (!Number.isSafeInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isSafeInteger((page - 1) * limit)) {
            throw fail(400, "Use a positive page and a limit from 1 to 100");
        }
        const filter = {participants: req.user._id};
        const [conversations, total] = await Promise.all([
            populateConversation(Conversation.find(filter).sort({lastMessageAt: -1, createdAt: -1, _id: -1}).skip((page - 1) * limit).limit(limit)).lean(),
            Conversation.countDocuments(filter),
        ]);
        return res.status(200).json({conversations, page, limit, total});
    } catch (error) { return handleError(error, res, next); }
};

export const getConversation = async (req, res, next) => {
    try {
        validateId(req);
        const conversation = await populateConversation(Conversation.findOne({_id: req.params.conversationId, participants: req.user._id})).lean();
        if (!conversation) throw fail(404, "Conversation not found");
        return res.status(200).json({conversation});
    } catch (error) { return handleError(error, res, next); }
};

// POST {type: "direct"|"group", participantIds: [otherUserId, ...], name?: string}
// The authenticated user is always included; creator and derived keys are server-owned.
export const createConversation = async (req, res, next) => {
    try {
        authenticate(req);
        const {type = "direct", participantIds, name} = req.body || {};
        if (!["direct", "group"].includes(type) || !Array.isArray(participantIds) || participantIds.length < 1 || participantIds.length > 99 || !participantIds.every((id) => mongoose.isObjectIdOrHexString(id))) {
            throw fail(400, "Choose a valid type and 1 to 99 participant IDs");
        }
        const current = req.user._id.toString();
        const others = participantIds.map((id) => new mongoose.Types.ObjectId(id).toString());
        if (others.includes(current) || new Set(others).size !== others.length) throw fail(400, "Participant IDs must be unique and exclude yourself");
        if (type === "direct" && others.length !== 1) throw fail(400, "A direct chat needs exactly one other user");
        if (type === "group" && (typeof name !== "string" || !name.trim() || name.trim().length > 100)) throw fail(400, "A group name must contain 1 to 100 characters");
        const directKey = [current, ...others].sort().join(":");
        if (type === "direct") {
            const existing = await Conversation.findOne({type: "direct", directKey});
            if (existing) return res.status(200).json({conversation: existing});
        }
        if (await User.countDocuments({_id: {$in: others}}) !== others.length) throw fail(404, "One or more users were not found");
        const pairs = others.map((id) => {
            const [user1, user2] = [current, id].sort();
            return {user1, user2};
        });
        if (await Friend.countDocuments({$or: pairs}) !== others.length) throw fail(403, "You must be friends with everyone you invite");
        let conversation;
        try {
            conversation = await Conversation.create({type, participants: [current, ...others], createdBy: req.user._id, ...(type === "group" ? {name: name.trim()} : {})});
        } catch (error) {
            // Two simultaneous direct-chat creations should return the same thread.
            if (error.code !== 11000 || type !== "direct") throw error;
            conversation = await Conversation.findOne({type: "direct", directKey});
            if (!conversation) throw error;
            return res.status(200).json({conversation});
        }
        await publishMessage(req, "conversation:created", conversation._id, {});
        return res.status(201).json({conversation});
    } catch (error) { return handleError(error, res, next); }
};

// Only a group's creator can rename it. Direct chats keep their peer-based name.
export const updateConversation = async (req, res, next) => {
    try {
        validateId(req);
        const name = req.body?.name;
        if (typeof name !== "string" || !name.trim() || name.trim().length > 100) throw fail(400, "A group name must contain 1 to 100 characters");
        const conversation = await Conversation.findOneAndUpdate({
            _id: req.params.conversationId, type: "group", participants: req.user._id, createdBy: req.user._id,
        }, {$set: {name: name.trim()}}, {new: true, runValidators: true});
        if (!conversation) throw fail(404, "Group not found or you are not its creator");
        return res.status(200).json({conversation});
    } catch (error) { return handleError(error, res, next); }
};
