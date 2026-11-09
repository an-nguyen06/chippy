import {test} from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Conversation from "../src/models/conversation.js";
import Friend from "../src/models/friend.js";
import User from "../src/models/user.js";
import {createConversation, getConversation, getConversations, updateConversation} from "../src/controllers/conversationController.js";
const a = new mongoose.Types.ObjectId();
const b = new mongoose.Types.ObjectId();
const c = new mongoose.Types.ObjectId();
async function run(handler, extra = {}) {
    const result = {};
    const req = {user: {_id: a}, params: {conversationId: c}, body: {participantIds: [String(b)]}, query: {}, ...extra};
    const res = {status(code) {result.code = code; return this;}, json(body) {result.body = body; return this;}};
    await handler(req, res, (error) => {result.error = error;});
    return result;
}

test("conversation controllers", async (t) => {
    await t.test("rejects unauthenticated, invalid, duplicate and self participants", async () => {
        assert.equal((await run(createConversation, {user: null})).code, 401);
        for (const participantIds of [[String(a)], [String(b), String(b)], [{$ne: null}], []]) {
            assert.equal((await run(createConversation, {body: {participantIds}})).code, 400);
        }
        assert.equal((await run(getConversations, {query: {limit: 101}})).code, 400);
    });
    await t.test("reuses an existing direct conversation", async (t) => {
        t.mock.method(Conversation, "findOne", async (filter) => {
            assert.equal(filter.directKey, [String(a), String(b)].sort().join(":"));
            return {_id: c};
        });
        assert.equal((await run(createConversation)).code, 200);
    });
    await t.test("new chats require existing users and friendships", async (t) => {
        t.mock.method(Conversation, "findOne", async () => null);
        let users = 0, friends = 0;
        t.mock.method(User, "countDocuments", async () => users);
        t.mock.method(Friend, "countDocuments", async () => friends);
        assert.equal((await run(createConversation)).code, 404);
        users = 1;
        assert.equal((await run(createConversation)).code, 403);
        friends = 1;
        t.mock.method(Conversation, "create", async (input) => {
            assert.equal(input.createdBy, a);
            assert.deepEqual(input.participants, [String(a), String(b)]);
            assert.equal(input.type, "direct");
            return {_id: c, ...input};
        });
        assert.equal((await run(createConversation)).code, 201);
    });
    await t.test("duplicate creation race returns the winning thread", async (t) => {
        let lookups = 0;
        t.mock.method(Conversation, "findOne", async () => ++lookups === 1 ? null : {_id: c});
        t.mock.method(User, "countDocuments", async () => 1);
        t.mock.method(Friend, "countDocuments", async () => 1);
        t.mock.method(Conversation, "create", async () => {throw {code: 11000};});
        assert.equal((await run(createConversation)).code, 200);
    });
    await t.test("viewing is restricted to members and populates public profiles", async (t) => {
        t.mock.method(Conversation, "findOne", (filter) => {
            assert.equal(filter.participants, a);
            return {populate() {return this;}, async lean() {return null;}};
        });
        assert.equal((await run(getConversation)).code, 404);
    });
    await t.test("renaming requires group creator and ignores other supplied fields", async (t) => {
        t.mock.method(Conversation, "findOneAndUpdate", async (filter, update) => {
            assert.equal(filter.createdBy, a);
            assert.equal(filter.participants, a);
            assert.equal(filter.type, "group");
            assert.deepEqual(update, {$set: {name: "Fairy circle"}});
            return {_id: c, name: "Fairy circle"};
        });
        assert.equal((await run(updateConversation, {body: {name: " Fairy circle ", createdBy: b}})).code, 200);
    });
});
