# Security

## What the app enforces (in code, covered by tests)

| Risk | Control | Test |
|---|---|---|
| Secrets in the browser | Provider settings are server environment variables without the public prefix; the browser learns only the provider kind and model label; a test fails if the public prefix appears in the code; the smoke test builds and runs the app with a marker in the key variable and finds it in no browser file, page or API answer | `no NEXT_PUBLIC_ variables`, `the browser learns only the provider kind and model label`, `scripts/smoke.mjs` |
| Paid key used by strangers (the demo has no login) | A real provider will not start without `ASSISTANT_ACCESS_CODE` (12+ characters); every chat request must carry it; compared in constant time; at most 10 wrong codes per 10 minutes for the whole app; the model is never called before the code matches | `unsafe or incomplete provider settings are refused`, `real provider: no code or a wrong code is refused …`, `… guessing codes is capped …` |
| Cross-site use of the assistant (browser CSRF) | `POST /api/assistant` refuses a missing `Origin` or one that differs from the app's own in scheme, host or port. Non-browser clients can fake Origin; the access code covers them | `origin must match exactly …`, smoke: cross-site and no-Origin refused |
| Flooding and spend | 20 messages per minute per client and 60 for the whole app; at most 4 model calls at once; the body is read with a byte counter and cut at 32 KB (a larger declared size is refused unread) with a 10 s read deadline; 1–20 messages of up to 2,000 characters, 12,000 in total. Client ids come from `x-forwarded-for` only when `TRUST_PROXY_HEADER=true` | `without TRUST_PROXY_HEADER, faked x-forwarded-for values share one bucket`, `… the whole app is capped`, `at most 4 model calls run at once`, `body limits …` |
| Key sent to the wrong server | https for remote hosts, plain http only for localhost; no credentials, query or fragment in the address; redirects refused; a local server gets no key unless one is set | `unsafe or incomplete provider settings are refused`, `a good reply is returned; … redirects are not followed`, `a local server without a key gets no Authorization header` |
| Key in errors or logs | Provider error bodies are never read; errors are neutral codes; config errors never show the value; the route never logs error objects | `errors map to neutral codes …`, `a config error never shows the key value` |
| Prompt injection through the model | The model has no tools and sees no app data; its reply is rendered as text (React escaping), never as HTML; a reply containing the key is discarded | `malformed, empty, oversized or key-echoing replies are discarded` |
| Injected scripts and markup | CSP with a per-request nonce, `strict-dynamic`, no `unsafe-inline` scripts, `connect-src 'self'`, `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'`; no `dangerouslySetInnerHTML` | `the page policy allows only …`, smoke: CSP checks |
| Malicious data from a source | Every panel's data passes a parser: strict types, length caps, list caps, unknown fields dropped, links https only | `links must be plain https …`, `wrong types, out-of-range values …`, `unknown fields are dropped` |
| Path tricks in panel URLs | Panel ids come only from the registry; anything else is a 404 | `soon panels and unknown ids have no page`, smoke: 404 checks |
| Clickjacking, sniffing, referrer leaks | `X-Frame-Options: DENY`, `nosniff`, `no-referrer`, Permissions-Policy (camera, microphone, location off), HSTS | smoke: frames refused |

## Limits (honest list)

- **No login.** The demo is for fictional data. Real data needs the design in [docs/adapters.md](docs/adapters.md)
  first: sign-in, a server-side check on every page and route, least-privilege data access, no caching of private
  pages.
- The limits are in memory, per server instance, and reset on restart. Behind several instances use a shared store.
  Set `TRUST_PROXY_HEADER=true` only behind a proxy that overwrites `x-forwarded-for` (most hosts do); without it every
  caller shares one bucket, which is safe but strict.
- The access code is a shared secret, not an account system. Use a long phrase and change it if it leaks.
- Message limits are not a money limit: set a spending cap in your provider account.
- The setup agent's rules are partly enforced (Claude Code permissions in `.claude/settings.json`, sub-agent tool
  lists) and partly instructions (`AGENTS.md`). They reduce risk but are not a sandbox.

## The setup agent: enforced vs instruction

| Restriction | How | Strength |
|---|---|---|
| No web tools, no `.env*` reads, no env dumps, no curl/wget, no package installs or `npx`, no deploy CLI, no git push (Claude Code) | `.claude/settings.json` deny rules | Enforced when the project settings are loaded |
| Sub-agents without web tools or sub-agents | `tools:` in `.claude/agents/*.md` | Enforced by Claude Code; a test checks the lists |
| Stay in the folder, never handle secret values, no public env prefix, ask before cost/installs/deploys, edit only own files, real data only after the design | `AGENTS.md`, agent and skill text | **Instruction only** |

## Reporting

Please open a GitHub issue without exploit details, or use GitHub's private vulnerability reporting for this
repository.
