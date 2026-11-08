import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { arcLayout, project, ringOffset } from "../lib/arc.ts";

const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
const root = new URL("../", import.meta.url);

test("arc menu maths", () => {
  assert.ok(near(arcLayout(0, 0, 9, 150, 60).x, 0) && near(arcLayout(0, 0, 9, 150, 60).y, 0), "front item at the centre");
  assert.ok(near(arcLayout(0, 0, 9, 150, 60).scale, 1) && near(arcLayout(0, 0, 9, 150, 60).opacity, 1), "front item full size");
  assert.ok(near(arcLayout(1, 0, 9, 150, 60).x, -arcLayout(8, 0, 9, 150, 60).x), "neighbours mirror");
  assert.ok(arcLayout(1, 0, 9, 150, 60).y < 0, "side items sit higher");
  assert.ok(near(ringOffset(8, 0, 9), -1), "the ring wraps");
  assert.ok(arcLayout(0, 0, 9, 1, 1).z > arcLayout(4, 0, 9, 1, 1).z, "front has the highest z");
  assert.ok(project(2) > 0 && project(-2) < 0 && near(project(0), 0), "a flick projects forward");
});

test("the page policy allows only this app's own scripts, styles, fonts and connections", () => {
  const proxy = readFileSync(new URL("proxy.ts", root), "utf8");
  for (const rule of ["default-src 'self'", "'nonce-${nonce}'", "connect-src 'self'", "object-src 'none'", "frame-ancestors 'none'", "base-uri 'none'"]) {
    assert.ok(proxy.includes(rule), rule);
  }
  assert.ok(!/script-src[^"]*'unsafe-inline'/.test(proxy), "no unsafe-inline scripts");
});

/** Every source file in the app, without node_modules and build output. */
function sources(dir = fileURLToPath(root), out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if ([".git", ".next", "node_modules"].includes(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sources(path, out);
    else if (/\.(tsx?|mjs|json|css)$/.test(name) && name !== "package-lock.json") out.push(path);
  }
  return out;
}

test("no NEXT_PUBLIC_ variables: nothing from the environment is built into the browser bundle", () => {
  for (const file of sources()) {
    if (/[\\/]tests[\\/]/.test(file)) continue;
    assert.ok(!readFileSync(file, "utf8").includes("NEXT_PUBLIC_"), file);
  }
});

test("the fictional data holds no real contact details or real links", () => {
  for (const file of sources().filter((f) => /[\\/]data[\\/]/.test(f))) {
    const text = readFileSync(file, "utf8");
    assert.ok(!/[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(text), `${file}: looks like an email`);
    for (const url of text.match(/https?:\/\/[^\s"]+/g) ?? []) assert.match(url, /^https:\/\/example\.com\//, `${file}: ${url}`);
  }
});
