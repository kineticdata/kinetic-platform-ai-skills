# Kinetic Platform Skills

## How to Use These Skills
**Before implementing** anything involving the Kinetic Platform, read the relevant skill file(s) from the index below. Do NOT guess — read the skill first. Skills are loaded on-demand to save context; read only what you need for the current task.

When you discover new patterns, corrections, or undocumented behavior, update the appropriate SKILL.md file.

## Writing Guidelines for Skills

These skills are the shared knowledge base for **any AI assistant or developer** building on the Kinetic Platform. Follow these principles:

- **Document the approach, not specific implementations.** Show the generic pattern (how to create an operation, how to build a workflow) — not hardcoded IDs, customer-specific field names, or environment URLs.
- **Platform behavior, not implementation choices.** Document what the platform does (API behavior, required properties, error responses). Don't document how a specific customer chose to use it (their form names, their workflow designs, their CSS classes).
- **Operations, connections, forms, and workflows are implementation-specific.** The skills teach the *schema* and *approach* for creating them. The specific operations you need depend on your use case.
- **Never include credentials, environment URLs, or UUIDs** in skill files. Those belong in project config, not shared documentation.
- **Test fixtures are separate.** The `tests/` directory has environment-specific provisioning scripts and exported JSON. Skills reference these as examples but don't embed them.

## Mandatory Rules
- Always use `@kineticdata/react` for Kinetic Platform interactions in React portals. Prefer exported helpers (`KineticLib`, `fetch*`, `searchSubmissions`) and only use `bundle.apiLocation()` + `getCsrfToken()` when no helper exists.
- `useData` is NOT exported by `@kineticdata/react` — it must be implemented as a project-local hook. See the Bootstrap skill.
- For new workflow API calls, prefer `system_integration_v1` (Connections/Operations) when the Integrator supports the target system. `kinetic_core_api_v1` (legacy) remains in heavy active use across customer spaces — observed at roughly 2× the rate of the modern handler — and continues to be a sensible choice where the Integrator doesn't yet cover an authentication pattern (AWS request signing is one known case). Custom handlers remain necessary for systems outside Integrator coverage. It is legacy but not being retired; integrations are the preferred approach where they cover the need.
- NEVER modify connection auth credentials via API — passwords are masked as `null` in GET responses and PUTting will overwrite them permanently with no way to recover.

## Skill Index — Read On-Demand

**Match your task to the descriptions below, then read only those skills.**

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
| Platform MCP Server | `skills/api/using-the-api/PLATFORM-MCP.md` | "Use when an MCP server ships with the platform — which tools to prefer |
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

## Common Errors → Which Skill to Read

| Error / Situation | Read |
|-------------------|------|
| 400 on KQL query ("requires index definition") | KQL & Indexing |
| 400 on form PUT with `indexDefinitions` | KQL & Indexing (strip read-only `status` from each entry) |
| 400 on form creation ("Invalid Form") | Form Engine (field property table) |
| 400 on submission ("field is required") | API Basics (coreState transitions) |
| Workflow never fires | Workflow Creation (filter syntax, supported events) |
| Workflow node fails with "ENGINE Run Error" | Troubleshooting (ENGINE Run Error causes); Workflow XML (return-node rules) |
| `system_tree_return_v1` RuntimeError | Workflow XML (tree_return is only for WebAPIs/routines) |
| Loop workflow fails | Workflow XML (loop connector pattern — head must connect to body AND tail) |
| Integration 401 Unauthorized | Integrations (connection auth — never modify via API) |
| `java.util.LinkedHashMap cannot be cast` | Form Engine (event action is a string, not object) |
| "Pre-defined patterns are not supported yet" | Form Engine (pattern property — use constraints instead) |

## Test Fixtures

Reference forms and workflows on demo.kinops.io (`ai-testing` kapp). Exported JSON in `tests/fixtures/`.

| Fixture | What it tests |
|---------|---------------|
| `kitchen-sink` form | Every field type, property variation, choice source, constraint, expression, layout element |
| `user-echo-test` form | Loop workflow (system_loop_head_v1 + system_loop_tail_v1) |
| `approval-request` form | Filtered workflow (KSL filter), deferral/approval pattern |
| `approval` form | Deferral completion (utilities_create_trigger_v1), submission close |
