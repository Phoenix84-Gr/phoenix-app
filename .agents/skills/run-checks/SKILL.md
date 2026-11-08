---
name: run-checks
description: Verify Phoenix after any change - typecheck, lint, unit tests, skill mirror, production build, and (if the app is running) the end-to-end smoke checks. Use at the end of every setup step and before telling the user something works.
---

# Run checks

From the project folder, in this order:

```
npm run check      # typecheck + lint + unit tests + skill mirror
npm run build      # production build
```

If the user agreed to run the app: `npm start` in a second terminal, then `node scripts/smoke.mjs --no-marker` (it checks the
pages, the 404s, the page policy headers and the assistant's refusals against the running app).

Report to the user:
- each command and whether it passed;
- for a failure: the shortest line that explains it, the likely cause in plain words, and the next step;
- `git diff --stat` if the folder is a git repository, otherwise the list of files you changed.

Never say "done" or "works" when a check failed or was skipped. If a check fails 3 times after fixes, stop and
explain instead of trying again.
