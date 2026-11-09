import { test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Friend from "../src/models/friend.js";
import FriendRequest from "../src/models/friend-request.js";
import Conversation from "../src/models/conversation.js";
import Message from "../src/models/message.js";

const a = new mongoose.Types.ObjectId("000000000000000000000001");
const b = new mongoose.Types.ObjectId("000000000000000000000002");
const c = new mongoose.Types.ObjectId("000000000000000000000003");

test("friendship canonicalizes pairs and rejects self friendship", async () => {
    const friend = new Friend({user1: b, user2: a});
    await friend.validate();
    assert.equal(String(friend.user1), String(a));
    assert.equal(String(friend.user2), String(b));
    await assert.rejects(new Friend({user1: a, user2: a}).validate(), /yourself/);
    await assert.rejects(new Friend({user1: a}).validate(), /user2/);
});

test("requests retain direction while deriving the same pair key", async () => {
    const forward = new FriendRequest({sender: a, recipient: b});
    const reverse = new FriendRequest({sender: b, recipient: a});
    await Promise.all([forward.validate(), reverse.validate()]);
    assert.equal(forward.pairKey, reverse.pairKey);
    assert.equal(String(reverse.sender), String(b));
    assert.equal(forward.status, "pending");
    await assert.rejects(new FriendRequest({sender: a, recipient: a}).validate(), /yourself/);
    await assert.rejects(new FriendRequest({sender: a, recipient: b, status: "unknown"}).validate(), /status/);
});

test("direct chats require exactly two unique users and a participating creator", async () => {
    const chat = new Conversation({participants: [b, a], createdBy: a});
    await chat.validate();
    assert.equal(chat.directKey, `${a}:${b}`);
    await assert.rejects(new Conversation({participants: [a, a], createdBy: a}).validate(), /distinct/);
    await assert.rejects(new Conversation({participants: [a, b, c], createdBy: a}).validate(), /exactly two/);
    await assert.rejects(new Conversation({participants: [a, b], createdBy: c}).validate(), /creator/);
});

test("groups need a name, permit multiple users, and have no direct key", async () => {
    const chat = new Conversation({type: "group", name: "  Fairy circle  ", participants: [a, b, c], createdBy: a, directKey: "untrusted"});
    await chat.validate();
    assert.equal(chat.name, "Fairy circle");
    assert.equal(chat.directKey, undefined);
    await assert.rejects(new Conversation({type: "group", participants: [a, b], createdBy: a}).validate(), /name/);
    await assert.rejects(new Conversation({type: "group", name: "circle", participants: [a], createdBy: a}).validate(), /distinct/);
});

test("messages preserve kaomoji and reject empty, oversized, or unlinked content", async () => {
    const message = new Message({conversation: c, sender: a, content: "  (づ｡•ᴗ•｡)づ ♡  "});
    await message.validate();
    assert.equal(message.content, "(づ｡•ᴗ•｡)づ ♡");
    for (const content of ["", "   ", "x".repeat(4001)]) {
        await assert.rejects(new Message({conversation: c, sender: a, content}).validate());
    }
    await assert.rejects(new Message({content: "hello"}).validate(), /conversation|sender/);
});

test("indexes enforce unique pairs and support conversation history", () => {
    assert.ok(Friend.schema.indexes().some(([keys, options]) => keys.user1 && keys.user2 && options.unique));
    assert.ok(FriendRequest.schema.indexes().some(([keys, options]) => keys.pairKey && options.unique && options.partialFilterExpression.status === "pending"));
    assert.ok(Conversation.schema.indexes().some(([keys, options]) => keys.directKey && options.unique && options.partialFilterExpression.type === "direct"));
    assert.ok(Message.schema.indexes().some(([keys]) => keys.conversation && keys.createdAt === -1 && keys._id === -1));
});
