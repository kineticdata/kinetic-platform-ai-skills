# Kinetic Platform — Copilot Instructions

This project uses the Kinetic Platform. Apply the rules below when writing or suggesting code.

---

## API & Authentication

- Base URL: `https://<space-slug>.kinops.io/app/api/v1` (cloud) or `https://<server>/kinetic/<space-slug>/app/api/v1` (self-hosted)
- Task API (workflows) is at a **different path**: `.../app/components/task/app/api/v2`
- Auth: HTTP Basic Auth — `Authorization: Basic <base64(username:password)>`

## KQL Queries (Critical Rules)

- KQL queries require **index definitions** on the form — even simple equality queries fail without them
- Range operators (`=*`, `>`, `<`, `>=`, `<=`, `BETWEEN`) **require `orderBy`** referencing the same field
- `!=` is a **range operator** (not equality) — requires `orderBy`, avoid in paginated UIs
- Multi-field `AND` queries require a **compound (multi-part) index** — single-field indexes are not sufficient
- `OR` across different fields is unreliable — use separate queries or client-side filtering
- Do NOT pass `timeline` param to Core API submission endpoints — it returns 400 errors
- `direction` param IS supported on submission search — `ASC` or `DESC` (default), use with `orderBy`

## Pagination

- Core API has a **hard 1000-record cap per query** — use keyset pagination (`q=createdAt < "<lastTimestamp>"`) to get past it
- Core API uses `pageToken` cursor pagination; Task API uses `limit`/`offset`
- `include=values` does NOT return `createdAt` — use `include=details` or `include=details,values`
- Core API does NOT provide a total count — show "Page N" with Prev/Next only
- Task API `limit=0` returns ALL records — use `limit=1` for count-only queries

## Task API (Workflows)

- `include=details` is **required** to get `id`, `createdAt`, etc. on run objects — without it `id` is absent (not null)
- Task `status` values: `"New"`, `"Deferred"`, `"Closed"` (not "Complete")
- Tree titles follow format: `"SourceName :: SourceGroup :: EventName"` — use full title in API paths
- Filter runs by tree short name: `?tree=test1` (NOT by kapp slug)

## React Portals

- Use `KineticLib` to wrap the app; load form globals asynchronously via dynamic import
- Use `KineticForm` wrapper (not raw `CoreForm`) for standard form flows
- Build KQL queries with `defineKqlQuery()` and pass to `searchSubmissions`
- Use `usePaginatedData(searchSubmissions, params)` for paginated submission lists
- `useData` returns `{ initialized, loading, response, actions }`
- `executeIntegration` posts to `/integrations/kapps/{kappSlug}/forms/{formSlug?}/{integrationName}`

## Gotchas

- Submitting values for fields not defined on the form returns **500** — verify field names first with `?include=fields`
- `/me` response is flat — `me.username`, NOT `me.user.username`
- Seed data values may differ from display labels — verify actual field values before hardcoding
- Bulk submission creation triggers active workflows — plan for this if trees are bound to submission events

---

## Skill Index — Read On-Demand

For full details, read the relevant skill file(s) below before writing or suggesting code for that area. This index is generated from `skills.yaml` — do not hand-edit the table.

<!-- BEGIN GENERATED:skills -->
### Recipes — Step-by-Step Guides

| Skill | Path | Read when you need to... |
|-------|------|--------------------------|
| Create Submission Form | `skills/recipes/create-submission-form/SKILL.md` | "Create a form via API with fields |
| Add Approval Workflow | `skills/recipes/add-approval-workflow/SKILL.md` | Build an approval/deferral workflow where a submission waits for someone's decision |
| Connect External System | `skills/recipes/connect-external-system/SKILL.md` | Wire up a Connection/Operation to call an external REST API from workflows or forms |
| Build Paginated List | `skills/recipes/build-paginated-list/SKILL.md` | "Show a filterable |
| Build Service Portal | `skills/recipes/build-service-portal/SKILL.md` | "Build a complete self-service portal (catalog |

### Concepts — Platform Fundamentals

