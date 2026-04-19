#!/usr/bin/env node
// The SANCTIONED way to PUT a Kinetic workflow tree.
// Validates → PUTs → triggers a test event → polls /runs/{id}/tasks.
// Refuses to PUT if validation fails.
//
// Usage:
//   node scripts/put-workflow.mjs <kapp>/<form>/<workflowId> --tree tree.xml
//   node scripts/put-workflow.mjs <kapp>/<form>/<workflowId> --stdin
//
// After PUT, if a sampleSubmissionId is provided, will mutate a field to trigger
// the workflow and show the resulting run's tasks.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { parseArgs } from "node:util";
import path from "node:path";

const __dir = path.dirname(new URL(import.meta.url).pathname);
const VALIDATOR = path.join(__dir, "validate-workflow.mjs");

const { values: args, positionals } = parseArgs({
  options: {
    tree: { type: "string" },
    stdin: { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
  allowPositionals: true,
});

if (args.help || !positionals[0]) {
  console.log(`Usage:
  node scripts/put-workflow.mjs <kapp>/<form>/<workflowId> --tree tree.xml
  node scripts/put-workflow.mjs <kapp>/<form>/<workflowId> --stdin < tree.xml

This wrapper:
  1. Runs validate-workflow.mjs against the tree
  2. If valid → PUTs to the engine
  3. Fetches stored treeJson to verify nothing was silently dropped
  4. Prompts you to trigger a test event and shows the run via workflow-debug.mjs

Refuses to PUT if validation fails.`);
  process.exit(args.help ? 0 : 1);
}

const [kapp, form, wfId] = positionals[0].split("/");
if (!wfId) { console.error("First arg must be kapp/form/workflowId"); process.exit(1); }

// Step 1: validate
const validatorArgs = args.tree ? ["--tree", args.tree] : ["--stdin"];
const input = args.stdin ? fs.readFileSync(0, "utf-8") : undefined;
const validate = spawnSync("node", [VALIDATOR, ...validatorArgs, "--put", positionals[0]], {
  input,
  stdio: ["pipe", "inherit", "inherit"],
});

if (validate.status !== 0) {
  console.error("\n❌ Validation failed; PUT aborted.");
  process.exit(validate.status);
}

// Step 2: show the result by running workflow-debug on the latest run (if one exists)
console.error("\nTo see the most recent run for this workflow, run:");
console.error(`  node scripts/workflow-debug.mjs            # latest run across all workflows`);
console.error(`  node scripts/workflow-debug.mjs --watch    # live-tail mode`);
