import {test} from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Friend from "../src/models/friend.js";
import FriendRequest from "../src/models/friend-request.js";
import {sendFriendRequest, acceptFriendRequest, rejectFriendRequest, cancelFriendRequest, removeFriend, getFriends, getFriendRequests} from "../src/controllers/friendController.js";
const a = new mongoose.Types.ObjectId("000000000000000000000001");
const b = new mongoose.Types.ObjectId("000000000000000000000002");
const requestId = new mongoose.Types.ObjectId();
async function run(handler, extra = {}) {
    const result = {};
    const req = {user: {_id: b}, params: {requestId}, query: {}, ...extra};
    const res = {status(code) {result.code = code; return this;}, json(body) {result.body = body; return this;}, sendStatus(code) {result.code = code; return this;}};
    await handler(req, res, (error) => {result.error = error;});
    return result;
}

test("friend controllers", async (t) => {
    await t.test("send uses middleware input and maps duplicate races to 409", async (t) => {
        const input = {sender: a, recipient: b};
        t.mock.method(FriendRequest, "create", async (value) => {assert.equal(value, input); return {_id: requestId, ...value};});
        assert.equal((await run(sendFriendRequest, {friendRequestInput: input, body: {sender: "untrusted"}})).code, 201);
        FriendRequest.create = async () => {throw {code: 11000};};
        assert.equal((await run(sendFriendRequest, {friendRequestInput: input})).code, 409);
    });
    await t.test("accept uses one transaction and conditional request ownership/status", async (t) => {
        const session = {};
        t.mock.method(mongoose.connection, "transaction", async (fn) => fn(session));
        t.mock.method(FriendRequest, "findOneAndUpdate", async (filter, update, options) => {
            assert.deepEqual(filter, {_id: requestId, recipient: b, status: "pending"});
            assert.equal(update.$set.status, "accepted");
            assert.equal(options.session, session);
            return {_id: requestId, sender: b, recipient: a, status: "accepted"};
        });
        t.mock.method(Friend, "findOneAndUpdate", async (filter, update, options) => {
            assert.deepEqual(filter, {user1: String(a), user2: String(b)});
            assert.equal(options.session, session);
            assert.equal(options.upsert, true);
            return filter;
        });
        assert.equal((await run(acceptFriendRequest)).code, 200);
    });
    await t.test("already resolved requests never create a friendship", async (t) => {
        t.mock.method(mongoose.connection, "transaction", async (fn) => fn({}));
        t.mock.method(FriendRequest, "findOneAndUpdate", async () => null);
        t.mock.method(Friend, "findOneAndUpdate", async () => assert.fail("Must not create friendship"));
        assert.equal((await run(acceptFriendRequest)).code, 409);
    });
    await t.test("reject and cancel repeat role and status checks in atomic updates", async (t) => {
        let role = "recipient";
        t.mock.method(FriendRequest, "findOneAndUpdate", async (filter, update) => {
            assert.equal(filter[role], b);
            assert.equal(filter.status, "pending");
            return {status: update.$set.status};
        });
        assert.equal((await run(rejectFriendRequest)).body.request.status, "rejected");
        role = "sender";
        assert.equal((await run(cancelFriendRequest)).body.request.status, "cancelled");
    });
    await t.test("unfriend restricts deletion to the authenticated participant", async (t) => {
        t.mock.method(Friend, "deleteOne", async (filter) => {
            assert.equal(filter._id, requestId);
            assert.deepEqual(filter.$or, [{user1: b}, {user2: b}]);
            return {deletedCount: 1};
        });
        assert.equal((await run(removeFriend, {friendship: {_id: requestId}})).code, 204);
    });
    await t.test("listing rejects invalid pagination and filters", async () => {
        assert.equal((await run(getFriends, {query: {limit: 1000}})).code, 400);
        assert.equal((await run(getFriends, {query: {page: 0}})).code, 400);
        assert.equal((await run(getFriendRequests, {query: {direction: "all"}})).code, 400);
        assert.equal((await run(getFriendRequests, {query: {status: {$ne: "pending"}}})).code, 400);
    });
    await t.test("listing friends returns only the other user and uses public profile projection", async (t) => {
        const chain = {
            sort() {return this;}, skip() {return this;}, limit() {return this;},
            populate(field, projection) {assert.equal(projection.includes("hashedPassword"), false); assert.equal(projection.includes("email"), false); return this;},
            async lean() {return [{_id: requestId, user1: {_id: a, username: "moon"}, user2: {_id: b}, createdAt: new Date()}];},
        };
        t.mock.method(Friend, "find", (filter) => {assert.deepEqual(filter.$or, [{user1: b}, {user2: b}]); return chain;});
        t.mock.method(Friend, "countDocuments", async () => 1);
        const result = await run(getFriends);
        assert.equal(result.body.friends[0].user.username, "moon");
        assert.equal(result.body.total, 1);
    });
    await t.test("database errors propagate to Express", async (t) => {
        const error = new Error("database offline");
        t.mock.method(FriendRequest, "create", async () => {throw error;});
        assert.equal((await run(sendFriendRequest, {friendRequestInput: {sender: a, recipient: b}})).error, error);
    });
});
