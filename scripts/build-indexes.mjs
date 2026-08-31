#!/usr/bin/env node
// Build CLAUDE.md / AGENTS.md / GEMINI.md / README.md / .github/copilot-instructions.md
// skill tables and .cursor/rules/*.mdc imports from the canonical skills.yaml manifest.
//
// Usage:
//   node scripts/build-indexes.mjs            # write generated sections in place
//   node scripts/build-indexes.mjs --check    # exit non-zero if any output would change
//
// The generator finds <!-- BEGIN GENERATED:skills --> ... <!-- END GENERATED:skills -->
// markers in each target file and replaces the content between them. Pre-marker and
// post-marker content (your hand-written prose) is preserved verbatim.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const yamlPath = resolve(repoRoot, 'skills.yaml');
if (!existsSync(yamlPath)) {
  console.error('skills.yaml not found at', yamlPath);
  process.exit(1);
}

// --- Tiny YAML parser tailored to skills.yaml shape ----------------------------------
//
// We don't want a dependency. The manifest uses only:
//   - top-level `sections:` list
//   - each section has `id`, `title`, `directory`, `description`, `skills:` list
//   - each skill is a single-line flow-mapping `{ key: value, key: value, ... }`
//
// Implementing just enough YAML to read that. Throws on anything fancier.

function parseManifest(text) {
  const lines = text.split(/\r?\n/);
  const sections = [];
  let i = 0;
  // Skip until 'sections:'
  while (i < lines.length && !/^sections:\s*$/.test(lines[i])) i++;
  if (i === lines.length) throw new Error('No top-level `sections:` key');
  i++;

  // Each section starts with `  - id:` at 2-space indent
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const m = line.match(/^  - id:\s*(\S+)\s*$/);
    if (!m) { i++; continue; }
    const section = { id: m[1], skills: [] };
    i++;
    while (i < lines.length) {
      const l = lines[i];
      if (/^  - id:/.test(l)) break;             // next section
      if (/^\S/.test(l)) break;                  // top-level key
      const kv = l.match(/^    (\w+):\s*(.*)$/);
      if (kv) {
        const [, key, raw] = kv;
        if (key === 'skills') {
          i++;
          // Read skill entries until indent drops below 6
          while (i < lines.length) {
            const sl = lines[i];
            if (!sl.trim()) { i++; continue; }
            const skillMatch = sl.match(/^      - \{(.+)\}\s*$/);
            if (!skillMatch) break;
            section.skills.push(parseFlowMapping(skillMatch[1]));
            i++;
          }
        } else {
          section[key] = unquote(raw);
          i++;
        }
      } else {
        i++;
      }
    }
    sections.push(section);
  }
  return { sections };
}

function parseFlowMapping(body) {
  // Split on top-level commas, then `key: value` per pair.
  const out = {};
  let depth = 0, start = 0;
  const parts = [];
  for (let j = 0; j < body.length; j++) {
    const ch = body[j];
    if (ch === '[' || ch === '{') depth++;
    else if (ch === ']' || ch === '}') depth--;
    else if (ch === ',' && depth === 0) {
      parts.push(body.slice(start, j));
      start = j + 1;
    }
  }
  parts.push(body.slice(start));
  for (const p of parts) {
    const idx = p.indexOf(':');
    if (idx < 0) continue;
    const key = p.slice(0, idx).trim();
    let val = p.slice(idx + 1).trim();
    if (val.startsWith('[') && val.endsWith(']')) {
      val = val.slice(1, -1).split(',').map((s) => unquote(s.trim())).filter(Boolean);
    } else {
      val = unquote(val);
    }
    out[key] = val;
  }
  return out;
}

function unquote(s) {
  s = s.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'");
  }
  return s;
}

// --- Generators ----------------------------------------------------------------------

