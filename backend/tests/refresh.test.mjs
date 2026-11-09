import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const dataUrl = (text) => `data:text/javascript;base64,${Buffer.from(text).toString('base64')}`;
const mocks = { session: null, userExists: true, filter: null };
globalThis.__refreshTest = mocks;
let source = await readFile(new URL('../src/controllers/authController.js', import.meta.url), 'utf8');
source = source.replace('"../models/user.js"', JSON.stringify(dataUrl('export default {exists: async () => globalThis.__refreshTest.userExists};')))
  .replace('"../models/session.js"', JSON.stringify(dataUrl('export default {findOne: async (filter) => {globalThis.__refreshTest.filter = filter; return globalThis.__refreshTest.session;}};')))
  .replace('"bcrypt"', JSON.stringify(pathToFileURL(require.resolve('bcrypt')).href))
  .replace("'jsonwebtoken'", JSON.stringify(pathToFileURL(require.resolve('jsonwebtoken')).href));
const { refreshAccessToken } = await import(dataUrl(source));
const jwt = require('jsonwebtoken');
const previousSecret = process.env.ACCESS_TOKEN_SECRET;
process.env.ACCESS_TOKEN_SECRET = 'refresh-test-only-secret';
function res() {
  return { code: 0, body: null, cleared: false, headers: {},
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
    clearCookie() { this.cleared = true; return this; },
    set(name, value) { this.headers[name] = value; return this; },
  };
}
test('refresh endpoint validates cookie, expiry, and session user', async (t) => {
  try {
    await t.test('missing cookie is unauthorized', async () => {
      const response = res();
      await refreshAccessToken({cookies: {}}, response);
      assert.equal(response.code, 401);
    });
    await t.test('expired or revoked session is unauthorized and clears cookie', async () => {
      mocks.session = null;
      const response = res();
      await refreshAccessToken({cookies: {refreshToken: 'old'}}, response);
      assert.equal(response.code, 401);
      assert.equal(response.cleared, true);
      assert.equal(mocks.filter.refreshToken, 'old');
      assert.ok(mocks.filter.expiresAt.$gt instanceof Date);
    });
    await t.test('deleted user cannot refresh', async () => {
      mocks.session = {userId: 'user-1'};
      mocks.userExists = false;
      const response = res();
      await refreshAccessToken({cookies: {refreshToken: 'valid'}}, response);
      assert.equal(response.code, 401);
    });
    await t.test('valid session issues a verifiable access token without exposing refresh token', async () => {
      mocks.session = {userId: 'user-1'};
      mocks.userExists = true;
      const response = res();
      await refreshAccessToken({cookies: {refreshToken: 'valid'}}, response);
      assert.equal(response.code, 200);
      const claims = jwt.verify(response.body.accessToken, process.env.ACCESS_TOKEN_SECRET);
      assert.equal(claims.userId, 'user-1');
      assert.equal(claims.exp - claims.iat, 30 * 60);
      assert.deepEqual(Object.keys(response.body), ['accessToken', 'userId']);
      assert.equal(response.body.userId, 'user-1');
      assert.equal(response.headers['Cache-Control'], 'no-store');
    });
  } finally {
    if (previousSecret === undefined) delete process.env.ACCESS_TOKEN_SECRET;
    else process.env.ACCESS_TOKEN_SECRET = previousSecret;
    delete globalThis.__refreshTest;
  }
});
