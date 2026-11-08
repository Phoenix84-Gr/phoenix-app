import type { AssistantConfig } from "./config.ts";
import { MAX_CHARS, type ChatMessage } from "./messages.ts";

/** Errors carry a short code and a neutral message: never the key, never the provider's error body. */
export type ProviderErrorCode = "auth" | "rate_limited" | "timeout" | "network" | "bad_response" | "refused";
export class ProviderError extends Error {
  code: ProviderErrorCode;
  constructor(code: ProviderErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export const SYSTEM_PROMPT =
  "You are the assistant inside a personal command center app. Answer briefly and kindly. " +
  "You cannot open pages, run tools or see the user's data; say so if asked.";

const MAX_REPLY_BYTES = 64 * 1024;
const MAX_REPLY_CHARS = MAX_CHARS; // a reply must fit back into the next request
const TIMEOUT_MS = 30_000;

/** Offline and deterministic: the demo works before anyone has a key. */
export function mockReply(messages: ChatMessage[]): string {
  const last = messages[messages.length - 1].content.toLowerCase();
  if (/\b(hi|hello|hey|γεια)\b/.test(last)) return "Hello! I'm the offline demo assistant. Connect your own model in SETUP.md and I'll answer for real.";
  if (last.includes("panel")) return "Panels live in config/panels.ts: one entry plus one component in panels/. Ask the setup agent to \"add a panel\".";
  if (last.includes("theme") || last.includes("color")) return "Tap the planet icon on the home screen to switch between Space and Ocean. The colours are tokens in app/globals.css.";
  return `You said: "${messages[messages.length - 1].content.slice(0, 200)}". I'm running offline, so I can only echo. Connect a model to get real answers.`;
}

/** One call to an OpenAI-compatible /chat/completions endpoint (OpenAI, OpenRouter, Ollama, LM Studio, ...). */
export async function openAICompatibleReply(
  config: Extract<AssistantConfig, { provider: "openai_compatible" }>,
  messages: ChatMessage[],
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;
  let response: Response;
  try {
    response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({ model: config.model, messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages], max_tokens: 600 }),
      redirect: "manual", // a redirect could carry the key to another host: refuse it
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    const name = (error as Error).name;
    throw name === "TimeoutError" || name === "AbortError"
      ? new ProviderError("timeout", "the model did not answer in time")
      : new ProviderError("network", "the model could not be reached");
  }
  if (response.status >= 300 && response.status < 400) throw new ProviderError("refused", "the provider tried to redirect; use its final address");
  if (!response.ok || response.type === "opaqueredirect") {
    await response.body?.cancel(); // error bodies are never read: they can echo request headers
    if (response.status === 401 || response.status === 403) throw new ProviderError("auth", "the provider refused the credentials");
    if (response.status === 429) throw new ProviderError("rate_limited", "the provider asked us to slow down");
    throw new ProviderError("bad_response", `the provider answered ${response.status}`);
  }
  const text = await readCapped(response, MAX_REPLY_BYTES);
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ProviderError("bad_response", "the reply was not JSON");
  }
  const content = (data as { choices?: { message?: { content?: unknown } }[] })?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new ProviderError("bad_response", "the reply had no text");
  if (config.apiKey && content.includes(config.apiKey)) throw new ProviderError("bad_response", "the reply was discarded");
  return content.slice(0, MAX_REPLY_CHARS);
}

async function readCapped(response: Response, limit: number): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new ProviderError("bad_response", "the reply was too large");
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}
