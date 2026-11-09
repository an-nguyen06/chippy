import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import ts from "typescript";
const source = await readFile(new URL("../src/lib/message.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022}}).outputText;
const {mergeMessages, senderId} = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const make = (id, content, createdAt = "2026-11-09T12:00:00.000Z") => ({_id: id, content, createdAt, sender: "user-1"});
test("history pages and new messages merge once in stable chronological order", () => {
  const current = [make("b", "hello"), make("c", "newest", "2026-11-09T12:01:00.000Z")];
  const result = mergeMessages([make("a", "older"), make("b", "hello")], current, [make("b", "edited")]);
  assert.deepEqual(result.map((message) => message._id), ["a", "b", "c"]);
  assert.equal(result[1].content, "edited");
  assert.equal(current[0].content, "hello");
});
test("ownership supports populated profiles, IDs, and deleted senders", () => {
  assert.equal(senderId({sender: "user-1"}), "user-1");
  assert.equal(senderId({sender: {_id: "user-1"}}), "user-1");
  assert.equal(senderId({sender: null}), undefined);
});
