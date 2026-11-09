import { test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Friend from "../src/models/friend.js";
import FriendRequest from "../src/models/friend-request.js";
import User from "../src/models/user.js";
import { requireFriend, canSendFriendRequest, canRespondToFriendRequest, canCancelFriendRequest } from "../src/middlewares/friendMiddleware.js";

const a = new mongoose.Types.ObjectId("000000000000000000000001");
const b = new mongoose.Types.ObjectId("000000000000000000000002");
const id = new mongoose.Types.ObjectId();
async function run(middleware, req) {
    const result = {code: null, next: false, error: null};
    const res = {status(code) {result.code = code; return this;}, json(body) {result.body = body; return this;}};
    await middleware(req, res, (error) => {result.next = true; result.error = error;});
    return result;
}

test("friend middleware authorization", async (t) => {
    await t.test("authentication and target validation happen before database queries", async () => {
        assert.equal((await run(requireFriend, {})).code, 401);
        assert.equal((await run(requireFriend, {user: {_id: a}, body: {recipientId: {$ne: null}}})).code, 400);
        assert.equal((await run(requireFriend, {user: {_id: a}, params: {userId: String(a)}})).code, 400);
    });
    await t.test("friend lookup normalizes pairs and attaches the friendship", async (t) => {
        const friendship = {user1: a, user2: b};
        t.mock.method(Friend, "findOne", async (query) => {
            assert.deepEqual(query, {user1: String(a), user2: String(b)});
            return friendship;
        });
        const req = {user: {_id: b}, params: {userId: String(a)}};
        assert.equal((await run(requireFriend, req)).next, true);
        assert.equal(req.friendship, friendship);
    });
    await t.test("non-friends are denied", async (t) => {
        t.mock.method(Friend, "findOne", async () => null);
        assert.equal((await run(requireFriend, {user: {_id: a}, body: {recipientId: String(b)}})).code, 403);
    });
    await t.test("new requests reject missing users, existing friends, and pending pairs", async (t) => {
        let exists = false, friends = false, pending = false;
        t.mock.method(User, "exists", async (filter) => filter["privacy.allowFriendRequests"] === false ? false : exists);
        t.mock.method(Friend, "exists", async () => friends);
        t.mock.method(FriendRequest, "exists", async (query) => {
            assert.equal(query.pairKey, `${a}:${b}`);
            return pending;
        });
        const req = {user: {_id: a}, body: {recipientId: String(b)}};
        assert.equal((await run(canSendFriendRequest, req)).code, 404);
        exists = true; friends = true;
        assert.equal((await run(canSendFriendRequest, req)).code, 409);
        friends = false; pending = true;
        assert.equal((await run(canSendFriendRequest, req)).code, 409);
        pending = false;
        assert.equal((await run(canSendFriendRequest, req)).next, true);
        assert.equal(req.friendRequestInput.sender, a);
    });
    await t.test("only the correct party can resolve a pending request", async (t) => {
        const request = {sender: a, recipient: b, status: "pending"};
        t.mock.method(FriendRequest, "findById", async () => request);
        const req = {user: {_id: b}, params: {requestId: String(id)}};
        assert.equal((await run(canRespondToFriendRequest, req)).next, true);
        assert.equal(req.friendRequest, request);
        assert.equal((await run(canCancelFriendRequest, req)).code, 403);
        req.user._id = a;
        assert.equal((await run(canCancelFriendRequest, req)).next, true);
        assert.equal((await run(canRespondToFriendRequest, req)).code, 403);
        request.status = "accepted";
        assert.equal((await run(canCancelFriendRequest, req)).code, 409);
    });
    await t.test("request IDs are validated and missing requests return 404", async (t) => {
        assert.equal((await run(canRespondToFriendRequest, {user: {_id: a}, params: {requestId: "bad"}})).code, 400);
        t.mock.method(FriendRequest, "findById", async () => null);
        assert.equal((await run(canRespondToFriendRequest, {user: {_id: a}, params: {requestId: String(id)}})).code, 404);
    });
    await t.test("database failures reach Express error handling", async (t) => {
        const error = new Error("database unavailable");
        t.mock.method(Friend, "findOne", async () => {throw error;});
        const result = await run(requireFriend, {user: {_id: a}, params: {userId: String(b)}});
        assert.equal(result.error, error);
        assert.equal(result.code, null);
    });
});
