import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { ICON_NAMES, PANELS, PANEL_ID_RE, panelById } from "../config/panels.ts";

const root = new URL("../", import.meta.url);
const read = (p: string) => readFileSync(new URL(p, root), "utf8");

test("panel ids are unique, URL-safe and not reserved", () => {
  const ids = PANELS.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) {
    assert.match(id, PANEL_ID_RE, id);
    assert.ok(!["api", "_next", "manifest.webmanifest"].includes(id), `${id} clashes with a built-in route`);
  }
});

test("every panel uses a known icon and has a title and subtitle", () => {
  for (const p of PANELS) {
    assert.ok((ICON_NAMES as readonly string[]).includes(p.icon), `${p.id}: unknown icon ${p.icon}`);
    assert.ok(p.title.trim() && p.subtitle.trim(), p.id);
  }
});

test("every ready panel has a component file and is registered", () => {
  const index = read("panels/index.ts");
  for (const p of PANELS.filter((x) => x.status === "ready")) {
    assert.ok(existsSync(new URL(`panels/${p.id}.tsx`, root)), `panels/${p.id}.tsx is missing`);
    assert.match(index, new RegExp(`\\b${p.id}\\s*:`), `${p.id} is not in panels/index.ts`);
  }
});

test("soon panels and unknown ids have no page", () => {
  for (const p of PANELS.filter((x) => x.status === "soon")) assert.equal(panelById(p.id), undefined);
  assert.equal(panelById("does-not-exist"), undefined);
  assert.equal(panelById("../etc/passwd"), undefined);
});
