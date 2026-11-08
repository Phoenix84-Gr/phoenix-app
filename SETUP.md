# Setup

## The easy way: ask your AI coding assistant

1. Install [Node.js](https://nodejs.org) 22.18 or newer (24 LTS recommended).
2. Open this folder in **Claude Code** or **Codex**.
3. Say: **"set it up"**.

The setup agent asks what windows you want, how it should look, and whether the assistant should use a real model.
It shows a short plan and waits for your OK, then hands each part to a specialist: **panel-builder** (windows),
**visual-adapter** (look and words) or **connection-adapter** (the assistant's model). It runs the checks after every
step and never reads your keys.

## The manual way

### 1. Run it

```bash
npm ci            # installs the exact package versions in package-lock.json
npm run dev       # http://localhost:3000
```

Tap the orb for the menu; double-tap it for the assistant. Everything you see is fictional.

### 2. Change the windows

Every window ("panel") is one entry in `config/panels.ts` plus one component in `panels/`. The full recipe is in
[.claude/skills/add-panel/SKILL.md](.claude/skills/add-panel/SKILL.md). The fictional data is in `data/`.

### 3. Change the look

App name, tagline, assistant name and language: `config/site.ts`. Colours: the two token blocks at the top of
`app/globals.css` (Space and Ocean). Icons: `public/*.png`. Details:
[.claude/skills/retheme/SKILL.md](.claude/skills/retheme/SKILL.md).

### 4. Connect your own model (optional)

Copy `.env.example` to `.env.local` and fill it in **yourself**:

```bash
ASSISTANT_PROVIDER=openai_compatible
ASSISTANT_BASE_URL=https://api.openai.com/v1     # or another provider, see below
ASSISTANT_MODEL=<model name>
ASSISTANT_API_KEY=<your key>                      # not needed for Ollama / LM Studio
ASSISTANT_ACCESS_CODE=<a phrase of 12+ characters>
```

| Provider | `ASSISTANT_BASE_URL` | Key |
|---|---|---|
| OpenAI | `https://api.openai.com/v1` | yes |
| OpenRouter | `https://openrouter.ai/api/v1` | yes |
| Ollama (this computer) | `http://localhost:11434/v1` | no |
| LM Studio (this computer) | `http://localhost:1234/v1` | no |
| Other OpenAI-compatible server | its `https://.../v1` address | usually |

Restart `npm run dev`. The chat now shows the model name and asks for the access code. Why a code: this demo has no
login, and a paid key behind a public address would be an open door. These variables are read by the server only;
none has the public prefix, so they never reach the browser (a test checks that).

Set a spending limit in your provider account too: the app limits messages per minute, not money.

### 5. Check everything

```bash
npm run check                         # typecheck, lint, unit tests, skill mirror
npm run build && npm start            # production build, then in a second terminal:
node scripts/smoke.mjs --no-marker    # end-to-end checks against the running app (CI also runs the secret-marker scan)
```

### 6. Put it on your phone

See [docs/INSTALL-ON-PHONE.md](docs/INSTALL-ON-PHONE.md).
