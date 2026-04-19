#!/usr/bin/env node
// Claude Code PreToolUse hook: block raw tree PUTs that bypass validate-workflow.mjs.
//
// Install in ~/.claude/settings.json (adjust path to your local clone of the skills repo):
// {
//   "hooks": {
//     "PreToolUse": [
//       { "matcher": "Bash",
//         "hooks": [{ "type": "command",
//                     "command": "node /absolute/path/to/skills/skills/platform/workflow-xml/scripts/hook-check-workflow-put.mjs" }] }
//     ]
//   }
// }
//
// Reads the tool_input JSON on stdin. For Bash tool use, checks if command modifies a
// Kinetic workflow tree (/workflows/{id}, POST /trees, PUT /trees/*). If so, requires
// that either:
//   (a) the command invokes validate-workflow.mjs or put-workflow.mjs, OR
//   (b) the environment variable KINETIC_SKIP_VALIDATION is set (explicit opt-out)
//
// Exit 0  → allow
// Exit 2  → block (stderr is shown to Claude)

import fs from "node:fs";

const input = JSON.parse(fs.readFileSync(0, "utf-8"));
if (input.tool_name !== "Bash") process.exit(0);
const cmd = input.tool_input?.command || "";

// Detect tree-modifying operations
const modifiesTree =
  /\bPUT\b.*\/workflows\/[0-9a-f-]{8,}/.test(cmd) ||
  /\bPOST\b.*\/trees\b/.test(cmd) ||
  /\/kapps\/[^ ]+\/workflows\/[0-9a-f-]{8,}/.test(cmd) ||
  /\/app\/components\/task\/app\/api\/v2\/trees/.test(cmd);

if (!modifiesTree) process.exit(0);

// Allow if the command already uses one of the sanctioned scripts
const sanctioned =
  /validate-workflow\.mjs/.test(cmd) ||
  /put-workflow\.mjs/.test(cmd);

if (sanctioned) process.exit(0);

// Allow explicit opt-out (accept either name)
if (process.env.KINETIC_SKIP_VALIDATION === "1" || process.env.PHOENIX_SKIP_VALIDATION === "1") process.exit(0);

// Block
console.error(`⛔ BLOCKED: command appears to modify a Kinetic workflow tree without validation.

  command: ${cmd.slice(0, 200)}${cmd.length > 200 ? "..." : ""}

Required: route through skills/skills/platform/workflow-xml/scripts/put-workflow.mjs
or .../validate-workflow.mjs.

Bypass rules (rare, only when intentional):
  KINETIC_SKIP_VALIDATION=1 <your command>

Why: skills/platform/workflow-xml/PITFALLS.md
Scripts: skills/platform/workflow-xml/scripts/README.md`);
process.exit(2);
