#!/usr/bin/env node
// Lint the skills library. Runs a set of mechanical checks across every SKILL.md
// and reports problems with file:line context. Exits non-zero if any error-level
// finding is present (warnings don't fail).
//
// Usage:
//   node scripts/lint-skills.mjs                 # human-readable output
//   node scripts/lint-skills.mjs --json          # machine-readable
//   node scripts/lint-skills.mjs --warnings      # promote warnings to errors
//   node scripts/lint-skills.mjs --rules R1,R2   # only run named rules
//
// Rules implemented:
//   frontmatter-present       — every SKILL.md starts with --- ... --- frontmatter
//   frontmatter-name          — `name:` field matches the folder name
//   frontmatter-description   — `description:` field present and ≥ 40 chars
//   description-trigger-style — descriptions start with "Use when…" (or command imperative)
//   max-body-length           — warn if body > 800 lines (configurable)
//   broken-skill-link         — `concepts/X` / `recipes/X` / `front-end/X` etc. cross-refs resolve
//   broken-relative-link      — `[text](path)` and `(../path)` resolve from the file's location
//   known-bugs-last-verified  — every bug heading in known-bugs has a last_verified date
//   known-bugs-freshness      — warn if any last_verified date is > 180 days old
//   yaml-manifest-coverage    — every SKILL.md is listed in skills.yaml (and vice versa)
//   mcp-tool-unknown          — backticked snake_case tool-like name in an MCP-mentioning file must be a real platform MCP tool
//   mcp-prefix-hardcoded      — backticked `mcp__...` fully-qualified tool name (prefix varies per environment)

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, dirname, basename, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
// True only when this file is run directly (`node lint-skills.mjs`), not when
// it's imported for its exports (e.g. by lint-skills.test.mjs) — otherwise
// importing it would run the whole library scan and call process.exit().
const isMainModule = process.argv[1] != null && import.meta.url === pathToFileURL(process.argv[1]).href;

// --- MCP tool reference checks ------------------------------------------------

const manifestPath = join(__dirname, 'mcp-tools.json');
const KNOWN_TOOLS = new Set(JSON.parse(readFileSync(manifestPath, 'utf8')).tools);

// Snake_case identifiers in backticks that look like MCP tool calls.
const TOOL_LIKE = /`([a-z][a-z0-9]*(?:_[a-z0-9]+){1,4})`/g;
const PREFIXED = /`(mcp__[A-Za-z0-9_-]+)`/g;
// Verbs that indicate an MCP tool rather than an unrelated snake_case term.
const TOOL_VERBS = /^(get|list|create|update|delete|search|execute|import|export|test|clone|repair|replace|resolve|restart|add|remove|discover)_/;

export function checkMcpReferences(file, content) {
  const findings = [];
  for (const m of content.matchAll(PREFIXED)) {
    findings.push({
      file, rule: 'mcp-prefix-hardcoded', index: m.index,
      message: `${m[1]} hardcodes a server prefix; the prefix varies per environment. Use the bare tool name.`,
    });
  }
  // mcp-tool-unknown only applies to files that actually discuss MCP — a file
  // that never mentions MCP cannot be making an MCP tool claim (and skills
  // that document SDK method calls like `space_sdk.add_user` are receiver-
  // qualified, not bare tool names, so they never match TOOL_LIKE anyway).
  if (!/MCP/i.test(content)) return findings;
  for (const m of content.matchAll(TOOL_LIKE)) {
    const name = m[1];
    if (!TOOL_VERBS.test(name)) continue;
    if (KNOWN_TOOLS.has(name)) continue;
    findings.push({
      file, rule: 'mcp-tool-unknown', index: m.index,
      message: `${name} is not a tool on the platform MCP server. See scripts/mcp-tools.json.`,
    });
  }
  return findings;
}

function main() {
const args = process.argv.slice(2);
const JSON_OUTPUT = args.includes('--json');
const WARNINGS_AS_ERRORS = args.includes('--warnings');
const ONLY_RULES = (() => {
  const idx = args.indexOf('--rules');
  if (idx < 0) return null;
  return new Set(args[idx + 1]?.split(',') ?? []);
})();

// --- helpers ----------------------------------------------------------------

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.') || entry === 'node_modules') continue;
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (s.isFile()) out.push(p);
  }
  return out;
}

function readSkillFiles() {
  const skillsDir = resolve(repoRoot, 'skills');
  return walk(skillsDir).filter((p) => basename(p) === 'SKILL.md');
}

