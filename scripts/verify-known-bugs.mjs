#!/usr/bin/env node
// Verify each documented platform bug against a live Kinetic environment.
// On a passing reproduction, bump the bug's `last_verified` date in the SKILL.md.
// On a failing reproduction (the platform has fixed the bug), report it so a human
// can decide whether to remove the entry.
//
// Usage:
//   node scripts/verify-known-bugs.mjs \
//     --space https://demo.kinops.io \
//     --user <admin-username> \
//     --pass <admin-password> \
//     [--bug 4]                        # verify just one bug by number
//     [--dry-run]                      # print results, don't write last_verified
//     [--quiet]                        # only print failures
//
// Add bug-specific repro functions in `reproductions/` below. Each function takes
// `{ space, user, pass }` and returns one of:
//   { verdict: 'REPRODUCED' }              — bug still present, bump last_verified
//   { verdict: 'FIXED', detail }           — bug appears resolved, do NOT bump
//   { verdict: 'INCONCLUSIVE', detail }    — environment can't determine, do NOT bump
//
// CI use: gate on `--exit-on-fixed` to fail the build when any bug appears resolved,
// so a human reviews whether to remove the entry.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const knownBugsPath = resolve(repoRoot, 'skills/platform/known-bugs/SKILL.md');

// --- args -------------------------------------------------------------------

const args = process.argv.slice(2);
const arg = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const flag = (k) => args.includes(k);

const config = {
  space: arg('--space') ?? process.env.KINETIC_SPACE,
  user:  arg('--user')  ?? process.env.KINETIC_USER,
  pass:  arg('--pass')  ?? process.env.KINETIC_PASS,
  onlyBug: arg('--bug'),
  dryRun: flag('--dry-run'),
  quiet:  flag('--quiet'),
  exitOnFixed: flag('--exit-on-fixed'),
};

if (!config.space || !config.user || !config.pass) {
  console.error('Missing --space / --user / --pass (or KINETIC_SPACE/KINETIC_USER/KINETIC_PASS env vars)');
  console.error('Usage: node scripts/verify-known-bugs.mjs --space <url> --user <u> --pass <p> [--bug N] [--dry-run]');
  process.exit(2);
}

// --- fetch helpers ----------------------------------------------------------

const basicAuth = 'Basic ' + Buffer.from(`${config.user}:${config.pass}`).toString('base64');

async function api(method, path, body) {
  const url = `${config.space.replace(/\/$/, '')}${path}`;
  const init = {
    method,
    headers: { 'Authorization': basicAuth, 'Accept': 'application/json' },
  };
  if (body != null) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const res = await fetch(url, init);
  let json;
  try { json = await res.json(); } catch { json = null; }
  return { status: res.status, body: json, raw: res };
}

// --- reproductions ----------------------------------------------------------
//
// One entry per bug. Add new bugs by adding entries. The `name` MUST match the
// "## Bug N: Title" heading line in known-bugs/SKILL.md exactly (after the colon).

