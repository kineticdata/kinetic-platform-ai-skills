---
name: platform-mcp
description: Use when an MCP server ships with the Kinetic Platform and you need to know which tools to prefer, how to confirm which environment you are pointed at, and why most tools should stay disabled.
---

# The Kinetic Platform MCP Server

Recent platform versions host an MCP server at `<space-url>/app/platform-ai/mcp`. It exposes **79 tools** and authenticates with OAuth 2.0 (dynamic client registration, PKCE), so a client needs only the URL.

Tool names below are **bare**. The fully-qualified name your client shows is prefixed with the server's configured name (for example `kinetic-<space-slug>`), which varies per environment — never hardcode a prefix.

## Confirm the environment before mutating anything

`get_context` returns the current space slug, the authenticated principal, and which back-end services have specs loaded. It takes no arguments.

**Call `get_context` before any create, update, or delete.** OAuth grants `full` scope, and a partner may have several environments connected. A mutating call against the wrong space is the most damaging plausible mistake — confirm the space slug first rather than trusting ambient configuration.

## Prefer `execute_api` over specific tools

`get_api_spec` returns spec slices; `execute_api` performs any request against them. Together they reach **every** endpoint, which makes the 68 specific CRUD tools redundant. Because tool-selection quality degrades past roughly 30 tools — and Cursor errors above ~40 — most deployments disable all but these 11:

`get_context`, `get_api_spec`, `execute_api`, `list_kapps`, `list_forms`, `get_form`, `search_submissions`, `get_submission`, `list_trees`, `get_tree`, `list_errors`

If a tool you want is absent, do not assume the server lacks the capability — reach for `execute_api` with the endpoint from `get_api_spec`.

## When no MCP server is connected

Everything here is reachable over raw HTTP using `api-basics`, `authentication`, and the endpoint references under `skills/api/`. MCP is a convenience, never a requirement.
