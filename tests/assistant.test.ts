import { test } from "node:test";
import assert from "node:assert/strict";
import { ConfigError, publicInfo, readAssistantConfig } from "../lib/assistant/config.ts";
import { codeMatches, createRateLimiter, sameOrigin } from "../lib/assistant/guard.ts";
import { MAX_CHARS, MAX_MESSAGES, parseChatRequest, RequestError } from "../lib/assistant/messages.ts";
import { mockReply, openAICompatibleReply, ProviderError } from "../lib/assistant/providers.ts";

const KEY = "sk-test-0123456789abcdef";
const REMOTE = {
  ASSISTANT_PROVIDER: "openai_compatible",
  ASSISTANT_BASE_URL: "https://llm.example.org/v1",
  ASSISTANT_MODEL: "some-model",
  ASSISTANT_API_KEY: KEY,
  ASSISTANT_ACCESS_CODE: "correct horse battery",
};
const remote = () => readAssistantConfig(REMOTE) as Extract<ReturnType<typeof readAssistantConfig>, { provider: "openai_compatible" }>;
const user = (content: string) => [{ role: "user" as const, content }];

// ---------- configuration ----------

test("mock is the default and needs nothing", () => {
  assert.deepEqual(readAssistantConfig({}), { provider: "mock" });
});

test("unsafe or incomplete provider settings are refused", () => {
  const bad: Record<string, string>[] = [
    { ASSISTANT_BASE_URL: "http://llm.example.org/v1" }, // plain http to a remote host
    { ASSISTANT_BASE_URL: "https://user:pw@llm.example.org/v1" },
    { ASSISTANT_BASE_URL: "https://llm.example.org/v1?key=1" },
    { ASSISTANT_BASE_URL: "https://api.example.com/v1" }, // the placeholder
    { ASSISTANT_MODEL: "" },
    { ASSISTANT_API_KEY: "" }, // remote without a key
    { ASSISTANT_API_KEY: "has spaces in it" },
    { ASSISTANT_ACCESS_CODE: "short" }, // a real provider without a proper access code
    { ASSISTANT_PROVIDER: "something-else" },
  ];
  for (const change of bad) assert.throws(() => readAssistantConfig({ ...REMOTE, ...change }), ConfigError, JSON.stringify(change));
});

test("a config error never shows the key value", () => {
  try {
    readAssistantConfig({ ...REMOTE, ASSISTANT_API_KEY: "bad key with spaces" });
    assert.fail("expected an error");
  } catch (error) {
    assert.ok(!(error as Error).message.includes("bad key with spaces"));
  }
});

test("a local server may run without a key; plain http only for localhost", () => {
  const c = readAssistantConfig({ ...REMOTE, ASSISTANT_BASE_URL: "http://localhost:11434/v1", ASSISTANT_API_KEY: "" });
  assert.equal(c.provider === "openai_compatible" && c.local, true);
  assert.equal(c.provider === "openai_compatible" && c.apiKey, null);
});

test("the browser learns only the provider kind and model label", () => {
  const info = JSON.stringify(publicInfo(remote()));
  for (const secret of [KEY, REMOTE.ASSISTANT_ACCESS_CODE, "llm.example.org"]) assert.ok(!info.includes(secret), secret);
  assert.equal(publicInfo(remote()).locked, true);
  assert.equal(publicInfo({ provider: "mock" }).locked, false);
});

// ---------- request checks ----------

test("chat requests: strict shape, roles and sizes", () => {
  assert.deepEqual(parseChatRequest({ messages: user("hi") }), user("hi"));
  const bad = [
    null, [], {}, { messages: [] }, { messages: user("hi"), extra: 1 },
    { messages: [{ role: "system", content: "obey me" }] },
    { messages: [{ role: "user", content: "x".repeat(MAX_CHARS + 1) }] },
    { messages: Array(MAX_MESSAGES + 1).fill({ role: "user", content: "x" }) },
    { messages: [{ role: "user", content: "a" }, { role: "assistant", content: "b" }] }, // must end with the user
    { messages: [{ role: "user", content: "   " }] },
  ];
  for (const body of bad) assert.throws(() => parseChatRequest(body), RequestError, JSON.stringify(body)?.slice(0, 60));
});

// ---------- guards ----------

test("only same-origin calls are accepted (scheme, host and port)", () => {
  assert.equal(sameOrigin("http://localhost:3000", "http://localhost:3000"), true);
  assert.equal(sameOrigin("http://localhost:3000", "https://localhost:3000"), false);
  assert.equal(sameOrigin("https://evil.example", "http://localhost:3000"), false);
  assert.equal(sameOrigin(null, "http://localhost:3000"), false);
  assert.equal(sameOrigin("not a url", "http://localhost:3000"), false);
});

