# Skills Library Restructure — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the kinetic-platform-ai-skills library from platform/front-end split into concepts/recipes/front-end/api tiers, add universal adapter files for cross-tool compatibility, and write new recipe skills.

**Architecture:** Reorganize existing 18 skills into a four-tier structure (concepts, recipes, front-end, api). Existing platform skills move to concepts/ with minimal content changes. New recipe skills provide step-by-step procedural guides. New api/ skills cover authentication and API usage patterns. Universal adapter files (AGENTS.md, GEMINI.md, etc.) make the library work with every major AI tool.

**Tech Stack:** Markdown, YAML frontmatter, git

**Design Spec:** `docs/superpowers/specs/2026-04-07-ai-knowledge-distribution-design.md`

---

## File Structure

### Files to Create
- `AGENTS.md` — Cross-tool adapter (Codex, growing adoption)
- `GEMINI.md` — Gemini CLI adapter
- `skills/concepts/` — Reorganized platform skills (moved from `skills/platform/`)
- `skills/recipes/create-submission-form/SKILL.md` — Recipe: create a form with fields, indexes, events
- `skills/recipes/add-approval-workflow/SKILL.md` — Recipe: deferral-based approval workflow
- `skills/recipes/connect-external-system/SKILL.md` — Recipe: connections/operations to external APIs
- `skills/recipes/build-paginated-list/SKILL.md` — Recipe: paginated submission list (front-end)
- `skills/recipes/build-service-portal/SKILL.md` — Recipe: end-to-end portal pulling patterns together
- `skills/api/authentication/SKILL.md` — Auth across Core, Integrator, Task APIs
- `skills/api/using-the-api/SKILL.md` — API usage patterns, execute_api guidance, common operations

### Files to Modify
- `CLAUDE.md` — Update skill index to reflect new structure
- `README.md` — Update skill tables and directory descriptions
- `.github/copilot-instructions.md` — Update skill references
- `.cursor/rules/kinetic-platform.mdc` — Update import paths

### Files to Move (git mv)
- `skills/platform/api-basics/` → `skills/concepts/api-basics/`
- `skills/platform/architectural-patterns/` → `skills/concepts/architectural-patterns/`
- `skills/platform/decision-frameworks/` → `skills/concepts/decision-frameworks/`
- `skills/platform/form-engine/` → `skills/concepts/form-engine/`
- `skills/platform/integrations/` → `skills/concepts/integrations/`
- `skills/platform/kql-and-indexing/` → `skills/concepts/kql-and-indexing/`
- `skills/platform/pagination/` → `skills/concepts/pagination/`
- `skills/platform/ruby-sdk/` → `skills/concepts/ruby-sdk/`
- `skills/platform/template-provisioning/` → `skills/concepts/template-provisioning/`
- `skills/platform/users-teams-security/` → `skills/concepts/users-teams-security/`
- `skills/platform/webapis-and-webhooks/` → `skills/concepts/webapis-and-webhooks/`
- `skills/platform/workflow-engine/` → `skills/concepts/workflow-engine/`
- `skills/platform/workflow-xml/` → `skills/concepts/workflow-xml/`

### Files to Delete
- `skills/platform/` directory (after all moves complete)

---

### Task 1: Move Platform Skills to Concepts Directory

**Files:**
- Move: all 13 `skills/platform/*/` directories → `skills/concepts/*/`

- [ ] **Step 1: Create the concepts directory and move all skills**

```bash
mkdir -p skills/concepts
git mv skills/platform/api-basics skills/concepts/api-basics
git mv skills/platform/architectural-patterns skills/concepts/architectural-patterns
git mv skills/platform/decision-frameworks skills/concepts/decision-frameworks
git mv skills/platform/form-engine skills/concepts/form-engine
git mv skills/platform/integrations skills/concepts/integrations
git mv skills/platform/kql-and-indexing skills/concepts/kql-and-indexing
git mv skills/platform/pagination skills/concepts/pagination
git mv skills/platform/ruby-sdk skills/concepts/ruby-sdk
git mv skills/platform/template-provisioning skills/concepts/template-provisioning
git mv skills/platform/users-teams-security skills/concepts/users-teams-security
git mv skills/platform/webapis-and-webhooks skills/concepts/webapis-and-webhooks
git mv skills/platform/workflow-engine skills/concepts/workflow-engine
git mv skills/platform/workflow-xml skills/concepts/workflow-xml
```

- [ ] **Step 2: Remove the empty platform directory**

```bash
rmdir skills/platform
```

- [ ] **Step 3: Verify the new structure**

```bash
find skills/concepts -name "SKILL.md" | sort
```

Expected: 13 SKILL.md files listed under `skills/concepts/`.

- [ ] **Step 4: Commit**

```bash
git add -A skills/
git commit -m "refactor: move platform skills to concepts directory"
```

---

### Task 2: Update CLAUDE.md Index

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Replace the skill index in CLAUDE.md**

Replace the entire contents of `CLAUDE.md` with:

