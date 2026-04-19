# Kinetic Workflow Tree Gate Scripts

Mechanical enforcement of the rules documented in `../SKILL.md`. These exist because the Kinetic Task engine silently accepts malformed tree XML — nodes are dropped, handlers 404, runs appear to succeed when they didn't. Every rule these scripts enforce cost multiple hours to rediscover. Don't rediscover them again.

## What's here

| Script | Purpose |
|---|---|
| **`validate-workflow.mjs`** | Static + live validation of a tree XML. Refuses invalid trees. Cites the rule violated. |
| **`put-workflow.mjs`** | Atomic validate + PUT wrapper. The sanctioned way to push a tree. |
| **`workflow-debug.mjs`** | Inspects a run via `/runs/{id}/tasks` (NOT `/triggers` — non-deferrable handlers execute inline and never appear in `/triggers`). |
| **`hook-check-workflow-put.mjs`** | Claude Code `PreToolUse` hook. Blocks raw Bash `curl PUT .../workflows/{id}` calls that bypass the validator. |
| **`install-hook.mjs`** | One-shot installer: adds the hook to `~/.claude/settings.json` with the right absolute path for this clone. |

## Quick install

From any machine where this skills repo is cloned:

```bash
node skills/platform/workflow-xml/scripts/install-hook.mjs
```

That's it. The script:
1. Detects the absolute path to itself (your local clone location)
2. Reads your `~/.claude/settings.json` (or creates it)
3. Adds or updates the `PreToolUse` hook for `Bash` — merging with any existing hooks, never replacing
4. Prints a verification line so you can confirm

After running, open Claude Code's `/hooks` menu once (or restart the session) to activate the watcher.

## Rules enforced by the validator

Every rule below is documented with symptoms, causes, and full explanation in [../PITFALLS.md](../PITFALLS.md).

| Rule | Why it exists | Reference |
|---|---|---|
| Start node: `id="start"`, `defers=false`, `deferrable=false` | Wrong id or defers → `RuntimeException`, zero triggers, no error. | PITFALLS § 1 |
| Non-start node IDs match `{definition_id}_{N}`, suffixes globally unique | Duplicate or non-conforming suffixes cause silent node-drop. | PITFALLS § 2 |
| `<lastID>` equals max suffix used | Mismatched lastID triggers silent node-drop too. | PITFALLS § 2 |
| Every dependent `content` resolves to a node ID in the tree | Dangling dependents cause NPE on trigger advance. | PITFALLS § 2 |
| Every `definition_id` exists as an installed handler on target engine | Referencing an uninstalled handler → NPE, no visible error. | PITFALLS § 5 |
| `kinetic_core_api_connection_v1` path starts with `/app/api/v1/` or `/app/components/task/` | Handler is server-root-relative; wrong prefix silently 404s. | PITFALLS § 3 |

## Usage

### Validate a tree XML file
```bash
node skills/platform/workflow-xml/scripts/validate-workflow.mjs --tree tree.xml
```

### Validate from stdin
```bash
cat tree.xml | node skills/platform/workflow-xml/scripts/validate-workflow.mjs --stdin
```

### Atomic validate + PUT (the right way to ship a tree)
```bash
node skills/platform/workflow-xml/scripts/put-workflow.mjs \
  work/work-item/04f3d8a4-3108-4e33-a543-bc4d352ec25a \
  --tree tree.xml
```

### Debug the most recent run (all handler errors surface, incl. 4xx response bodies)
```bash
node skills/platform/workflow-xml/scripts/workflow-debug.mjs          # latest run
node skills/platform/workflow-xml/scripts/workflow-debug.mjs 27        # specific run
node skills/platform/workflow-xml/scripts/workflow-debug.mjs --sub <submissionId>
node skills/platform/workflow-xml/scripts/workflow-debug.mjs --watch   # live-tail
```

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `KINETIC_URL` | `https://phoenix.kinetics.com` | Target space URL |
| `KINETIC_USER` | `john` | Basic auth username |
| `KINETIC_PASS` | `john1` | Basic auth password |
| `KINETIC_SKIP_VALIDATION` | unset | Set to `1` to bypass the hook for a single command (rare, intentional). |

## Bypass a blocked PUT (rare)

If the hook blocks you and you genuinely need to push raw XML without validation:

```bash
KINETIC_SKIP_VALIDATION=1 curl -X PUT ...
```

If you're doing this regularly, the validator has a bug — open an issue with the tree that falsely fails.

## Removing / disabling the hook

Edit `~/.claude/settings.json` and delete the `PreToolUse.[Bash]` entry pointing at `hook-check-workflow-put.mjs`. Or run `/hooks` in Claude Code and toggle it off for the session.
