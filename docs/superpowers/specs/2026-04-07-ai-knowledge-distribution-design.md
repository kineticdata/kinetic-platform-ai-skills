# Kinetic Platform AI Knowledge Distribution Architecture

**Date:** 2026-04-07
**Status:** Draft
**Authors:** James Davies, Claude

## Problem

Kinetic Data wants AI tools to build apps on the Kinetic Platform from natural language descriptions. The current approach has two components:

1. **kinetic-platform-ai-skills** — A markdown-based skills library (18 skills, ~6,500 lines) that teaches AI tools how to build on Kinetic. Customers include it via `CLAUDE.md`.
2. **kinetic-platform-mgnt-mcp** — An MCP server auto-generated from the Core API OpenAPI spec that exposes ~559 tools (277 operations x 2 names + utility tools).

Problems with the current approach:
- The MCP server has far too many tools. AI tool selection degrades past ~30 tools, and context windows are consumed by tool descriptions alone.
- The MCP server only wraps Core and Integrator APIs. Task API and future services aren't covered.
- The skills library is reference-focused (how APIs work) but lacks procedural guidance (how to build things step-by-step).
- No automation keeps the skills library current when APIs change.
- Distribution is Claude Code-centric. Cross-tool compatibility (Cursor, Copilot, Codex, Gemini CLI, Windsurf) is important but underserved.

## Goals

1. Customers describe what they want built, and AI knows how to do it against the Kinetic Platform.
2. Progressive capability: component-level building today, full app generation as the north star.
3. Serve all personas: customer developers, admins, and partners/integrators.
4. Cross-tool compatibility is critical — not tied to a single AI vendor.
5. Progressive adoption — works with zero infrastructure, gets more powerful with the MCP server.
6. Maintainable by a small team as APIs evolve.

## Non-Goals

- Embedding AI into the Kinetic Builder UI (browser-based AI assistance).
- Building a standalone chatbot or conversational interface outside of existing AI tools.
- Replacing the `@kineticdata/react` SDK for front-end development.

## Architecture

Four layers, each independently useful but most powerful together:

```
+---------------------------------------------------+
|  Layer 4: Skills Library (hand-curated)            |
|  Concepts, recipes, front-end patterns             |
+---------------------------------------------------+
|  Layer 3: API Reference (auto-generated)           |
|  Endpoint docs generated from OpenAPI specs        |
+---------------------------------------------------+
|  Layer 2: Slim MCP Server (~12 tools)              |
|  Auth, discovery, spec serving, API execution      |
+---------------------------------------------------+
|  Layer 1: OpenAPI Specs (source of truth)           |
|  Core, Integrator, Task service specs              |
+---------------------------------------------------+
```

### Layer 1: OpenAPI Specs (Source of Truth)

The platform's OpenAPI specs for Core, Integrator, and Task APIs are the canonical description of what the platform can do. These specs are machine-readable and already exist (Core and Integrator are in the current mgmt MCP repo). Task API spec may need to be created or obtained.

All other layers derive from or reference these specs.

### Layer 2: Slim MCP Server (~12 Tools)

Instead of wrapping every API endpoint as a tool, the MCP server becomes a thin gateway. AI uses the skills library to understand what to do, and the MCP server to do it.

**Core tools:**

| Tool | Purpose |
|------|---------|
| `connect` | Authenticate to a Kinetic Platform instance |
| `discover_space` | Overview of the space — kapps, forms, workflows, teams, integrations |
| `discover_kapp` | Deep-dive into a specific kapp — forms, workflows, categories, security |
| `discover_form` | Full form definition — fields, events, indexes, attached workflows |
| `get_api_spec` | Return a relevant slice of the OpenAPI spec for a given domain (e.g., "forms", "submissions", "workflows") as formatted markdown (endpoint, method, parameters, response shape, example). Includes a pointer to the relevant concept/recipe skill for guidance on when and why to use each endpoint. Accepts optional `service` parameter (core, integrator, task). |
| `execute_api` | Generic API execution — AI provides method, path, and body. MCP handles auth, base URL, CSRF tokens, SSL, error formatting. |
| `validate_form` | Check a form definition for common mistakes (missing indexes, invalid field types) |
| `validate_workflow` | Check workflow XML/JSON for structural issues before deploying |
| `list_templates` | (Future) Show available app templates as starting points |
| `scaffold_from_template` | (Future) Clone a template into the space |
| `get_submission` | Read a specific submission (common during debugging) |
| `search_submissions` | KQL-based search (the most common read operation) |

