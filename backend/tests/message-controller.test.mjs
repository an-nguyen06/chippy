import {test} from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Message from "../src/models/message.js";
import Conversation from "../src/models/conversation.js";
import {getMessages, sendMessage, editMessage, deleteMessage} from "../src/controllers/messageController.js";
const userId = new mongoose.Types.ObjectId();
const conversationId = new mongoose.Types.ObjectId();
const messageId = new mongoose.Types.ObjectId();
const createdAt = new Date();
function conversationQuery(value) {return {session() {return Promise.resolve(value);}, then(resolve, reject) {return Promise.resolve(value).then(resolve, reject);}};}
async function run(handler, extra = {}) {
    const result = {};
    const req = {user: {_id: userId}, params: {conversationId, messageId}, query: {}, body: {content: " (｡•ᴗ•｡) "}, ...extra};
    const res = {status(code) {result.code = code; return this;}, json(body) {result.body = body; return this;}, sendStatus(code) {result.code = code; return this;}};
    await handler(req, res, (error) => {result.error = error;});
    return result;
}
test("message controllers", async (t) => {
    await t.test("validate authentication, identifiers, content and pagination", async () => {
        assert.equal((await run(getMessages, {user: null})).code, 401);
        assert.equal((await run(sendMessage, {params: {conversationId: "invalid"}})).code, 400);
        for (const content of [" ", "x".repeat(4001), {$ne: null}]) {
            assert.equal((await run(sendMessage, {body: {content}})).code, 400);
        }
        assert.equal((await run(getMessages, {query: {limit: 101}})).code, 400);
    });
    await t.test("nonmembers cannot read history or edit messages", async (t) => {
        t.mock.method(Conversation, "findOne", (filter) => {
            assert.equal(filter.participants, userId);
            return conversationQuery(null);
        });
        t.mock.method(Message, "findOneAndUpdate", () => assert.fail("No message mutation allowed"));
        assert.equal((await run(getMessages)).code, 404);
        assert.equal((await run(editMessage)).code, 404);
    });
    await t.test("send writes authenticated sender and last-message reference in the same transaction", async (t) => {
        const session = {};
        t.mock.method(mongoose.connection, "transaction", async (fn) => fn(session));
        t.mock.method(Conversation, "findOne", () => conversationQuery({_id: conversationId}));
        t.mock.method(Message, "create", async ([input], options) => {
            assert.deepEqual(input, {conversation: conversationId, sender: userId, content: "(｡•ᴗ•｡)"});
            assert.equal(options.session, session);
            return [{_id: messageId, createdAt, ...input}];
        });
        t.mock.method(Conversation, "updateOne", async (filter, update, options) => {
            assert.equal(options.session, session);
            assert.equal(update.$set.lastMessage, messageId);
            assert.equal(update.$set.lastMessageAt, createdAt);
        });
        assert.equal((await run(sendMessage)).code, 201);
    });
    await t.test("edit restricts update to the sender within the requested conversation", async (t) => {
        t.mock.method(Conversation, "findOne", () => conversationQuery({_id: conversationId}));
        t.mock.method(Message, "findOneAndUpdate", async (filter) => {
            assert.deepEqual(filter, {_id: messageId, conversation: conversationId, sender: userId});
            return null;
        });
        assert.equal((await run(editMessage)).code, 404);
    });
    await t.test("history returns stable cursor with public sender data", async (t) => {
        t.mock.method(Conversation, "findOne", () => conversationQuery({_id: conversationId}));
        const cursorDate = new Date();
        t.mock.method(Message, "findOne", async (filter) => {
            assert.equal(filter.conversation, conversationId);
            return {_id: messageId, createdAt: cursorDate};
        });
        t.mock.method(Message, "find", (filter) => {
            assert.equal(filter.$or[1].createdAt, cursorDate);
            assert.equal(filter.$or[1]._id.$lt, messageId);
            return {
                sort(value) {assert.deepEqual(value, {createdAt: -1, _id: -1}); return this;},
                limit(value) {assert.equal(value, 2); return this;},
                populate(field, select) {assert.equal(field, "sender"); assert.equal(select, "username displayName avatarUrl"); return this;},
                async lean() {return [{_id: messageId}, {_id: new mongoose.Types.ObjectId()}];},
            };
        });
        const result = await run(getMessages, {query: {limit: 1, before: messageId}});
        assert.equal(result.body.messages.length, 1);
        assert.equal(result.body.hasMore, true);
        assert.equal(result.body.nextCursor, String(messageId));
    });
    await t.test("deleting the last message clears an empty conversation preview", async (t) => {
        const session = {};
        t.mock.method(mongoose.connection, "transaction", async (fn) => fn(session));
        t.mock.method(Conversation, "findOne", () => conversationQuery({_id: conversationId, lastMessage: messageId, lastMessageAt: createdAt}));
        t.mock.method(Message, "findOneAndDelete", async (filter, options) => {
            assert.equal(filter.sender, userId);
            assert.equal(options.session, session);
            return {_id: messageId};
        });
        t.mock.method(Message, "findOne", () => ({sort() {return this;}, async session() {return null;}}));
        t.mock.method(Conversation, "updateOne", async (filter, update, options) => {
            assert.deepEqual(update.$set, {lastMessage: null, lastMessageAt: null});
            assert.equal(options.session, session);
        });
        assert.equal((await run(deleteMessage)).code, 204);
    });
});