function renderSkillIndex(manifest, { style }) {
  // style: 'claude' | 'readme'
  const out = [];
  for (const section of manifest.sections) {
    out.push(`### ${section.title}\n`);
    if (style === 'readme') {
      // README table: just `[name](path) | description`
      out.push(`| Skill | Description |`);
      out.push(`|-------|-------------|`);
      for (const s of section.skills) {
        out.push(`| [${s.name}](${s.path}) | ${s.description} |`);
      }
    } else {
      // CLAUDE/AGENTS/GEMINI table: Skill | Path | Read when you need to...
      const header = section.id === 'commands' ? 'Run when you need to...' : 'Read when you need to...';
      out.push(`| Skill | Path | ${header} |`);
      out.push(`|-------|------|--------------------------|`);
      for (const s of section.skills) {
        const title = section.id === 'commands' ? `\`${s.title}\`` : s.title;
        out.push(`| ${title} | \`${s.path}\` | ${s.description} |`);
      }
    }
    out.push('');
  }
  return out.join('\n');
}

function renderCursorRule(manifest, tag) {
  const lines = [];
  for (const section of manifest.sections) {
    for (const s of section.skills) {
      if (!s.tags || !s.tags.includes(tag)) continue;
      lines.push(`@../../${s.path}`);
    }
  }
  return lines.join('\n') + '\n';
}

// --- Replace-between-markers utility -------------------------------------------------

function applyGenerated(filePath, beginMarker, endMarker, generated) {
  if (!existsSync(filePath)) {
    console.error(`Target missing: ${filePath} — skipping`);
    return { changed: false, present: false };
  }
  const text = readFileSync(filePath, 'utf8');
  const beginIdx = text.indexOf(beginMarker);
  const endIdx = text.indexOf(endMarker);
  if (beginIdx < 0 || endIdx < 0 || endIdx < beginIdx) {
    console.error(`Markers missing in ${filePath} — skipping. Add:\n  ${beginMarker}\n  ${endMarker}`);
    return { changed: false, present: true };
  }
  const before = text.slice(0, beginIdx + beginMarker.length);
  const after = text.slice(endIdx);
  const next = `${before}\n${generated.trim()}\n${after}`;
  if (next === text) return { changed: false, present: true };
  return { changed: true, present: true, next };
}

// --- Main ---------------------------------------------------------------------------

const checkMode = process.argv.includes('--check');
const manifest = parseManifest(readFileSync(yamlPath, 'utf8'));

const targets = [
  { path: 'CLAUDE.md',     style: 'claude' },
  { path: 'AGENTS.md',     style: 'claude' },
  { path: 'GEMINI.md',     style: 'claude' },
  { path: 'README.md',     style: 'readme' },
  { path: '.github/copilot-instructions.md', style: 'claude' },
];

const BEGIN = '<!-- BEGIN GENERATED:skills -->';
const END   = '<!-- END GENERATED:skills -->';

let drift = false;

for (const t of targets) {
  const generated = renderSkillIndex(manifest, { style: t.style });
  const r = applyGenerated(resolve(repoRoot, t.path), BEGIN, END, generated);
  if (!r.present) continue;
  if (r.changed) {
    drift = true;
    if (checkMode) {
      console.log(`DRIFT: ${t.path}`);
    } else {
      writeFileSync(resolve(repoRoot, t.path), r.next, 'utf8');
      console.log(`updated: ${t.path}`);
    }
  } else {
    if (!checkMode) console.log(`unchanged: ${t.path}`);
  }
}

// Cursor rules
const cursorTargets = [
  { path: '.cursor/rules/kinetic-platform.mdc',  tag: 'platform' },
  { path: '.cursor/rules/kinetic-front-end.mdc', tag: 'front-end' },
];
const CURSOR_BEGIN = '<!-- BEGIN GENERATED:imports -->';
const CURSOR_END   = '<!-- END GENERATED:imports -->';

for (const c of cursorTargets) {
  const generated = renderCursorRule(manifest, c.tag);
  const r = applyGenerated(resolve(repoRoot, c.path), CURSOR_BEGIN, CURSOR_END, generated);
  if (!r.present) continue;
  if (r.changed) {
    drift = true;
    if (checkMode) {
      console.log(`DRIFT: ${c.path}`);
    } else {
      writeFileSync(resolve(repoRoot, c.path), r.next, 'utf8');
      console.log(`updated: ${c.path}`);
    }
  } else {
    if (!checkMode) console.log(`unchanged: ${c.path}`);
  }
}

if (checkMode && drift) {
  console.error('\nGenerated content is out of date. Run `node scripts/build-indexes.mjs` and commit.');
  process.exit(1);
}

if (!checkMode) {
  console.log('\nDone.');
}