```markdown
# Kinetic Platform Skills

## How to Use These Skills
**Before implementing** anything involving the Kinetic Platform, read the relevant skill file(s) from the index below. Do NOT guess — read the skill first. Skills are loaded on-demand to save context; read only what you need for the current task.

When you discover new patterns, corrections, or undocumented behavior, update the appropriate SKILL.md file.

## Mandatory Rules
- Always use `@kineticdata/react` for Kinetic Platform interactions in React portals. Prefer exported helpers (`KineticLib`, `fetch*`, `searchSubmissions`) and only use `bundle.apiLocation()` + `getCsrfToken()` when no helper exists.
- `useData` is NOT exported by `@kineticdata/react` — it must be implemented as a project-local hook. See the Bootstrap skill.

## Skill Index — Read On-Demand

**Read the relevant skill file(s) before starting work.** Match your task to the descriptions below.

### Recipes — How to Build Things

| Skill | Path | When to read |
|-------|------|-------------|
| Create Submission Form | `skills/recipes/create-submission-form/SKILL.md` | Building a new form with fields, indexes, events, and submission handling |
| Add Approval Workflow | `skills/recipes/add-approval-workflow/SKILL.md` | Adding deferral-based approval workflows to forms |
| Connect External System | `skills/recipes/connect-external-system/SKILL.md` | Setting up connections/operations to external REST APIs |
| Build Paginated List | `skills/recipes/build-paginated-list/SKILL.md` | Building a paginated submission list in a React portal |
| Build Service Portal | `skills/recipes/build-service-portal/SKILL.md` | End-to-end portal setup pulling all patterns together |

### Concepts — How Things Work

| Skill | Path | When to read |
|-------|------|-------------|
| API Basics | `skills/concepts/api-basics/SKILL.md` | Any REST API call — endpoints, auth, query params, response shapes, submission CRUD, gotchas |
| KQL & Indexing | `skills/concepts/kql-and-indexing/SKILL.md` | Writing KQL queries, form index definitions, search/filter logic |
| Pagination | `skills/concepts/pagination/SKILL.md` | Paginated lists, pageToken, keyset pagination past 1000-record cap, Task API offset pagination |
| Workflow Engine | `skills/concepts/workflow-engine/SKILL.md` | Workflow concepts (trees, nodes, connectors, deferrals, runs), Task API, building workflow UIs |
| Workflow XML | `skills/concepts/workflow-xml/SKILL.md` | Programmatic workflow creation/export, tree XML schema, treeJson, handler definition IDs |
| Decision Frameworks | `skills/concepts/decision-frameworks/SKILL.md` | Choosing between integration types, data storage patterns, workflow vs real-time |
| Architectural Patterns | `skills/concepts/architectural-patterns/SKILL.md` | Approvals, deferrals, fulfillment, SLA tracking, external system sync, work routing |
| Form Engine | `skills/concepts/form-engine/SKILL.md` | Form JSON schema, field types, events, K() API, expressions, bundle.config overrides |
| Integrations | `skills/concepts/integrations/SKILL.md` | Connections/Operations, Bridges, Handlers, File Resources — setup and usage |
| WebAPIs & Webhooks | `skills/concepts/webapis-and-webhooks/SKILL.md` | Custom REST endpoints (WebAPIs), event-driven triggers (webhooks), security policies |
| Users, Teams & Security | `skills/concepts/users-teams-security/SKILL.md` | User/team CRUD, KSL security expressions, policy definitions, attribute definitions, activities |
| Ruby SDK | `skills/concepts/ruby-sdk/SKILL.md` | `kinetic_sdk` gem — scripted admin, migrations, bulk operations, environment provisioning |
| Template Provisioning | `skills/concepts/template-provisioning/SKILL.md` | Template directory structure, install.rb scripts, connection JSON, export/import patterns |

### Front-End — React Portal Patterns

| Skill | Path | When to read |
|-------|------|-------------|
| Bootstrap | `skills/front-end/bootstrap/SKILL.md` | Portal setup — KineticLib, CoreForm prerequisites, Vite config, auth state, routing, project structure |
| Forms | `skills/front-end/forms/SKILL.md` | CoreForm vs client-side API, KineticForm wrapper, FormLayout, globals.jsx, widget system |
| Data Fetching | `skills/front-end/data-fetching/SKILL.md` | useData, usePaginatedData, usePagination, usePoller, defineKqlQuery, searchSubmissions |
| Mutations | `skills/front-end/mutations/SKILL.md` | executeIntegration, submission create/delete, profile/kapp/space updates |
| State | `skills/front-end/state/SKILL.md` | regRedux, appActions, themeActions, viewActions, getAttributeValue, toasts, confirmation modal |

### API Reference

| Skill | Path | When to read |
|-------|------|-------------|
| Authentication | `skills/api/authentication/SKILL.md` | Auth patterns across Core, Integrator, and Task APIs |
| Using the API | `skills/api/using-the-api/SKILL.md` | API usage patterns, common operations, request/response conventions |
```

- [ ] **Step 2: Verify all paths in the index exist**

```bash
# Check each path listed in CLAUDE.md exists (concepts and front-end should exist, recipes and api will be created in later tasks)
for f in skills/concepts/api-basics/SKILL.md skills/concepts/kql-and-indexing/SKILL.md skills/concepts/pagination/SKILL.md skills/concepts/workflow-engine/SKILL.md skills/concepts/workflow-xml/SKILL.md skills/concepts/decision-frameworks/SKILL.md skills/concepts/architectural-patterns/SKILL.md skills/concepts/form-engine/SKILL.md skills/concepts/integrations/SKILL.md skills/concepts/webapis-and-webhooks/SKILL.md skills/concepts/users-teams-security/SKILL.md skills/concepts/ruby-sdk/SKILL.md skills/concepts/template-provisioning/SKILL.md skills/front-end/bootstrap/SKILL.md skills/front-end/forms/SKILL.md skills/front-end/data-fetching/SKILL.md skills/front-end/mutations/SKILL.md skills/front-end/state/SKILL.md; do
  [ -f "$f" ] && echo "OK: $f" || echo "MISSING: $f"
done
```

Expected: All 18 files report "OK".

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "refactor: update CLAUDE.md index for new skills structure"
```

---

### Task 3: Create AGENTS.md (Cross-Tool Adapter)

**Files:**
- Create: `AGENTS.md`

- [ ] **Step 1: Create AGENTS.md**

Create `AGENTS.md` at the project root with the same content as the updated `CLAUDE.md` from Task 2. This file serves tools that read `AGENTS.md` (Codex, and increasingly other tools).

```bash
cp CLAUDE.md AGENTS.md
```

- [ ] **Step 2: Commit**

```bash
git add AGENTS.md
git commit -m "feat: add AGENTS.md for cross-tool compatibility"
```

---

### Task 4: Create GEMINI.md Adapter

**Files:**
- Create: `GEMINI.md`

- [ ] **Step 1: Create GEMINI.md**

Create `GEMINI.md` at the project root. Gemini CLI reads this file for project instructions. Use the same content as `CLAUDE.md`.

```bash
cp CLAUDE.md GEMINI.md
```

- [ ] **Step 2: Commit**

```bash
git add GEMINI.md
git commit -m "feat: add GEMINI.md for Gemini CLI compatibility"
```

---

### Task 5: Update Cursor Rules

**Files:**
- Modify: `.cursor/rules/kinetic-platform.mdc`

- [ ] **Step 1: Read the existing Cursor rules file**

```bash
cat .cursor/rules/kinetic-platform.mdc
```

- [ ] **Step 2: Update import paths from `skills/platform/` to `skills/concepts/`**

In `.cursor/rules/kinetic-platform.mdc`, replace every occurrence of `skills/platform/` with `skills/concepts/`. Also add imports for the new recipe and api skill paths.

The file uses `@` import syntax to reference skills. Update all paths, for example:
- `@skills/platform/api-basics/SKILL.md` → `@skills/concepts/api-basics/SKILL.md`
- Add `@skills/recipes/create-submission-form/SKILL.md`
- Add `@skills/recipes/add-approval-workflow/SKILL.md`
- Add `@skills/recipes/connect-external-system/SKILL.md`
- Add `@skills/api/authentication/SKILL.md`
- Add `@skills/api/using-the-api/SKILL.md`

- [ ] **Step 3: Commit**

```bash
git add .cursor/
git commit -m "refactor: update Cursor rules for new skills structure"
```

---

### Task 6: Update Copilot Instructions

**Files:**
- Modify: `.github/copilot-instructions.md`

- [ ] **Step 1: Update the skill references at the bottom of the file**

Replace the skill reference section at the end of `.github/copilot-instructions.md`:

Replace:
```markdown
For full details see the skills library:
- `skills/platform/` — API basics, KQL & indexing, pagination, workflow engine, workflow XML schema, decision frameworks, architectural patterns, form engine, integrations, WebAPIs & webhooks, users/teams/security, Ruby SDK, template provisioning
- `skills/front-end/` — bootstrap, forms, data fetching, mutations, state management
```

With:
```markdown
For full details see the skills library:
- `skills/concepts/` — API basics, KQL & indexing, pagination, workflow engine, workflow XML, decision frameworks, architectural patterns, form engine, integrations, WebAPIs & webhooks, users/teams/security, Ruby SDK, template provisioning
- `skills/recipes/` — Create forms, add approval workflows, connect external systems, build paginated lists, build service portals
- `skills/front-end/` — Bootstrap, forms, data fetching, mutations, state management
- `skills/api/` — Authentication, API usage patterns
```

- [ ] **Step 2: Commit**

```bash
git add .github/copilot-instructions.md
git commit -m "refactor: update Copilot instructions for new skills structure"
```

---

### Task 7: Update README.md

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the skills tables in README.md**

Replace the skills section to reflect the new four-tier structure. Update:
- Rename "Platform" section to "Concepts"
- Update all paths from `skills/platform/` to `skills/concepts/`
- Add a new "Recipes" section before Concepts
- Add a new "API Reference" section after Front-End
- Update the directory structure examples in the Contributing section

The key changes:
- `### Platform (\`skills/platform/\`)` → `### Concepts (\`skills/concepts/\`)`
- All table paths: `skills/platform/X/SKILL.md` → `skills/concepts/X/SKILL.md`
- Add new table for Recipes with the 5 recipe skills
- Add new table for API Reference with authentication and using-the-api skills
- In Contributing section, update `skills/platform/` references to `skills/concepts/`

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README for new skills structure"
```

---

### Task 8: Write API Authentication Skill

**Files:**
- Create: `skills/api/authentication/SKILL.md`

- [ ] **Step 1: Create the directory and skill file**

```bash
mkdir -p skills/api/authentication
```

- [ ] **Step 2: Write the authentication skill**

Create `skills/api/authentication/SKILL.md` with this content:

```markdown
---
name: authentication
description: Authentication patterns for Core, Integrator, and Task APIs — Basic Auth, OAuth 2.0, CSRF tokens, and self-signed certificate handling.
---