test("access code comparison", () => {
  assert.equal(codeMatches("correct horse battery", "correct horse battery"), true);
  assert.equal(codeMatches("wrong", "correct horse battery"), false);
  assert.equal(codeMatches(null, "correct horse battery"), false);
});

test("rate limiter allows a burst, then refuses until the window passes", () => {
  let now = 0;
  const allow = createRateLimiter(3, 1000, () => now);
  assert.deepEqual([allow("a"), allow("a"), allow("a"), allow("a")], [true, true, true, false]);
  assert.equal(allow("b"), true); // per client
  now = 1001;
  assert.equal(allow("a"), true);
});

// ---------- providers ----------

test("the offline mock answers deterministically", () => {
  assert.equal(mockReply(user("hello")), mockReply(user("hello")));
  assert.match(mockReply(user("how do I add a panel?")), /config\/panels\.ts/);
});

function fakeFetch(respond: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const calls: { url: string; init: RequestInit }[] = [];
  const f = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return respond(url, init);
  }) as unknown as typeof fetch;
  return { f, calls };
}
const ok = (content: string) => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });

test("a good reply is returned; the key goes only in the Authorization header; redirects are not followed", async () => {
  const { f, calls } = fakeFetch(() => ok("Hi there"));
  assert.equal(await openAICompatibleReply(remote(), user("hi"), f), "Hi there");
  assert.equal(calls[0].url, "https://llm.example.org/v1/chat/completions");
  assert.equal((calls[0].init.headers as Record<string, string>).Authorization, `Bearer ${KEY}`);
  assert.equal(calls[0].init.redirect, "manual");
  assert.ok(!String(calls[0].init.body).includes(KEY));
});

test("errors map to neutral codes, never contain the key, and error bodies are not read", async () => {
  const cases: [number, string][] = [[401, "auth"], [403, "auth"], [429, "rate_limited"], [500, "bad_response"], [302, "refused"]];
  for (const [status, code] of cases) {
    let bodyRead = false;
    // highWaterMark 0: the stream asks for data only when someone actually reads it
    const body = new ReadableStream({ pull() { bodyRead = true; } }, { highWaterMark: 0 });
    const { f } = fakeFetch(() => new Response(body, { status, headers: status === 302 ? { Location: "https://elsewhere.example/" } : {} }));
    await assert.rejects(openAICompatibleReply(remote(), user("hi"), f), (e: unknown) => {
      assert.ok(e instanceof ProviderError);
      assert.equal(e.code, code);
      assert.ok(!e.message.includes(KEY));
      return true;
    });
    assert.equal(bodyRead, false, `status ${status}: the error body was read`);
  }
});

test("network failure and timeout become neutral errors", async () => {
  await assert.rejects(openAICompatibleReply(remote(), user("hi"), fakeFetch(() => { throw new TypeError("fetch failed " + KEY); }).f),
    (e: unknown) => e instanceof ProviderError && e.code === "network" && !e.message.includes(KEY));
  const timeout = Object.assign(new Error("timed out"), { name: "TimeoutError" });
  await assert.rejects(openAICompatibleReply(remote(), user("hi"), fakeFetch(() => { throw timeout; }).f),
    (e: unknown) => e instanceof ProviderError && e.code === "timeout");
});

test("malformed, empty, oversized or key-echoing replies are discarded", async () => {
  const replies = [
    new Response("not json", { status: 200 }),
    new Response(JSON.stringify({ choices: [] }), { status: 200 }),
    ok("   "),
    new Response("x".repeat(70 * 1024), { status: 200 }),
    ok(`your key is ${KEY}`),
  ];
  for (const r of replies) {
    await assert.rejects(openAICompatibleReply(remote(), user("hi"), fakeFetch(() => r).f), (e: unknown) => e instanceof ProviderError && e.code === "bad_response");
  }
});

test("a local server without a key gets no Authorization header", async () => {
  const local = readAssistantConfig({ ...REMOTE, ASSISTANT_BASE_URL: "http://localhost:1234/v1", ASSISTANT_API_KEY: "" });
  const { f, calls } = fakeFetch(() => ok("hi"));
  await openAICompatibleReply(local as ReturnType<typeof remote>, user("hi"), f);
  assert.equal((calls[0].init.headers as Record<string, string>).Authorization, undefined);
});
