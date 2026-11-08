/** Assistant settings, read on the SERVER from environment variables. None of them has Next.js's public prefix,
 *  so Next.js never puts them in the browser bundle (a test checks that the prefix is used nowhere). The key value is only ever passed to the provider call. */
export type AssistantConfig =
  | { provider: "mock" }
  | {
      provider: "openai_compatible";
      baseUrl: string;
      model: string;
      apiKey: string | null;
      accessCode: string;
      local: boolean;
    };

export class ConfigError extends Error {}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const KEY_RE = /^[\x21-\x7e]{8,512}$/; // printable ASCII, no spaces: refuses pasted quotes, newlines or junk

export function readAssistantConfig(env: Record<string, string | undefined>): AssistantConfig {
  const provider = (env.ASSISTANT_PROVIDER ?? "mock").trim();
  if (provider === "mock") return { provider: "mock" };
  if (provider !== "openai_compatible") throw new ConfigError("ASSISTANT_PROVIDER must be mock or openai_compatible");

  let url: URL;
  try {
    url = new URL((env.ASSISTANT_BASE_URL ?? "").trim());
  } catch {
    throw new ConfigError("ASSISTANT_BASE_URL is not a valid address");
  }
  const local = LOCAL_HOSTS.has(url.hostname);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && local)) {
    throw new ConfigError("ASSISTANT_BASE_URL must use https (plain http only for localhost)");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new ConfigError("ASSISTANT_BASE_URL must not contain credentials, a query or a fragment");
  }
  if (url.hostname.endsWith("example.com")) throw new ConfigError("ASSISTANT_BASE_URL is still the placeholder");

  const model = (env.ASSISTANT_MODEL ?? "").trim();
  if (!/^[\w.:/@-]{1,120}$/.test(model)) throw new ConfigError("ASSISTANT_MODEL is missing or has odd characters");

  const rawKey = env.ASSISTANT_API_KEY;
  if (rawKey !== undefined && rawKey !== "" && !KEY_RE.test(rawKey)) {
    throw new ConfigError("ASSISTANT_API_KEY has an unexpected format (value not shown)");
  }
  const apiKey = rawKey ? rawKey : null;
  if (!apiKey && !local) throw new ConfigError("a remote provider needs ASSISTANT_API_KEY");

  // The demo has no login. A real provider costs money, so every request must carry this code.
  const accessCode = env.ASSISTANT_ACCESS_CODE ?? "";
  if (accessCode.length < 12) throw new ConfigError("a real provider needs ASSISTANT_ACCESS_CODE (12+ characters)");

  return { provider: "openai_compatible", baseUrl: url.toString().replace(/\/$/, ""), model, apiKey, accessCode, local };
}

/** What the browser may learn: which provider and model label. Never the key, the code or the address. */
export function publicInfo(config: AssistantConfig): { provider: string; model: string; locked: boolean } {
  return config.provider === "mock"
    ? { provider: "mock", model: "offline demo", locked: false }
    : { provider: "openai_compatible", model: config.model, locked: true };
}
