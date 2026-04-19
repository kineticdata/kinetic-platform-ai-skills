#!/usr/bin/env node
// One-shot installer: adds the Kinetic workflow PreToolUse hook to ~/.claude/settings.json.
// Idempotent — safe to run multiple times. Merges with any existing hooks.
//
// Usage: node install-hook.mjs
//        node install-hook.mjs --uninstall

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const __dir = path.dirname(new URL(import.meta.url).pathname);
const HOOK_PATH = path.join(__dir, "hook-check-workflow-put.mjs");
const SETTINGS = path.join(os.homedir(), ".claude", "settings.json");
const UNINSTALL = process.argv.includes("--uninstall");

if (!fs.existsSync(HOOK_PATH)) {
  console.error(`ERROR: Hook script not found at ${HOOK_PATH}`);
  console.error("Expected this script to live next to hook-check-workflow-put.mjs.");
  process.exit(1);
}

// Read or create settings.json
let settings = {};
let existed = false;
if (fs.existsSync(SETTINGS)) {
  existed = true;
  try { settings = JSON.parse(fs.readFileSync(SETTINGS, "utf-8")); }
  catch (e) { console.error(`ERROR: ${SETTINGS} is not valid JSON: ${e.message}`); process.exit(1); }
} else {
  fs.mkdirSync(path.dirname(SETTINGS), { recursive: true });
}

// Build the hook entry
const hookCommand = `node ${HOOK_PATH}`;

// Ensure hooks.PreToolUse array exists
settings.hooks ||= {};
settings.hooks.PreToolUse ||= [];

// Find any existing Bash matcher entry
let bashEntry = settings.hooks.PreToolUse.find(e => e.matcher === "Bash");

if (UNINSTALL) {
  if (!bashEntry) { console.log("No Bash hook entry found — nothing to remove."); process.exit(0); }
  bashEntry.hooks = bashEntry.hooks.filter(h => !(h.type === "command" && h.command?.includes("hook-check-workflow-put.mjs")));
  if (bashEntry.hooks.length === 0) {
    settings.hooks.PreToolUse = settings.hooks.PreToolUse.filter(e => e !== bashEntry);
  }
  if (settings.hooks.PreToolUse.length === 0) delete settings.hooks.PreToolUse;
  if (Object.keys(settings.hooks).length === 0) delete settings.hooks;
  fs.writeFileSync(SETTINGS, JSON.stringify(settings, null, 2) + "\n");
  console.log(`✓ Uninstalled workflow-tree hook from ${SETTINGS}`);
  process.exit(0);
}

// Install — create matcher entry if absent, add command hook if absent
if (!bashEntry) {
  bashEntry = { matcher: "Bash", hooks: [] };
  settings.hooks.PreToolUse.push(bashEntry);
}
bashEntry.hooks ||= [];

const already = bashEntry.hooks.some(h => h.type === "command" && h.command?.includes("hook-check-workflow-put.mjs"));
if (already) {
  // Update path in case the repo was moved
  for (const h of bashEntry.hooks) {
    if (h.type === "command" && h.command?.includes("hook-check-workflow-put.mjs") && h.command !== hookCommand) {
      console.log(`Updating hook path: ${h.command}`);
      console.log(`                 → ${hookCommand}`);
      h.command = hookCommand;
    }
  }
} else {
  bashEntry.hooks.push({ type: "command", command: hookCommand });
}

fs.writeFileSync(SETTINGS, JSON.stringify(settings, null, 2) + "\n");

console.log(`✓ Installed workflow-tree validation hook.`);
console.log(`  Settings file: ${SETTINGS}${existed ? "" : " (created)"}`);
console.log(`  Hook command:  ${hookCommand}`);
console.log();
console.log(`Open Claude Code's /hooks menu once (or restart the session) to activate.`);
console.log(`To uninstall: node ${path.relative(process.cwd(), import.meta.url.replace("file://", ""))} --uninstall`);
