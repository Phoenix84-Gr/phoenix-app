// Mirror the canonical skills (.claude/skills) to .agents/skills for Codex and other assistants.
//   node scripts/sync-skills.mjs          copy (removes mirror files that no longer exist upstream)
//   node scripts/sync-skills.mjs --check  exit 1 if the mirror differs (used by npm run check)
// Refuses symlinks and anything that would land outside the project folder.
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, ".claude", "skills");
const DST = join(ROOT, ".agents", "skills");

function inside(path) {
  const rel = relative(ROOT, resolve(path));
  return rel && !rel.startsWith("..") && !rel.includes(`..${sep}`);
}

/** Every existing folder from the project root down to `dir` must be a real folder (not a symlink or a Windows
 *  junction), and its real path must stay inside the real project root. */
export function assertRealInside(dir, root = ROOT) {
  const realRoot = realpathSync(root);
  let current = root;
  for (const part of relative(root, dir).split(sep).filter(Boolean)) {
    current = join(current, part);
    if (!existsSync(current)) return;
    if (lstatSync(current).isSymbolicLink()) throw new Error(`refusing symlink: ${relative(root, current)}`);
    const real = realpathSync(current);
    if (real !== realRoot && !real.startsWith(realRoot + sep)) throw new Error(`refusing path outside the project: ${current}`);
  }
}

/** Relative paths of all files under dir; throws on a symlink or an escaping path. */
export function listFiles(dir) {
  const out = [];
  assertRealInside(dir);
  if (!existsSync(dir)) return out;
  const walk = (d) => {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      const st = lstatSync(p);
      if (st.isSymbolicLink()) throw new Error(`refusing symlink: ${relative(ROOT, p)}`);
      if (!inside(p)) throw new Error(`refusing path outside the project: ${p}`);
      if (st.isDirectory()) walk(p);
      else out.push(relative(dir, p).split(sep).join("/"));
    }
  };
  walk(dir);
  return out;
}

export function differences() {
  const src = listFiles(SRC);
  const dst = listFiles(DST);
  const diffs = [];
  for (const f of src) {
    if (!dst.includes(f)) diffs.push(`missing in mirror: ${f}`);
    else if (!readFileSync(join(SRC, f)).equals(readFileSync(join(DST, f)))) diffs.push(`differs: ${f}`);
  }
  for (const f of dst) if (!src.includes(f)) diffs.push(`extra in mirror: ${f}`);
  return diffs;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--check")) {
    const diffs = differences();
    if (diffs.length) {
      console.error(`skill mirror is out of date (run: npm run sync-skills)\n  ${diffs.join("\n  ")}`);
      process.exit(1);
    }
    console.log("skill mirror is identical");
  } else {
    const files = listFiles(SRC);
    if (existsSync(DST)) {
      listFiles(DST); // refuses symlinks in the mirror before deleting anything
      rmSync(DST, { recursive: true });
    }
    assertRealInside(DST);
    for (const f of files) {
      const target = join(DST, f);
      if (!inside(target)) throw new Error(`refusing to write outside the project: ${target}`);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, readFileSync(join(SRC, f)));
    }
    console.log(`mirrored ${files.length} files to .agents/skills`);
  }
}
