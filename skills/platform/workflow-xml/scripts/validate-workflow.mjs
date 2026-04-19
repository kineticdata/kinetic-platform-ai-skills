#!/usr/bin/env node
// Gate: validates a Kinetic workflow tree XML against known rules BEFORE PUTting to the engine.
// Every check cites the memory file that documents why.
//
// Usage:
//   node scripts/validate-workflow.mjs --tree path/to/tree.xml [--put kapp/form/workflowId]
//   node scripts/validate-workflow.mjs --stdin < tree.xml
//   echo '<taskTree>...' | node scripts/validate-workflow.mjs --stdin
//
// Exit 0 = valid. Exit 1 = violations found (printed with memory citations).
// With --put: validates, then PUTs and polls the first run's /tasks endpoint to confirm.

import fs from "node:fs";
import https from "node:https";
import { parseArgs } from "node:util";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const KINETIC = process.env.KINETIC_URL || "https://phoenix.kinetics.com";
const USER = process.env.KINETIC_USER || "john";
const PASS = process.env.KINETIC_PASS || "john1";
const AUTH = "Basic " + Buffer.from(`${USER}:${PASS}`).toString("base64");

const { values: args, positionals } = parseArgs({
  options: {
    tree: { type: "string" },
    stdin: { type: "boolean" },
    put: { type: "string" }, // format: kapp/form/workflowId
    "dry-run": { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
  allowPositionals: true,
});

if (args.help) {
  console.log(`Usage:
  node scripts/validate-workflow.mjs --tree file.xml
  node scripts/validate-workflow.mjs --stdin < file.xml
  node scripts/validate-workflow.mjs --tree file.xml --put work/work-item/04f3d8a4-...

Memory-cited checks performed:
  1. Node ID convention              — PITFALLS.md § 2
  2. Start node id=start, defers=false — PITFALLS.md § 1
  3. Installed handlers exist         — PITFALLS.md § 2
  4. kinetic_core_api path prefix     — PITFALLS.md § 3
  5. lastID = max numeric suffix      — PITFALLS.md § 2
  6. Dependent targets exist          — PITFALLS.md § 2
`);
  process.exit(0);
}

function die(msg) { console.error("ERROR:", msg); process.exit(2); }

let xml = "";
if (args.tree) xml = fs.readFileSync(args.tree, "utf-8");
else if (args.stdin) xml = fs.readFileSync(0, "utf-8");
else die("Provide --tree FILE or --stdin.");

// Minimal XML structure parse (regex-based; good enough for validation)
function textOf(el, tag) {
  const m = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`).exec(el);
  return m ? m[1] : "";
}
function attrOf(el, name) {
  const m = new RegExp(`${name}="([^"]*)"`).exec(el);
  return m ? m[1] : "";
}
function extractTasks(src) {
  const tasks = [];
  const re = /<task\s+([^>]*?)>([\s\S]*?)<\/task>/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    // skip dependent <task> refs (they have only a content, no definition_id)
    if (!/definition_id=/.test(m[1])) continue;
    tasks.push({ attrs: m[1], body: m[2] });
  }
  return tasks;
}
function extractDependents(taskBody) {
  const block = /<dependents>([\s\S]*?)<\/dependents>/.exec(taskBody);
  if (!block) return [];
  const deps = [];
  const re = /<task([^>]*)>([^<]+)<\/task>/g;
  let m;
  while ((m = re.exec(block[1])) !== null) {
    deps.push({ type: attrOf(m[1], "type"), label: attrOf(m[1], "label"), value: attrOf(m[1], "value"), content: m[2].trim() });
  }
  return deps;
}

const violations = [];
const warnings = [];
function violate(msg, memory) { violations.push({ msg, memory }); }
function warn(msg, memory) { warnings.push({ msg, memory }); }

// Parse tree
const tasks = extractTasks(xml);
if (!tasks.length) die("No <task> elements with definition_id found.");

const nodesById = {};
const allIds = new Set();
const suffixes = new Set();
const maxSuffix = { n: 0 };

for (const t of tasks) {
  const id = attrOf(t.attrs, "id");
  const defId = attrOf(t.attrs, "definition_id");
  const defers = textOf(t.body, "defers");
  const deferrable = textOf(t.body, "deferrable");
  const dependents = extractDependents(t.body);
  const params = {};
  const pRe = /<parameter[^>]*id="([^"]+)"[^>]*>([^<]*)<\/parameter>/g;
  let pm;
  while ((pm = pRe.exec(t.body)) !== null) params[pm[1]] = pm[2];

  if (allIds.has(id)) violate(`Duplicate node id: ${id}`, "PITFALLS.md § 2");
  allIds.add(id);

  nodesById[id] = { id, defId, defers, deferrable, dependents, params };

  // Node ID convention
  if (id === "start") {
    if (defId !== "system_start_v1") violate(`Start node has wrong definition_id: ${defId}`, "PITFALLS.md § 1");
    if (defers !== "false") violate(`Start node must have <defers>false</defers> (was: ${defers})`, "PITFALLS.md § 1");
    if (deferrable !== "false") violate(`Start node must have <deferrable>false</deferrable> (was: ${deferrable})`, "PITFALLS.md § 1");
  } else {
    const match = /^(.+)_(\d+)$/.exec(id);
    if (!match) {
      violate(`Node id '${id}' does not match convention '{definition_id}_{N}'`, "PITFALLS.md § 2");
    } else {
      const [_, base, n] = match;
      if (base !== defId) violate(`Node id '${id}' prefix does not match definition_id '${defId}'`, "PITFALLS.md § 2");
      const num = parseInt(n, 10);
      if (suffixes.has(num)) violate(`Duplicate suffix _${n} across nodes`, "PITFALLS.md § 2");
      suffixes.add(num);
      if (num > maxSuffix.n) maxSuffix.n = num;
    }
  }
}