**Why `get_api_spec` + `execute_api` instead of 559 tools:**
- AI tools perform well with 10-15 tools — accurate selection every time.
- The OpenAPI spec is the source of truth, not hand-maintained tool descriptions.
- `execute_api` can do anything the platform API supports, including future endpoints — no MCP update needed when new API endpoints ship.
- Discovery tools give AI situational awareness without overwhelming it.
- Auth complexity (username/password, OAuth 2.0, CSRF tokens, self-signed certs) is solved once in the MCP server.

**Multi-service support:**
All three APIs (Core, Integrator, Task) are proxied through Core. The `get_api_spec` tool accepts a `service` parameter to return the relevant spec slice. The `execute_api` tool routes through the Core proxy. Adding future services requires only adding their OpenAPI spec and updating `get_api_spec` — no new tools needed.

**Scope:** The MCP server is for server-side/admin work only — provisioning, configuring, and managing platform objects. Front-end portal development does not use the MCP server; AI uses the skills library and the `@kineticdata/react` SDK directly.

### Layer 3: API Reference (Auto-Generated)

A CI pipeline generates markdown reference files from the OpenAPI specs:

```
skills/
  api/
    core/
      spaces.md        # Generated from Core spec — space endpoints, params, response shapes
      kapps.md
      forms.md
      submissions.md
      ...
    integrator/
      connections.md
      operations.md
      ...
    task/
      runs.md
      nodes.md
      ...
    authentication.md  # Hand-written — covers auth across all services
    using-the-api.md   # Hand-written — how to use execute_api, common patterns
```

**Generation process:**
1. CI pulls latest OpenAPI specs from each service.
2. A script generates markdown reference files — endpoint lists, parameter tables, response shapes, example payloads.
3. CI compares generated output to what's committed. If specs changed, it opens a PR with the updated reference and flags which hand-curated skills may be affected.

This layer is the "facts" — always current, no curation needed. It sits between the raw specs (machine-readable) and the curated skills (human-readable guidance).

### Layer 4: Skills Library (Hand-Curated)

The core knowledge layer. Teaches AI how to think about the Kinetic Platform — concepts, patterns, decision frameworks, and step-by-step recipes.

**Restructured into three tiers:**

```
skills/
  concepts/              # What things are and how they work
    forms/SKILL.md
    workflows/SKILL.md
    integrations/SKILL.md
    kql-and-indexing/SKILL.md
    users-teams-security/SKILL.md
    webapis-and-webhooks/SKILL.md
    decision-frameworks/SKILL.md
    architectural-patterns/SKILL.md
    ...

  recipes/               # How to build things (step-by-step)
    create-kapp/SKILL.md
    add-approval-workflow/SKILL.md
    connect-external-system/SKILL.md
    build-service-portal/SKILL.md
    add-sla-tracking/SKILL.md
    create-bridge-adapter/SKILL.md
    ...

  front-end/             # React portal patterns using @kineticdata/react
    bootstrap/SKILL.md
    forms/SKILL.md
    data-fetching/SKILL.md
    mutations/SKILL.md
    state/SKILL.md

  api/                   # Auto-generated + hand-written API reference
    (see Layer 3 above)
```

**Concepts** (evolved from current platform skills): Reference material explaining what things are, how they relate, and when to use them. These are what exists today, refined and reorganized.

**Recipes** (new): Step-by-step procedural guides for common building patterns. Recipes are domain-agnostic — they teach patterns like "submission-driven workflow with approvals and external integrations" that apply whether the customer is building a service catalog, a recruiting app, or a field service management system. Each recipe references the relevant concept skills and API reference. Recipes are the key enabler for AI to go from "build me X" to a sequence of concrete actions.

**Front-end** (existing, enhanced): React portal development patterns. These guide AI to use `@kineticdata/react` instead of raw API calls.

**API** (new, mostly auto-generated): Endpoint reference generated from OpenAPI specs, supplemented with hand-written guides for auth and common patterns.

## Distribution

### Universal Adapter Files

The skills library ships with adapter files for every major AI tool at the root:

```
AGENTS.md                          # Cross-tool standard (Codex, growing adoption)
CLAUDE.md                          # Claude Code
GEMINI.md                          # Gemini CLI
.cursor/rules/                     # Cursor
.github/copilot-instructions.md   # GitHub Copilot
```

All adapters point into the same skills directory — single source of truth, multiple entry points.

### Installation Methods

**Git submodule (recommended for teams):**
```bash
git submodule add https://github.com/kineticdata/kinetic-platform-ai-skills.git ai-skills
```

**Direct clone:**
```bash
git clone https://github.com/kineticdata/kinetic-platform-ai-skills.git ~/kinetic-skills
```