const reproductions = [
  {
    bug: 1,
    name: '/trees/{title}/export Returns Wrong Tree',
    async run() {
      // The bug requires a tree with versionId="1" modified via Core API PUT.
      // This is environment-specific to reproduce; the verification here is a smoke test
      // that the export endpoint at least responds. A full repro requires test fixtures.
      const r = await api('GET', '/app/components/task/app/api/v2/trees?include=details&limit=1');
      if (r.status !== 200) return { verdict: 'INCONCLUSIVE', detail: `trees endpoint returned ${r.status}` };
      return { verdict: 'INCONCLUSIVE', detail: 'requires a test fixture tree with versionId=1; smoke test only' };
    },
  },
  {
    bug: 2,
    name: 'run.tree Is an Object, Not a String',
    async run() {
      const r = await api('GET', '/app/components/task/app/api/v2/runs?include=details&limit=1');
      if (r.status !== 200 || !r.body?.runs?.length) {
        return { verdict: 'INCONCLUSIVE', detail: `no runs available (status ${r.status})` };
      }
      const tree = r.body.runs[0].tree;
      if (typeof tree === 'object' && tree != null) return { verdict: 'REPRODUCED' };
      if (typeof tree === 'string') return { verdict: 'FIXED', detail: `run.tree is now a string ("${tree}")` };
      return { verdict: 'INCONCLUSIVE', detail: `run.tree is ${typeof tree}` };
    },
  },
  {
    bug: 3,
    name: '/submissions/{id}/submit Does Not Exist',
    async run() {
      // Need any submission ID. Find one.
      const list = await api('GET', '/app/api/v1/kapps?include=details&limit=1');
      if (list.status !== 200 || !list.body?.kapps?.length) {
        return { verdict: 'INCONCLUSIVE', detail: 'no kapps available' };
      }
      const kappSlug = list.body.kapps[0].slug;
      const subs = await api('GET', `/app/api/v1/kapps/${kappSlug}/submissions?limit=1`);
      const subId = subs.body?.submissions?.[0]?.id;
      if (!subId) return { verdict: 'INCONCLUSIVE', detail: 'no submissions to probe' };
      const probe = await api('POST', `/app/api/v1/submissions/${subId}/submit`);
      if (probe.status === 404) return { verdict: 'REPRODUCED' };
      return { verdict: 'FIXED', detail: `/submit returned ${probe.status} (was 404)` };
    },
  },
  {
    bug: 4,
    name: 'WebAPI timeout > 30 Causes 500',
    async run() {
      // This one needs an actual WebAPI to invoke. Reproducing destructively against
      // an unknown environment is risky — orphan runs are produced. Skipped in default
      // verification unless a known-safe webapi is configured.
      return { verdict: 'INCONCLUSIVE', detail: 'destructive repro (creates orphan run); skipped by default' };
    },
  },
  {
    bug: 5,
    name: 'Security Policy Evaluation Returns 500 Instead of 403',
    async run() {
      // Would require provisioning a failing policy. Skip by default.
      return { verdict: 'INCONCLUSIVE', detail: 'requires provisioning a known-bad policy; skipped by default' };
    },
  },
  {
    bug: 6,
    name: 'SMTP Handler Omits Handler Error Message on Success',
    async run() {
      // Would require provisioning a tree that exercises smtp_email_send_v1.
      return { verdict: 'INCONCLUSIVE', detail: 'requires provisioned SMTP workflow; skipped by default' };
    },
  },
  {
    bug: 7,
    name: 'GET /errors Hard-Caps at 5 Results',
    async run() {
      const r = await api('GET', '/app/components/task/app/api/v2/errors?limit=100');
      if (r.status !== 200) return { verdict: 'INCONCLUSIVE', detail: `errors endpoint returned ${r.status}` };
      const count = r.body?.errors?.length ?? 0;
      // If there happen to be < 5 errors in the system, we can't conclude.
      if (count < 5) return { verdict: 'INCONCLUSIVE', detail: `environment has only ${count} errors; need ≥ 5 to verify cap` };
      if (count === 5) return { verdict: 'REPRODUCED' };
      return { verdict: 'FIXED', detail: `endpoint returned ${count} results (cap appears removed)` };
    },
  },
];

// --- runner -----------------------------------------------------------------

const today = new Date().toISOString().slice(0, 10);

let toBump = []; // [{bug, name}]
let fixed = [];  // [{bug, name, detail}]
let inconclusive = [];

for (const r of reproductions) {
  if (config.onlyBug && String(r.bug) !== String(config.onlyBug)) continue;
  if (!config.quiet) console.log(`Bug ${r.bug}: ${r.name}`);
  try {
    const result = await r.run();
    switch (result.verdict) {
      case 'REPRODUCED':
        if (!config.quiet) console.log(`  ✓ REPRODUCED — bumping last_verified to ${today}`);
        toBump.push(r);
        break;
      case 'FIXED':
        console.log(`  ✗ APPEARS FIXED — ${result.detail}`);
        fixed.push({ ...r, detail: result.detail });
        break;
      case 'INCONCLUSIVE':
        if (!config.quiet) console.log(`  ? INCONCLUSIVE — ${result.detail}`);
        inconclusive.push({ ...r, detail: result.detail });
        break;
    }
  } catch (err) {
    console.error(`  ! ERROR — ${err?.message ?? err}`);
    inconclusive.push({ ...r, detail: `repro threw: ${err?.message}` });
  }
}

// --- update last_verified ----------------------------------------------------

if (toBump.length > 0 && !config.dryRun) {
  if (!existsSync(knownBugsPath)) {
    console.error(`Cannot bump — ${knownBugsPath} doesn't exist`);
    process.exit(2);
  }
  let text = readFileSync(knownBugsPath, 'utf8');
  let bumped = 0;
  for (const r of toBump) {
    const pattern = new RegExp(
      `(## Bug ${r.bug}:[^\\n]+\\r?\\n\\r?\\n\`last_verified:\\s*)\\d{4}-\\d{2}-\\d{2}(\`[^\\n]*)`,
    );
    const next = text.replace(pattern, `$1${today}$2`);
    if (next !== text) {
      text = next;
      bumped++;
    }
  }
  writeFileSync(knownBugsPath, text, 'utf8');
  if (!config.quiet) console.log(`\nBumped last_verified for ${bumped} of ${toBump.length} reproduced bugs.`);
} else if (toBump.length > 0 && config.dryRun) {
  console.log(`\nDry run — would have bumped ${toBump.length} bugs:`, toBump.map((r) => r.bug).join(', '));
}

// --- summary + exit ---------------------------------------------------------

console.log('');
console.log(`Summary: ${toBump.length} reproduced, ${fixed.length} appear fixed, ${inconclusive.length} inconclusive`);

if (fixed.length > 0) {
  console.log('\nReview required — bugs that appear to be platform-fixed:');
  for (const f of fixed) console.log(`  Bug ${f.bug}: ${f.name} — ${f.detail}`);
  if (config.exitOnFixed) {
    process.exit(1);
  }
}
