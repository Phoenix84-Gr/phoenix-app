import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DataError, parseMarkets, parseMission, parseReading, parseTraining } from "../lib/schema.ts";

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url), "utf8"));

test("the shipped fictional data passes its checks", () => {
  assert.equal(parseMission(fixture("mission")).projects.length, 4);
  assert.equal(parseMarkets(fixture("markets")).positions.length, 3);
  assert.equal(parseTraining(fixture("training")).sessions.length, 5);
  assert.equal(parseReading(fixture("reading")).items.length, 4);
});

test("links must be plain https: javascript:, data:, http: and credentials are refused", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,<b>x</b>", "http://example.com/a", "https://user:pw@example.com/", "not a url"]) {
    const data = { items: [{ title: "T", source: "S", minutes: 1, tag: "t", url }] };
    assert.throws(() => parseReading(data), DataError, url);
  }
});

test("wrong types, out-of-range values and oversized lists are refused", () => {
  const mission = fixture("mission");
  assert.throws(() => parseMission({ ...mission, projects: [{ ...mission.projects[0], progress: 120 }] }), DataError);
  assert.throws(() => parseMission({ ...mission, tiles: "four" }), DataError);
  assert.throws(() => parseMarkets({ ...fixture("markets"), cash: "1000" }), DataError);
  assert.throws(() => parseTraining({ ...fixture("training"), sessions: Array(15).fill(fixture("training").sessions[0]) }), DataError);
  assert.throws(() => parseMission(null), DataError);
  assert.throws(() => parseMission([]), DataError);
});

test("unknown fields are dropped, not passed to the page", () => {
  const raw = fixture("reading");
  raw.items[0].onclick = "alert(1)";
  raw.secret = "x";
  const parsed = parseReading(raw) as unknown as Record<string, unknown> & { items: Record<string, unknown>[] };
  assert.equal(parsed.secret, undefined);
  assert.equal(parsed.items[0].onclick, undefined);
});
