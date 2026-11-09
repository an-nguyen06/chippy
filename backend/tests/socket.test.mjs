import {test} from "node:test";
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {once} from "node:events";
import {createRequire} from "node:module";
import jwt from "jsonwebtoken";
import User from "../src/models/user.js";
import Conversation from "../src/models/conversation.js";
import {setupSocket, publishMessage} from "../src/libs/socket.js";
const requireFrontend = createRequire(new URL("../../frontend/package.json", import.meta.url));
const {io: connect} = requireFrontend("socket.io-client");
const a = "000000000000000000000001";
const b = "000000000000000000000002";
const outsider = "000000000000000000000003";
function event(socket, name) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {socket.off(name, done); reject(new Error(`Timed out: ${name}`));}, 3000);
    function done(value) {clearTimeout(timer); resolve(value);}
    socket.once(name, done);
  });
}
test("Socket.IO authenticates users and isolates message notifications", async (t) => {
  const oldSecret = process.env.ACCESS_TOKEN_SECRET;
  process.env.ACCESS_TOKEN_SECRET = "socket-test-secret";
  t.mock.method(User, "exists", async ({_id}) => [a, b, outsider].includes(_id));
  t.mock.method(Conversation, "findById", () => ({select() {return this;}, async lean() {return {participants: [a, b]};}}));
  const server = createServer();
  const io = setupSocket(server);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const url = `http://127.0.0.1:${server.address().port}`;
  const clients = [];
  function client(token) {
    const socket = connect(url, {autoConnect: false, forceNew: true, reconnection: false, transports: ["websocket"], auth: {token}});
    clients.push(socket); return socket;
  }
  try {
    await t.test("missing and expired tokens are rejected", async () => {
      for (const token of [undefined, jwt.sign({userId: a}, process.env.ACCESS_TOKEN_SECRET, {expiresIn: -1})]) {
        const socket = client(token);
        const failure = event(socket, "connect_error");
        socket.connect();
        assert.ok(["UNAUTHORIZED", "TOKEN_EXPIRED"].includes((await failure).data.code));
      }
    });
    await t.test("only participants receive new, edited, and deleted messages", async () => {
      const sockets = [a, b, outsider].map((userId) => client(jwt.sign({userId}, process.env.ACCESS_TOKEN_SECRET, {expiresIn: 60})));
      await Promise.all(sockets.map(async (socket) => {const connected = event(socket, "connect"); socket.connect(); await connected;}));
      let leaked = false;
      sockets[2].onAny(() => {leaked = true;});
      for (const name of ["message:new", "message:updated", "message:deleted"]) {
        const received = sockets.slice(0, 2).map((socket) => event(socket, name));
        await publishMessage({app: {get: () => io}}, name, a, {messageId: b});
        for (const payload of await Promise.all(received)) assert.equal(payload.conversationId, a);
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
      assert.equal(leaked, false);
    });
  } finally {
    clients.forEach((socket) => socket.disconnect());
    await new Promise((resolve) => io.close(resolve));
    if (oldSecret === undefined) delete process.env.ACCESS_TOKEN_SECRET;
    else process.env.ACCESS_TOKEN_SECRET = oldSecret;
  }
});
