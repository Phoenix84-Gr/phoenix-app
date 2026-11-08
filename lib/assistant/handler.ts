import { ConfigError, publicInfo, readAssistantConfig, type AssistantConfig } from "./config.ts";
import { codeMatches, createRateLimiter, sameOrigin } from "./guard.ts";
import { parseChatRequest, RequestError } from "./messages.ts";
import { mockReply, openAICompatibleReply, ProviderError } from "./providers.ts";

/** The assistant's request handling, framework-free so tests can drive it directly. app/api/assistant/route.ts
 *  only adapts Next.js requests to this. */
export const MAX_BODY_BYTES = 32 * 1024;
const BODY_DEADLINE_MS = 10_000;

export type Reply = { status: number; body: Record<string, unknown> };
export type Incoming = {
  origin: string | null;
  /** this app's own origin (scheme + host + port), e.g. https://phoenix.example.net */
  selfOrigin: string;
  forwardedFor: string | null;
  accessCode: string | null;
  contentLength: string | null;
  body: ReadableStream<Uint8Array> | null;
};

type Limits = { perClient: (k: string) => boolean; allClients: (k: string) => boolean; wrongCodes: (k: string) => boolean };

export function createHandler(env: Record<string, string | undefined>, fetchImpl: typeof fetch = fetch, now: () => number = Date.now) {
  const limits: Limits = {
    perClient: createRateLimiter(20, 60_000, now), // per client
    allClients: createRateLimiter(60, 60_000, now), // whole app: caps spend even if client ids are faked
    wrongCodes: createRateLimiter(10, 10 * 60_000, now), // wrong access codes, whole app
  };
  let inFlight = 0;
  const MAX_IN_FLIGHT = 4;
  // x-forwarded-for can be set by anyone unless a proxy you control overwrites it: opt in explicitly
  const trustProxy = env.TRUST_PROXY_HEADER === "true";

  function config(): AssistantConfig | null {
    try {
      return readAssistantConfig(env);
    } catch (error) {
      if (error instanceof ConfigError) {
        console.error("assistant config:", error.message);
        return null;
      }
      throw error;
    }
  }

  async function info(): Promise<Reply> {
    const c = config();
    return c ? { status: 200, body: publicInfo(c) } : { status: 503, body: { error: "The assistant is not set up correctly. See SETUP.md." } };
  }

  async function chat(req: Incoming): Promise<Reply> {
    // a browser CSRF check: browsers always send Origin on cross-site POSTs; other clients can fake it,
    // which is why a real provider also needs the access code
    if (!sameOrigin(req.origin, req.selfOrigin)) return { status: 403, body: { error: "Cross-site requests are refused." } };
    const client = (trustProxy && req.forwardedFor?.split(",")[0]?.trim()) || "client";
    if (!limits.perClient(client) || !limits.allClients("all")) return { status: 429, body: { error: "Too many messages. Wait a minute." } };

    const c = config();
    if (!c) return { status: 503, body: { error: "The assistant is not set up correctly. See SETUP.md." } };
    if (c.provider === "openai_compatible" && !codeMatches(req.accessCode, c.accessCode)) {
      if (!limits.wrongCodes("all")) return { status: 429, body: { error: "Too many wrong codes. Try again later.", locked: true } };
      return { status: 401, body: { error: "Enter the access code to use the connected model.", locked: true } };
    }

    let raw: string;
    try {
      raw = await readBody(req, MAX_BODY_BYTES);
    } catch (error) {
      return error instanceof RequestError && error.message === "too large"
        ? { status: 413, body: { error: "The message is too large." } }
        : { status: 400, body: { error: "The request could not be read." } };
    }
    let messages;
    try {
      messages = parseChatRequest(JSON.parse(raw));
    } catch (error) {
      return { status: 400, body: { error: `Bad request: ${error instanceof RequestError ? error.message : "expected JSON"}.` } };
    }

    if (c.provider === "mock") return { status: 200, body: { reply: mockReply(messages), provider: "mock" } };
    if (inFlight >= MAX_IN_FLIGHT) return { status: 429, body: { error: "The assistant is busy. Try again in a moment." } };
    inFlight++;
    try {
      return { status: 200, body: { reply: await openAICompatibleReply(c, messages, fetchImpl), provider: c.model } };
    } catch (error) {
      if (error instanceof ProviderError) return { status: 502, body: { error: `The model is unavailable: ${error.message}.`, code: error.code } };
      console.error("assistant: unexpected error"); // never log the error object: it may hold request details
      return { status: 500, body: { error: "Something went wrong." } };
    } finally {
      inFlight--;
    }
  }

  return { info, chat };
}

/** Read at most `limit` bytes, counting while reading, with a deadline; never buffers an oversized body. */
export async function readBody(req: Pick<Incoming, "body" | "contentLength">, limit: number): Promise<string> {
  const declared = Number(req.contentLength ?? "");
  if (Number.isFinite(declared) && declared > limit) throw new RequestError("too large");
  if (!req.body) return "";
  const reader = req.body.getReader();
  const timer = setTimeout(() => void reader.cancel().catch(() => {}), BODY_DEADLINE_MS);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel().catch(() => {});
        throw new RequestError("too large");
      }
      chunks.push(value);
    }
  } finally {
    clearTimeout(timer);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}
