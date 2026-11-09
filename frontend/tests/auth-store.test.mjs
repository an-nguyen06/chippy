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
  store.setState({ user: null, accessToken: null, isLoading: false, isFetchingUser: false, isInitialized: false, error: null });
}

test("authentication store request and state transitions", async (t) => {
  await t.test("signing out then signing in as another user replaces the profile", async () => {
    reset();
    const other = {...user, _id: "user-2", username: "sunflower", displayName: "Sun Flower"};
    store.setState({user, accessToken: "old-token"});
    api.defaults.adapter = async (config) => {
      if (config.url === "/auth/signout") return response(config, undefined, 204);
      if (config.url === "/auth/signin") {
        assert.equal(JSON.parse(config.data).username, "sunflower");
        return response(config, {accessToken: "new-token"});
      }
      assert.equal(config.headers.Authorization, "Bearer new-token");
      return response(config, {user: other});
    };
    assert.equal(await store.getState().signOut(), true);
    assert.equal(store.getState().user, null);
    assert.equal(await store.getState().signIn({username: "sunflower", password: "test-password"}), true);
    assert.deepEqual(store.getState().user, other);
  });
  await t.test("late old-account errors cannot replay requests using the new account", async () => {
    reset();
    store.setState({user, accessToken: "old-token"});
    let release, started;
    const requestStarted = new Promise((resolve) => {started = resolve;});
    let oldAttempts = 0;
    const other = {...user, _id: "user-2", username: "sunflower"};
    api.defaults.adapter = async (config) => {
      if (config.url === "/friends/requests") {
        oldAttempts++;
        started();
        await new Promise((resolve) => {release = resolve;});
        throw new AxiosError("Expired", "ERR_BAD_REQUEST", config, {}, response(config, {}, 401));
      }
      if (config.url === "/auth/signout") return response(config, undefined, 204);
      if (config.url === "/auth/signin") return response(config, {accessToken: "new-token"});
      return response(config, {user: other});
    };
    const pending = api.post("/friends/requests", {recipientId: "friend"});
    const rejected = assert.rejects(pending);
    await requestStarted;
    await store.getState().signOut();
    await store.getState().signIn({username: "sunflower", password: "test-password"});
    release();
    await rejected;
    assert.equal(oldAttempts, 1);
    assert.equal(store.getState().user._id, "user-2");
    assert.equal(store.getState().accessToken, "new-token");
  });
  await t.test("a refresh cookie belonging to a different account cannot keep the old profile", async () => {
    reset();
    store.setState({user, accessToken: "old-token"});
    api.defaults.adapter = async (config) => response(config, {accessToken: "other-token", userId: "user-2"});
    assert.equal(await store.getState().refreshAccessToken(), false);
    assert.equal(store.getState().user, null);
    assert.equal(store.getState().accessToken, null);
    assert.match(store.getState().error, /account changed/);
  });
  await t.test("friend-request permission errors do not refresh tokens or sign out", async () => {
    reset();
    store.setState({ user, accessToken: "valid-token" });
    api.defaults.adapter = async (config) => {
      assert.equal(config.url, "/friends/requests");
      throw new AxiosError("Forbidden", "ERR_BAD_REQUEST", config, {}, response(config, {message: "This user isn't accepting new friend requests"}, 403));
    };
    await assert.rejects(api.post("/friends/requests", {recipientId: "friend"}));
    assert.equal(store.getState().accessToken, "valid-token");
    assert.deepEqual(store.getState().user, user);
  });
  await t.test("startup without a refresh session completes as a guest", async () => {
    reset();
    let requests = 0;
    api.defaults.adapter = async (config) => {
      requests++;
      throw new AxiosError("No session", "ERR_BAD_REQUEST", config, {}, response(config, {}, 401));
    };
    await store.getState().initialize();
    assert.equal(requests, 1);
    assert.equal(store.getState().isInitialized, true);
    assert.equal(store.getState().user, null);
  });
  await t.test("a refresh response arriving after signout cannot restore access", async () => {
    reset();
    store.setState({ user, accessToken: "expired" });
    let finishRefresh;
    let startedRefresh;
    const started = new Promise((resolve) => { startedRefresh = resolve; });
    api.defaults.adapter = async (config) => {
      if (config.url === "/auth/refresh") {
        startedRefresh();
        await new Promise((resolve) => { finishRefresh = resolve; });
        return response(config, { accessToken: "late-token" });
      }
      return response(config, undefined, 204);
    };
    const refreshing = store.getState().refreshAccessToken();
    await started;
    await store.getState().signOut();
    finishRefresh();
    assert.equal(await refreshing, false);
    assert.equal(store.getState().accessToken, null);
    assert.equal(store.getState().user, null);
  });
  await t.test("concurrent expired requests share refresh and retry with the new token", async () => {
    reset();
    store.setState({ user, accessToken: "expired" });
    let refreshes = 0;
    api.defaults.adapter = async (config) => {
      if (config.url === "/auth/refresh") {
        refreshes++;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return response(config, { accessToken: "renewed" });
      }
      if (config.headers.Authorization === "Bearer expired") {
        throw new AxiosError("Expired", "ERR_BAD_REQUEST", config, {}, response(config, {message: "expired/incorrent access token"}, 403));
      }
      assert.equal(config.headers.Authorization, "Bearer renewed");
      return response(config, { user });
    };
    await Promise.all([api.get("/users/me"), api.get("/users/me")]);
    assert.equal(refreshes, 1);
    assert.equal(store.getState().accessToken, "renewed");
    assert.deepEqual(store.getState().user, user);
  });
  await t.test("failed refresh clears authentication without retrying auth endpoints", async () => {
    reset();
    store.setState({ user, accessToken: "expired" });
    let refreshes = 0;
    api.defaults.adapter = async (config) => {
      if (config.url === "/auth/refresh") refreshes++;
      throw new AxiosError("Expired", "ERR_BAD_REQUEST", config, {}, response(config, {}, 401));
    };
    await assert.rejects(api.get("/users/me"));
    assert.equal(refreshes, 1);
    assert.equal(store.getState().user, null);
    assert.equal(store.getState().accessToken, null);
  });
  await t.test("a rejected retry stops rather than refreshing forever", async () => {
    reset();
    store.setState({ user, accessToken: "expired" });
    let refreshes = 0;
    let attempts = 0;
    api.defaults.adapter = async (config) => {
      if (config.url === "/auth/refresh") {
        refreshes++;
        return response(config, { accessToken: "renewed" });
      }
      attempts++;
      throw new AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, {}, response(config, {}, 401));
    };
    await assert.rejects(api.get("/users/me"));
    assert.equal(refreshes, 1);
    assert.equal(attempts, 2);
    assert.equal(store.getState().user, null);
  });
  await t.test("startup restores profile and deduplicates initialization", async () => {
    reset();
    const requests = [];
    api.defaults.adapter = async (config) => {
      requests.push(config.url);
      return response(config, config.url === "/auth/refresh" ? { accessToken: "restored" } : { user });
    };
    await Promise.all([store.getState().initialize(), store.getState().initialize()]);
    assert.deepEqual(requests, ["/auth/refresh", "/users/me"]);
    assert.equal(store.getState().isInitialized, true);
    assert.deepEqual(store.getState().user, user);
  });
  await t.test("fetchUser reads the latest token automatically and updates the profile", async () => {
    reset();
    store.setState({ accessToken: "current-token" });
    api.defaults.adapter = async (config) => {
      assert.equal(config.url, "/users/me");
      assert.equal(config.headers.Authorization, "Bearer current-token");
      assert.equal(store.getState().isFetchingUser, true);
      return response(config, { user });
    };
    assert.equal(await store.getState().fetchUser(), true);
    assert.deepEqual(store.getState().user, user);
    assert.equal(store.getState().isFetchingUser, false);
  });
  await t.test("fetchUser without a token does not send a request", async () => {
    reset();
    api.defaults.adapter = async () => { assert.fail("No anonymous profile request"); };
    assert.equal(await store.getState().fetchUser(), false);
  });
  await t.test("a late profile response cannot restore a signed-out user", async () => {
    reset();
    store.setState({ accessToken: "old-token" });
    api.defaults.adapter = async (config) => {
      store.setState({ user: null, accessToken: null });
      return response(config, { user });
    };
    assert.equal(await store.getState().fetchUser(), false);
    assert.equal(store.getState().user, null);
    assert.equal(store.getState().isFetchingUser, false);
  });
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
