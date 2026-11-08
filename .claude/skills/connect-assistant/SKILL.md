---
name: connect-assistant
description: Connect the Phoenix assistant to the user's own LLM - OpenAI, OpenRouter, Ollama, LM Studio or any OpenAI-compatible server - with server-side environment variables. Use for "use my OpenAI key", "run it with Ollama", "switch back to offline". Never touches key values.
---

# Connect the assistant

The model is called by the app's server (`app/api/assistant/route.ts`). The browser never learns the address, the key
or the configured access code; the person chatting types the code, the page keeps it in memory and sends it with each
message to the app's own server. Settings are environment variables in `.env.local`, which **only the user edits**.

## Steps

1. Ask which provider. Give the user these lines for `.env.local` (copy `.env.example` first):

   | Provider | `ASSISTANT_BASE_URL` | Key |
   |---|---|---|
   | OpenAI | `https://api.openai.com/v1` | yes |
   | OpenRouter | `https://openrouter.ai/api/v1` | yes |
   | Ollama (this computer) | `http://localhost:11434/v1` | no |
   | LM Studio (this computer) | `http://localhost:1234/v1` | no |

   plus `ASSISTANT_PROVIDER=openai_compatible` and `ASSISTANT_MODEL=<model name>`.
2. Tell the user to add, in their own editor: `ASSISTANT_API_KEY=` (remote providers) and `ASSISTANT_ACCESS_CODE=`
   (12+ characters, any phrase they like). The app has no login; the chat asks for this code before it uses a paid
   model, so a deployed app is not an open door to their key. Never ask for either value in the chat.
3. To check a value is set without showing it: PowerShell `[bool]$env:ASSISTANT_API_KEY` (after loading the file) or
   simply start the app: `GET /api/assistant` answers `locked: true` with the model name when the settings are valid,
   and `503` with "not set up correctly" when they are not (the server log names the problem, never the value).
4. Do not send a real message yourself. Hand back to the orchestrator: the user tries the chat and enters their code.

## What the app enforces (do not change it)

https for remote hosts (plain http only for localhost) · no credentials or query in the address · redirects refused
· a key is never sent to a local server unless set · requests only from the app's own pages (Origin check) · access
code compared in constant time · 20 messages per minute per client · message and reply size limits · provider error
bodies never read · a reply that contains the key is discarded.

## Troubleshooting

"not set up correctly": read the server log line · "access code": the user typed a different code · "refused the
credentials": wrong key · "slow down": rate limit at the provider · "did not answer in time": local server not
running or too slow · "tried to redirect": use the provider's final address.