| Skill | Path | Read when you need to... |
|-------|------|--------------------------|
| API Basics | `skills/concepts/api-basics/SKILL.md` | "Make any REST API call — endpoints |
| Form Engine | `skills/concepts/form-engine/SKILL.md` | "Understand form JSON schema |
| Kapp Lifecycle | `skills/concepts/kapp-lifecycle/SKILL.md` | "Kapp create/update/delete |
| Form Events & Expressions | `skills/concepts/form-events-expressions/SKILL.md` | "Form events (load/submit/change/click) |
| KQL & Indexing | `skills/concepts/kql-and-indexing/SKILL.md` | "Write search queries |
| Pagination | `skills/concepts/pagination/SKILL.md` | "Page through results — pageToken |
| Workflow Engine | `skills/concepts/workflow-engine/SKILL.md` | "Understand the execution model (trees |
| Workflow XML | `skills/concepts/workflow-xml/SKILL.md` | "Handler reference — handler definition IDs |
| Workflow Creation | `skills/concepts/workflow-creation/SKILL.md` | "Create/manage workflows — Core API two-step creation |
| Task API Reference | `skills/concepts/task-api-reference/SKILL.md` | "Call the Task API v2 directly — trees/runs/handlers/sources endpoints |
| Integrations | `skills/concepts/integrations/SKILL.md` | "Set up Connections/Operations (preferred) |
| File Resources | `skills/concepts/file-resources/SKILL.md` | "Stream files from external systems (S3 |
| LogHub API | `skills/concepts/loghub-api/SKILL.md` | "Read real-time platform logs — endpoint |
| Decision Frameworks | `skills/concepts/decision-frameworks/SKILL.md` | "Choose between approaches — which integration type |
| Architectural Patterns | `skills/concepts/architectural-patterns/SKILL.md` | "Implement approvals |
| Robots | `skills/concepts/robots/SKILL.md` | "Scheduled automation — robot-definitions/executions/next-execution forms |
| WebAPIs & Webhooks | `skills/concepts/webapis-and-webhooks/SKILL.md` | Create custom REST endpoints (WebAPIs) or event-driven triggers (webhooks) |
| Users & Teams | `skills/concepts/users-and-teams/SKILL.md` | "Manage users/teams — CRUD |
| Security Policies | `skills/concepts/security-policies/SKILL.md` | "KSL security expressions |
| Attribute Definitions | `skills/concepts/attribute-definitions/SKILL.md` | "Define custom metadata on space/kapp/form/user/userProfile/team/category — per-scope endpoints |
| Submission Activities | `skills/concepts/submission-activities/SKILL.md` | "Per-submission audit trail / timeline — /submissions/{id}/activities CRUD |
| Models (Data Views) | `skills/concepts/models/SKILL.md` | Query external data from forms via bridge models and bridged resources |
| Ruby SDK | `skills/concepts/ruby-sdk/SKILL.md` | "Script admin operations |
| Template Provisioning | `skills/concepts/template-provisioning/SKILL.md` | "Export/import entire spaces |

### Front-End — React Portal Development

| Skill | Path | Read when you need to... |
|-------|------|--------------------------|
| Bootstrap | `skills/front-end/bootstrap/SKILL.md` | "Set up a new React portal — installation |
| Portal Patterns | `skills/front-end/portal-patterns/SKILL.md` | "Portal architecture — routing |
| Forms | `skills/front-end/forms/SKILL.md` | "Render forms in React — CoreForm component |
| Data Fetching | `skills/front-end/data-fetching/SKILL.md` | "Fetch submissions/data in React — useData |
| Mutations | `skills/front-end/mutations/SKILL.md` | "Create/update/delete submissions from React — executeIntegration |
| State | `skills/front-end/state/SKILL.md` | "Manage portal state — regRedux |
| Testing | `skills/front-end/testing/SKILL.md` | "Test portal components |
| Accessibility | `skills/front-end/accessibility/SKILL.md` | "ARIA patterns for pagination |

### API Reference