function parseFrontmatter(text) {
  // Accept both LF and CRLF line endings
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) return null;
  const body = m[1];
  const out = {};
  // Lightweight YAML — supports `key: value` and `key: "value with colons"` only.
  for (const line of body.split(/\r?\n/)) {
    const km = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (km) {
      let val = km[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      out[km[1]] = val;
    }
  }
  return { meta: out, frontmatterLines: m[0].split(/\r?\n/).length };
}

function lineFromIndex(text, index) {
  return text.slice(0, index).split('\n').length;
}

// --- findings collector ------------------------------------------------------

const findings = [];
function add(level, rule, file, line, message, extra) {
  if (ONLY_RULES && !ONLY_RULES.has(rule)) return;
  findings.push({ level, rule, file: relative(repoRoot, file).replaceAll('\\', '/'), line, message, ...(extra ?? {}) });
}

// --- rules -------------------------------------------------------------------

const skillFiles = readSkillFiles();
const skillByFolder = new Map();   // folder name -> file path
const skillByPath = new Map();     // 'skills/.../SKILL.md' -> { meta, body }

for (const file of skillFiles) {
  const text = readFileSync(file, 'utf8');
  const fm = parseFrontmatter(text);
  const folder = basename(dirname(file));

  if (!fm) {
    add('error', 'frontmatter-present', file, 1, 'Missing YAML frontmatter at top of file');
    continue;
  }
  const meta = fm.meta;

  // frontmatter-name
  if (!meta.name) {
    add('error', 'frontmatter-name', file, 1, '`name:` field missing in frontmatter');
  } else if (meta.name !== folder) {
    add('error', 'frontmatter-name', file, 1, `\`name: ${meta.name}\` does not match folder \`${folder}\``);
  }

  // frontmatter-description
  if (!meta.description) {
    add('error', 'frontmatter-description', file, 1, '`description:` field missing in frontmatter');
  } else if (meta.description.length < 40) {
    add('warning', 'frontmatter-description', file, 1, `description is only ${meta.description.length} chars (target ≥ 40)`);
  }

  // description-trigger-style
  if (meta.description) {
    const d = meta.description.trim();
    const isCommand = file.includes('skills/commands/') || file.includes('skills\\commands\\');
    if (isCommand) {
      // Commands should be imperative ("Create a...", "Test a...", "Debug a..."): just check it starts with a verb-ish word
      if (/^use when/i.test(d)) {
        add('warning', 'description-trigger-style', file, 1, 'command descriptions should be imperative ("Create a…", "Test a…"), not "Use when…"');
      }
    } else {
      if (!/^use when/i.test(d)) {
        add('warning', 'description-trigger-style', file, 1, 'description should start with "Use when…" for AI trigger matching');
      }
    }
  }

  // max-body-length
  const totalLines = text.split('\n').length;
  if (totalLines > 800) {
    add('warning', 'max-body-length', file, 1, `${totalLines} lines (> 800 line soft limit); consider splitting`);
  }

  // mcp-tool-unknown, mcp-prefix-hardcoded
  for (const finding of checkMcpReferences(file, text)) {
    add('error', finding.rule, file, lineFromIndex(text, finding.index), finding.message);
  }

  skillByFolder.set(folder, file);
  skillByPath.set(relative(repoRoot, file).replaceAll('\\', '/'), { meta, text });
}

// --- broken-skill-link, broken-relative-link --------------------------------

const allSkillFolders = new Set(skillByFolder.keys());
// Also accept top-level section names (concepts, recipes, front-end, api, platform, commands)
const validSections = new Set(['concepts', 'recipes', 'front-end', 'api', 'platform', 'commands']);

const linkRegex = /\[[^\]]+\]\(([^)]+)\)/g;
// Only match references that are clearly skill links:
//   1. wrapped in backticks: `concepts/api-basics`
//   2. ending in /SKILL.md: concepts/api-basics/SKILL.md
//   3. preceded by `skills/`: skills/concepts/api-basics
// `api/v1`, `api/connections`, `api/v2` in URL paths must NOT match.
const inlineSkillRegex = /(?:`(concepts|recipes|front-end|api|platform|commands)\/([a-z0-9-]+)`|\b(concepts|recipes|front-end|api|platform|commands)\/([a-z0-9-]+)\/SKILL\.md\b|\bskills\/(concepts|recipes|front-end|api|platform|commands)\/([a-z0-9-]+))/g;