# Authentication

## Overview

The Kinetic Platform has three API surfaces, all proxied through the Core server. Authentication varies by surface.

| API | Primary Auth | When to Use |
|-----|-------------|-------------|
| Core API v1 | HTTP Basic Auth | Forms, submissions, kapps, users, teams, spaces, webhooks, WebAPIs |
| Task API v2 | HTTP Basic Auth | Workflow runs, nodes, trees, handlers, engine operations |
| Integrator API | OAuth 2.0 Bearer Token | Connections, operations, agents |

## Core API & Task API — HTTP Basic Auth

Both Core and Task APIs use HTTP Basic Authentication.

### Request Header

```
Authorization: Basic <base64(username:password)>
```

### Example

```bash
# Core API — list kapps
curl -u "admin:password" \
  "https://myspace.kinops.io/app/api/v1/kapps"

# Task API — list runs
curl -u "admin:password" \
  "https://myspace.kinops.io/app/components/task/app/api/v2/runs"
```

### Verifying Credentials

```bash
# The /me endpoint returns the authenticated user's profile
curl -u "admin:password" \
  "https://myspace.kinops.io/app/api/v1/me"
```

Response:
```json
{
  "username": "admin",
  "displayName": "Admin User",
  "email": "admin@example.com",
  "enabled": true,
  "spaceAdmin": true
}
```

**Gotcha:** The `/me` response is flat — `me.username`, NOT `me.user.username`.

## Integrator API — OAuth 2.0

The Integrator API uses OAuth 2.0 implicit grant flow to obtain bearer tokens.

### Token Acquisition

```bash
# Step 1: Request token via implicit grant
curl -u "admin:password" \
  -X GET \
  --max-redirs 0 \
  "https://myspace.kinops.io/app/oauth/authorize?grant_type=implicit&response_type=token&client_id=system"
```

The server responds with a `302 redirect` containing the token in the URL fragment:
```
Location: ...#access_token=<TOKEN>&token_type=bearer&expires_in=43200
```

### Using the Token

```bash
curl -H "Authorization: Bearer <TOKEN>" \
  "https://myspace.kinops.io/app/components/integrator/app/api/v1/connections"
```

### Token Lifecycle
- Default expiry: 43,200 seconds (12 hours)
- Cache the token and check expiry before each request
- Re-acquire when expired (subtract 30 seconds as a safety buffer)

## Base URL Patterns

### Cloud Deployments
```
Core:       https://<space-slug>.kinops.io/app/api/v1
Task:       https://<space-slug>.kinops.io/app/components/task/app/api/v2
Integrator: https://<space-slug>.kinops.io/app/components/integrator/app/api/v1
```

### Self-Hosted Deployments
```
Core:       https://<server>/kinetic/<space-slug>/app/api/v1
Task:       https://<server>/kinetic/<space-slug>/app/components/task/app/api/v2
Integrator: https://<server>/kinetic/<space-slug>/app/components/integrator/app/api/v1
```

## Self-Signed Certificates

In development or air-gapped environments, the platform may use self-signed SSL certificates. When using the MCP server, set:

```bash
KINETIC_ALLOW_SELF_SIGNED=true
```

When making direct API calls from Node.js:
```javascript
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
```

**Warning:** Only use this in development or trusted network environments. Never disable certificate verification in production against untrusted networks.

## CSRF Tokens

When making API calls from a browser context (e.g., inside a React portal using `@kineticdata/react`), the SDK handles CSRF tokens automatically via `KineticLib`. If making raw `fetch` calls from the browser:

```javascript
import { bundle } from '@kineticdata/react';

fetch(`${bundle.apiLocation()}/submissions`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': bundle.csrfToken(),
  },
  body: JSON.stringify({ values: { "Field Name": "value" } }),
});
```

**Gotcha:** CSRF tokens are only required for browser-originated requests. Server-side API calls (curl, MCP server, scripts) use Basic Auth or Bearer tokens and do not need CSRF.
```

- [ ] **Step 3: Commit**

```bash
git add skills/api/authentication/
git commit -m "feat: add authentication skill covering Core, Integrator, Task API auth"
```

---

### Task 9: Write API Usage Patterns Skill

**Files:**
- Create: `skills/api/using-the-api/SKILL.md`

- [ ] **Step 1: Create the directory and skill file**

```bash
mkdir -p skills/api/using-the-api
```

- [ ] **Step 2: Write the using-the-api skill**

Create `skills/api/using-the-api/SKILL.md` with this content:

```markdown
---
name: using-the-api
description: Common API usage patterns, request/response conventions, error handling, and guidance for working with the Kinetic Platform REST APIs.
---

# Using the API

## Overview

This skill covers practical patterns for working with the Kinetic Platform APIs. For authentication details, see the Authentication skill (`api/authentication`). For specific endpoint reference, see the auto-generated API reference files in `api/core/`, `api/integrator/`, and `api/task/`.

## Request Conventions

### Content Type

All request and response bodies use JSON:
```
Content-Type: application/json
Accept: application/json
```

### Include Parameter

Most GET endpoints accept an `include` query parameter to control response detail:

```bash
# Minimal response (default)
GET /app/api/v1/kapps/{kappSlug}/forms

# Include field definitions
GET /app/api/v1/kapps/{kappSlug}/forms?include=fields

# Include submission values
GET /app/api/v1/kapps/{kappSlug}/forms/{formSlug}/submissions?include=values

# Include multiple — comma-separated
GET /app/api/v1/kapps/{kappSlug}/forms/{formSlug}/submissions?include=details,values
```

