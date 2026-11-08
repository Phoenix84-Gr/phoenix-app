"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };
type Info = { provider: string; model: string; locked: boolean };

const SUGGESTIONS = ["Hello!", "How do I add a panel?", "How do I change the theme?"];
// the same limits as the server (lib/assistant/messages.ts): keep the newest messages that fit
const MAX_MESSAGES = 20;
const MAX_TOTAL_CHARS = 12000;
const MAX_BODY_BYTES = 30 * 1024; // under the server's 32 KB cap, measured as sent (UTF-8 JSON)
const bytes = (list: Message[]) => new TextEncoder().encode(JSON.stringify({ messages: list })).byteLength;
function fit(list: Message[]): Message[] {
  const out: Message[] = [];
  let total = 0;
  for (let i = list.length - 1; i >= 0 && out.length < MAX_MESSAGES; i--) {
    total += list[i].content.length;
    if (total > MAX_TOTAL_CHARS) break;
    out.unshift(list[i]);
  }
  while (out.length && (out[0].role !== "user" || bytes(out) > MAX_BODY_BYTES)) out.shift(); // starts with the user, fits the body cap
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}

/** The conversation lives in this tab only. Messages go to /api/assistant on this app's server, which talks to
 *  the model; the browser never holds a key. The access code the user types (needed only for a connected model) is
 *  kept in memory and sent with each message to this app's server; nothing is stored on the device. */
export default function Chat({ title, assistantName }: { title: string; assistantName: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<Info | null>(null);
  const [code, setCode] = useState(""); // kept in memory only: gone when the page closes
  const end = useRef<HTMLDivElement>(null);
  const conversation = useRef(0); // bumped by New chat: a reply to an older conversation is ignored

  useEffect(() => {
    fetch("/api/assistant", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: Info & { error?: string }) => (d.error ? setError(d.error) : setInfo(d)))
      .catch(() => setError("The assistant could not be reached."));
  }, []);
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [messages, busy]);

  async function send(content: string) {
    const clean = content.trim();
    if (!clean || busy) return;
    const next = fit([...messages, { role: "user" as const, content: clean }]);
    setMessages(next);
    setText("");
    setBusy(true);
    setError(null);
    const mine = conversation.current;
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (info?.locked && code) headers["x-access-code"] = code;
      const r = await fetch("/api/assistant", { method: "POST", headers, body: JSON.stringify({ messages: next }) });
      const d = (await r.json()) as { reply?: string; error?: string };
      if (!r.ok || !d.reply) throw new Error(d.error ?? "No reply.");
      if (mine === conversation.current) setMessages([...next, { role: "assistant", content: d.reply }]);
    } catch (e) {
      if (mine === conversation.current) setError((e as Error).message);
    } finally {
      if (mine === conversation.current) setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-[max(env(safe-area-inset-top),20px)]">
      <header className="flex items-center gap-3 pb-3">
        <Link href="/?menu=1" className="orb orb-sm shrink-0" aria-label="Back to the menu" />
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">{assistantName}</h1>
          <p className="tech truncate text-[var(--accent-2)]">{info ? `${info.model}${info.provider === "mock" ? " · no key needed" : ""}` : title}</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => {
              conversation.current++;
              setMessages([]);
              setError(null);
              setBusy(false);
            }}
            className="glass tech ml-auto shrink-0 rounded-full px-3 py-2"
          >
            New chat
          </button>
        )}
      </header>

      {info?.locked && (
        <label className="glass mb-3 flex items-center gap-2 px-4 py-2 text-sm">
          <span className="tech shrink-0 text-muted">Access code</span>
          <input type="password" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" className="min-w-0 flex-1 bg-transparent outline-none" aria-label="Access code" />
        </label>
      )}

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto pb-3" aria-live="polite">
        {messages.length === 0 && (
          <div className="rise mt-6 flex flex-col items-center gap-4 text-center">
            <span className="orb" aria-hidden />
            <p className="text-xl font-semibold">{title}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => void send(s)} className="glass rounded-full px-4 py-2 text-sm">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] whitespace-pre-wrap rounded-3xl px-4 py-3 text-[15px] leading-relaxed ${m.role === "user" ? "self-end bg-[var(--me)]" : "glass self-start"}`}
          >
            {m.content}
          </div>
        ))}
        {busy && (
          <div className="glass self-start rounded-3xl px-4 py-3" aria-label="Thinking">
            <span className="typing" aria-hidden>
              <i />
              <i />
              <i />
            </span>
          </div>
        )}
        {error && (
          <p className="self-center rounded-full bg-[var(--bad)]/15 px-4 py-2 text-sm text-[var(--bad)]" role="alert">
            {error}
          </p>
        )}
        <div ref={end} />
      </div>

      <form
        className="glass flex items-end gap-2 rounded-[28px] p-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send(text);
        }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(text);
            }
          }}
          rows={1}
          maxLength={2000}
          placeholder="Write a message"
          aria-label="Message"
          className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 outline-none"
        />
        <button type="submit" disabled={busy || !text.trim()} className="cta h-11 rounded-full px-5 font-semibold disabled:opacity-40">
          Send
        </button>
      </form>
    </main>
  );
}