for (const [path, { text }] of skillByPath) {
  const file = resolve(repoRoot, path);
  // 1. relative markdown links
  let m;
  while ((m = linkRegex.exec(text))) {
    const target = m[1].split('#')[0].split('?')[0];
    if (!target || target.startsWith('http') || target.startsWith('mailto:')) continue;
    const idx = m.index;
    const line = lineFromIndex(text, idx);
    // Resolve relative to the file
    let resolved;
    try {
      resolved = resolve(dirname(file), target);
    } catch { continue; }
    if (!existsSync(resolved)) {
      add('error', 'broken-relative-link', file, line, `link \`${target}\` doesn't resolve (tried ${relative(repoRoot, resolved)})`);
    }
  }
  // 2. inline `concepts/X` style refs (the regex has three alternatives — pull section/name from whichever matched)
  inlineSkillRegex.lastIndex = 0;
  while ((m = inlineSkillRegex.exec(text))) {
    const section = m[1] || m[3] || m[5];
    const name    = m[2] || m[4] || m[6];
    if (!section || !name) continue;
    if (!validSections.has(section)) continue;
    if (!allSkillFolders.has(name)) {
      const line = lineFromIndex(text, m.index);
      add('warning', 'broken-skill-link', file, line, `inline ref \`${section}/${name}\` — no skill folder \`${name}\``);
    }
  }
}

// --- known-bugs checks -------------------------------------------------------

const knownBugsPath = resolve(repoRoot, 'skills/platform/known-bugs/SKILL.md');
if (existsSync(knownBugsPath)) {
  const text = readFileSync(knownBugsPath, 'utf8');
  const bugHeadings = [...text.matchAll(/^## (Bug \d+):/gm)];
  const lines = text.split('\n');
  const now = Date.now();
  const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;
  for (const m of bugHeadings) {
    const heading = m[1];
    const line = lineFromIndex(text, m.index);
    // Look in the next 5 lines for `last_verified: YYYY-MM-DD`
    const slice = lines.slice(line - 1, line + 5).join('\n');
    const lv = slice.match(/last_verified:\s*(\d{4})-(\d{2})-(\d{2})/);
    if (!lv) {
      add('error', 'known-bugs-last-verified', knownBugsPath, line, `${heading} has no \`last_verified:\` date within 5 lines of the heading`);
      continue;
    }
    const date = new Date(`${lv[1]}-${lv[2]}-${lv[3]}T00:00:00Z`).getTime();
    if (Number.isNaN(date)) {
      add('error', 'known-bugs-last-verified', knownBugsPath, line, `${heading} has malformed last_verified date "${lv[0]}"`);
      continue;
    }
    if (now - date > SIX_MONTHS_MS) {
      const daysOld = Math.floor((now - date) / (24 * 60 * 60 * 1000));
      add('warning', 'known-bugs-freshness', knownBugsPath, line, `${heading} last_verified is ${daysOld} days old (> 180); re-verify`);
    }
  }
}

// --- yaml-manifest-coverage --------------------------------------------------

const yamlPath = resolve(repoRoot, 'skills.yaml');
if (existsSync(yamlPath)) {
  const ytext = readFileSync(yamlPath, 'utf8');
  // Extract `path: skills/.../SKILL.md` values
  const pathsInManifest = new Set();
  for (const m of ytext.matchAll(/path:\s*(skills\/[\w\/-]+\/SKILL\.md)/g)) {
    pathsInManifest.add(m[1]);
  }
  // Every SKILL.md file should appear
  for (const path of skillByPath.keys()) {
    if (!pathsInManifest.has(path)) {
      add('warning', 'yaml-manifest-coverage', resolve(repoRoot, path), 1, `Not listed in skills.yaml (add an entry or this skill won't appear in generated indexes)`);
    }
  }
  // Every manifest path should exist
  for (const path of pathsInManifest) {
    if (!skillByPath.has(path)) {
      add('error', 'yaml-manifest-coverage', yamlPath, 1, `skills.yaml references ${path} but no SKILL.md exists there`);
    }
  }
}

// --- output -----------------------------------------------------------------

if (JSON_OUTPUT) {
  console.log(JSON.stringify({ findings }, null, 2));
} else {
  const byLevel = { error: [], warning: [] };
  for (const f of findings) byLevel[f.level]?.push(f);
  const allLevels = WARNINGS_AS_ERRORS ? ['error', 'warning'] : ['error', 'warning'];
  for (const level of allLevels) {
    for (const f of byLevel[level]) {
      console.log(`${level.toUpperCase().padEnd(7)} ${f.file}:${f.line} [${f.rule}] ${f.message}`);
    }
  }
  console.log('');
  console.log(`${findings.length} findings total: ${byLevel.error.length} errors, ${byLevel.warning.length} warnings`);
}

const failureCount = findings.filter((f) => f.level === 'error' || (WARNINGS_AS_ERRORS && f.level === 'warning')).length;
process.exit(failureCount > 0 ? 1 : 0);
}

if (isMainModule) main();
