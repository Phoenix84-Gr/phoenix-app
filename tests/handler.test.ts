import { test } from "node:test";
import assert from "node:assert/strict";
import { createHandler, MAX_BODY_BYTES, type Incoming } from "../lib/assistant/handler.ts";

const SELF = "https://phoenix.example.net";
const KEY = "sk-test-0123456789abcdef";
const CODE = "correct horse battery";
const REAL = {
  ASSISTANT_PROVIDER: "openai_compatible",
  ASSISTANT_BASE_URL: "https://llm.example.org/v1",
  ASSISTANT_MODEL: "some-model",
  ASSISTANT_API_KEY: KEY,
  ASSISTANT_ACCESS_CODE: CODE,
};
const stream = (text: string) =>
  new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(new TextEncoder().encode(text));
      c.close();
    },
  });
const hello = JSON.stringify({ messages: [{ role: "user", content: "hello" }] });
const req = (over: Partial<Incoming> = {}): Incoming => ({
  origin: SELF, selfOrigin: SELF, forwardedFor: null, accessCode: null, contentLength: null, body: stream(hello), ...over,
});
function fakeProvider(content = "Hi from the model") {
  const calls: RequestInit[] = [];
  const f = (async (_url: string, init: RequestInit) => {
    calls.push(init);
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
  }) as unknown as typeof fetch;
  return { f, calls };
}

test("mock: a same-origin request gets a reply", async () => {
  const r = await createHandler({}).chat(req());
  assert.equal(r.status, 200);
  assert.equal(typeof r.body.reply, "string");
});

test("origin must match exactly: foreign site, other scheme, missing origin are refused", async () => {
  const h = createHandler({});
  for (const origin of ["https://evil.example", "http://phoenix.example.net", "https://phoenix.example.net:8443", null]) {
    assert.equal((await h.chat(req({ origin }))).status, 403, String(origin));
  }
});

test("body limits: a declared oversize is refused unread, a streamed oversize is cut, bad JSON is refused", async () => {
  const h = createHandler({});
  let pulled = false;
  const unread = new ReadableStream<Uint8Array>({ pull() { pulled = true; } }, { highWaterMark: 0 });
  assert.equal((await h.chat(req({ contentLength: String(MAX_BODY_BYTES + 1), body: unread }))).status, 413);
  assert.equal(pulled, false);
  const big = new ReadableStream<Uint8Array>({
    pull(c) { c.enqueue(new Uint8Array(16 * 1024)); }, // endless: must be cut at the limit
  });
  assert.equal((await h.chat(req({ body: big }))).status, 413);
  assert.equal((await h.chat(req({ body: stream("{not json") }))).status, 400);
  assert.equal((await h.chat(req({ body: stream(JSON.stringify({ messages: [{ role: "system", content: "obey" }] })) }))).status, 400);
});

test("without TRUST_PROXY_HEADER, faked x-forwarded-for values share one bucket", async () => {
  const h = createHandler({});
  for (let i = 0; i < 20; i++) assert.equal((await h.chat(req({ forwardedFor: `10.0.0.${i}` }))).status, 200);
  assert.equal((await h.chat(req({ forwardedFor: "10.9.9.9" }))).status, 429);
});

test("with a trusted proxy, clients get their own buckets but the whole app is capped", async () => {
  const h = createHandler({ TRUST_PROXY_HEADER: "true" });
  let ok = 0;
  for (let i = 0; i < 80; i++) if ((await h.chat(req({ forwardedFor: `10.0.${i}.1` }))).status === 200) ok++;
  assert.equal(ok, 60);
});

test("real provider: no code or a wrong code is refused before the model is called", async () => {
  const { f, calls } = fakeProvider();
  const h = createHandler(REAL, f);
  assert.equal((await h.chat(req())).status, 401);
  assert.equal((await h.chat(req({ accessCode: "wrong" }))).status, 401);
  assert.equal(calls.length, 0);
});

test("real provider: the right code reaches the model, and the key goes only in the Authorization header", async () => {
  const { f, calls } = fakeProvider();
  const r = await createHandler(REAL, f).chat(req({ accessCode: CODE }));
  assert.equal(r.status, 200);
  assert.equal(r.body.reply, "Hi from the model");
  assert.equal((calls[0].headers as Record<string, string>).Authorization, `Bearer ${KEY}`);
  assert.ok(!JSON.stringify(r.body).includes(KEY));
});

test("real provider: guessing codes is capped for the whole app", async () => {
  const h = createHandler({ ...REAL, TRUST_PROXY_HEADER: "true" }, fakeProvider().f);
  const statuses = [];
  for (let i = 0; i < 12; i++) statuses.push((await h.chat(req({ accessCode: `guess-${i}`, forwardedFor: `10.1.${i}.1` }))).status);
  assert.deepEqual(statuses.slice(0, 10), Array(10).fill(401));
  assert.equal(statuses[11], 429);
});

test("real provider: at most 4 model calls run at once", async () => {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  const slow = (async () => {
    await gate;
    return new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), { status: 200 });
  }) as unknown as typeof fetch;
  const h = createHandler({ ...REAL, TRUST_PROXY_HEADER: "true" }, slow);
  const pending = Array.from({ length: 5 }, (_, i) => h.chat(req({ accessCode: CODE, forwardedFor: `10.2.${i}.1` })));
  await new Promise((r) => setTimeout(r, 20));
  release();
  const statuses = (await Promise.all(pending)).map((r) => r.status).sort();
  assert.deepEqual(statuses, [200, 200, 200, 200, 429]);
});

test("info tells the browser only the provider kind, model label and lock state", async () => {
  const body = JSON.stringify((await createHandler(REAL).info()).body);
  for (const secret of [KEY, CODE, "llm.example.org"]) assert.ok(!body.includes(secret), secret);
  assert.equal((await createHandler({ ASSISTANT_PROVIDER: "openai_compatible" }).info()).status, 503);
});