**Gotcha:** `include=values` does NOT return `createdAt` or `id`. Use `include=details` or `include=details,values` when you need timestamps or identifiers.

### Task API Include Behavior

The Task API has a different `include` behavior:

```bash
# REQUIRED to get id, createdAt on run objects
GET /app/components/task/app/api/v2/runs?include=details
```

**Gotcha:** Without `include=details`, the Task API returns run objects where `id` is absent (not null) — code that checks `run.id === null` will fail silently.

## Response Conventions

### Single Resource
```json
{
  "form": {
    "slug": "my-form",
    "name": "My Form",
    "fields": [...]
  }
}
```

### Collection
```json
{
  "forms": [
    { "slug": "form-1", "name": "Form 1" },
    { "slug": "form-2", "name": "Form 2" }
  ],
  "nextPageToken": "..."
}
```

### Error Response
```json
{
  "error": {
    "key": "not_found",
    "message": "Form not found: bad-slug"
  }
}
```

## Common Operations

### Create a Form

```bash
curl -u "admin:password" -X POST \
  "https://myspace.kinops.io/app/api/v1/kapps/services/forms" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "service-request",
    "name": "Service Request",
    "description": "General service request form",
    "type": "Service",
    "status": "Active",
    "attributes": [
      { "name": "Icon", "values": ["fa-file-text"] }
    ]
  }'
```

### Add Fields to a Form

```bash
curl -u "admin:password" -X POST \
  "https://myspace.kinops.io/app/api/v1/kapps/services/forms/service-request/fields" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Requested For",
    "key": "f1",
    "dataType": "string",
    "renderType": "text"
  }'
```

**Gotcha:** Submitting values for fields not defined on the form returns **500**. Always verify field names with `?include=fields` before submitting.

### Create an Index on a Form

```bash
curl -u "admin:password" -X POST \
  "https://myspace.kinops.io/app/api/v1/kapps/services/forms/service-request/indexDefinitions" \
  -H "Content-Type: application/json" \
  -d '{
    "parts": [
      { "name": "values[Status]" },
      { "name": "values[Requested For]" }
    ]
  }'
```

**Critical:** KQL queries require index definitions on the form — even simple equality queries fail without them. See KQL & Indexing concept skill for details.

### Search Submissions with KQL

```bash
curl -u "admin:password" \
  "https://myspace.kinops.io/app/api/v1/kapps/services/forms/service-request/submissions?include=values&q=values[Status]=\"Open\"&index=values[Status]"
```

### Update a Submission (PATCH)

```bash
curl -u "admin:password" -X PATCH \
  "https://myspace.kinops.io/app/api/v1/submissions/{submissionId}" \
  -H "Content-Type: application/json" \
  -d '{
    "values": {
      "Status": "Approved",
      "Approver": "john.doe"
    }
  }'
```

## Error Patterns

| HTTP Status | Common Cause |
|-------------|-------------|
| 400 | Invalid query parameter (e.g., `timeline` or `direction` on Core API submissions) |
| 401 | Bad credentials or expired OAuth token |
| 404 | Wrong slug, wrong kapp path, or resource doesn't exist |
| 500 | Submitting values for undefined fields, or malformed request body |

## Working with the MCP Server

When using the Kinetic Platform MCP server, you don't construct API calls directly. Instead:

1. Use `discover_space`, `discover_kapp`, `discover_form` to understand what exists
2. Use `get_api_spec` to get endpoint details for a specific domain
3. Use `execute_api` to make calls — it handles auth, base URL, and CSRF

```
execute_api({ method: "POST", path: "/kapps/services/forms", body: { slug: "my-form", name: "My Form" } })
```

The `path` is relative to the Core API base URL. For Task API or Integrator API endpoints, prefix accordingly:
- Task: `execute_api({ method: "GET", path: "/components/task/app/api/v2/runs" })`
- Integrator: `execute_api({ method: "GET", path: "/components/integrator/app/api/v1/connections" })`
```

- [ ] **Step 3: Commit**

```bash
git add skills/api/using-the-api/
git commit -m "feat: add API usage patterns skill with common operations and conventions"
```

---

### Task 10: Write Recipe — Create Submission Form

**Files:**
- Create: `skills/recipes/create-submission-form/SKILL.md`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p skills/recipes/create-submission-form
```

- [ ] **Step 2: Write the recipe skill**

Create `skills/recipes/create-submission-form/SKILL.md` with this content:

```markdown
---
name: create-submission-form
description: Step-by-step recipe for creating a new form with fields, index definitions, events, and submission handling on the Kinetic Platform.
---

# Recipe: Create a Submission Form

## When to Use

You need to create a new form that users will submit — a service request, job application, maintenance ticket, enrollment form, or any submission-driven workflow. This recipe covers the full lifecycle from form creation to submission handling.

## Prerequisites

- Read the Form Engine concept skill (`concepts/form-engine`) for field types, events, and expressions
- Read the KQL & Indexing concept skill (`concepts/kql-and-indexing`) if the form's submissions will be searched
- Access to the Kinetic Platform (via MCP server or direct API)

## Overview

```
1. Create the form definition
2. Add fields with appropriate types
3. Define index definitions for KQL search
4. Add form events (submission create/update)
5. Verify with a test submission
```

## Step 1: Create the Form

Every form belongs to a kapp. Choose an existing kapp or create one first.

```bash
POST /app/api/v1/kapps/{kappSlug}/forms
Content-Type: application/json

{
  "slug": "maintenance-request",
  "name": "Maintenance Request",
  "description": "Submit a facilities maintenance request",
  "type": "Service",
  "status": "Active",
  "attributes": [
    { "name": "Icon", "values": ["fa-wrench"] },
    { "name": "Owning Team", "values": ["Facilities"] }
  ]
}
```

**Key decisions:**
- `slug` must be unique within the kapp, URL-safe, lowercase with hyphens
- `type` is a free-text categorization field — use it to group forms (e.g., "Service", "Approval", "Lookup")
- `status` should be "Active" for user-facing forms, "Inactive" for drafts
- `attributes` are key-value metadata — use for categorization, routing, display (Icon, Owning Team, etc.)

## Step 2: Add Fields

Add fields one at a time or in bulk. Each field needs a unique `name` and a `key` (auto-generated if omitted).

### Common Field Types

| renderType | dataType | Use For |
|-----------|----------|---------|
| `text` | `string` | Short text input |
| `textarea` | `string` | Multi-line text |
| `dropdown` | `string` | Selection from a list |
| `checkbox` | `string` | Multi-select checkboxes |
| `radio` | `string` | Single selection from options |
| `date` | `string` | Date picker |
| `attachment` | `string` | File upload |

```bash
POST /app/api/v1/kapps/{kappSlug}/forms/{formSlug}/fields
Content-Type: application/json

