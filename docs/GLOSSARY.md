# Kinetic Platform — Canonical Glossary

This file is the single source of truth for terminology used across the skills library. Where any skill disagrees with this glossary, the glossary wins; the skill is wrong and should be updated.

---

## Example values

This is a **public** repository. Example hostnames and space/kapp slugs in skills, docs, and
scripts must be placeholders, never real environments. Convention:

- **Hostnames** — `<space-slug>.kinops.io`, or `yourcompany.kinops.io` where a concrete-looking
  value reads better than a bracketed placeholder.
- **Kapp/space slugs** — a neutral generic such as `your-space`, `services`, or `my-kapp`,
  chosen to match whatever the surrounding example is illustrating.

Mark the placeholder as an example in nearby text (e.g. "Replace `<space-slug>.kinops.io` with
your own space's URL") — substitution alone isn't enough; a reader must be able to tell it's a
placeholder and not a real, copyable value. Never use a real engagement, customer, or internal
dev-environment name as an example.

---

## Workflow vocabulary

**Tree** — The Task API's term for a workflow definition. Every workflow IS a tree at the Task layer. Endpoints: `GET /app/components/task/app/api/v2/trees`.

**Workflow** — The Core API's term for a tree that is bound to a Core resource (kapp, form, space) and triggered by a Core event (Submission Submitted, etc.). Workflows are created/managed via `POST /app/api/v1/kapps/{kapp}/forms/{form}/workflows`; under the hood the Core API creates a tree on the Task layer and registers the binding.

> **Rule:** "Workflow" = a Core-bound tree. "Tree" = any tree, including workflows, routines, and WebAPI-attached trees. Every workflow is a tree; not every tree is a workflow.

**Routine** — A reusable, parameterized tree that other trees invoke as a sub-call. Routines have inputs and outputs and can be deferred. They are NOT triggered by Core events; they are called from within other trees. Type: `Routine` on the tree record.

**WebAPI Tree** — A tree attached to a custom WebAPI endpoint, triggered by HTTP invocation rather than a Core event. `sourceGroup` starts with `"WebApis > {kapp-slug}"`.

**Run** — One execution instance of a tree. `runId` identifies it. Created by either a Core event firing (for workflows) or a direct invocation (for WebAPIs/routines).

**Trigger** — One node activation within a run. Runs contain many triggers. Confusingly, the Task API also has a `triggers` endpoint that exposes these per-node activations as the `Trigger` resource.

**Node** — A step in a tree's schema (one entry in the `nodes` array of `treeJson` or `<task>` element of `treeXml`).

**Handler** — The code that backs a node. Identified by `definitionId` (e.g., `system_integration_v1`, `kinetic_core_api_v1`).

**Connector** — A directed edge between nodes. Has a `type` (`Complete`, `Create`, `Update`, `Loop Head`, `Loop Tail`) and optionally a Ruby `value` expression that gates traversal.

**Deferral** — A pause point in a run waiting for an external event. The run status appears "Started" but the deferred node is in `Work In Progress`. Resumed via a trigger or a token completion.

> **Status string canon.** The Task API exposes `New`, `Closed`, `Work In Progress`, `Failed`, `Deferred` on triggers. Skills should use `Work In Progress` (not "WIP" except as parenthetical) when referring to the live API value; "deferred" the concept and `Work In Progress` the observed status string are not the same.

---

## Workflow definition format

**treeJson** — The canonical JSON representation of a tree. Round-trip safe; what the platform stores internally.

**treeXml** — The legacy XML representation. Still accepted on write; emitted on read only when explicitly requested. **For new code and for round-tripping via API, use treeJson.**

> **Rule:** Default to `treeJson` everywhere unless a specific endpoint requires `treeXml`. Recipes that show treeXml should label it as legacy with a treeJson equivalent.

---

## Security language

**KSL** ("Kinetic Security Language") — Colloquial name for the rule language used in **Core platform** security policy definitions. Rules are **JavaScript expressions** with platform-supplied binding functions (`identity()`, `team()`, `submission()`, `values()`, `kapp()`, `form()`, `space()`, etc.). Use JS operators: `&&`, `||`, `===`, `!==`, `!`.

**Task Policy Rules** — A **separate** policy system used by the Task engine for workflow-category, source, console, and API-access control. These rules are **Ruby** expressions, not JavaScript. Do not mix syntaxes.

> **Rule:** "KSL" by itself refers to the JavaScript-based Core policy language. When discussing Task engine policies, say "Task policy rules (Ruby)" — never "Task KSL." Skills that conflate these must be corrected.

---

## Submission states (`coreState`)

The `coreState` follows a one-way state machine: `Draft` → `Submitted` → `Closed`.

- `Draft` — created but not validated; workflows may pre-populate.
- `Submitted` — validation has fired and passed; the canonical "live" state.
- `Closed` — terminal-ish state for lifecycle indication. **Closed is NOT a write lock** — value mutations succeed via PUT/PATCH/handler paths even after closure. See `architectural-patterns/SKILL.md` for enforcement patterns.

PATCH is the escape hatch — admins can force any transition via `PATCH /submissions/{id}`.

---

## Integration vocabulary

**Connection** — A configured external system endpoint with auth credentials. Lives in the Integrator. **Credentials are masked as `null` on GET responses** — never PUT a GET body back, you'll wipe the credentials permanently.

**Operation** — A reusable, named API call defined under a Connection. Has typed inputs and a fixed HTTP method/path/auth.

**Bridge** — An older mechanism for read-only external data adapters. See `concepts/models` for usage; `concepts/integrations` references it.

**Model** (aka "Bridge Data Model") — A read-only data view backed by a Bridge adapter. Has mappings and qualifications.

**Handler** — A workflow node implementation. Custom handlers extend the Task engine. See `platform/handler-development`. (Note: "handler" is overloaded — it can refer to the package, the definition, or the running node, depending on context.)

**File Resource** — A static file uploaded into the platform and referenced by URL. See `api/core` and the file-resources references.

**WebAPI** — A custom REST endpoint exposed by the platform, backed by a tree. Triggered via HTTP.

**Webhook** — Two unrelated meanings in the platform docs:
1. *Customer-managed webhook* — a platform-owned HTTP POSTer that calls an external URL on a Core event.
2. *Implicit webhook* — the internal mechanism that fires workflow trees on platform events.

> **Rule:** When skills say "webhook" they should disambiguate. Default meaning is #1 (external POST) unless context makes #2 clear.

---

## Resource hierarchy

```
Space
├─ Kapps (containers; each has forms, workflows, indexes, attributes, categories)
│  ├─ Forms (schema; each has fields, events, indexes, integrations, attributes)
│  │  └─ Submissions (instances of a form's schema; have values + coreState)
│  └─ Webhooks / WebAPIs (kapp-scoped)
├─ Users / Teams / Memberships
├─ Bridges / Models / File Resources
├─ Security Policy Definitions (space + kapp level)
└─ Attribute Definitions (space, kapp, form, user, userProfile, team, category)
```

- **"Datastore form"** is not a separate type — it's a label for a form that uses a `formType` other than the default `Service`. All forms live inside a kapp.

---

## Authoritative skill homes for cross-cutting topics

To stop duplicate documentation, the following topics have one canonical home:

| Topic | Canonical skill |
|---|---|
| Connector type semantics (Complete/Create/Update/Loop) | `concepts/workflow-engine` |
| Deferral / Queue Task pattern | `concepts/architectural-patterns` |
| `system_tree_return_v1` headers_json rule | `concepts/workflow-xml` |
| "Closure Is Not a Write Lock" | `concepts/architectural-patterns` |
| Run-status-is-misleading rule | `concepts/task-api-reference` |
| ERB context table | `concepts/workflow-xml` |
| Core endpoint shapes | `api/core/*.md` (auto-generated) |
| Task endpoint shapes | `api/task/*.md` (auto-generated) |
| Bridge architecture | `concepts/models` |
| Handler authoring | `platform/handler-development` |
| KQL gotchas | `concepts/kql-and-indexing` |
| Form engine gotchas | `concepts/form-engine` |
| UUID-v1 timestamp matching for workflow discovery | `concepts/workflow-creation` |

When a section in another skill repeats one of these, it should be reduced to a one-line link.