| Skill | Path | Read when you need to... |
|-------|------|--------------------------|
| Authentication | `skills/api/authentication/SKILL.md` | "Authenticate API calls — Basic Auth |
| Using the API | `skills/api/using-the-api/SKILL.md` | "Understand API conventions — space-level endpoints |
| Platform MCP Server | `skills/api/using-the-api/PLATFORM-MCP.md` | "Use when running the Kinetic Platform MCP server locally — install and auth |
| Core API Reference | `skills/api/core/SKILL.md` | "Look up Core API v1 endpoint URLs |
| Integrator API Reference | `skills/api/integrator/SKILL.md` | "Look up Integrator REST endpoint shapes for connections + operations (OAuth-only |
| Task API Reference | `skills/api/task/SKILL.md` | "Look up Task API v2 endpoint shapes for trees |

### Platform — Handlers, Bugs, Troubleshooting

| Skill | Path | Read when you need to... |
|-------|------|--------------------------|
| Handler Development | `skills/platform/handler-development/SKILL.md` | "Build a custom Task handler — zero-dependency architecture |
| Known Bugs | `skills/platform/known-bugs/SKILL.md` | "Check confirmed platform bugs with symptoms |
| Troubleshooting | `skills/platform/troubleshooting/SKILL.md` | "Diagnose workflow failures |
| SSO & Identity | `skills/platform/sso-and-identity/SKILL.md` | "SAML/SSO/OIDC configuration |

### Commands — Slash-Command Skills (user-invocable)

| Skill | Path | Run when you need to... |
|-------|------|--------------------------|
| `/kinetic-new-app` | `skills/commands/kinetic-new-app/SKILL.md` | "Scaffold a complete application — forms |
| `/kinetic-workflow` | `skills/commands/kinetic-workflow/SKILL.md` | "Create a workflow tree (event-triggered |
| `/kinetic-create-connection` | `skills/commands/kinetic-create-connection/SKILL.md` | Create a Connection + Operations for an external system via the Integrator API |
| `/kinetic-create-handler` | `skills/commands/kinetic-create-handler/SKILL.md` | "Scaffold a custom Task handler — init.rb |
| `/kinetic-debug-run` | `skills/commands/kinetic-debug-run/SKILL.md` | Debug a workflow execution — find failures and diagnose root causes |
| `/kinetic-test-workflow` | `skills/commands/kinetic-test-workflow/SKILL.md` | Test a workflow with synthetic input + assertions on per-node outputs |
| `/kinetic-explain-workflow` | `skills/commands/kinetic-explain-workflow/SKILL.md` | Export and explain a workflow tree in human-readable form |
| `/kinetic-export-form` | `skills/commands/kinetic-export-form/SKILL.md` | Export a single form's definition to JSON for version control |
| `/kinetic-health` | `skills/commands/kinetic-health/SKILL.md` | Run a comprehensive platform health check |
| `/kinetic-indexes` | `skills/commands/kinetic-indexes/SKILL.md` | Audit and manage search indexes for a form |
| `/kinetic-bump-indexes` | `skills/commands/kinetic-bump-indexes/SKILL.md` | Analyze a form's KQL queries and recommend + build the minimum compound indexes |
| `/kinetic-kql` | `skills/commands/kinetic-kql/SKILL.md` | Build KQL queries with index awareness (generation-only) |
| `/kinetic-migrate` | `skills/commands/kinetic-migrate/SKILL.md` | Copy forms and data between kapps (same or different servers) |
| `/kinetic-policy` | `skills/commands/kinetic-policy/SKILL.md` | Build KSL security-policy expressions for the ABAC model (generation-only) |
| `/kinetic-audit-permissions` | `skills/commands/kinetic-audit-permissions/SKILL.md` | Resolve effective permissions on a kapp/form/submission |
| `/kinetic-report` | `skills/commands/kinetic-report/SKILL.md` | Generate a branded PDF report (generation-only; needs the project's report-style module) |
| `/kinetic-seed` | `skills/commands/kinetic-seed/SKILL.md` | Generate and load realistic seed data into a form |
<!-- END GENERATED:skills -->