**npm package (alternative):**
```bash
npm install --save-dev @kineticdata/ai-skills
```

### Customer Adoption Tiers

**Tier 1: Skills Library Only (5 minutes)**
Customer adds the skills library to their project. AI understands Kinetic concepts, can write forms/workflows/integrations from descriptions, knows SDK patterns for React portals. No live platform connection. Works in air-gapped environments.

Best for: Front-end development, writing workflow XML, learning the platform.

**Tier 2: Skills Library + MCP Server (15 minutes)**
Customer installs the MCP server and configures credentials. AI can discover existing platform objects, create and modify configurations, validate before deploying, scaffold from templates. The skills library provides the knowledge, the MCP server provides the capabilities.

Best for: Active development against a running platform.

**Tier 3: Plugin Wrapper (Future, 1 minute)**
A Claude Code plugin that auto-configures the skills library and MCP server in one install command. No unique knowledge lives in the plugin — it's purely a convenience wrapper. Potential for slash commands (`/kinetic:new-kapp`) as a guided experience.

Best for: Claude Code users who want the fastest possible onboarding.

## Maintenance Model

### Auto-Generated Content (CI-Driven)

1. CI pulls the latest OpenAPI specs from Core, Integrator, and Task services.
2. A generation script produces the `skills/api/` reference files.
3. CI compares against committed content. On spec changes:
   - Auto-commits updated API reference files.
   - Runs a cross-reference check against concept and recipe skills.
   - Opens an issue or PR listing which curated skills may need updating, with specific details of what changed.

### Hand-Curated Content (Team-Driven)

- Concept skills are updated when platform behavior changes (flagged by CI).
- Recipe skills are added when new common patterns emerge or customers request them.
- Front-end skills are updated when `@kineticdata/react` ships breaking changes.

### MCP Server Maintenance

Because the MCP server uses `get_api_spec` + `execute_api` rather than per-endpoint tools, it rarely needs updates when APIs change. Updates are needed only when:
- A new service is added (add its spec to `get_api_spec`).
- Discovery tools need to surface new entity types.
- Validation rules change for forms or workflows.

## End-to-End Example

A Tier 2 customer opens their AI tool and says:

> "Create a new Facilities Maintenance Request kapp with a service request form, an approval workflow, and SLA tracking."

AI's process:
1. Reads the on-demand skill index, identifies relevant skills.
2. Reads recipe `create-kapp/` — understands the sequence of steps.
3. Calls MCP `discover_space` — sees existing kapps, teams, integrations.
4. Reads concept skills for forms, workflows, architectural patterns (approval + SLA).
5. Calls MCP `get_api_spec("kapps")` — gets exact API parameters for kapp creation.
6. Calls MCP `execute_api` to create the kapp, forms, fields, indexes, workflow XML.
7. Calls MCP `validate_workflow` to check the workflow structure.
8. Reports back what was created and suggests next steps (security policies, portal UI, testing).

For front-end work on the same project, AI skips the MCP and uses front-end skills to write React components with `@kineticdata/react`.

## Resolved Questions

1. **Task API OpenAPI spec** — Confirmed: a machine-readable spec exists for the Task API. All three specs (Core, Integrator, Task) are available.
2. **Template library** — Templates are aspirational, not a launch requirement. The `list_templates` and `scaffold_from_template` MCP tools are marked as future. The self-service catalog pattern (request → async workflow → integrations) is the primary use case but recipes should be domain-agnostic.
3. **Recipe prioritization** — Agreed order: (1) Create a submission-driven form, (2) Add an approval workflow, (3) Connect to an external system, (4) Build a paginated list view, (5) Build a full portal pulling the above together.
4. **MCP server** — The slim MCP replaces the existing kinetic-platform-mgnt-mcp. No coexistence period.
5. **OpenAPI spec enrichment** — Not a launch blocker. Ship with specs as-is, track cases where AI makes wrong choices due to ambiguous specs, and enrich incrementally.

## Reference Codebase

The [momentum-portal](https://github.com/kineticdata/momentum-portal) repository is the reference implementation for generalizing front-end skills and recipes. It demonstrates production patterns for:
- Paginated data fetching (`usePaginatedData` hook)
- Form rendering (`KineticForm` component with custom layouts)
- Request lifecycle management (submission timelines, activity tracking, approval status)
- Integration orchestration (`executeIntegration` for external systems like ServiceNow)
- Real-time polling (`usePoller` for background updates)
- Dynamic Redux registration (`regRedux` for modular state)
- Mobile-responsive design patterns

These patterns should be generalized into domain-agnostic skills, not tied to any specific app type.
