/** The chat request from the browser is untrusted: strict shape, roles, sizes. */
export type ChatMessage = { role: "user" | "assistant"; content: string };

export const MAX_MESSAGES = 20;
export const MAX_CHARS = 2000;
export const MAX_TOTAL_CHARS = 12000;

export class RequestError extends Error {}

export function parseChatRequest(body: unknown): ChatMessage[] {
  if (typeof body !== "object" || body === null || Array.isArray(body)) throw new RequestError("expected a JSON object");
  const keys = Object.keys(body);
  if (keys.length !== 1 || keys[0] !== "messages") throw new RequestError("only a 'messages' field is accepted");
  const list = (body as { messages: unknown }).messages;
  if (!Array.isArray(list) || list.length < 1 || list.length > MAX_MESSAGES) {
    throw new RequestError(`messages: 1 to ${MAX_MESSAGES} items`);
  }
  let total = 0;
  const out = list.map((m, i): ChatMessage => {
    if (typeof m !== "object" || m === null) throw new RequestError(`message ${i}: expected an object`);
    const { role, content } = m as Record<string, unknown>;
    if (role !== "user" && role !== "assistant") throw new RequestError(`message ${i}: role must be user or assistant`);
    if (typeof content !== "string" || !content.trim() || content.length > MAX_CHARS) {
      throw new RequestError(`message ${i}: text of 1 to ${MAX_CHARS} characters`);
    }
    total += content.length;
    return { role, content };
  });
  if (total > MAX_TOTAL_CHARS) throw new RequestError("the conversation is too long; start a new one");
  if (out[out.length - 1].role !== "user") throw new RequestError("the last message must be from the user");
  return out;
}
