/*
 * content/ -> Microsoft Word, for authoring the Journal on a SharePoint or
 * OneDrive mountpoint.
 *
 * The Journal's documents live in this repository as da.live storage HTML so
 * that `npm run up` can render them with no remote content source. A deployed
 * Edge Delivery site keeps its documents in a content source instead, and when
 * that source is SharePoint or OneDrive the authoring surface is Word. This
 * script turns each stored document into the .docx an author would have
 * produced, so the same six articles and the index can be dropped into a
 * document library and previewed without anyone retyping them.
 *
 * The mapping is the Word authoring model Edge Delivery reads back:
 *
 *   <main> child <div>            a section, separated in Word by a horizontal
 *                                 rule (an empty paragraph with a bottom border)
 *   <h1>..<h6>                    Word Heading 1..6
 *   <p>, <ul>, <ol>               body text and lists
 *   <div class="cards">           a table whose first row is one merged cell
 *                                 naming the block ("Cards"); each following
 *                                 <div> is a row and each of its <div>s a cell
 *   <div class="metadata">        the same, named "Metadata"
 *   <img src="/media/x.jpg">      the image itself, embedded in the document
 *   <a href="/articles/y">        a hyperlink, absolute against --origin
 *
 * The block name in Word is written in title case ("Video Story"); Edge
 * Delivery slugs it back to the class the block folder is named for
 * ("video-story"). Writing the slug directly works too.
 *
 * CONFIRM BEFORE CLIENT USE. The Word to HTML side of this contract is Adobe
 * platform behaviour, and adobe documentation was not reachable when this was
 * written. What is asserted from the shipped documents in content/ is exact;
 * what is asserted about how Word is parsed back (the horizontal rule as a
 * section break, the first row of a table as the block name, title case
 * slugging) is from prior knowledge and should be checked against the current
 * aem.live documentation before it goes in front of a client.
 *
 * Usage:
 *   node tools/to-docx.mjs                      writes word/ from content/
 *   node tools/to-docx.mjs --origin https://main--journal--slalom.aem.page
 *   node tools/to-docx.mjs --out /tmp/word
 *   node tools/to-docx.mjs --verify             also read every file back
 *
 * --verify unpacks each .docx it just wrote and rebuilds the document's
 * skeleton (section count, heading levels and text, block names in order) from
 * the packed XML, then compares it with the skeleton of the source HTML. It
 * proves the conversion lost nothing structural without needing Word, and it
 * exits non-zero on the first mismatch.
 *
 * --origin is the host internal links are written against. Word has no notion
 * of a site-relative link, so every /path becomes <origin>/path; the Edge
 * Delivery pipeline turns same-origin links back into relative ones when it
 * renders. The default is the local `npm run up` server, which is the right
 * answer while a real preview host does not exist yet.
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';
import { parse } from 'node-html-parser';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, BorderStyle, ExternalHyperlink, ImageRun, AlignmentType, PageOrientation,
} from 'docx';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const ORIGIN = flag('--origin', 'http://localhost:3000').replace(/\/$/, '');
const OUT = resolve(ROOT, flag('--out', 'word'));

/* US Letter, in DXA (1440 per inch). */
const PAGE = { size: { width: 12240, height: 15840, orientation: PageOrientation.PORTRAIT } };
/* Table width inside one inch margins. */
const TABLE_DXA = 12240 - 2880;
/* Widest an embedded image is laid out, in pixels at 96dpi. */
const MAX_IMAGE_PX = 600;

/* ------------------------------------------------------------------ images */

/**
 * Intrinsic pixel size of a PNG or JPEG, read from the file header. Word needs
 * an explicit width and height for every embedded image and there is no image
 * library in this project, so the two formats the Journal ships are parsed
 * directly. Anything unrecognised falls back to a 3:2 box.
 */
