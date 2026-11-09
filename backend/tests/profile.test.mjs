import {test} from "node:test";
import assert from "node:assert/strict";
import User from "../src/models/user.js";
import {updateProfile} from "../src/controllers/userController.js";
import {canSendFriendRequest} from "../src/middlewares/friendMiddleware.js";
const userId = "000000000000000000000001";
async function run(body, handler = updateProfile, extra = {}) {
  const result = {};
  const req = {user: {_id: userId}, body, ...extra};
  const res = {status(code) {result.code = code; return this;}, json(data) {result.data = data; return this;}};
  await handler(req, res, (error) => {result.error = error;});
  return result;
}
test("profile updates and privacy", async (t) => {
  await t.test("rejects protected fields, injected objects and unsupported values", async () => {
    for (const body of [{hashedPassword: "bad"}, {role: "admin"}, {displayName: {$set: "bad"}}, {privacy: {allowFriendRequests: "false"}}, {preferences: {unknown: true}}, {bio: "x".repeat(501)}, {avatarUrl: "javascript:alert(1)"}, {}]) {
      assert.equal((await run(body)).code, 400);
    }
    assert.equal((await run({bio: "hello"}, updateProfile, {user: null})).code, 401);
  });
  await t.test("saves only permitted properties for the authenticated user", async (t) => {
    t.mock.method(User, "findByIdAndUpdate", (id, update, options) => {
      assert.equal(id, userId);
      assert.deepEqual(update, {$set: {displayName: "Moon", "preferences.compactMode": true, "privacy.allowFriendRequests": false}});
      assert.equal(options.runValidators, true);
      return {select: async (projection) => {assert.equal(projection, "-hashedPassword"); return {_id: userId, displayName: "Moon"};}};
    });
    assert.equal((await run({displayName: " Moon ", preferences: {compactMode: true}, privacy: {allowFriendRequests: false}})).code, 200);
  });
  await t.test("avatars require actual image signatures, not just data URL labels", async () => {
    assert.equal((await run({avatarUrl: "data:image/png;base64,YWJjZA=="})).code, 400);
    assert.equal((await run({avatarUrl: "data:image/png;base64," + "A".repeat(65540)})).code, 400);
  });
  await t.test("privacy blocks new requests", async (t) => {
    t.mock.method(User, "exists", async () => true);
    assert.equal((await run({recipientId: "000000000000000000000002"}, canSendFriendRequest)).code, 403);
  });
});
