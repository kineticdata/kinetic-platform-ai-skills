#!/usr/bin/env node
// Debug a Kinetic workflow run — uses /runs/{id}/tasks (NOT /triggers) to see every node's execution.
// See feedback_tasks_vs_triggers.md — non-deferrable handlers don't create triggers.
//
// Usage:
//   node scripts/workflow-debug.mjs                   # show most recent run
//   node scripts/workflow-debug.mjs 27                # show run #27
//   node scripts/workflow-debug.mjs --sub <id>        # most recent run sourced from that submission
//   node scripts/workflow-debug.mjs --watch           # poll latest run every 2s

import https from "node:https";
import { parseArgs } from "node:util";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const KINETIC = process.env.KINETIC_URL || "https://phoenix.kinetics.com";
const USER = process.env.KINETIC_USER || "john";
const PASS = process.env.KINETIC_PASS || "john1";
const AUTH = "Basic " + Buffer.from(`${USER}:${PASS}`).toString("base64");

const { values: args, positionals } = parseArgs({
  options: {
    sub: { type: "string" },
    watch: { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
  allowPositionals: true,
});

if (args.help) {
  console.log(`Usage:
  node scripts/workflow-debug.mjs          # latest run, tasks detail
  node scripts/workflow-debug.mjs 27       # run #27
  node scripts/workflow-debug.mjs --sub <submissionId>
  node scripts/workflow-debug.mjs --watch  # poll latest

Decodes handler errors from task results (incl. 4xx/5xx from kinetic_core_api_connection_v1).`);
  process.exit(0);
}

function api(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, KINETIC);
    const req = https.request(url, { method: "GET", headers: { "Authorization": AUTH } }, (res) => {
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch { resolve(Buffer.concat(chunks).toString()); }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

function color(s, c) { const codes = { red: 31, green: 32, yellow: 33, cyan: 36, gray: 90, bold: 1 }; return `\x1b[${codes[c] || 0}m${s}\x1b[0m`; }
function truncate(s, n) { s = String(s || ""); return s.length > n ? s.slice(0, n) + "…" : s; }

async function findRunId() {
  if (positionals[0] && /^\d+$/.test(positionals[0])) return parseInt(positionals[0], 10);
  if (args.sub) {
    const r = await api(`/app/components/task/app/api/v2/runs?limit=10&include=details`);
    const match = (r.runs || []).find(run => run.sourceId === args.sub);
    if (!match) { console.error(`No run found with sourceId=${args.sub}`); process.exit(1); }
    return match.id;
  }
  const r = await api(`/app/components/task/app/api/v2/runs?limit=1&include=details`);
  return r.runs?.[0]?.id;
}

async function showRun(runId) {
  const runs = await api(`/app/components/task/app/api/v2/runs?limit=100&include=details`);
  const run = (runs.runs || []).find(r => r.id === runId);
  if (!run) { console.error(`Run ${runId} not found`); return; }

  const tasks = await api(`/app/components/task/app/api/v2/runs/${runId}/tasks?include=details`);

  console.log(`${color("═".repeat(80), "gray")}`);
  console.log(color(`Run #${runId}`, "bold") + " — " + color(run.tree?.name || "?", "cyan") + " @ " + run.createdAt);
  console.log(`  source: ${run.source?.name}  |  sourceId: ${run.sourceId || "-"}  |  status: ${run.status === "Started" ? color(run.status + " (tasks-level detail below)", "yellow") : run.status}`);
  console.log(`  versionId: ${run.tree?.versionId}`);
  console.log();

  if (!tasks.tasks?.length) { console.log(color("  (no tasks recorded)", "gray")); return; }

  let anyFailed = false;
  for (const t of tasks.tasks) {
    const statusColor = t.status === "Closed" ? "green" : t.status === "Failed" ? "red" : "yellow";
    console.log(`  ${color(t.status, statusColor).padEnd(15)} ${color(t.nodeName, "bold")}  ${color("[" + t.definitionId + "]", "gray")}  (${t.duration}ms)`);
    const results = t.results || {};

    // Handler error surfacing
    if (results["Handler Error Message"]) {
      anyFailed = true;
      console.log(`     ${color("✗ Handler Error:", "red")} ${truncate(results["Handler Error Message"], 500)}`);
    }
    // Response preview
    if (results["Response Code"] && results["Response Body"]) {
      const codeColor = parseInt(results["Response Code"]) >= 400 ? "red" : "green";
      console.log(`     ${color(results["Response Code"], codeColor)} ${truncate(results["Response Body"], 300)}`);
    }
    // Echo output
    if (results.output) {
      console.log(`     ${color("output:", "gray")} ${truncate(results.output, 400)}`);
    }
    // Any other non-trivial results
    for (const [k, v] of Object.entries(results)) {
      if (["Handler Error Message", "Response Code", "Response Body", "output"].includes(k)) continue;
      if (v && String(v).length > 0) console.log(`     ${color(k + ":", "gray")} ${truncate(v, 200)}`);
    }
  }

  if (anyFailed) {
    console.log();
    console.log(color("  → One or more handler errors above. Check path prefixes, body JSON, ERB variables.", "yellow"));
    console.log(color("    See: feedback_core_api_handler_path.md, feedback_tree_xml_discipline.md", "gray"));
  }
  console.log();
}

async function main() {
  if (args.watch) {
    let lastRunId = 0;
    while (true) {
      const r = await api(`/app/components/task/app/api/v2/runs?limit=1&include=details`);
      const id = r.runs?.[0]?.id;
      if (id && id !== lastRunId) { lastRunId = id; await showRun(id); }
      await new Promise(r => setTimeout(r, 2000));
    }
  } else {
    const runId = await findRunId();
    if (!runId) { console.error("No run found."); process.exit(1); }
    await showRun(runId);
  }
}

main().catch(e => { console.error("ERROR:", e.message); process.exit(1); });
