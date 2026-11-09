import { readFile } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import { AxiosError } from "axios";

// Compile the actual TypeScript modules in memory; no test runner dependency needed.
function moduleUrl(source) {
  return `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText).toString("base64")}`;
}
const apiSource = (await readFile(new URL("../src/lib/api.ts", import.meta.url), "utf8"))
  .replace('"axios"', JSON.stringify(import.meta.resolve("axios")));
const apiUrl = moduleUrl(apiSource);
const { api } = await import(apiUrl);
const storeSource = (await readFile(new URL("../src/stores/auth-store.ts", import.meta.url), "utf8"))
  .replace('"zustand"', JSON.stringify(import.meta.resolve("zustand")))
  .replace('"@/lib/api"', JSON.stringify(apiUrl));
const { useAuthStore: store } = await import(moduleUrl(storeSource));
const user = { _id: "user-1", username: "moonflower", email: "moon@example.com", displayName: "Moon Flower" };
const credentials = { username: "moonflower", password: "test-password" };
const response = (config, data, status = 200) => ({ config, data, status, statusText: "", headers: {} });
function reset() {
  store.setState({ user: null, accessToken: null, isLoading: false, error: null });
}

test("authentication store request and state transitions", async (t) => {
  await t.test("signup sends required fields without signing the user in", async () => {
    reset();
    const values = { ...credentials, email: user.email, firstName: "Moon", lastName: "Flower" };
    api.defaults.adapter = async (config) => {
      assert.equal(config.url, "/auth/signup");
      assert.deepEqual(JSON.parse(config.data), values);
      assert.equal(store.getState().isLoading, true);
      return response(config, undefined, 204);
    };
    assert.equal(await store.getState().signUp(values), true);
    assert.equal(store.getState().user, null);
    assert.equal(store.getState().isLoading, false);
  });
  await t.test("signin fetches the profile using the returned access token", async () => {
    reset();
    const requests = [];
    api.defaults.adapter = async (config) => {
      requests.push(config.url);
      if (config.url === "/auth/signin") {
        assert.deepEqual(JSON.parse(config.data), credentials);
        return response(config, { accessToken: "test-token" });
      }
      assert.equal(config.headers.Authorization, "Bearer test-token");
      return response(config, { user });
    };
    assert.equal(await store.getState().signIn(credentials), true);
    assert.deepEqual(requests, ["/auth/signin", "/users/me"]);
    assert.deepEqual(store.getState().user, user);
    assert.equal(store.getState().accessToken, "test-token");
    assert.equal(store.getState().isLoading, false);
  });
  await t.test("server errors surface and failed profile loading never authenticates", async () => {
    reset();
    api.defaults.adapter = async (config) => {
      if (config.url === "/auth/signin") return response(config, { accessToken: "test-token" });
      throw new AxiosError("Forbidden", "ERR_BAD_REQUEST", config, {}, response(config, { message: "Session expired" }, 403));
    };
    assert.equal(await store.getState().signIn(credentials), false);
    assert.equal(store.getState().error, "Session expired");
    assert.equal(store.getState().user, null);
    assert.equal(store.getState().accessToken, null);
    assert.equal(store.getState().isLoading, false);
  });
  await t.test("network failure clears loading and can be dismissed", async () => {
    reset();
    api.defaults.adapter = async (config) => { throw new AxiosError("Network Error", "ERR_NETWORK", config); };
    assert.equal(await store.getState().signIn(credentials), false);
    assert.match(store.getState().error, /Can't reach Chippy/);
    assert.equal(store.getState().isLoading, false);
    store.getState().clearError();
    assert.equal(store.getState().error, null);
  });
  await t.test("concurrent submissions are ignored", async () => {
    reset();
    store.setState({ isLoading: true });
    api.defaults.adapter = async () => { assert.fail("Must not send another request"); };
    assert.equal(await store.getState().signIn(credentials), false);
  });
  await t.test("signout sends credentials and clears session state", async () => {
    reset();
    store.setState({ user, accessToken: "test-token" });
    api.defaults.adapter = async (config) => {
      assert.equal(config.url, "/auth/signout");
      assert.equal(config.withCredentials, true);
      assert.equal(config.headers.Authorization, "Bearer test-token");
      return response(config, undefined, 204);
    };
    assert.equal(await store.getState().signOut(), true);
    assert.equal(store.getState().user, null);
    assert.equal(store.getState().accessToken, null);
  });
  await t.test("failed signout keeps session available for retry", async () => {
    reset();
    store.setState({ user, accessToken: "test-token" });
    api.defaults.adapter = async (config) => { throw new AxiosError("Network Error", "ERR_NETWORK", config); };
    assert.equal(await store.getState().signOut(), false);
    assert.deepEqual(store.getState().user, user);
    assert.equal(store.getState().isLoading, false);
  });
});
