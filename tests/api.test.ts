import assert from "node:assert/strict";
import test from "node:test";
import { ApiError, OpenverseClient } from "../src/lib/api.ts";
import { defaultForm } from "../src/lib/model.ts";
const id = "eab8a6e2-0ac8-4615-9e0d-ebde30523783";
test("GET requests are anonymous, deduplicated and cached", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (_url, init) => {
    calls++; assert.equal(init?.credentials, "omit"); assert.equal(new Headers(init?.headers).has("Authorization"), false);
    return Response.json({ id, license: "cc0" });
  };
  try { const client = new OpenverseClient(); await Promise.all([client.details(id), client.details(id)]); await client.details(id); assert.equal(calls, 1); await client.details(id, true); assert.equal(calls, 2); }
  finally { globalThis.fetch = original; }
});
test("429 honors Retry-After and blocks repeated requests without another fetch", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json({}, { status: 429, headers: { "Retry-After": "60" } }); };
  try {
    const client = new OpenverseClient();
    await assert.rejects(client.details(id), (e: unknown) => e instanceof ApiError && e.status === 429 && e.retryAt > Date.now());
    await assert.rejects(client.sources(), (e: unknown) => e instanceof ApiError && e.status === 429);
    assert.equal(calls, 1);
  } finally { globalThis.fetch = original; }
});
test("malformed pagination is rejected and error responses keep useful detail", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ results: [], page: 1, page_size: 20, page_count: "bad", result_count: 0 });
  try {
    await assert.rejects(new OpenverseClient().search({ form: { ...defaultForm, query: "rain" }, page: 1 }), /Unexpected search/);
    globalThis.fetch = async () => Response.json({ detail: { unstable__include_sensitive_results: ["Content flags must not both be defined."] } }, { status: 400 });
    await assert.rejects(new OpenverseClient().details(id), /Content flags must not both be defined/);
  }
  finally { globalThis.fetch = original; }
});
test("reports use the matching identifier and enforce reason/description constraints", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (_url, init) => { assert.equal(init?.method, "POST"); assert.deepEqual(JSON.parse(String(init?.body)), { identifier: id, reason: "other", description: "Unavailable file" }); return Response.json({}, { status: 201 }); };
  try {
    const client = new OpenverseClient(); await client.report(id, "other", "Unavailable file");
    await assert.rejects(client.report(id, "other", "a".repeat(501)), /Invalid report/);
    await assert.rejects(client.details("../../other"), /identifier/);
  } finally { globalThis.fetch = original; }
});
