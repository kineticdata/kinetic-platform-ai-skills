# Kinetic Platform AI Skills

A shareable AI skills library for building on the Kinetic Platform. Organized following the [Agent Skills Standard](https://agentskills.io) for compatibility with Claude Code, Cursor, GitHub Copilot, Codex, and other AI coding tools.

## Skills

### Recipes (`skills/recipes/`)

| Skill | Description |
|-------|-------------|
| [create-submission-form](skills/recipes/create-submission-form/SKILL.md) | Step-by-step recipe for creating forms with fields, indexes, events, and submission handling |
| [add-approval-workflow](skills/recipes/add-approval-workflow/SKILL.md) | Recipe for adding deferral-based approval workflows to forms |
| [connect-external-system](skills/recipes/connect-external-system/SKILL.md) | Recipe for connecting to external REST APIs using Connections and Operations |
| [build-paginated-list](skills/recipes/build-paginated-list/SKILL.md) | Recipe for building paginated submission lists in React portals |
| [build-service-portal](skills/recipes/build-service-portal/SKILL.md) | End-to-end recipe for building a self-service portal |

### Concepts (`skills/concepts/`)

| Skill | Description |
|-------|-------------|
| [api-basics](skills/concepts/api-basics/SKILL.md) | Base URLs, authentication, Core API v1 and Task API v2 endpoints, response formats, submission PATCH, and common gotchas |
| [kql-and-indexing](skills/concepts/kql-and-indexing/SKILL.md) | KQL operators, form index definitions, compound indexes, and query gotchas |
| [pagination](skills/concepts/pagination/SKILL.md) | Core API pageToken pagination, 1000-record cap, keyset pagination, Task API offset pagination |
| [workflow-engine](skills/concepts/workflow-engine/SKILL.md) | Workflow execution model, nodes/connectors/events/coreState, deferrals & Queue Task pattern, run-status derivation, stuck-run repair |
| [workflow-xml](skills/concepts/workflow-xml/SKILL.md) | XML/treeJson schema, task nodes, flow control, ERB context, system handlers, return node rules, critical node flags |
| [workflow-creation](skills/concepts/workflow-creation/SKILL.md) | Create/manage workflows — Core API two-step creation, kapp vs form, filters, supported events, tree title format, sources |
| [task-api-reference](skills/concepts/task-api-reference/SKILL.md) | Task API v2 endpoints (trees/runs/handlers/sources), triggers & errors APIs, run/tree/task response shapes, meta resources |
| [decision-frameworks](skills/concepts/decision-frameworks/SKILL.md) | Integration type selection, data storage patterns, workflow execution model |
| [architectural-patterns](skills/concepts/architectural-patterns/SKILL.md) | Deferral pattern, approvals, fulfillment, work routing, SLA tracking, external system sync, bulk operations |
| [robots](skills/concepts/robots/SKILL.md) | Scheduled automation — robot definition/execution/next-execution forms, the execution routine, robot tree pattern, scheduling, and gotchas |
| [form-engine](skills/concepts/form-engine/SKILL.md) | Form JSON schema, field types, events, expressions, K() JavaScript API, bundle.config overrides |
| [form-events-expressions](skills/concepts/form-events-expressions/SKILL.md) | Form events (load/submit/change/click), K() JavaScript API, expression syntax, bundle.config overrides, form-level integrations |
| [integrations](skills/concepts/integrations/SKILL.md) | Connections/Operations, Bridges, Handlers, File Resources — when to use each |
| [models](skills/concepts/models/SKILL.md) | Bridge Data Models — read-only data views backed by bridge adapters for querying external data from forms and portals |
| [webapis-and-webhooks](skills/concepts/webapis-and-webhooks/SKILL.md) | WebAPIs (custom REST endpoints), Webhooks (event triggers), security, callback patterns |
| [users-teams-security](skills/concepts/users-teams-security/SKILL.md) | Users, Teams, KSL security definitions, two-layer security model, policy endpoints, attribute definitions, submission activities |
| [security-policies](skills/concepts/security-policies/SKILL.md) | KSL security expressions, policy definitions/CRUD, binding functions, attribute definitions, activities, Task engine security, access control |

#### Provisioning & Automation

| Skill | Description |
|-------|-------------|
| [ruby-sdk](skills/concepts/ruby-sdk/SKILL.md) | Kinetic Ruby SDK (kinetic_sdk gem) for environment provisioning, data migrations, and scripted administration |
| [template-provisioning](skills/concepts/template-provisioning/SKILL.md) | Template export/import structure, install.rb scripts, connection/operation JSON schema, bootstrap patterns |

### Front-End (`skills/front-end/`)

| Skill | Description |
|-------|-------------|
| [bootstrap](skills/front-end/bootstrap/SKILL.md) | KineticLib setup, app context fetching, Vite config, auth state machine |
| [portal-patterns](skills/front-end/portal-patterns/SKILL.md) | Portal architecture — routing, Redux/regRedux, useData hook, context fetching, kappSlug resolution, project structure |
| [forms](skills/front-end/forms/SKILL.md) | CoreForm vs client-side decision, KineticForm wrapper, CoreForm usage, globals.jsx, widget system |
| [data-fetching](skills/front-end/data-fetching/SKILL.md) | useData, usePaginatedData, defineKqlQuery, searchSubmissions |
| [mutations](skills/front-end/mutations/SKILL.md) | executeIntegration, submission CRUD, profile/kapp/space updates |
| [state](skills/front-end/state/SKILL.md) | regRedux, appActions, theme, toasts, confirmation modal, utilities |

### API Reference (`skills/api/`)

| Skill | Description |
|-------|-------------|
| [authentication](skills/api/authentication/SKILL.md) | Authentication patterns for Core, Integrator, and Task APIs |
| [using-the-api](skills/api/using-the-api/SKILL.md) | Common API usage patterns, request/response conventions |

### Platform (`skills/platform/`)

| Skill | Description |
|-------|-------------|
| [handler-development](skills/platform/handler-development/SKILL.md) | Building custom Kinetic Task handlers — architecture, file structure, auth, packaging, handler catalog |
| [known-bugs](skills/platform/known-bugs/SKILL.md) | Confirmed platform bugs with symptoms, impact, and tested workarounds |
| [troubleshooting](skills/platform/troubleshooting/SKILL.md) | Diagnosing workflow failures, stuck runs, error management, and common API error patterns |

### Commands (`skills/commands/`)

User-invocable slash-command skills that drive the platform through the raw Core/Task REST API (an MCP server that wraps those calls is optional). `kinetic-kql` and `kinetic-policy` are generation-only; `kinetic-report` uses the project's report-style module.

| Skill | Description |
|-------|-------------|
| [kinetic-new-app](skills/commands/kinetic-new-app/SKILL.md) | Scaffold a complete application — forms, indexes, seed data, UI |
| [kinetic-workflow](skills/commands/kinetic-workflow/SKILL.md) | Create a workflow tree (event-triggered, WebAPI, or routine) |
| [kinetic-debug-run](skills/commands/kinetic-debug-run/SKILL.md) | Debug a workflow execution — find failures and diagnose root causes |
| [kinetic-explain-workflow](skills/commands/kinetic-explain-workflow/SKILL.md) | Export and explain a workflow tree in human-readable form |
| [kinetic-health](skills/commands/kinetic-health/SKILL.md) | Comprehensive platform health check |
| [kinetic-indexes](skills/commands/kinetic-indexes/SKILL.md) | Audit and manage search indexes for a form |
| [kinetic-kql](skills/commands/kinetic-kql/SKILL.md) | Build KQL queries with index awareness |
| [kinetic-migrate](skills/commands/kinetic-migrate/SKILL.md) | Copy forms and data between kapps (same or different servers) |
| [kinetic-policy](skills/commands/kinetic-policy/SKILL.md) | Build KSL security-policy expressions for the ABAC model |
| [kinetic-report](skills/commands/kinetic-report/SKILL.md) | Generate a branded PDF report |
| [kinetic-seed](skills/commands/kinetic-seed/SKILL.md) | Generate and load realistic seed data into a form |

---

## Usage

### Claude Code

Add to your project's `CLAUDE.md`:

```markdown
@/path/to/kinetic-platform-ai-skills/CLAUDE.md
```

Or globally in `~/.claude/CLAUDE.md`:

```markdown
@/path/to/kinetic-platform-ai-skills/CLAUDE.md
```

`CLAUDE.md` is an on-demand index: it lists every skill with a "read when you need to…" description, and the assistant reads only the skill files relevant to the current task (rather than loading them all up front).

To reference individual skills:

```markdown
@/path/to/kinetic-platform-ai-skills/skills/concepts/api-basics/SKILL.md
```

### Cursor

Copy or symlink the `.cursor/rules/` directory into your project root. Two rules files auto-apply by file type:
- `kinetic-platform.mdc` — `.js`, `.ts`, `.rb`, `.yaml`, `.yml` files
- `kinetic-front-end.mdc` — `.jsx`, `.tsx` files

### GitHub Copilot

Copy `.github/copilot-instructions.md` into your project's `.github/` directory.

### Other Tools

Each `SKILL.md` file is self-contained markdown with YAML frontmatter. Point your tool at the relevant skill files directly.

---

## Distribution

### Git submodule (recommended for teams)

```bash
git submodule add https://github.com/kineticdata/kinetic-platform-ai-skills.git ai-skills
```

Then reference in your `CLAUDE.md`:
```markdown
@ai-skills/CLAUDE.md
```

### Claude Code `--add-dir`

```bash
claude --add-dir /path/to/kinetic-platform-ai-skills
```

### Direct clone

```bash
git clone https://github.com/kineticdata/kinetic-platform-ai-skills.git ~/kinetic-skills
```

Then reference from `~/.claude/CLAUDE.md` for global access across all projects.

---

## For Kinetic Data Employees — Testing Skills

When updating skills, run the test suite to verify your changes don't break AI assistants' ability to build working apps.

### Test Suite

The test suite provisions a complete test environment (kapp, forms, workflows, connection, operations) and verifies everything works end-to-end.

```bash
# Provision test fixtures on any Kinetic environment
./tests/provision.sh https://your-space.kinops.io username password

# Run 16 verification checks
./tests/verify.sh https://your-space.kinops.io username password

# Clean up when done
./tests/teardown.sh https://your-space.kinops.io username password
```

**What the tests verify:**
- Kapp creation with formTypes, kapp fields, and indexes (system + custom field)
- Form creation with all field types and property variations
- Workflow execution with `system_integration_v1` (preferred handler)
- Deferral/approval lifecycle (submit → pending → deferred → approved → closed)
- Workflow filters (KSL expression on Submission Submitted)
- KQL search with form-level and kapp-level indexes
- Kapp-wide cross-form search using kapp fields

### Sample Portal

A minimal React portal for manual testing of CoreForm rendering and kapp-wide search.

```bash
cd portal
cp .env.development.local.sample .env.development.local
# Edit .env.development.local with your Kinetic environment URL
npm install
npm run dev
# Open http://localhost:3000
```

### Internal-Only Directories

These directories are for KD employees and are not intended for customer use:

| Directory | Purpose |
|-----------|---------|
| `tests/` | Provision, verify, and teardown scripts |
| `tests/fixtures/` | Exported form/workflow JSON reference |
| `portal/` | Sample React portal for manual testing |
| `docs/superpowers/` | Design specs and implementation plans |

---

## Contributing

### Adding a New Skill

1. **Choose the right domain folder:**
   - `skills/recipes/` — End-to-end guides for specific workflows or features
   - `skills/concepts/` — Core platform concepts, APIs, and architecture topics
   - `skills/api/` — API reference and integration patterns
   - `skills/front-end/` — React portal patterns, UI components, data hooks, state management
   - `skills/platform/` — Handler development, known bugs, troubleshooting
   - `skills/commands/` — User-invocable slash-command skills

2. **Create the skill directory and file:**
   ```bash
   mkdir -p skills/concepts/my-new-skill
   touch skills/concepts/my-new-skill/SKILL.md
   ```

3. **Add YAML frontmatter** — the core fields are `name` and `description`:
   ```yaml
   ---
   name: my-new-skill
   description: Short description of what this skill covers.
   ---

   # My New Skill

   Content here...
   ```

   **Frontmatter rules:**
   - `name` **must match the folder name exactly** (e.g., folder `api-basics/` → `name: api-basics`)
   - `description` should start with "Use when …" and state the concrete triggering conditions/symptoms that signal the skill applies (not a scope summary, and not a step-by-step of what it does) — this is what an AI reads to decide whether to load the skill. (Slash-command skills under `skills/commands/` are the exception: their `description` is an imperative action label shown in the command menu.)
   - For most skills, `name` and `description` are the only fields needed — don't add `tags`, `version`, etc.
   - **Slash-command skills** under `skills/commands/` additionally use the Claude Code fields `user-invocable: true` and `argument-hint: "<...>"`. These are Claude Code command conventions (not part of the core Agent Skills Standard) and apply only to command skills.

4. **Write the content:**
   - Keep each skill under ~500 lines / ~5,000 tokens for progressive disclosure
   - Use code blocks with language tags for examples
   - Cross-reference other skills by relative path: `See the Pagination skill (\`concepts/pagination\`)`
   - Keep content generic — avoid references to specific project codebases or environments

5. **Register the skill** in these files:
   - `CLAUDE.md` — add a row to the appropriate skill-index table (the index is read on demand; there are no `@`-imports)
   - `AGENTS.md` **and** `GEMINI.md` — these mirror `CLAUDE.md` for Codex and Gemini; add the same row (or just re-copy `CLAUDE.md` into both)
   - `README.md` — add a row to the appropriate skills table
   - `.cursor/rules/kinetic-platform.mdc` or `kinetic-front-end.mdc` — add an `@` import
   - `.github/copilot-instructions.md` — add to the skill list at the bottom

### Updating an Existing Skill

Edit the `SKILL.md` file directly. No other files need to change unless you rename the skill folder.

### Renaming or Moving a Skill

If you rename a skill folder, update all references:
- `SKILL.md` frontmatter `name` (must match new folder name)
- `CLAUDE.md` index row + path (and mirror into `AGENTS.md` / `GEMINI.md`)
- `README.md` table link
- `.cursor/rules/*.mdc` import paths
- `.github/copilot-instructions.md`
- Cross-references in other `SKILL.md` files

### Style Guidelines

- **Be factual** — document observed behavior, not assumptions
- **Include code examples** — show real API calls, payloads, and response shapes
- **Document gotchas** — call out non-obvious behavior, common mistakes, and error messages
- **Stay generic** — skills should apply to any Kinetic Platform project, not just one codebase
