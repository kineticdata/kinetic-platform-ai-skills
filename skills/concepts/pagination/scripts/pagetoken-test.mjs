#!/usr/bin/env node
// pagetoken-test.mjs — Test whether the Core API nextPageToken / pageToken cursor
// works end-to-end past the 1000-record cap on a given space + form.
//
// History: the Core API pageToken was historically unreliable past 1000 records —
// following nextPageToken with a wide `limit` stalled at the 1000-record cap and
// silently stopped, so the keyset cursor (limit=25 + createdAt) became the default.
// This re-tests the token per build, because the behavior is version-specific
// (verified FIXED on v7.0.0 / build 853d029).
//
// Strategy: establish ground truth with the trusted keyset walk, then drive the
// pageToken cursor at several limits and diff. PASS = every record returned exactly
// once, crosses 1000, and terminates cleanly (no token loop / empty-page-with-token).
//
// Usage:
//   KINETIC_URL=https://space.example.com KINETIC_USER=u KINETIC_PASS=p \
//     node pagetoken-test.mjs <kapp> <form>
//   (add NODE_TLS_REJECT_UNAUTHORIZED=0 for self-signed certs)
//
// Point it at a form with > 1000 records, or it can't exercise the bug.

const BASE = process.env.KINETIC_URL;
const USER = process.env.KINETIC_USER;
const PASS = process.env.KINETIC_PASS;
const KAPP = process.argv[2];
const FORM = process.argv[3];

if (!BASE || !USER || !PASS || !KAPP || !FORM) {
  console.error('Usage: KINETIC_URL=.. KINETIC_USER=.. KINETIC_PASS=.. node pagetoken-test.mjs <kapp> <form>');
  process.exit(2);
}
const AUTH = 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64');
const SAFETY_PAGES = 100000; // backstop against an infinite token loop

async function api(path) {
  const r = await fetch(BASE + '/app/api/v1' + path, { headers: { Authorization: AUTH } });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`HTTP ${r.status} ${path}: ${JSON.stringify(body).slice(0, 300)}`);
  return body;
}

// --- Ground truth: trusted keyset (limit=25 + createdAt cursor) ----------------
async function keysetWalk() {
  const ids = new Set();
  let last = null, pages = 0;
  while (true) {
    let q = last ? `createdAt < "${last}"` : '';
    let p = `/kapps/${KAPP}/forms/${FORM}/submissions?include=details&limit=25`;
    if (q) p += `&q=${encodeURIComponent(q)}`;
    const r = await api(p);
    const subs = r.submissions || [];
    pages++;
    for (const s of subs) ids.add(s.id);
    if (subs.length < 25) break;
    last = subs[subs.length - 1].createdAt;
  }
  return { ids, pages };
}

// --- Subject under test: follow nextPageToken as a real cursor ------------------
async function pageTokenWalk(limit) {
  const ids = new Set();
  const seenTokens = new Set();
  let token = null, pages = 0, totalSeen = 0;
  let dupRecords = 0, emptyPageWithToken = 0, repeatedToken = false, crossed1000 = false;

  while (pages < SAFETY_PAGES) {
    let p = `/kapps/${KAPP}/forms/${FORM}/submissions?include=details&limit=${limit}`;
    if (token) p += `&pageToken=${encodeURIComponent(token)}`;
    const r = await api(p);
    const subs = r.submissions || [];
    pages++;
    for (const s of subs) { if (ids.has(s.id)) dupRecords++; ids.add(s.id); }
    totalSeen += subs.length;
    if (totalSeen > 1000) crossed1000 = true;

    const next = r.nextPageToken;
    if (subs.length === 0 && next) emptyPageWithToken++;
    if (!next) break;                                          // clean termination
    if (seenTokens.has(next)) { repeatedToken = true; break; } // token loop
    seenTokens.add(next);
    token = next;
  }
  return { ids, pages, totalSeen, dupRecords, emptyPageWithToken, repeatedToken, crossed1000,
           hitSafety: pages >= SAFETY_PAGES };
}

function diff(truthIds, gotIds) {
  let missing = 0, extra = 0;
  for (const id of truthIds) if (!gotIds.has(id)) missing++;
  for (const id of gotIds) if (!truthIds.has(id)) extra++;
  return { missing, extra };
}

// --- Runner --------------------------------------------------------------------
const results = [];
function check(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

console.log(`\nCore API pageToken test suite`);
console.log(`Target: ${BASE}  ${KAPP}/${FORM}\n`);

console.log('Establishing ground truth (keyset walk)…');
const truth = await keysetWalk();
const N = truth.ids.size;
console.log(`  ground-truth unique records = ${N} (over ${truth.pages} keyset pages)\n`);
if (N <= 1000) {
  console.log(`WARNING: form has only ${N} records — cannot exercise the >1000 bug. Pick a bigger form.\n`);
}

for (const limit of [25, 100, 500, 1000]) {
  console.log(`--- pageToken cursor @ limit=${limit} ---`);
  const t = Date.now();
  const w = await pageTokenWalk(limit);
  const d = diff(truth.ids, w.ids);
  console.log(`  walked ${w.pages} pages, saw ${w.totalSeen} rows, ${w.ids.size} unique (${Date.now() - t}ms)`);

  check(`limit=${limit}: retrieved all ${N} records`, d.missing === 0, d.missing ? `${d.missing} missing` : '');
  check(`limit=${limit}: crossed the 1000-record boundary`, w.crossed1000, w.crossed1000 ? `saw ${w.totalSeen}` : `stalled at ${w.totalSeen}`);
  check(`limit=${limit}: no duplicate records across pages`, w.dupRecords === 0, w.dupRecords ? `${w.dupRecords} dups` : '');
  check(`limit=${limit}: no extra/foreign records`, d.extra === 0, d.extra ? `${d.extra} extra` : '');
  check(`limit=${limit}: terminated cleanly`,
        !w.repeatedToken && w.emptyPageWithToken === 0 && !w.hitSafety,
        [w.repeatedToken && 'token repeated', w.emptyPageWithToken && 'empty page w/ token',
         w.hitSafety && 'hit safety cap'].filter(Boolean).join(', '));
  console.log('');
}

const failed = results.filter(r => !r.pass);
console.log('='.repeat(60));
console.log(`RESULT: ${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log(`\npageToken is STILL BUGGY on this build — failing checks:`);
  for (const f of failed) console.log(`  • ${f.name}${f.detail ? ' — ' + f.detail : ''}`);
  console.log(`\nRecommendation: use the limit=25 + createdAt keyset cursor.`);
  process.exit(1);
} else {
  console.log(`\npageToken WORKS end-to-end past 1000 records on this build.`);
  process.exit(0);
}