function imageSize(buf) {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i += 1; continue; }
      const marker = buf[i + 1];
      // SOF0..SOF15, skipping the four markers in that range that are not frames.
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return { width: MAX_IMAGE_PX, height: Math.round((MAX_IMAGE_PX * 2) / 3) };
}

function imageRun(src) {
  const file = join(ROOT, src.replace(/^\//, ''));
  const data = readFileSync(file);
  const { width, height } = imageSize(data);
  const scale = Math.min(1, MAX_IMAGE_PX / width);
  return new ImageRun({
    data,
    type: /\.png$/i.test(src) ? 'png' : 'jpg',
    transformation: { width: Math.round(width * scale), height: Math.round(height * scale) },
  });
}

/* ------------------------------------------------------------------- inline */

const absolute = (href) => (href.startsWith('/') ? `${ORIGIN}${href}` : href);

/**
 * One element's children as Word runs. Bold, italic and code carry through;
 * a link becomes a real hyperlink; an image becomes the embedded picture.
 */
function runs(node, style = {}) {
  const out = [];
  for (const child of node.childNodes) {
    if (child.nodeType === 3) {
      const text = child.rawText.replace(/\s+/g, ' ');
      if (text.trim() || (out.length && text === ' ')) out.push(new TextRun({ text, ...style }));
      continue;
    }
    if (child.nodeType !== 1) continue;
    const tag = child.rawTagName.toLowerCase();
    if (tag === 'img') { out.push(imageRun(child.getAttribute('src'))); continue; }
    if (tag === 'br') { out.push(new TextRun({ text: '', break: 1 })); continue; }
    if (tag === 'a') {
      const href = child.getAttribute('href') || '';
      out.push(new ExternalHyperlink({
        link: absolute(href),
        children: runs(child, { ...style, style: 'Hyperlink' }),
      }));
      continue;
    }
    if (tag === 'strong' || tag === 'b') { out.push(...runs(child, { ...style, bold: true })); continue; }
    if (tag === 'em' || tag === 'i') { out.push(...runs(child, { ...style, italics: true })); continue; }
    if (tag === 'code') { out.push(...runs(child, { ...style, font: 'Consolas' })); continue; }
    out.push(...runs(child, style));
  }
  return out;
}

const HEADINGS = {
  h1: HeadingLevel.HEADING_1, h2: HeadingLevel.HEADING_2, h3: HeadingLevel.HEADING_3,
  h4: HeadingLevel.HEADING_4, h5: HeadingLevel.HEADING_5, h6: HeadingLevel.HEADING_6,
};

/** The empty paragraph with a bottom border that Word shows as a horizontal rule. */
const rule = () => new Paragraph({
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, space: 1, color: '999999' } },
  spacing: { before: 240, after: 240 },
});

/* -------------------------------------------------------------------- blocks */

/** "video-story" -> "Video Story", the way an author writes a block name. */
const blockName = (cls) => cls.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

function cellContent(cell) {
  const parts = flow(cell);
  return parts.length ? parts : [new Paragraph({})];
}

function blockTable(div, cls) {
  const rows = div.childNodes.filter((n) => n.nodeType === 1);
  const columns = Math.max(1, ...rows.map((r) => r.childNodes.filter((n) => n.nodeType === 1).length));
  const colWidth = Math.floor(TABLE_DXA / columns);
  const columnWidths = Array.from({ length: columns }, (_, i) => (
    i === columns - 1 ? TABLE_DXA - colWidth * (columns - 1) : colWidth));

  const header = new TableRow({
    children: [new TableCell({
      columnSpan: columns,
      width: { size: TABLE_DXA, type: WidthType.DXA },
      children: [new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [new TextRun({ text: blockName(cls), bold: true })],
      })],
    })],
  });

  const body = rows.map((row) => {
    const cells = row.childNodes.filter((n) => n.nodeType === 1);
    return new TableRow({
      children: columnWidths.map((w, i) => new TableCell({
        width: { size: w, type: WidthType.DXA },
        children: cells[i] ? cellContent(cells[i]) : [new Paragraph({})],
      })),
    });
  });

  return new Table({ columnWidths, width: { size: TABLE_DXA, type: WidthType.DXA }, rows: [header, ...body] });
}

