# Recommended tools (optional)

**Nothing here is required.** The app runs with Node.js and the pinned packages in `package-lock.json`; the bundled
skills in `.claude/skills/` cover setup. The setup agent may suggest an entry below only when it fits the user's
request, and installs nothing without the user's OK for that one install.

## Software the user installs

| Tool | What it adds | Source | License | Install behavior |
|---|---|---|---|---|
| Node.js 24 LTS | Runs the app | https://nodejs.org (official site) | MIT | User installs it |
| Ollama | Open models on your own computer; no key, data stays local | https://ollama.com (official site) | MIT (core) | User installs it; the agent never runs the installer |
| LM Studio | Desktop app to download and serve local models | https://lmstudio.ai (official site) | Proprietary; check its current terms | User installs it |

## Hosting (only if the user wants the app on their phone away from home)

Any host that runs a Next.js app works. Deploying uses the user's own account and is their decision; the agent
explains the steps in `docs/INSTALL-ON-PHONE.md` and never runs a deploy command itself.

## External skills or plugins

None are listed. To add one, record all of these fields before it may be suggested:

| Field | Example of what is required |
|---|---|
| Name and purpose | what it adds that the bundled skills do not |
| Exact source | repository URL **and** commit or release tag |
| Integrity | checksum or signed release, verified at install |
| License | SPDX identifier, checked against redistribution needs |
| Permissions | which tools, files and network it uses |
| Install behavior | what it writes and where; any scripts it runs |
| Update policy | pinned; updates are a new review and a new approval |

Approval covers that one version. A newer version needs a new review.
