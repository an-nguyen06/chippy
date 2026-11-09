import {test} from "node:test";
import assert from "node:assert/strict";
import Kaomoji from "../src/models/kaomoji.js";
import {getKaomoji, getKaomojiCategories} from "../src/controllers/kaomojiController.js";
async function run(handler, query = {}) {
    const result = {};
    const res = {status(code) {result.code = code; return this;}, json(data) {result.data = data; return this;}};
    await handler({query}, res, (error) => {result.error = error;});
    return result;
}
test("kaomoji API validates and safely searches the imported dataset", async (t) => {
    await t.test("rejects invalid query values", async () => {
        for (const query of [{search: {$ne: ""}}, {limit: 101}, {page: 0}, {search: "a".repeat(81)}]) assert.equal((await run(getKaomoji, query)).code, 400);
    });
    await t.test("escapes literal kaomoji regex symbols and paginates", async (t) => {
        t.mock.method(Kaomoji, "find", (filter) => {
            assert.equal(filter.categories, "cat");
            assert.equal(filter.$or[0].text.$regex, "\\(\\*\\^\\.\\^\\*\\)");
            return {sort() {return this;}, skip(value) {assert.equal(value, 20); return this;}, limit(value) {assert.equal(value, 20); return this;}, select() {return this;}, async lean() {return [{text: "(*^.^*)"}];}};
        });
        t.mock.method(Kaomoji, "countDocuments", async () => 42);
        const result = await run(getKaomoji, {search: "(*^.^*)", category: "CAT", page: 2, limit: 20});
        assert.equal(result.data.total, 42);
        assert.equal(result.data.items[0].text, "(*^.^*)");
    });
    await t.test("categories return counts from manual tags", async (t) => {
        t.mock.method(Kaomoji, "aggregate", async (pipeline) => {assert.equal(pipeline[0].$unwind, "$categories"); return [{name: "cat", count: 10}];});
        assert.equal((await run(getKaomojiCategories)).data.categories[0].name, "cat");
    });
});