/* --------------------------------------------------------------------- flow */

/** Every child of a container as Word paragraphs, tables and lists. */
function flow(container) {
  const out = [];
  for (const node of container.childNodes) {
    if (node.nodeType === 3) {
      const text = node.rawText.trim();
      if (text) out.push(new Paragraph({ children: [new TextRun(text)] }));
      continue;
    }
    if (node.nodeType !== 1) continue;
    const tag = node.rawTagName.toLowerCase();

    if (HEADINGS[tag]) { out.push(new Paragraph({ heading: HEADINGS[tag], children: runs(node) })); continue; }
    if (tag === 'p') { out.push(new Paragraph({ children: runs(node) })); continue; }
    if (tag === 'ul' || tag === 'ol') {
      for (const li of node.querySelectorAll('li')) {
        out.push(new Paragraph({
          children: runs(li),
          ...(tag === 'ul'
            ? { bullet: { level: 0 } }
            : { numbering: { reference: 'ordered', level: 0 } }),
        }));
      }
      continue;
    }
    if (tag === 'div') {
      const cls = (node.getAttribute('class') || '').trim().split(/\s+/)[0];
      if (cls) { out.push(blockTable(node, cls)); continue; }
      out.push(...flow(node));
      continue;
    }
    out.push(...flow(node));
  }
  return out;
}

/* ---------------------------------------------------------------- documents */

function convert(htmlPath) {
  const root = parse(readFileSync(htmlPath, 'utf8'));
  const main = root.querySelector('main');
  if (!main) throw new Error(`${htmlPath}: no <main>`);

  const sections = main.childNodes.filter((n) => n.nodeType === 1 && n.rawTagName.toLowerCase() === 'div');
  const children = [];
  sections.forEach((section, i) => {
    if (i) children.push(rule());
    children.push(...flow(section));
  });

  return new Document({
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 22 } },
      },
    },
    numbering: {
      config: [{
        reference: 'ordered',
        levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.START }],
      }],
    },
    sections: [{ properties: { page: PAGE }, children }],
  });
}

/* ------------------------------------------------------------------- verify */

/**
 * One named entry out of a .docx, which is a zip. Written here rather than
 * shelled out to `unzip` because this runs on Windows workstations too. Only
 * the two storage methods Word and this script produce are handled.
 */
function zipEntry(buf, wanted) {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error('not a zip');
  let at = buf.readUInt32LE(eocd + 16);
  const count = buf.readUInt16LE(eocd + 10);
  for (let i = 0; i < count; i += 1) {
    const nameLen = buf.readUInt16LE(at + 28);
    const name = buf.toString('utf8', at + 46, at + 46 + nameLen);
    const localAt = buf.readUInt32LE(at + 42);
    const method = buf.readUInt16LE(at + 10);
    const compressed = buf.readUInt32LE(at + 20);
    if (name === wanted) {
      const start = localAt + 30 + buf.readUInt16LE(localAt + 26) + buf.readUInt16LE(localAt + 28);
      const slice = buf.subarray(start, start + compressed);
      return method === 0 ? slice.toString('utf8') : inflateRawSync(slice).toString('utf8');
    }
    at += 46 + nameLen + buf.readUInt16LE(at + 30) + buf.readUInt16LE(at + 32);
  }
  throw new Error(`${wanted} not in archive`);
}

const unescapeXml = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'").replace(/&amp;/g, '&');