{
  "name": "Summary",
  "key": "f1",
  "dataType": "string",
  "renderType": "text",
  "required": true
}
```

### Typical Form Fields Pattern

For a submission-driven form, you typically need:
1. **User input fields** — what the submitter fills in (Summary, Description, Priority)
2. **Status field** — tracks the submission lifecycle (Open, Approved, In Progress, Complete)
3. **Behind-the-scenes fields** — populated by workflows or integrations (Assigned To, Resolution, External ID)

```bash
# Status field — dropdown with predefined values
POST /app/api/v1/kapps/{kappSlug}/forms/{formSlug}/fields
{
  "name": "Status",
  "key": "f10",
  "dataType": "string",
  "renderType": "dropdown",
  "defaultValue": "Open",
  "allowsOtherOption": false,
  "choices": ["Open", "Approved", "In Progress", "Complete", "Cancelled"]
}
```

## Step 3: Define Indexes

**Critical:** KQL queries will not work without index definitions. Define indexes for every field you plan to search or filter by.

```bash
POST /app/api/v1/kapps/{kappSlug}/forms/{formSlug}/indexDefinitions
Content-Type: application/json

{
  "parts": [
    { "name": "values[Status]" }
  ]
}
```

### Compound Index for Multi-Field Queries

If you need to filter by Status AND Priority:

```bash
POST /app/api/v1/kapps/{kappSlug}/forms/{formSlug}/indexDefinitions
{
  "parts": [
    { "name": "values[Status]" },
    { "name": "values[Priority]" }
  ]
}
```

**Gotcha:** A compound index on `[Status, Priority]` supports queries on `Status` alone or `Status AND Priority`, but NOT `Priority` alone. Create a separate single-field index for `Priority` if you need standalone queries.

### Recommended Indexes

For most submission-driven forms, create these indexes:
- `values[Status]` — filter by lifecycle state
- `values[Requested For]` or `values[Submitted By]` — filter by person
- `createdAt` — sort by date (enables keyset pagination past the 1000-record cap)

## Step 4: Add Form Events (Optional)

Form events trigger JavaScript when submissions are created, updated, or loaded. Common uses:
- Set default values based on the logged-in user
- Auto-populate fields from external data
- Validate complex business rules

Events are configured on the form definition. See the Form Engine concept skill (`concepts/form-engine`) for event syntax and the K() API.

## Step 5: Verify with a Test Submission

```bash
# Create a test submission
POST /app/api/v1/kapps/{kappSlug}/forms/{formSlug}/submissions
Content-Type: application/json

{
  "values": {
    "Summary": "Test request",
    "Status": "Open"
  }
}

# Verify it's searchable via KQL
GET /app/api/v1/kapps/{kappSlug}/forms/{formSlug}/submissions?include=values&q=values[Status]="Open"&index=values[Status]
```

## Next Steps

- **Add an approval workflow** — see the Add Approval Workflow recipe (`recipes/add-approval-workflow`)
- **Connect to an external system** — see the Connect External System recipe (`recipes/connect-external-system`)
- **Build a UI for this form** — see the Build Paginated List recipe (`recipes/build-paginated-list`) and the Front-End Forms skill (`front-end/forms`)
```

- [ ] **Step 3: Commit**

```bash
git add skills/recipes/create-submission-form/
git commit -m "feat: add recipe skill for creating submission-driven forms"
```

---

### Task 11: Write Recipe — Add Approval Workflow

**Files:**
- Create: `skills/recipes/add-approval-workflow/SKILL.md`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p skills/recipes/add-approval-workflow
```

- [ ] **Step 2: Write the recipe skill**

Create `skills/recipes/add-approval-workflow/SKILL.md` with this content:

```markdown
---
name: add-approval-workflow
description: Step-by-step recipe for adding a deferral-based approval workflow to a form, including routing, notifications, and status updates.
---

# Recipe: Add an Approval Workflow

## When to Use

You need submissions to go through an approval process before fulfillment. This pattern applies to service requests, purchase orders, access requests, leave applications, job requisitions, or any process where human approval gates the next step.

## Prerequisites

- A form with a Status field (see Create Submission Form recipe, `recipes/create-submission-form`)
- Read the Architectural Patterns concept skill (`concepts/architectural-patterns`) for the deferral and approval patterns
- Read the Workflow Engine concept skill (`concepts/workflow-engine`) for workflow concepts
- Read the Workflow XML concept skill (`concepts/workflow-xml`) for workflow XML schema

## Overview

```
1. Design the approval flow
2. Create the workflow tree
3. Add approval routing logic
4. Add the deferral node (pause and wait)
5. Add approval/denial handling
6. Wire the workflow to the form
7. Test the full cycle
```

## The Deferral Pattern

The Kinetic Platform's approval mechanism is built on **deferrals** — a universal "pause and wait for callback" pattern.

```
Submission Created
  → Workflow starts
    → Route to approver(s)
    → DEFER (pause workflow, wait for callback)
    → Approver takes action (approve/deny via form or API)
    → Callback resumes workflow
    → Branch: Approved → fulfill / Denied → notify & close
```

The deferral node creates a **run** in the Task API that stays in "Deferred" status until an external callback resumes it. The callback typically comes from:
- An approver submitting an approval form
- An API call from a portal UI
- An automated system making a decision

## Step 1: Design the Approval Flow

Before building, decide:
- **Who approves?** A specific person, a team, or dynamic routing based on request type/amount?
- **Single or multi-level?** One approver, or sequential (manager → director) or parallel (any 2 of 3)?
- **What happens on approval?** Update status, trigger fulfillment, notify requester?
- **What happens on denial?** Update status, notify requester, allow resubmission?

## Step 2: Create the Workflow Tree

Workflows are XML-based trees. The tree title must follow the format:
```
SourceName :: SourceGroup :: EventName
```

For a form submission trigger:
```
Kinetic Request :: <kapp-slug> > <form-slug> :: Submitted
```

Example workflow XML structure:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<tree schema_version="1.0" version="" name="Kinetic Request :: services > maintenance-request :: Submitted">
  <task name="Set Status to Pending" id="1" definitionId="kinetic_submission_update_v1">
    <!-- Update submission status to Pending Approval -->
  </task>
  <task name="Create Approval" id="2" definitionId="kinetic_submission_create_v1">
    <!-- Create an approval submission on the approval form -->
  </task>
  <task name="Defer for Approval" id="3" definitionId="system_defer_v1">
    <!-- Pause workflow until approval callback -->
  </task>
  <task name="Check Approval Decision" id="4" definitionId="system_junction_v1">
    <!-- Branch based on approval result -->
  </task>
  <!-- ... additional nodes for approved/denied paths -->
</tree>
```

See the Workflow XML concept skill (`concepts/workflow-xml`) for complete XML schema, task node structure, and handler definition IDs.

## Step 3: Approval Routing

Route the approval to the right person. Common patterns:

**Static routing** — Always goes to the same team:
- Set the approver field to a team name or specific user in the workflow

**Attribute-based routing** — Route based on form attributes:
- Read the form's "Owning Team" attribute → send approval to that team

**Value-based routing** — Route based on submission values:
- If `Priority` == "High" → route to manager; else → route to team lead

## Step 4: The Deferral Node

The deferral node is the core of the approval pattern. It:
1. Pauses the workflow
2. Creates a "Deferred" run in the Task API
3. Waits for a callback with the approval decision
4. Resumes the workflow with the decision result

The callback is typically triggered by:
```bash
# Resume a deferred run with approval result
POST /app/components/task/app/api/v2/runs/{runId}/callbacks
Content-Type: application/json

