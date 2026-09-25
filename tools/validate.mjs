/*
 * Journal validation harness, the Phase 4 gate (task E4-0).
 * House style follows prototype/scripts/verify.mjs: plain Node, no
 * dependencies, an errors array, exit 1 on any failure, one OK line on green.
 *
 * Content note: the Journal's documents are da.live storage HTML under
 * content/ (see fstab.yaml for the layout decision), so the plan's
 * "markdown parses" checks apply to those documents: front-of-file H1,
 * metadata table rows, banned copy, resolvable media references, and a
 * query-index that mirrors the article set exactly.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const EXPECTED = { blocks: 8, articles: 6 };

// Article Template row values and the media block each one must embed
// (task E4-2): podcast pages carry the podcast player, film pages carry the
// video story, plain stories carry neither requirement.
const ARTICLE_TEMPLATES = ["article", "podcast", "film"];
const TEMPLATE_BLOCKS = { podcast: "podcast-player", film: "video-story" };

// Brand guardrails, mirrored from prototype/scripts/verify.mjs so the same
// retired names and copy rules bind both sites.
const BANNED_CASE_SENSITIVE = ["MileagePlus", "Meridian", "Black Diamond", "btn--gold", "gold-rule", "Carve the sky"];
const BANNED_CASE_INSENSITIVE = ["C9A96A", "D4B87E"];
// user directive 2026-09-02: no dash punctuation in reader-facing copy. Em and
// en dashes must never appear, raw or as entity spellings. Hyphens are fine.
const BANNED_ALWAYS = ["—", "–", "&mdash;", "&ndash;", "&#8212;", "&#8211;", "&#x2014;", "&#x2013;"];

const REQUIRED_METADATA_ROWS = ["Title", "Description", "Author", "Date", "Template", "Tags"];

// Journal taxonomy: every Tags value is a namespaced AEM tag id on the
// slalomair namespace using a known facet (data-layer-dictionary.md sections
// 1.1 and 1.1a). New facets require a dictionary revision first.
const KNOWN_TAG_FACETS = ["page-type", "journey", "product", "destination"];

const errors = [];

function read(p) {
  return readFileSync(p, "utf8");
}

function* walk(dir, ext) {
  if (!existsSync(dir)) return;
  for (const f of readdirSync(dir)) {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) yield* walk(p, ext);
    else if (!ext || f.endsWith(ext)) yield p;
  }
}

function rel(p) {
  return path.relative(ROOT, p).replaceAll("\\", "/");
}

// 1. Block inventory: every directory under blocks/ must be a js + css pair
// named after the directory, and the count must match EXPECTED.blocks.
const blocksDir = path.join(ROOT, "blocks");
const blockDirs = existsSync(blocksDir)
  ? readdirSync(blocksDir).filter((d) => statSync(path.join(blocksDir, d)).isDirectory())
  : [];
for (const b of blockDirs) {
  for (const suffix of ["js", "css"]) {
    const f = path.join(blocksDir, b, `${b}.${suffix}`);
    if (!existsSync(f)) errors.push(`blocks/${b}: missing ${b}.${suffix}`);
  }
}
if (blockDirs.length !== EXPECTED.blocks) {
  errors.push(`Expected exactly ${EXPECTED.blocks} blocks, found ${blockDirs.length} (${blockDirs.join(", ")})`);
}

// 2. Article inventory, when the documents are in the repository at all.
//
// Two layouts are valid and the difference between them is deliberate. The
// monorepo's eds-blog/ carries content/, so `aem up` previews the whole Journal
// with no remote content source. The deployed repository does not: fstab.yaml
// points at da.live, the platform is the source of truth, and a second copy in
// git would be a thing to edit by mistake. The checks that read documents run
// only in the first case, and the ones that read block code, styles and
// fstab.yaml run in both.
const hasLocalContent = existsSync(path.join(ROOT, "content"));
const articlesDir = path.join(ROOT, "content", "articles");
const articleFiles = [...walk(articlesDir, ".html")];
if (hasLocalContent && articleFiles.length !== EXPECTED.articles) {
  errors.push(`Expected exactly ${EXPECTED.articles} articles, found ${articleFiles.length}`);
}

// 3. Document checks: every content document renders one front-of-file H1;
// every article carries the full metadata table.
const contentDocs = [...walk(path.join(ROOT, "content"), ".html")];

// Authoring convention: the metadata block is the LAST block in <main>, so
// everything from its opening tag to the end of the document is metadata rows
// and closing markup. That keeps this parser indentation-proof and safe from
// other div-table blocks, which always precede it.
function metadataRows(html) {
  const start = html.indexOf('<div class="metadata">');
  if (start === -1) return null;
  const slice = html.slice(start);
  const rows = {};
  for (const [, key, value] of slice.matchAll(/<div>\s*<div>([\s\S]*?)<\/div>\s*<div>([\s\S]*?)<\/div>\s*<\/div>/g)) {
    rows[key.trim()] = value.trim();
  }
  return rows;
}

for (const doc of contentDocs) {
  const html = read(doc);
  const name = rel(doc);

  const h1s = [...html.matchAll(/<h1[\s>]/g)];
  if (h1s.length !== 1) errors.push(`${name}: expected exactly one <h1>, found ${h1s.length}`);
  else {
    const firstHeading = html.match(/<h[1-6][\s>]/);
    if (firstHeading && !firstHeading[0].startsWith("<h1")) {
      errors.push(`${name}: first heading is ${firstHeading[0].trim()}>, want the H1 at the front`);
    }
  }

  const isArticle = doc.startsWith(articlesDir);
  const rows = metadataRows(html);
  if (isArticle) {
    if (!rows) errors.push(`${name}: missing metadata table`);
    else {
      for (const key of REQUIRED_METADATA_ROWS) {
        if (!rows[key]) errors.push(`${name}: metadata table missing ${key} row`);
      }
      if (rows.Date && !/^\d{4}-\d{2}-\d{2}$/.test(rows.Date)) {
        errors.push(`${name}: metadata Date "${rows.Date}" is not an ISO date`);
      }
      if (rows.Template && !ARTICLE_TEMPLATES.includes(rows.Template)) {
        errors.push(`${name}: metadata Template "${rows.Template}" is not one of ${ARTICLE_TEMPLATES.join("|")}`);
      }
      const requiredBlock = rows.Template && TEMPLATE_BLOCKS[rows.Template];
      if (requiredBlock && !html.includes(`class="${requiredBlock}"`)) {
        errors.push(`${name}: Template ${rows.Template} requires a ${requiredBlock} block in the document`);
      }
    }
    if (!html.includes('class="article-header"')) {
      errors.push(`${name}: missing article-header block`);
    }
  }

  // Tags row conformance (required on articles above; validated wherever a
  // document carries one): slalomair namespace, known facets only.
  if (rows && rows.Tags) {
    const tags = rows.Tags.split(",").map((t) => t.trim()).filter(Boolean);
    if (!tags.length) errors.push(`${name}: metadata Tags row is empty`);
    for (const tag of tags) {
      const m = /^slalomair:([a-z][a-z-]*)\/[a-z0-9][a-z0-9-]*$/.exec(tag);
      if (!m) {
        errors.push(`${name}: tag "${tag}" is not a slalomair:<facet>/<value> id`);
      } else if (!KNOWN_TAG_FACETS.includes(m[1])) {
        errors.push(`${name}: tag "${tag}" uses unknown facet "${m[1]}" (known: ${KNOWN_TAG_FACETS.join(", ")})`);
      }
    }
  }

  // media references must resolve to committed files
  for (const [, ref] of html.matchAll(/(?:src|href)="(\/media\/[^"]+)"/g)) {
    const clean = ref.split(/[#?]/)[0];
    const target = path.join(ROOT, clean);
    if (!existsSync(target) || !statSync(target).isFile()) {
      errors.push(`${name}: media reference ${ref} does not resolve to a file`);
    }
  }
}

// 4. Banned copy sweep over every reader-facing text file in eds-blog/:
// content documents and data, block code and styles, site styles, head/404.
// scripts/ is included too (aem.js is vendored clean; nothing here may ever
// carry dash punctuation or a retired brand term into rendered output).
const readerFiles = [
  ...walk(path.join(ROOT, "content")),
  ...walk(path.join(ROOT, "blocks")),
  ...walk(path.join(ROOT, "styles")),
  ...walk(path.join(ROOT, "scripts")),
  ...walk(path.join(ROOT, "media"), ".md"), // podcast narration scripts
  path.join(ROOT, "head.html"),
  path.join(ROOT, "404.html"),
  path.join(ROOT, "fstab.yaml"),
].filter((p) => existsSync(p) && /\.(html|json|js|mjs|css|yaml|md)$/.test(p));

for (const p of readerFiles) {
  const text = read(p);
  const name = rel(p);
  for (const term of BANNED_ALWAYS) {
    if (text.includes(term)) errors.push(`${name}: banned dash punctuation "${term}" present`);
  }
  for (const term of BANNED_CASE_SENSITIVE) {
    if (text.includes(term)) errors.push(`${name}: banned string "${term}" present`);
  }
  const lower = text.toLowerCase();
  for (const term of BANNED_CASE_INSENSITIVE) {
    if (lower.includes(term.toLowerCase())) errors.push(`${name}: banned string "${term}" present (case-insensitive)`);
  }
}

// 5. query-index.json must mirror the article set exactly, both directions,
// and every entry must be complete.
const indexPath = path.join(ROOT, "content", "query-index.json");
if (hasLocalContent && !existsSync(indexPath)) {
  errors.push("content/query-index.json: missing");
} else if (existsSync(indexPath)) {
  let idx;
  try {
    idx = JSON.parse(read(indexPath));
  } catch (e) {
    errors.push(`content/query-index.json: invalid JSON (${e.message})`);
  }
  if (idx) {
    const entries = Array.isArray(idx.data) ? idx.data : [];
    const indexPaths = new Set(entries.map((e) => e.path));
    const articlePaths = new Set(
      articleFiles.map((f) => `/articles/${path.basename(f, ".html")}`),
    );
    for (const p of articlePaths) {
      if (!indexPaths.has(p)) errors.push(`content/query-index.json: article ${p} missing from index`);
    }
    for (const p of indexPaths) {
      if (!articlePaths.has(p)) errors.push(`content/query-index.json: entry ${p} has no article document`);
    }
    for (const entry of entries) {
      for (const field of ["path", "title", "description", "image", "author", "date", "template"]) {
        if (!entry[field]) errors.push(`content/query-index.json: entry ${entry.path || "?"} missing ${field}`);
      }
      if (entry.image && !existsSync(path.join(ROOT, entry.image.split(/[#?]/)[0]))) {
        errors.push(`content/query-index.json: entry ${entry.path} image ${entry.image} does not resolve`);
      }
    }
    if (typeof idx.total === "number" && idx.total !== entries.length) {
      errors.push(`content/query-index.json: total ${idx.total} does not match ${entries.length} entries`);
    }
  }
}

// 6. fstab.yaml must carry each top-level key exactly once.
//
// A duplicated mapping key is not a warning in YAML, it is a parse error: a
// standard parser refuses the whole document. That happened on the deployed
// Journal repository on 2026-09-14, where an edit left a bare `mountpoints:`
// line above the real one. The platform then had no mountpoint at all, and
// every content read came back as "No source document found", which reads
// exactly like a folder that was never shared. Hours went into the share.
// This check is three lines and would have caught it immediately.
const fstabPath = path.join(ROOT, "fstab.yaml");
if (!existsSync(fstabPath)) {
  errors.push("fstab.yaml: missing");
} else {
  const seen = new Map();
  for (const line of read(fstabPath).split(/\r?\n/)) {
    const m = /^([A-Za-z_][\w-]*):/.exec(line);
    if (m) seen.set(m[1], (seen.get(m[1]) || 0) + 1);
  }
  for (const [key, count] of seen) {
    if (count > 1) {
      errors.push(`fstab.yaml: top-level key "${key}" appears ${count} times; YAML rejects a duplicated mapping key and the whole file fails to parse`);
    }
  }
  if (!seen.has("mountpoints")) {
    errors.push("fstab.yaml: no mountpoints key");
  }
}

// 7. .hlxignore must not exclude the Cloud Manager challenge or the Sidekick.
//
// Adobe's boilerplate opens its own .hlxignore with `.*`, and copying that line
// wholesale is the obvious thing to do. It would stop the code bus serving
// .well-known/adobe/cloudmanager-challenge.txt, which is what Cloud Manager
// fetched to verify ownership of this site. Verification can be re-checked at
// any time, nothing would announce the failure, and the symptom would appear
// weeks later as a site that has quietly lost its domain.
//
// tools/sidekick/config.json is the same shape of problem: the Sidekick fetches
// it over the code bus, and excluding tools/ wholesale makes the project plugin
// vanish with no error anywhere.
//
// Neither can be checked from a local preview, because the local CLI ignores
// .hlxignore completely and serves every one of these paths. This check is the
// only thing standing between a paste and a silent outage.
const hlxIgnorePath = path.join(ROOT, ".hlxignore");
if (existsSync(hlxIgnorePath)) {
  const patterns = read(hlxIgnorePath)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  for (const pattern of patterns) {
    if (/^\.\*/.test(pattern)) {
      errors.push(`.hlxignore: the pattern "${pattern}" excludes every dot-prefixed path, including .well-known/adobe/cloudmanager-challenge.txt; name each dot file instead`);
    }
    if (/^\.well-known/.test(pattern)) {
      errors.push(`.hlxignore: "${pattern}" excludes the Cloud Manager ownership challenge`);
    }
    if (/^tools\/?\*?$/.test(pattern) || /^tools\/sidekick/.test(pattern)) {
      errors.push(`.hlxignore: "${pattern}" excludes tools/sidekick/config.json, which the Sidekick fetches over the code bus`);
    }
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
const contentNote = hasLocalContent
  ? `${articleFiles.length} articles, query-index`
  : "content from the mountpoint";
console.log(`validate OK: ${blockDirs.length} blocks, ${contentNote}, banned copy + media + fstab conformant`);
