import mongoose from "mongoose";
import Friend from "../models/friend.js";
import FriendRequest from "../models/friend-request.js";
import User from "../models/user.js";

function authenticated(req, res) {
    if (!req.user?._id) {
        res.status(401).json({message: "Please sign in first"});
        return false;
    }
    return true;
}

// Target user: /:userId or {recipientId} in the request body.
function getPair(req, res) {
    const target = req.params?.userId ?? req.body?.recipientId;
    if (!mongoose.isObjectIdOrHexString(target)) {
        res.status(400).json({message: "A valid recipient user ID is required"});
        return null;
    }
    const current = req.user._id.toString();
    if (current === target.toString()) {
        res.status(400).json({message: "Choose a user other than yourself"});
        return null;
    }
    const [user1, user2] = [current, target.toString()].sort();
    return {user1, user2, target: target.toString()};
}

// Run protectedRoute first. On success, controllers can use req.friendship.
export const requireFriend = async (req, res, next) => {
    if (!authenticated(req, res)) return;
    const pair = getPair(req, res);
    if (!pair) return;
    try {
        const friendship = await Friend.findOne({user1: pair.user1, user2: pair.user2});
        if (!friendship) return res.status(403).json({message: "You must be friends to do this"});
        req.friendship = friendship;
        return next();
    } catch (error) {
        return next(error);
    }
};

export const canSendFriendRequest = async (req, res, next) => {
    if (!authenticated(req, res)) return;
    const pair = getPair(req, res);
    if (!pair) return;
    try {
        if (!await User.exists({_id: pair.target})) {
            return res.status(404).json({message: "User not found"});
        }
        if (await User.exists({_id: pair.target, "privacy.allowFriendRequests": false})) {
            return res.status(403).json({message: "This user isn't accepting new friend requests"});
        }
        if (await Friend.exists({user1: pair.user1, user2: pair.user2})) {
            return res.status(409).json({message: "You are already friends"});
        }
        const pairKey = `${pair.user1}:${pair.user2}`;
        if (await FriendRequest.exists({pairKey, status: "pending"})) {
            return res.status(409).json({message: "A friend request is already pending"});
        }
        // Build controller input from authenticated/validated values.
        req.friendRequestInput = {sender: req.user._id, recipient: pair.target};
        return next();
    } catch (error) {
        return next(error);
    }
};

function authorizePendingRequest(role) {
    return async (req, res, next) => {
        if (!authenticated(req, res)) return;
        const requestId = req.params?.requestId;
        if (!mongoose.isObjectIdOrHexString(requestId)) {
            return res.status(400).json({message: "A valid friend request ID is required"});
        }
        try {
            const request = await FriendRequest.findById(requestId);
            if (!request) return res.status(404).json({message: "Friend request not found"});
            if (request[role].toString() !== req.user._id.toString()) {
                return res.status(403).json({message: "You cannot change this friend request"});
            }
            if (request.status !== "pending") {
                return res.status(409).json({message: "This friend request has already been resolved"});
            }
            req.friendRequest = request;
            return next();
        } catch (error) {
            return next(error);
        }
    };
}

// Only the recipient can accept/reject; only the sender can cancel.
export const canRespondToFriendRequest = authorizePendingRequest("recipient");
export const canCancelFriendRequest = authorizePendingRequest("sender");

// Controllers must still handle duplicate-key errors (11000), and resolve
// requests atomically with a status: "pending" filter to avoid concurrent writes.