{
  "message": {
    "Decision": "Approved",
    "Approver": "jane.doe",
    "Comments": "Looks good"
  }
}
```

## Step 5: Post-Approval Handling

**On approval:**
1. Update submission Status to "Approved"
2. Trigger fulfillment workflow or integration
3. Notify the requester

**On denial:**
1. Update submission Status to "Denied"
2. Include denial reason from approver comments
3. Notify the requester

## Step 6: Wire the Workflow to the Form

Workflows are triggered by form events. The tree title format determines which form and event trigger it:
```
Kinetic Request :: <kapp-slug> > <form-slug> :: Submitted
```

When a submission is created on the matching form with `coreState: "Submitted"`, the workflow engine automatically starts the tree.

## Step 7: Test the Full Cycle

1. Create a test submission on the form
2. Verify the workflow starts (check Task API for a new run)
3. Verify the deferral creates a deferred run
4. Simulate approval callback
5. Verify post-approval handling (status update, notifications)

```bash
# Check for active runs
GET /app/components/task/app/api/v2/runs?source=Kinetic Request&tree=maintenance-request&status=Deferred&include=details

# Resume with approval
POST /app/components/task/app/api/v2/runs/{runId}/callbacks
{ "message": { "Decision": "Approved" } }

# Verify submission status updated
GET /app/api/v1/submissions/{submissionId}?include=values
```

## Next Steps

- **Connect to an external system** for fulfillment — see `recipes/connect-external-system`
- **Build an approver UI** — see `front-end/forms` for rendering approval forms in a portal
- **Add SLA tracking** — see `concepts/architectural-patterns` for the SLA tracking pattern
```

- [ ] **Step 3: Commit**

```bash
git add skills/recipes/add-approval-workflow/
git commit -m "feat: add recipe skill for deferral-based approval workflows"
```

---

### Task 12: Write Recipe — Connect External System

**Files:**
- Create: `skills/recipes/connect-external-system/SKILL.md`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p skills/recipes/connect-external-system
```

- [ ] **Step 2: Write the recipe skill**

Create `skills/recipes/connect-external-system/SKILL.md` with this content:

```markdown
---
name: connect-external-system
description: Step-by-step recipe for connecting the Kinetic Platform to an external REST API using Connections and Operations.
---

# Recipe: Connect to an External System

## When to Use

You need the Kinetic Platform to communicate with an external system — ServiceNow, Jira, Salesforce, a custom REST API, a database, or any system with an API. This recipe covers the modern Connections/Operations approach.

## Prerequisites

- Read the Integrations concept skill (`concepts/integrations`) for the full integration type decision framework
- Read the Authentication skill (`api/authentication`) for Integrator API auth (OAuth 2.0 required)
- The external system's API documentation (base URL, auth method, endpoints)

## Overview

```
1. Create a Connection (stores the external system's URL and credentials)
2. Create Operations on the Connection (defines specific API calls)
3. Use Operations in workflows or from the front-end via executeIntegration
```

## Step 1: Create a Connection

A Connection stores how to reach and authenticate with an external system.

```bash
# Integrator API requires OAuth 2.0 bearer token — see api/authentication skill
POST /app/components/integrator/app/api/v1/connections
Authorization: Bearer <oauth-token>
Content-Type: application/json

{
  "name": "ServiceNow Production",
  "description": "ServiceNow instance for incident management",
  "type": "REST",
  "properties": {
    "baseUrl": "https://mycompany.service-now.com/api",
    "username": "integration_user",
    "password": "integration_password",
    "authType": "Basic"
  }
}
```

**Key decisions:**
- `name` should clearly identify the system and environment (e.g., "ServiceNow Production" vs "ServiceNow Dev")
- Store credentials in Connection properties — they're encrypted at rest
- Use separate Connections for different environments (dev, staging, prod)

## Step 2: Create Operations

An Operation defines a specific API call against the Connection. Think of it as a reusable, parameterized API template.

```bash
POST /app/components/integrator/app/api/v1/connections/{connectionId}/operations
Authorization: Bearer <oauth-token>
Content-Type: application/json

{
  "name": "Create Incident",
  "description": "Creates a new incident in ServiceNow",
  "method": "POST",
  "path": "/now/table/incident",
  "headers": {
    "Content-Type": "application/json",
    "Accept": "application/json"
  },
  "bodyTemplate": {
    "short_description": "{{short_description}}",
    "description": "{{description}}",
    "urgency": "{{urgency}}",
    "category": "{{category}}"
  }
}
```

### Common Operation Patterns

**Lookup (GET):**
```json
{
  "name": "Get Incident",
  "method": "GET",
  "path": "/now/table/incident/{{sys_id}}",
  "headers": { "Accept": "application/json" }
}
```

**Search (GET with query):**
```json
{
  "name": "Search Incidents",
  "method": "GET",
  "path": "/now/table/incident?sysparm_query={{query}}&sysparm_limit={{limit}}",
  "headers": { "Accept": "application/json" }
}
```

**Update (PATCH/PUT):**
```json
{
  "name": "Update Incident Status",
  "method": "PATCH",
  "path": "/now/table/incident/{{sys_id}}",
  "headers": { "Content-Type": "application/json" },
  "bodyTemplate": { "state": "{{state}}", "close_notes": "{{close_notes}}" }
}
```

## Step 3: Use Operations

### In Workflows

Operations are invoked from workflow nodes. The workflow passes submission values as parameters to the Operation template variables (`{{short_description}}`, etc.).

### From Front-End Portals

Use `executeIntegration` from `@kineticdata/react`:

```javascript
import { executeIntegration } from '@kineticdata/react';

const result = await executeIntegration({
  kappSlug: 'services',
  formSlug: 'maintenance-request',
  integrationName: 'Create Incident',
  values: {
    short_description: 'Facilities maintenance needed',
    description: 'AC unit in building 3 is not working',
    urgency: '2',
    category: 'Facilities',
  },
});
```

See the Mutations front-end skill (`front-end/mutations`) for more on `executeIntegration`.

## Testing the Integration

1. Create the Connection and verify it can reach the external system
2. Create a test Operation (e.g., a simple GET)
3. Execute the Operation and verify the response
4. Wire into a workflow or front-end and test end-to-end

## Next Steps

- **Add this to a workflow** — see `recipes/add-approval-workflow` for wiring integrations into approval flows
- **Build a UI** — see `front-end/mutations` for calling Operations from React portals
- **Error handling** — Operations return the external system's response; handle errors in your workflow or front-end code
```

- [ ] **Step 3: Commit**

```bash
git add skills/recipes/connect-external-system/
git commit -m "feat: add recipe skill for connecting to external systems"
```

---

### Task 13: Write Recipe — Build Paginated List

**Files:**
- Create: `skills/recipes/build-paginated-list/SKILL.md`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p skills/recipes/build-paginated-list
```

- [ ] **Step 2: Write the recipe skill**

