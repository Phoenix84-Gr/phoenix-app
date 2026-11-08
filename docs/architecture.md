# Architecture

```
phone / browser                         Next.js server (this app)                       optional
───────────────                         ─────────────────────────                       ────────
 /            home: orb + arc menu ◄─── app/page.tsx ── config/panels.ts (registry)
 /<id>        a panel            ◄───── app/[panel]/layout.tsx  (unknown id → 404)
                                        app/[panel]/page.tsx ── panels/<id>.tsx
                                                                 │ loadPanelData(id, parser)
                                                                 ▼
                                        lib/data.ts (DataSource) ── data/*.json (mock)
                                        lib/schema.ts (parsers: types, caps, https links)
 /assistant   chat UI ── fetch ───────► app/api/assistant/route.ts
                                         origin check · rate limit · access code
                                         lib/assistant/messages.ts (request shape)
                                         lib/assistant/providers.ts ───────────────►  OpenAI-compatible
                                           mock (offline) | openai_compatible              /chat/completions
 every page ◄── proxy.ts: CSP with a fresh nonce; next.config.ts: fixed security headers
```

## Panels

`config/panels.ts` is the single list of windows: id, title, subtitle, icon, status. The home menu reads it, the
`/[panel]` route reads it, and the tests read it. A panel's component lives in `panels/<id>.tsx` and is registered in
`panels/index.ts`. "Soon" panels show as dimmed bubbles and have no page.

`app/[panel]/layout.tsx` checks the id before `loading.tsx` starts streaming, so an unknown id gets a real 404
status rather than a 200 with an error page.

## Data

Panels never read files or call APIs themselves. They call `loadPanelData(id, parser)`. The source (`mock` by
default, chosen in `config/data.ts`) returns raw data; the parser in `lib/schema.ts` returns a typed copy with only
the known fields, or the page shows "No data" and the server logs why. Links must be plain `https:`.

## Assistant

The browser sends the conversation to `POST /api/assistant` and gets back text. The logic is in
`lib/assistant/handler.ts` (framework-free, so the tests drive it directly); the route only adapts the request. It:

1. refuses requests whose `Origin` is missing or not this app (a browser always sends it on cross-site POSTs);
2. limits each client to 20 messages a minute and the whole app to 60 (in memory, per server instance; client ids
   from `x-forwarded-for` only with `TRUST_PROXY_HEADER=true`);
3. for a real provider, requires the access code (`x-access-code` header, compared in constant time; 10 wrong codes
   per 10 minutes for the whole app) and allows at most 4 model calls at once;
4. reads the body with a byte counter, cut at 32 KB, and checks its shape: 1–20 messages, roles `user`/`assistant` only, 2,000 characters each,
   12,000 in total, last message from the user;
5. calls the provider: https only (http only for localhost), no redirects, 30 s timeout, 64 KB reply cap, error
   bodies never read, the key only in the `Authorization` header, a reply containing the key discarded.

`GET /api/assistant` tells the browser only the provider kind, the model label and whether a code is needed.

## Security headers

`proxy.ts` sets a Content-Security-Policy with a per-request nonce: scripts only from this app and only with the
nonce, `connect-src 'self'`, no plugins, no framing, no base-tag tricks. `next.config.ts` adds `nosniff`,
`no-referrer`, a Permissions-Policy with camera, microphone and location off, HSTS and `X-Frame-Options: DENY`.

## The 3D orb

`components/orb.tsx` draws a wireframe sphere with a dust halo in Three.js, displaced by 3D simplex noise in the
vertex shader. Its render loop reads a `signal` ref every frame (mode and level), so a voice feature can move the
surface without React re-renders. Reduced-motion users get a still orb; without WebGL a CSS gradient stands in.

## Tests

`tests/*.test.ts` run with Node's built-in test runner (no test framework): panel registry invariants, data parsers
(including refused links and values), assistant config, request checks, origin, access code, rate limiter, the
provider adapter against a fake `fetch` (redirects, error bodies, timeouts, oversized and key-echoing replies), the
page policy, that the public env prefix is used nowhere (Next.js inlines only those variables into browser code),
fictional-data hygiene, the setup kit, and the assistant handler end to end with a fake provider (missing, wrong and
correct access codes, rate limits, body limits). `scripts/smoke.mjs` checks the running app, including that a marker
placed in the server's key variable appears in no browser file, page or API answer it fetches. These are checks for
known leak paths, not a proof that no other path exists.
