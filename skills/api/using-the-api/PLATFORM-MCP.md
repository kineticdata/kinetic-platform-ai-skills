---
name: platform-mcp
description: Use when running the Kinetic Platform MCP server locally and you need to know how to install and authenticate it, which tools to prefer, how to confirm which environment you're pointed at, and why most of its tools should stay disabled.
---

# The Kinetic Platform MCP Server

There is no MCP server hosted by the platform itself. The MCP server people use is
**`kineticdata/kinetic-platform-mgnt-mcp-server`** (public), run **locally**:

```bash
git clone https://github.com/kineticdata/kinetic-platform-mgnt-mcp-server
cd kinetic-platform-mgnt-mcp-server
npm install
npm run build
```

Requires Node.js 18+.

## Running it

```bash
node dist/index.js --stdio
```

Stdio is the right default for local use. An HTTP/SSE mode also exists (`node dist/index.js --http`), but it defaults to port 3000 — the same port a typical Vite dev server uses — so unless you specifically need HTTP, run stdio.

## Auth

Basic auth via environment variables, set in the client's MCP config or the shell environment:

- `KINETIC_SERVER_URL` — the space's base URL
- `KINETIC_USERNAME`
- `KINETIC_PASSWORD`
- `KINETIC_ALLOW_SELF_SIGNED` (optional; `true` to allow self-signed certs)

There is **no OAuth dynamic client registration and no browser sign-in.** If none of the environment variables are set, the server exposes a `connect` tool that takes `serverUrl`/`username`/`password` directly instead.

**These are real credentials, sitting in plain text in the client's MCP config or the environment. Never commit them** — not to the repo, not to a shared config file, not to a dotfile checked into version control.

Tool names below are **bare**. The fully-qualified name your client shows is prefixed with a server name that varies per client config — never hardcode a prefix onto a tool name.

## The tool-surface problem

This server covers 277 REST operations in the platform's OpenAPI spec. Registered the old way — every operation as its own tool, under both a `core_<operationId>` name and a `snake_case` alias — that's **558 tools**, far past the roughly-30-tool point where model tool-selection quality degrades, and past Cursor's roughly-40-tool ceiling.

**In builds that support `KINETIC_MCP_MODE`**, a `KINETIC_MCP_MODE` environment variable selects one of four surfaces over those same 277 operations — no capability is dropped in any of them, only how the tools are organized:

| `KINETIC_MCP_MODE` | Tools | Shape |
|---|---|---|
| `consolidated` (**default**) | ~26 | One tool per resource family (`forms`, `submissions`, `kapps`, `users`, `space`, …), dispatched by `object`/`action` parameters. |
| `contexts` | ~280 | One tool per operation, `snake_case` names only (no `core_*` duplicates). |
| `slim` | ~10 | A generic discovery-and-execute pair (`get_api_spec` + `execute_api`) plus a few session/connection tools. |
| `full` | ~558 | The legacy surface — every operation under both `core_*` and `snake_case` names. |

Select a mode by setting `KINETIC_MCP_MODE` (e.g. `KINETIC_MCP_MODE=slim`); `contexts` mode also accepts `KINETIC_MCP_CONTEXTS` to scope it to a comma-separated list of resource families instead of all of them. Treat the counts above as approximate — check your server's actual `tools/list` response (or its stderr startup line, `kinetic-platform-mcp: mode=…, N tools`) for the real names and count.

**If your build predates `KINETIC_MCP_MODE`, or you haven't confirmed it supports the variable, assume you have the old unconditional 558-tool surface with no mode switch.** In that case:

1. Disable tools you don't need from your MCP client's own tool picker — most MCP-capable clients let you toggle individual tools off per server.
2. If your client has no per-tool toggle, prefer Claude Code over clients that eagerly load every tool's full schema up front — Claude Code defers loading a tool's definition until it's actually invoked, which mitigates (though doesn't eliminate) the selection-quality problem.

Do not assume a fresh clone of the public repo has `KINETIC_MCP_MODE` support just because this document describes it — confirm it against your own server's startup output or `tools/list` before relying on it.

## Prefer the consolidated/generic shape over piling on named tools

The underlying principle still holds: a small, generic set of tools beats enabling dozens of narrow named ones, because it reaches every endpoint without growing the loaded tool count. If your build has `consolidated` (the default) or `slim`, prefer those over enabling individual per-operation tools one at a time.

Per-operation names like `create_form`, `retrieve_submission`, or `list_kapps` — the `contexts`/`full`-mode names — appear throughout this skills library because they read clearly in prose. On a `consolidated`-mode server, reach the same operation through its resource-family tool instead: `list_forms` → `forms` tool with `action: list`; `create_submission` → `submissions` tool with `action: create`; `retrieve_kapp` → `kapps` tool with `action: get`. Check your client's actual tool list before assuming either form is what you have.

This server covers the Core and Integrator APIs. It does not currently generate tools for the Task API (trees, runs, handlers) — reach the Task API over raw HTTP instead (see `api/task`).

## Confirm the environment before mutating anything

**There is no `get_context` tool on this server, in any mode.** Before any create, update, or delete, confirm which space you're pointed at using one of the real equivalents:

- The `KINETIC_SERVER_URL` configured for the session — check your client's MCP config or environment. This alone tells you the space.
- On a `consolidated`-mode server: the `space` tool with `action: get` (equivalent to `GET /space`).
- On a `contexts`/`full`-mode server: `retrieve_space` (`GET /space`, returns slug/name and, with `include=details`, its kapps and attributes) or `retrieve_me` (`GET /me`, the authenticated principal).

A partner may have several environments connected. A mutating call against the wrong space is the most damaging plausible mistake — confirm the space before trusting ambient configuration, using whichever of the tools above your enabled tool set actually includes.

## When no MCP server is connected

Everything here is reachable over raw HTTP using `api-basics`, `authentication`, and the endpoint references under `skills/api/`. MCP is a convenience, never a requirement.