Create `skills/recipes/build-paginated-list/SKILL.md` with this content:

```markdown
---
name: build-paginated-list
description: Step-by-step recipe for building a paginated submission list in a React portal using @kineticdata/react hooks.
---

# Recipe: Build a Paginated List

## When to Use

You need to display a list of submissions in a React portal — a request queue, approval inbox, search results, activity log, or any list of records that could grow large. This recipe covers paginated data fetching with filtering and search.

## Prerequisites

- A working React portal with `KineticLib` configured (see `front-end/bootstrap`)
- A form with submissions and index definitions (see `recipes/create-submission-form`)
- Read the Data Fetching skill (`front-end/data-fetching`) for hook reference
- Read the Pagination concept skill (`concepts/pagination`) for API-level pagination details

## Overview

```
1. Define the KQL query
2. Set up the paginated data hook
3. Build the list UI component
4. Add filtering
5. Add pagination controls
```

## Step 1: Define the KQL Query

Use `defineKqlQuery` to build a parameterized KQL query:

```javascript
import { defineKqlQuery, searchSubmissions } from '@kineticdata/react';

const kqlQuery = defineKqlQuery()
  .startsWith('values[Status]', 'status')
  .equals('values[Requested For]', 'requestedFor')
  .end();
```

This creates a query function that accepts `{ status, requestedFor }` parameters. Parameters that are `undefined` or `null` are omitted from the query automatically.

**Gotcha:** Every field referenced in the KQL query must have an index definition on the form. See `concepts/kql-and-indexing`.

## Step 2: Set Up the Paginated Data Hook

```javascript
import { usePaginatedData } from '../hooks/usePaginatedData';
// Note: usePaginatedData is a project-local hook, not exported by @kineticdata/react.
// See front-end/data-fetching skill for the implementation.

function RequestList({ kappSlug, formSlug }) {
  const { data, loading, nextPage, prevPage, hasNextPage, hasPrevPage } =
    usePaginatedData(searchSubmissions, {
      kapp: kappSlug,
      form: formSlug,
      search: {
        q: kqlQuery({ status: 'Open' }),
        include: ['details', 'values'],
        limit: 25,
      },
    });

  // data.submissions contains the current page results
  // nextPage() / prevPage() navigate between pages
}
```

## Step 3: Build the List UI

```jsx
function RequestList({ kappSlug, formSlug }) {
  const { data, loading, nextPage, prevPage, hasNextPage, hasPrevPage } =
    usePaginatedData(searchSubmissions, {
      kapp: kappSlug,
      form: formSlug,
      search: {
        q: kqlQuery({ status: 'Open' }),
        include: ['details', 'values'],
        limit: 25,
      },
    });

  if (loading && !data) return <div>Loading...</div>;

  return (
    <div>
      <ul>
        {data?.submissions?.map(submission => (
          <li key={submission.id}>
            <span>{submission.values['Summary']}</span>
            <span>{submission.values['Status']}</span>
            <span>{new Date(submission.createdAt).toLocaleDateString()}</span>
          </li>
        ))}
      </ul>

      <div>
        <button onClick={prevPage} disabled={!hasPrevPage}>Previous</button>
        <button onClick={nextPage} disabled={!hasNextPage}>Next</button>
      </div>
    </div>
  );
}
```

**Gotcha:** Core API does NOT provide a total count. Show "Page N" with Prev/Next controls — don't try to show "Page 1 of 10".

## Step 4: Add Filtering

Add filter controls that update the KQL query parameters:

```jsx
function RequestList({ kappSlug, formSlug }) {
  const [statusFilter, setStatusFilter] = useState('Open');
  const [searchTerm, setSearchTerm] = useState('');

  const { data, loading, nextPage, prevPage, hasNextPage, hasPrevPage } =
    usePaginatedData(searchSubmissions, {
      kapp: kappSlug,
      form: formSlug,
      search: {
        q: kqlQuery({ status: statusFilter, requestedFor: searchTerm || undefined }),
        include: ['details', 'values'],
        limit: 25,
      },
    });

  return (
    <div>
      <div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="Open">Open</option>
          <option value="Approved">Approved</option>
          <option value="Complete">Complete</option>
        </select>
      </div>
      {/* ... list and pagination from Step 3 ... */}
    </div>
  );
}
```

When filter values change, the hook automatically refetches with the new query.

## Step 5: Add Polling (Optional)

For real-time updates (e.g., an approval inbox), add polling with `usePoller`:

```javascript
import { usePoller } from '../hooks/usePoller';

// Inside your component
const { data, refetch } = usePaginatedData(/* ... */);
usePoller(refetch, { interval: 30000 }); // Poll every 30 seconds
```

See `front-end/data-fetching` for `usePoller` implementation and exponential backoff configuration.

## Next Steps

- **Add row actions** — see `front-end/mutations` for updating submissions
- **Build detail views** — fetch single submission with `fetchSubmission`
- **Add real-time updates** — see `front-end/data-fetching` for `usePoller`
```

- [ ] **Step 3: Commit**

```bash
git add skills/recipes/build-paginated-list/
git commit -m "feat: add recipe skill for building paginated submission lists"
```

---

### Task 14: Write Recipe — Build Service Portal

**Files:**
- Create: `skills/recipes/build-service-portal/SKILL.md`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p skills/recipes/build-service-portal
```

- [ ] **Step 2: Write the recipe skill**

Create `skills/recipes/build-service-portal/SKILL.md` with this content:

```markdown
---
name: build-service-portal
description: End-to-end recipe for building a self-service portal on the Kinetic Platform — from project setup through service catalog, request forms, approval queues, and request tracking.
---

# Recipe: Build a Service Portal

## When to Use

You need to build a complete self-service portal — a service catalog, recruiting portal, facilities management app, field service app, or any application where users submit requests that flow through async workflows with approvals and integrations. This recipe ties together all the other recipes into an end-to-end guide.

## Prerequisites

- Read the Bootstrap front-end skill (`front-end/bootstrap`) for project setup
- Familiarity with the individual recipe skills referenced below
- Access to a Kinetic Platform instance

## Architecture

A typical Kinetic portal follows this pattern:

```
User → Service Catalog → Request Form → Submission
  ↓
Workflow Engine → Approval Deferral → Approver Action
  ↓
Integration → External System (ServiceNow, Jira, etc.)
  ↓
Status Update → Notification → User Sees Result
```

The front-end is a React app using `@kineticdata/react`. The back-end is the Kinetic Platform handling forms, workflows, and integrations.

## Step 1: Platform Setup

### Create the Kapp

```bash
POST /app/api/v1/kapps
{
  "slug": "services",
  "name": "Services",
  "attributes": [
    { "name": "Description", "values": ["Self-service request portal"] }
  ]
}
```

### Create Forms

Build the forms your portal needs using the Create Submission Form recipe (`recipes/create-submission-form`). Typical forms:

1. **Service request forms** — one per service type (IT Help, Facilities, HR, etc.)
2. **Approval form** — a shared form for all approvals (Decision, Comments, Approver fields)
3. **Lookup/utility forms** — forms used by integrations for data lookups

### Add Workflows