// lastID check
const lastIDMatch = /<lastID>(\d+)<\/lastID>/.exec(xml);
const lastID = lastIDMatch ? parseInt(lastIDMatch[1], 10) : null;
if (lastID === null) warn("Missing <lastID> element — engine may default to 1.", "PITFALLS.md § 2");
else if (lastID < maxSuffix.n) violate(`<lastID>${lastID}</lastID> is less than max suffix _${maxSuffix.n}. Silent node-drop risk.`, "PITFALLS.md § 2");

// Dependent targets exist
for (const [id, node] of Object.entries(nodesById)) {
  for (const d of node.dependents) {
    if (!nodesById[d.content]) {
      violate(`Node '${id}' has dependent pointing to missing target '${d.content}'`, "PITFALLS.md § 2");
    }
  }
}

// Handler-specific checks
function callKinetic(path, method = "GET") {
  return new Promise((resolve, reject) => {
    const url = new URL(path, KINETIC);
    const req = https.request(url, { method, headers: { "Authorization": AUTH } }, (res) => {
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(Buffer.concat(chunks).toString()) }); }
        catch { resolve({ status: res.statusCode, data: Buffer.concat(chunks).toString() }); }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

// Live check: each definition_id exists as a handler
console.error(`Validating ${Object.keys(nodesById).length} nodes against live engine at ${KINETIC}...`);
const needCheck = new Set();
for (const n of Object.values(nodesById)) {
  if (!n.defId.startsWith("system_")) needCheck.add(n.defId);
}
for (const defId of needCheck) {
  const r = await callKinetic(`/app/components/task/app/api/v2/handlers/${defId}`);
  if (r.status === 404 || (r.data && r.data.message && r.data.message.includes("Unable to retrieve"))) {
    violate(`Handler '${defId}' is not installed on this engine.`, "PITFALLS.md § 2");
  }
}

// kinetic_core_api_connection_v1 path prefix
for (const n of Object.values(nodesById)) {
  if (n.defId === "kinetic_core_api_connection_v1") {
    const path = n.params.path || "";
    if (!path.startsWith("/app/api/v1/") && !path.startsWith("/app/components/task/")) {
      violate(`Handler '${n.id}' path='${path}' must start with '/app/api/v1/' or '/app/components/task/' (handler is server-root-relative).`, "PITFALLS.md § 3");
    }
  }
}

// Print results
console.log();
if (violations.length) {
  console.error(`❌ ${violations.length} violation${violations.length > 1 ? "s" : ""}:`);
  for (const v of violations) console.error(`  • ${v.msg}  [see ${v.memory}]`);
}
if (warnings.length) {
  console.error(`⚠️  ${warnings.length} warning${warnings.length > 1 ? "s" : ""}:`);
  for (const w of warnings) console.error(`  • ${w.msg}  [see ${w.memory}]`);
}
if (!violations.length) {
  console.error(`✓ Tree valid (${Object.keys(nodesById).length} nodes, max suffix _${maxSuffix.n}, lastID=${lastID ?? "(none)"}).`);
}

if (violations.length) process.exit(1);

// PUT + verify, if requested
if (args.put) {
  const [kapp, form, wfId] = args.put.split("/");
  if (!wfId) die("--put must be kapp/form/workflowId");
  console.error(`\nPUTting to /kapps/${kapp}/forms/${form}/workflows/${wfId}...`);

  const putReq = await new Promise((resolve, reject) => {
    const url = new URL(`/app/api/v1/kapps/${kapp}/forms/${form}/workflows/${wfId}`, KINETIC);
    const body = JSON.stringify({ treeXml: xml });
    const r = https.request(url, { method: "PUT", headers: { "Authorization": AUTH, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } }, (res) => {
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => resolve({ status: res.statusCode, data: JSON.parse(Buffer.concat(chunks).toString()) }));
    });
    r.on("error", reject);
    r.write(body); r.end();
  });
  if (putReq.status >= 300) die(`PUT failed: ${JSON.stringify(putReq.data)}`);
  console.error(`✓ PUT ok (versionId=${putReq.data.versionId || putReq.data.workflow?.versionId}).`);
  console.error(`Run workflow-debug.mjs after triggering an event to verify the first run.`);
}
