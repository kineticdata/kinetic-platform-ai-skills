# Kinetic Platform Skills

## How to Use These Skills
**Before implementing** anything involving the Kinetic Platform, read the relevant skill file(s) from the index below. Do NOT guess — read the skill first. Skills are loaded on-demand to save context; read only what you need for the current task.

When you discover new patterns, corrections, or undocumented behavior, update the appropriate SKILL.md file.

## Mandatory Rules
- Always use `@kineticdata/react` for Kinetic Platform interactions in React portals. Prefer exported helpers (`KineticLib`, `fetch*`, `searchSubmissions`) and only use `bundle.apiLocation()` + `getCsrfToken()` when no helper exists.
- `useData` is NOT exported by `@kineticdata/react` — it must be implemented as a project-local hook. See the Bootstrap skill.

## Skill Index — Read On-Demand

**Read the relevant skill file(s) before starting work.** Match your task to the descriptions below.

### Platform Skills

| Skill | Path | When to read |
|-------|------|-------------|
| API Basics | `skills/platform/api-basics/SKILL.md` | Any REST API call — endpoints, auth, query params, response shapes, submission CRUD, gotchas |
| KQL & Indexing | `skills/platform/kql-and-indexing/SKILL.md` | Writing KQL queries, form index definitions, search/filter logic |
| Pagination | `skills/platform/pagination/SKILL.md` | Paginated lists, pageToken, keyset pagination past 1000-record cap, Task API offset pagination |
| Workflow Engine | `skills/platform/workflow-engine/SKILL.md` | Workflow concepts (trees, nodes, connectors, deferrals, runs), Task API, building workflow UIs |
| Workflow XML | `skills/platform/workflow-xml/SKILL.md` | Programmatic workflow creation/export, tree XML schema, treeJson, handler definition IDs |
| Decision Frameworks | `skills/platform/decision-frameworks/SKILL.md` | Choosing between integration types, data storage patterns, workflow vs real-time |
| Architectural Patterns | `skills/platform/architectural-patterns/SKILL.md` | Approvals, deferrals, fulfillment, SLA tracking, external system sync, work routing |
| Form Engine | `skills/platform/form-engine/SKILL.md` | Form JSON schema, field types, events, K() API, expressions, bundle.config overrides |
| Integrations | `skills/platform/integrations/SKILL.md` | Connections/Operations, Bridges, Handlers, File Resources — setup and usage |
| WebAPIs & Webhooks | `skills/platform/webapis-and-webhooks/SKILL.md` | Custom REST endpoints (WebAPIs), event-driven triggers (webhooks), security policies |
| Users, Teams & Security | `skills/platform/users-teams-security/SKILL.md` | User/team CRUD, KSL security expressions, policy definitions, attribute definitions, activities |
| Ruby SDK | `skills/platform/ruby-sdk/SKILL.md` | `kinetic_sdk` gem — scripted admin, migrations, bulk operations, environment provisioning |
| Template Provisioning | `skills/platform/template-provisioning/SKILL.md` | Template directory structure, install.rb scripts, connection JSON, export/import patterns |

### Front-End Skills

| Skill | Path | When to read |
|-------|------|-------------|
| Bootstrap | `skills/front-end/bootstrap/SKILL.md` | Portal setup — KineticLib, CoreForm prerequisites, Vite config, auth state, routing, project structure |
| Forms | `skills/front-end/forms/SKILL.md` | CoreForm vs client-side API, KineticForm wrapper, FormLayout, globals.jsx, widget system |
| Data Fetching | `skills/front-end/data-fetching/SKILL.md` | useData, usePaginatedData, usePagination, usePoller, defineKqlQuery, searchSubmissions |
| Mutations | `skills/front-end/mutations/SKILL.md` | executeIntegration, submission create/delete, profile/kapp/space updates |
| State | `skills/front-end/state/SKILL.md` | regRedux, appActions, themeActions, viewActions, getAttributeValue, toasts, confirmation modal |
