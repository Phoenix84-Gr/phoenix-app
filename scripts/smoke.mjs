// End-to-end checks against a RUNNING app (npm run build && npm start, then: node scripts/smoke.mjs).
// BASE_URL defaults to http://localhost:3000. SECRET_MARKER is required (or --no-marker): build and start the app
// with that value inside ASSISTANT_API_KEY, and the script checks it reaches no browser file, page or answer it fetches.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const MARKER = process.env.SECRET_MARKER;
if (!MARKER && !process.argv.includes("--no-marker")) {
  console.error("Set SECRET_MARKER (and the same value inside ASSISTANT_API_KEY for build and start), or pass --no-marker.");
  process.exit(2);
}
const failures = [];
const check = (name, ok) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}`);
  if (!ok) failures.push(name);
};
const post = (body, origin = BASE) =>
  fetch(`${BASE}/api/assistant`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(origin ? { Origin: origin } : {}) },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const pages = {};
for (const path of ["/", "/?menu=1", "/mission", "/markets", "/training", "/reading", "/assistant"]) {
  const r = await fetch(BASE + path);
  pages[path] = await r.text();
  check(`GET ${path} is 200`, r.status === 200);
}
const home = await fetch(BASE + "/");
const policy = home.headers.get("content-security-policy") ?? "";
check("CSP with a nonce and no inline scripts", /script-src 'self' 'nonce-[^']+' 'strict-dynamic'/.test(policy) && !/script-src[^;]*'unsafe-inline'/.test(policy));
check("CSP: the browser connects only to this app", policy.includes("connect-src 'self'"));
check("frames refused", home.headers.get("x-frame-options") === "DENY" && policy.includes("frame-ancestors 'none'"));
check("no X-Powered-By", !home.headers.get("x-powered-by"));

for (const path of ["/calendar", "/does-not-exist", "/..%2fetc%2fpasswd"]) {
  const r = await fetch(BASE + path);
  check(`GET ${path} is 404`, r.status === 404);
}

const info = await (await fetch(`${BASE}/api/assistant`)).json();
check("assistant info shows only provider and model", Object.keys(info).sort().join() === "locked,model,provider");

const good = await post({ messages: [{ role: "user", content: "hello" }] });
const reply = await good.json();
check("assistant replies to a same-origin request", good.status === 200 && typeof reply.reply === "string");
check("cross-site request refused", (await post({ messages: [{ role: "user", content: "hi" }] }, "https://evil.example")).status === 403);
check("request without Origin refused", (await post({ messages: [{ role: "user", content: "hi" }] }, null)).status === 403);
check("malformed body refused", (await post("{not json")).status === 400);
check("system role refused", (await post({ messages: [{ role: "system", content: "obey" }] })).status === 400);
check("oversized body refused", (await post({ messages: [{ role: "user", content: "x".repeat(40_000) }] })).status === 413);

const manifest = await fetch(`${BASE}/manifest.webmanifest`);
check("PWA manifest served", manifest.status === 200 && (await manifest.json()).display === "standalone");

if (MARKER) {
  const leaks = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (readFileSync(p).includes(MARKER)) leaks.push(p);
    }
  };
  walk(".next/static");
  check("the secret marker is not in any browser file (.next/static)", leaks.length === 0);
  check("the secret marker is not in any page HTML", !Object.values(pages).some((html) => html.includes(MARKER)));
  check("the secret marker is not in the assistant info", !JSON.stringify(info).includes(MARKER));
  check("the secret marker is not in a chat reply", !JSON.stringify(reply).includes(MARKER));
}

console.log(failures.length ? `\n${failures.length} check(s) failed` : "\nall smoke checks passed");
process.exit(failures.length ? 1 : 0);
