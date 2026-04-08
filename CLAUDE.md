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
