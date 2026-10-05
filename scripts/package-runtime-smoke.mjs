/* eslint-disable unicorn/no-global-object-property-assignment -- Exercise the installed SDK with mocked fetch without making network requests. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import process from "node:process";
import * as esm from "@anthonyhagi/kit-node-sdk";

const require = createRequire(import.meta.url);
const cjs = require("@anthonyhagi/kit-node-sdk");
const metadata = require("@anthonyhagi/kit-node-sdk/package.json");
assert.equal(metadata.engines.node, ">=22.0.0");

const originalFetch = fetch;
try {
  for (const [format, sdk] of [
    ["ESM", esm],
    ["CommonJS", cjs],
  ]) {
    const { Kit, ApiError, generateOAuthPKCE } = sdk;
    const kit = new Kit({ apiKey: "runtime-test-key", maxRetries: 0 });
    const expected = { colors: ["#123456"] };
    let calls = 0;
    globalThis.fetch = (url, init) => {
      calls++;
      assert.equal(new URL(url).pathname, "/v4/account/colors");
      assert.equal(init.method, "GET");
      return Promise.resolve(Response.json(expected));
    };
    assert.deepEqual(await kit.accounts.listColors(), expected);
    assert.equal(calls, 1);

    const preAborted = new AbortController();
    const reason = new Error("Cancelled runtime request");
    preAborted.abort(reason);
    await assert.rejects(
      kit.accounts.listColors({ signal: preAborted.signal }),
      (error) => error === reason
    );
    assert.equal(calls, 1);

    const controller = new AbortController();
    globalThis.fetch = (_url, init) => {
      calls++;
      assert.equal(init.signal, controller.signal);
      return new Promise((_resolve, reject) => {
        init.signal.addEventListener(
          "abort",
          () => reject(init.signal.reason),
          {
            once: true,
          }
        );
      });
    };
    const pending = assert.rejects(
      kit.accounts.listColors({ signal: controller.signal }),
      (error) => error === reason
    );
    controller.abort(reason);
    await pending;
    assert.equal(calls, 2);

    globalThis.fetch = () =>
      Promise.resolve(new Response("Unauthorized", { status: 401 }));
    await assert.rejects(kit.accounts.listColors(), ApiError);

    const notFound = { errors: ["Missing resource"] };
    globalThis.fetch = () =>
      Promise.resolve(Response.json(notFound, { status: 404 }));
    await assert.rejects(kit.accounts.listColors(), (error) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 404);
      assert.deepEqual(error.details, notFound);
      return true;
    });

    const pkce = generateOAuthPKCE();
    assert.match(pkce.code_verifier, /^[\w-]{43}$/);
    assert.equal(pkce.code_challenge_method, "S256");
    assert.match(pkce.code_challenge, /^[\w-]{43}$/);
    assert.notEqual(pkce.code_challenge, pkce.code_verifier);
    console.log(
      `${format} packed SDK checks passed on Node ${process.versions.node}`
    );
  }
} finally {
  globalThis.fetch = originalFetch;
}
