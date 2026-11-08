---
name: retheme
description: Change the look and words of Phoenix - app name, tagline, assistant name, language, colours of the Space and Ocean themes, app icons. Use for "make it green", "call it Nova", "Greek please", "new icon".
---

# Retheme

## Words: `config/site.ts`

`name`, `tagline`, `assistantName`, `lang` (an HTML language code such as `en` or `el`; it tells browsers and screen
readers the page language), `defaultTheme` (`space` or `ocean`). Panel titles live in `config/panels.ts` (that file
belongs to the panel-builder: hand the wording to it). Fixed labels such as "← Menu" are in `components/`; translate
them only on request and through the panel-builder.

## Colours: the token blocks at the top of `app/globals.css`

Each theme defines the same variables: `--bg`, `--bg-2`, `--glow-1`, `--glow-2` (the orb and background glow),
`--card`, `--card-line`, `--text`, `--muted`, `--accent`, `--accent-2`, `--accent-ink`, `--core`, `--rim`, `--me`,
`--good`, `--warn`, `--bad`. Change values, keep the names. Contrast: `--text` on `--bg` at least 13:1, `--muted` 7:1,
`--accent` 4.5:1. The 3D orb's colours are in `components/orb.tsx` (`LOOK`): that file is outside your role, so
describe the wanted colours to the user and ask before anyone edits it.

## Icons: `public/icon-192.png`, `public/icon-512.png`, `public/apple-icon.png`

Square PNGs at exactly those sizes; keep the symbol inside the middle 80% so phones can crop it to a circle. Use an
image the user owns or made; do not download one.

## Rules

No web fonts, `@import`, external `url(...)` or scripts. Finish with `run-checks`, then suggest the user looks at
both themes (the planet button on the home screen).