/** Section count, headings and block names, from the source document. */
function skeletonFromHtml(main) {
  const sections = main.childNodes.filter((n) => n.nodeType === 1 && n.rawTagName.toLowerCase() === 'div');
  const headings = [];
  const blocks = [];
  const visit = (node, inBlock) => {
    for (const child of node.childNodes) {
      if (child.nodeType !== 1) continue;
      const tag = child.rawTagName.toLowerCase();
      if (HEADINGS[tag] && !inBlock) { headings.push(`${tag}:${child.text.replace(/\s+/g, ' ').trim()}`); continue; }
      if (tag === 'div') {
        const cls = (child.getAttribute('class') || '').trim().split(/\s+/)[0];
        if (cls && !inBlock) { blocks.push(blockName(cls)); continue; }
        visit(child, inBlock);
        continue;
      }
      visit(child, inBlock);
    }
  };
  sections.forEach((s) => visit(s, false));
  return { sections: sections.length, headings, blocks };
}

/** The same three things, read back out of the packed file. */
function skeletonFromDocx(buffer) {
  const xml = zipEntry(buffer, 'word/document.xml');
  const headings = [];
  const blocks = [];
  let rules = 0;
  let depth = 0;
  let pending = null;
  const token = /<w:tbl>|<\/w:tbl>|<w:pStyle w:val="Heading(\d)"\/>|<w:pBdr>|<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>|<w:tr>/g;
  let m = token.exec(xml);
  while (m) {
    const [text] = m;
    if (text === '<w:tbl>') { depth += 1; if (depth === 1) pending = 'name'; }
    else if (text === '</w:tbl>') depth -= 1;
    else if (text === '<w:pBdr>') { if (!depth) rules += 1; }
    else if (text === '<w:tr>') { if (depth === 1 && pending !== 'name') pending = null; }
    else if (m[1] !== undefined) { if (!depth) pending = `h${m[1]}`; }
    else if (m[2] !== undefined) {
      const value = unescapeXml(m[2]).replace(/\s+/g, ' ').trim();
      if (pending === 'name') { blocks.push(value); pending = null; }
      else if (pending && pending.startsWith('h')) { headings.push(`h${pending.slice(1)}:${value}`); pending = null; }
    }
    m = token.exec(xml);
  }
  return { sections: rules + 1, headings, blocks };
}

function verify(source, buffer) {
  const want = skeletonFromHtml(parse(readFileSync(source, 'utf8')).querySelector('main'));
  const got = skeletonFromDocx(buffer);
  const problems = [];
  if (want.sections !== got.sections) problems.push(`sections ${want.sections} authored, ${got.sections} in the file`);
  if (want.headings.join('|') !== got.headings.join('|')) problems.push(`headings [${want.headings}] vs [${got.headings}]`);
  if (want.blocks.join('|') !== got.blocks.join('|')) problems.push(`blocks [${want.blocks}] vs [${got.blocks}]`);
  return problems;
}

/* ---------------------------------------------------------------------- run */

function walk(dir) {
  const found = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) found.push(...walk(full));
    else if (name.endsWith('.html')) found.push(full);
  }
  return found;
}

const VERIFY = args.includes('--verify');
const sources = walk(join(ROOT, 'content')).sort();
let written = 0;
let failed = 0;
for (const source of sources) {
  const rel = relative(join(ROOT, 'content'), source).replace(/\.html$/, '.docx');
  const target = join(OUT, rel);
  mkdirSync(dirname(target), { recursive: true });
  const buffer = await Packer.toBuffer(convert(source));
  writeFileSync(target, buffer);
  written += 1;
  let note = '';
  if (VERIFY) {
    const problems = verify(source, buffer);
    failed += problems.length ? 1 : 0;
    note = problems.length ? `  MISMATCH: ${problems.join('; ')}` : '  verified';
  }
  process.stdout.write(`  ${rel}${note}\n`);
}
process.stdout.write(`to-docx: ${written} documents written to ${relative(ROOT, OUT)}/, internal links against ${ORIGIN}\n`);
if (VERIFY && failed) { process.stderr.write(`to-docx: ${failed} document(s) do not match their source\n`); process.exit(1); }
if (VERIFY) process.stdout.write('to-docx: every document matches its source (sections, headings, block order)\n');
