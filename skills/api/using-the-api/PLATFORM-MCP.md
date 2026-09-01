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

This server generates two tool names for nearly every REST operation in the platform's OpenAPI spec — `core_<operationId>` and a `snake_case` alias. In its current released form that registers **558 tools by default**, far past the roughly-30-tool point where model tool-selection quality degrades, and past Cursor's roughly-40-tool ceiling. Connecting it with defaults will visibly hurt tool selection and may hit hard limits in some clients.

A reorganization is in progress to cut this down: **newer versions** add a `KINETIC_MCP_MODE` environment variable with three settings — `slim` (roughly a dozen general-purpose tools), `contexts` (a scoped allowlist you choose via `KINETIC_MCP_CONTEXTS`), and `full` (everything). **This work is not finished or released as of this writing — do not assume your build has it, and do not assume `slim` is the default you'll get.**

What to do, in order of preference:

1. **If your build supports `KINETIC_MCP_MODE`**, set it to `slim`, or to `contexts` with `KINETIC_MCP_CONTEXTS` naming only the contexts you need (`space`, `kapp`, `form`, `submission`, `user`, `team`, and others — check what your server reports as valid).
2. **If it doesn't**, disable tools you don't need from your MCP client's own tool picker — most MCP-capable clients let you toggle individual tools off per server.
3. **If your client has no per-tool toggle**, prefer Claude Code over clients that eagerly load every tool's full schema up front — Claude Code defers loading a tool's definition until it's actually invoked, which mitigates (though doesn't eliminate) the selection-quality problem.

## Prefer generic operations over piling on named tools

The underlying principle still holds: a small, generic set of tools beats enabling dozens of narrow named ones, because it reaches every endpoint without growing the loaded tool count. On this server today there is **no generic "get a spec slice, then execute against it" pair** — every operation is its own named tool. Examples that exist right now: `list_forms`, `retrieve_form`, `list_kapps`, `retrieve_kapp`, `list_form_submissions`, `retrieve_submission`, `create_submission`, `update_submission`, `delete_submission`. If a future `slim`/`contexts`/`full`-mode build on your install exposes a generic discovery-and-execute pair, prefer it over enabling the equivalent named CRUD tools — but check your client's actual tool list for its real name rather than assuming it matches any specific name in this document.

This server covers the Core and Integrator APIs. It does not currently generate tools for the Task API (trees, runs, handlers) — reach the Task API over raw HTTP instead (see `api/task`).

## Confirm the environment before mutating anything

**There is no `get_context` tool on this server.** Before any create, update, or delete, confirm which space you're pointed at using one of the real equivalents:

- The `KINETIC_SERVER_URL` configured for the session — check your client's MCP config or environment. This alone tells you the space.
- `retrieve_space` — calls `GET /space` and returns the space's slug and name (and, with `include=details`, its kapps and attributes).
- `retrieve_me` — calls `GET /me` and returns the authenticated principal.

A partner may have several environments connected. A mutating call against the wrong space is the most damaging plausible mistake — confirm the space before trusting ambient configuration, using whichever of the tools above your enabled tool set actually includes.

## When no MCP server is connected

Everything here is reachable over raw HTTP using `api-basics`, `authentication`, and the endpoint references under `skills/api/`. MCP is a convenience, never a requirement.