Wire approval workflows to your service request forms using the Add Approval Workflow recipe (`recipes/add-approval-workflow`).

### Connect External Systems

Set up integrations for fulfillment using the Connect External System recipe (`recipes/connect-external-system`).

## Step 2: React Portal Setup

### Initialize the Project

```bash
npm create vite@latest my-portal -- --template react
cd my-portal
npm install @kineticdata/react react-router-dom
```

### Configure KineticLib

See `front-end/bootstrap` for complete setup. The critical pieces:

```jsx
// src/App.jsx
import { KineticLib } from '@kineticdata/react';
import { globals } from './globals';

function App() {
  return (
    <KineticLib globals={globals}>
      {({ initialized, loggedIn, loginProps }) => {
        if (!initialized) return <Loading />;
        if (!loggedIn) return <Login {...loginProps} />;
        return <Router />;
      }}
    </KineticLib>
  );
}
```

### Configure Vite Proxy

```javascript
// vite.config.js
export default defineConfig({
  server: {
    proxy: {
      '/app': {
        target: 'https://myspace.kinops.io',
        changeOrigin: true,
      },
    },
  },
});
```

## Step 3: Build the Service Catalog

The catalog displays available services grouped by category.

```jsx
import { searchForms } from '@kineticdata/react';
import { useData } from '../hooks/useData';

function ServiceCatalog({ kappSlug }) {
  const { data, loading } = useData(searchForms, {
    kapp: kappSlug,
    include: ['attributes', 'categorizations'],
    q: 'status="Active"',
  });

  if (loading) return <Loading />;

  // Group forms by type attribute
  const categories = {};
  data?.forms?.forEach(form => {
    const type = form.type || 'Other';
    if (!categories[type]) categories[type] = [];
    categories[type].push(form);
  });

  return (
    <div>
      {Object.entries(categories).map(([category, forms]) => (
        <section key={category}>
          <h2>{category}</h2>
          {forms.map(form => (
            <a key={form.slug} href={`/forms/${form.slug}`}>
              {form.name}
            </a>
          ))}
        </section>
      ))}
    </div>
  );
}
```

## Step 4: Build the Request Form Page

Render Kinetic forms using `KineticForm`:

```jsx
import { KineticForm } from '../components/KineticForm';

function RequestForm({ kappSlug, formSlug }) {
  return (
    <KineticForm
      kappSlug={kappSlug}
      formSlug={formSlug}
      onCompleted={({ submission }) => {
        // Navigate to the request detail page
        navigate(`/requests/${submission.id}`);
      }}
    />
  );
}
```

See `front-end/forms` for `KineticForm` wrapper implementation, `generateFormLayout`, and `globals.jsx` setup.

## Step 5: Build the Request List

Use the Build Paginated List recipe (`recipes/build-paginated-list`) to create:

1. **My Requests** — submissions where `Requested For` matches the logged-in user
2. **Approval Queue** — submissions pending the user's approval
3. **All Requests** — admin view of all submissions (if authorized)

## Step 6: Build the Request Detail Page

Show a single request with its activity timeline:

```jsx
import { fetchSubmission } from '@kineticdata/react';
import { useData } from '../hooks/useData';

function RequestDetail({ submissionId }) {
  const { data, loading } = useData(fetchSubmission, {
    id: submissionId,
    include: ['details', 'values', 'activities'],
  });

  if (loading) return <Loading />;
  const submission = data?.submission;

  return (
    <div>
      <h1>{submission.values['Summary']}</h1>
      <dl>
        <dt>Status</dt><dd>{submission.values['Status']}</dd>
        <dt>Submitted</dt><dd>{new Date(submission.createdAt).toLocaleDateString()}</dd>
        <dt>Requested For</dt><dd>{submission.values['Requested For']}</dd>
      </dl>

      <h2>Activity</h2>
      <ul>
        {submission.activities?.map(activity => (
          <li key={activity.id}>
            {activity.description} — {new Date(activity.createdAt).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Putting It All Together

### Recommended Route Structure

```
/                     → Service Catalog
/forms/:formSlug      → Request Form
/requests             → My Requests (paginated list)
/requests/:id         → Request Detail
/approvals            → Approval Queue
/profile              → User Profile
```

### Reference Implementation

The [momentum-portal](https://github.com/kineticdata/momentum-portal) repository demonstrates these patterns in a production portal. Study it for:
- Paginated data fetching with `usePaginatedData`
- Request lifecycle management with activity timelines
- Integration orchestration with `executeIntegration`
- Mobile-responsive design patterns
- Dynamic Redux registration with `regRedux`

## Next Steps

- **Customize the theme** — see `front-end/state` for theme system
- **Add mobile support** — see momentum-portal for mobile detection patterns
- **Add security** — see `concepts/users-teams-security` for KSL security policies
```

- [ ] **Step 3: Commit**

```bash
git add skills/recipes/build-service-portal/
git commit -m "feat: add recipe skill for building end-to-end service portals"
```

---

### Task 15: Validate Complete Structure

**Files:** None (verification only)

- [ ] **Step 1: Verify the full directory structure**

```bash
find skills/ -name "SKILL.md" | sort
```

Expected output:
```
skills/api/authentication/SKILL.md
skills/api/using-the-api/SKILL.md
skills/concepts/api-basics/SKILL.md
skills/concepts/architectural-patterns/SKILL.md
skills/concepts/decision-frameworks/SKILL.md
skills/concepts/form-engine/SKILL.md
skills/concepts/integrations/SKILL.md
skills/concepts/kql-and-indexing/SKILL.md
skills/concepts/pagination/SKILL.md
skills/concepts/ruby-sdk/SKILL.md
skills/concepts/template-provisioning/SKILL.md
skills/concepts/users-teams-security/SKILL.md
skills/concepts/webapis-and-webhooks/SKILL.md
skills/concepts/workflow-engine/SKILL.md
skills/concepts/workflow-xml/SKILL.md
skills/front-end/bootstrap/SKILL.md
skills/front-end/data-fetching/SKILL.md
skills/front-end/forms/SKILL.md
skills/front-end/mutations/SKILL.md
skills/front-end/state/SKILL.md
skills/recipes/add-approval-workflow/SKILL.md
skills/recipes/build-paginated-list/SKILL.md
skills/recipes/build-service-portal/SKILL.md
skills/recipes/connect-external-system/SKILL.md
skills/recipes/create-submission-form/SKILL.md
```

Total: 25 skill files (13 concepts + 5 front-end + 5 recipes + 2 api).

- [ ] **Step 2: Verify all CLAUDE.md paths resolve**

```bash
grep -oP '`skills/[^`]+`' CLAUDE.md | tr -d '`' | while read f; do
  [ -f "$f" ] && echo "OK: $f" || echo "MISSING: $f"
done
```

Expected: All paths report "OK".

- [ ] **Step 3: Verify adapter files exist**

```bash
for f in CLAUDE.md AGENTS.md GEMINI.md .cursor/rules/kinetic-platform.mdc .github/copilot-instructions.md; do
  [ -f "$f" ] && echo "OK: $f" || echo "MISSING: $f"
done
```

Expected: All 5 files report "OK".
