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
- Use `system_integration_v1` (Connections/Operations) for workflow API calls — NOT `kinetic_core_api_v1` (legacy, being retired).
- NEVER modify connection auth credentials via API — passwords are masked as `null` in GET responses and PUTting will overwrite them permanently with no way to recover.

## Skill Index — Read On-Demand

**Match your task to the descriptions below, then read only those skills.**

### Recipes — Step-by-Step Guides

| Skill | Path | Read when you need to... |
|-------|------|--------------------------|
| Create Submission Form | `skills/recipes/create-submission-form/SKILL.md` | Create a form via API with fields, indexes, events, and handle submissions |
| Add Approval Workflow | `skills/recipes/add-approval-workflow/SKILL.md` | Build an approval/deferral workflow where a submission waits for someone's decision |
| Connect External System | `skills/recipes/connect-external-system/SKILL.md` | Wire up a Connection/Operation to call an external REST API from workflows or forms |
| Build Paginated List | `skills/recipes/build-paginated-list/SKILL.md` | Show a filterable, paginated list of submissions in a React portal |
| Build Service Portal | `skills/recipes/build-service-portal/SKILL.md` | Build a complete self-service portal (catalog, forms, request tracking, approvals) |

### Concepts — Platform Fundamentals

| Skill | Path | Read when you need to... |
|-------|------|--------------------------|
| API Basics | `skills/concepts/api-basics/SKILL.md` | Make any REST API call — endpoints, auth, query params, response shapes, submission CRUD. **Start here for API work.** |
| Form Engine | `skills/concepts/form-engine/SKILL.md` | Understand form JSON schema, field types and their required properties, choices, content, buttons. **Start here for form structure.** |
| Form Events & Expressions | `skills/concepts/form-events-expressions/SKILL.md` | Form events (load/submit/change/click), K() JavaScript API, expression syntax, bundle.config overrides, form-level integrations |
| KQL & Indexing | `skills/concepts/kql-and-indexing/SKILL.md` | Write search queries, create indexes, filter submissions. Read when you get KQL errors or need to search. |
| Pagination | `skills/concepts/pagination/SKILL.md` | Page through results — pageToken, 1000-record cap workarounds, keyset pagination |
| Workflow Engine | `skills/concepts/workflow-engine/SKILL.md` | Understand workflow concepts (trees, nodes, events, runs), create/manage workflows via Core API, workflow filters |
| Workflow XML | `skills/concepts/workflow-xml/SKILL.md` | Handler reference — handler definition IDs, parameters, loops, deferrals, `system_integration_v1` pattern, run debugging API, gotchas |
| Workflow Creation | `skills/concepts/workflow-creation/SKILL.md` | Create and manage workflows — tree creation via Task API, treeJson upload, title format, handler discovery, sources |
| Integrations | `skills/concepts/integrations/SKILL.md` | Set up Connections/Operations (preferred), Bridges, or Handlers. Read when wiring up external system calls. |
| Decision Frameworks | `skills/concepts/decision-frameworks/SKILL.md` | Choose between approaches — which integration type, where to store data, workflow vs real-time |
| Architectural Patterns | `skills/concepts/architectural-patterns/SKILL.md` | Implement approvals, deferrals, fulfillment queues, SLA tracking, external system sync |
| WebAPIs & Webhooks | `skills/concepts/webapis-and-webhooks/SKILL.md` | Create custom REST endpoints (WebAPIs) or event-driven triggers (webhooks) |
| Users & Teams | `skills/concepts/users-teams-security/SKILL.md` | Manage users/teams — CRUD, memberships, management patterns |
| Security Policies | `skills/concepts/security-policies/SKILL.md` | KSL security expressions, policy definitions, binding functions, attribute definitions, activities, access control |
| Models (Data Views) | `skills/concepts/models/SKILL.md` | Query external data from forms via bridge models and bridged resources |
| Ruby SDK | `skills/concepts/ruby-sdk/SKILL.md` | Script admin operations, bulk imports, migrations using the `kinetic_sdk` gem |
| Template Provisioning | `skills/concepts/template-provisioning/SKILL.md` | Export/import entire spaces, write install.rb provisioning scripts |

### Front-End — React Portal Development

| Skill | Path | Read when you need to... |
|-------|------|--------------------------|
| Bootstrap | `skills/front-end/bootstrap/SKILL.md` | Set up a new React portal — KineticLib, Vite proxy, auth state, routing |
| Forms | `skills/front-end/forms/SKILL.md` | Render forms in React — CoreForm component, callbacks, globals.jsx, widget system |
| Data Fetching | `skills/front-end/data-fetching/SKILL.md` | Fetch submissions/data in React — useData, usePaginatedData, defineKqlQuery |
| Mutations | `skills/front-end/mutations/SKILL.md` | Create/update/delete submissions from React — executeIntegration, submission API functions |
| State | `skills/front-end/state/SKILL.md` | Manage portal state — regRedux, actions, toasts, confirmation modals |

### API Reference

| Skill | Path | Read when you need to... |
|-------|------|--------------------------|
| Authentication | `skills/api/authentication/SKILL.md` | Authenticate API calls — Basic Auth, OAuth 2.0 for Integrator, SAML SSO |
| Using the API | `skills/api/using-the-api/SKILL.md` | Understand API conventions — space-level endpoints, request patterns, error shapes |

## Common Errors → Which Skill to Read

| Error / Situation | Read |
|-------------------|------|
| 400 on KQL query ("requires index definition") | KQL & Indexing |
| 400 on form creation ("Invalid Form") | Form Engine (field property table) |
| 400 on submission ("field is required") | API Basics (coreState transitions) |
| Workflow never fires | Workflow Engine (filter syntax, event names) |
| Workflow node fails with "ENGINE Run Error" | Workflow XML (debugging runs section) |
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
