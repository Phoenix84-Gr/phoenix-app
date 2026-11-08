---
name: add-panel
description: Add, remove, rename or reshape a Phoenix panel (a window of the app). Use for "add a panel/window for X", "remove the markets panel", "rename Training", "show my habits instead". Registry entry, component, fictional data, parser, tests.
---

# Add or reshape a panel

A panel = **one entry in `config/panels.ts`** + **one component in `panels/<id>.tsx`** registered in
`panels/index.ts`. Its data (if any) = `data/<id>.json` checked by a parser in `lib/schema.ts`. The home menu and the
route `/<id>` pick it up automatically.

## Add

1. Choose an `id`: lowercase letters, digits and dashes (it becomes the URL). Not `api`.
2. Add the entry to `PANELS` in `config/panels.ts`: `title`, `subtitle`, an `icon` from `ICON_NAMES`, `status: "ready"`.
   Need a new icon? Add its name to `ICON_NAMES` and map it to a Lucide icon in `components/icons.tsx`.
3. If it shows data: write fictional `data/<id>.json`, add a `parse<Name>()` to `lib/schema.ts` built from the
   existing helpers (strict types, length caps, https-only links), and add the JSON to `MOCK_DATA` in
   `data/index.ts`.
4. Create `panels/<id>.tsx` from the pattern of `panels/reading.tsx`: an async component that calls
   `loadPanelData("<id>", parseX)`, shows `<NoData />` when it gets `null`, and uses `PanelShell`, `Section`, `Tile`,
   `Progress`, `Sparkline` from `components/ui.tsx`.
5. Register it in `panels/index.ts`.
6. Add a test in `tests/schema.test.ts`: the fixture passes, and one bad value (wrong type or a `javascript:` link)
   is refused.

## Remove

Delete the entry, the component, its registration, its data file and its tests. Its parser in `lib/schema.ts` is
core code: remove it only after the user explicitly agrees (or leave it; an unused parser is harmless). Or set
`status: "soon"` to keep a dimmed bubble in the menu.

## Rules

Fictional data only (no real names, emails, phones, addresses; links on `https://example.com/`). No new npm packages,
no external images, fonts or scripts, no `dangerouslySetInnerHTML`. Finish with `run-checks`.
