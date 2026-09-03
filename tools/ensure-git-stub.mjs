/*
 * Creates the minimal .git stub the aem CLI needs to run `aem up` from this
 * directory (Phase 4, task E4-0). Runs before every `npm run up`, idempotent.
 *
 * WHY THIS EXISTS. @adobe/aem-cli 16.21.15 hard-requires, in the exact
 * directory it serves from:
 *   1. a `.git` entry (it lstats `<cwd>/.git` and never walks up), and
 *   2. a resolvable HEAD ref, and
 *   3. an `origin` remote in that .git's config.
 * The Journal lives at eds-blog/ inside the slalom-airlines monorepo, whose
 * real .git sits one level up, and Phase 4 forbids a GitHub remote. A real
 * nested repository is not an option either: git would treat eds-blog as an
 * embedded repo and stop tracking its files in the monorepo.
 *
 * THE STUB. Three files, verified empirically on git 2.x: without an
 * objects/ directory git does NOT consider this a valid repository, so the
 * parent repo keeps tracking eds-blog files exactly as before (adds, status,
 * commits all normal), while the aem CLI finds everything it looks for. The
 * origin URL "." intentionally fails the CLI's GitUrl parser, which makes it
 * fall back to the --url flag passed by the `up` script (a placeholder
 * aem.page host with no ref--site--org shape, so no aem.page registration
 * can ever route it; it sees the CLI's own probes and would-be-404 misses
 * as permanent 404s, and the git remote itself is never contacted).
 *
 * Git never tracks paths containing a .git segment, so this stub can not be
 * committed; it is recreated on demand instead, which is why this script
 * runs as part of `npm run up`.
 */

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GIT = path.join(ROOT, ".git");

const FILES = {
  HEAD: "ref: refs/heads/main\n",
  "refs/heads/main": "074c3880440ffcf729cff911cd76bddf2cc8930b\n",
  config: '[core]\n\trepositoryformatversion = 0\n\tbare = false\n[remote "origin"]\n\turl = .\n',
};

// A real repository at eds-blog/.git (even a fresh init) has objects/; the
// stub deliberately does not. Never touch a real repo: a per-file guard alone
// would write a loose refs/heads/main into a packed-refs repository and
// corrupt it (E4-0 review finding 1, reproduced).
if (existsSync(path.join(GIT, "objects"))) {
  console.log("real repository at eds-blog/.git, leaving it untouched");
  process.exit(0);
}

let created = 0;
for (const [relPath, content] of Object.entries(FILES)) {
  const target = path.join(GIT, relPath);
  if (!existsSync(target)) {
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, content);
    created += 1;
  }
}

console.log(created > 0
  ? `git stub ready (${created} file(s) created) at eds-blog/.git`
  : "git stub already in place");
