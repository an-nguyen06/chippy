import mongoose from "mongoose";
import Friend from "../models/friend.js";
import FriendRequest from "../models/friend-request.js";

// Only public profile fields are returned when populating users.
const PROFILE_FIELDS = "username displayName avatarUrl bio";

function pagination(query = {}) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100 || !Number.isSafeInteger((page - 1) * limit)) {
        return null;
    }
    return {page, limit, skip: (page - 1) * limit};
}

function handleError(error, res, next) {
    if (error.code === 11000) {
        return res.status(409).json({message: "This friendship or pending request already exists"});
    }
    return next(error);
}

// Requires canSendFriendRequest; never accept sender/status from the client.
export const sendFriendRequest = async (req, res, next) => {
    try {
        const request = await FriendRequest.create(req.friendRequestInput);
        return res.status(201).json({request});
    } catch (error) {
        return handleError(error, res, next);
    }
};

export const getFriends = async (req, res, next) => {
    const paging = pagination(req.query);
    if (!paging) return res.status(400).json({message: "Use a positive page and a limit from 1 to 100"});
    try {
        const filter = {$or: [{user1: req.user._id}, {user2: req.user._id}]};
        const [relationships, total] = await Promise.all([
            Friend.find(filter).sort({createdAt: -1, _id: -1}).skip(paging.skip).limit(paging.limit)
                .populate("user1", PROFILE_FIELDS).populate("user2", PROFILE_FIELDS).lean(),
            Friend.countDocuments(filter),
        ]);
        const friends = relationships.map((friendship) => ({
            friendshipId: friendship._id,
            user: friendship.user1?._id.toString() === req.user._id.toString() ? friendship.user2 : friendship.user1,
            friendsSince: friendship.createdAt,
        })).filter((friendship) => friendship.user);
        return res.status(200).json({friends, page: paging.page, limit: paging.limit, total});
    } catch (error) {
        return next(error);
    }
};

// GET ?direction=incoming|outgoing&status=pending|accepted|rejected|cancelled
export const getFriendRequests = async (req, res, next) => {
    const {direction = "incoming", status = "pending"} = req.query || {};
    const paging = pagination(req.query);
    if (!paging || !["incoming", "outgoing"].includes(direction) || !["pending", "accepted", "rejected", "cancelled"].includes(status)) {
        return res.status(400).json({message: "Invalid pagination, direction, or request status"});
    }
    try {
        const filter = {[direction === "incoming" ? "recipient" : "sender"]: req.user._id, status};
        const [requests, total] = await Promise.all([
            FriendRequest.find(filter).sort({createdAt: -1, _id: -1}).skip(paging.skip).limit(paging.limit)
                .populate("sender", PROFILE_FIELDS).populate("recipient", PROFILE_FIELDS).lean(),
            FriendRequest.countDocuments(filter),
        ]);
        return res.status(200).json({requests, page: paging.page, limit: paging.limit, total});
    } catch (error) {
        return next(error);
    }
};

// Requires canRespondToFriendRequest. Both writes commit or roll back together.
// MongoDB must support transactions (Atlas or a replica set).
export const acceptFriendRequest = async (req, res, next) => {
    try {
        let request;
        let friendship;
        await mongoose.connection.transaction(async (session) => {
            request = await FriendRequest.findOneAndUpdate(
                {_id: req.params.requestId, recipient: req.user._id, status: "pending"},
                {$set: {status: "accepted"}},
                {new: true, runValidators: true, session},
            );
            if (!request) {
                const error = new Error("This request has already been resolved");
                error.status = 409;
                throw error;
            }
            const [user1, user2] = [request.sender.toString(), request.recipient.toString()].sort();
            // Idempotent if a friendship already exists.
            friendship = await Friend.findOneAndUpdate(
                {user1, user2}, {$setOnInsert: {user1, user2}},
                {upsert: true, new: true, runValidators: true, session},
            );
        });
        return res.status(200).json({request, friendship});
    } catch (error) {
        if (error.status === 409) return res.status(409).json({message: error.message});
        return handleError(error, res, next);
    }
};

function resolveRequest(status, role) {
    return async (req, res, next) => {
        try {
            const request = await FriendRequest.findOneAndUpdate(
                {_id: req.params.requestId, [role]: req.user._id, status: "pending"},
                {$set: {status}}, {new: true, runValidators: true},
            );
            if (!request) return res.status(409).json({message: "This request has already been resolved"});
            return res.status(200).json({request});
        } catch (error) {
            return next(error);
        }
    };
}

export const rejectFriendRequest = resolveRequest("rejected", "recipient");
export const cancelFriendRequest = resolveRequest("cancelled", "sender");

// Requires requireFriend. Chat history is retained when unfriending.
export const removeFriend = async (req, res, next) => {
    try {
        const result = await Friend.deleteOne({
            _id: req.friendship._id,
            $or: [{user1: req.user._id}, {user2: req.user._id}],
        });
        if (!result.deletedCount) return res.status(404).json({message: "Friendship not found"});
        return res.sendStatus(204);
    } catch (error) {
        return next(error);
    }
};
