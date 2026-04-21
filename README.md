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
| [workflow-engine](skills/concepts/workflow-engine/SKILL.md) | Workflow engine concepts, execution model, ERB context, events/coreState, programmatic workflow creation, Task API v2 reference |
| [workflow-xml](skills/concepts/workflow-xml/SKILL.md) | XML/treeJson schema, task nodes, flow control, system handlers, return node rules, critical node flags, error management API, triggers API |
| [decision-frameworks](skills/concepts/decision-frameworks/SKILL.md) | Integration type selection, data storage patterns, workflow execution model |
| [architectural-patterns](skills/concepts/architectural-patterns/SKILL.md) | Deferral pattern, approvals, fulfillment, work routing, SLA tracking, external system sync, bulk operations |
| [form-engine](skills/concepts/form-engine/SKILL.md) | Form JSON schema, field types, events, expressions, K() JavaScript API, bundle.config overrides |
| [integrations](skills/concepts/integrations/SKILL.md) | Connections/Operations, Bridges, Handlers, File Resources — when to use each |
| [webapis-and-webhooks](skills/concepts/webapis-and-webhooks/SKILL.md) | WebAPIs (custom REST endpoints), Webhooks (event triggers), security, callback patterns |
| [users-teams-security](skills/concepts/users-teams-security/SKILL.md) | Users, Teams, KSL security definitions, two-layer security model, policy endpoints, attribute definitions, submission activities |

#### Provisioning & Automation

| Skill | Description |
|-------|-------------|
| [ruby-sdk](skills/concepts/ruby-sdk/SKILL.md) | Kinetic Ruby SDK (kinetic_sdk gem) for environment provisioning, data migrations, and scripted administration |
| [template-provisioning](skills/concepts/template-provisioning/SKILL.md) | Template export/import structure, install.rb scripts, connection/operation JSON schema, bootstrap patterns |

### Front-End (`skills/front-end/`)

| Skill | Description |
|-------|-------------|
| [bootstrap](skills/front-end/bootstrap/SKILL.md) | KineticLib setup, app context fetching, Vite config, auth state machine |
| [forms](skills/front-end/forms/SKILL.md) | CoreForm vs client-side decision, KineticForm wrapper, CoreForm usage, globals.jsx, widget system |
| [data-fetching](skills/front-end/data-fetching/SKILL.md) | useData, usePaginatedData, defineKqlQuery, searchSubmissions |
| [mutations](skills/front-end/mutations/SKILL.md) | executeIntegration, submission CRUD, profile/kapp/space updates |
| [state](skills/front-end/state/SKILL.md) | regRedux, appActions, theme, toasts, confirmation modal, utilities |

### API Reference (`skills/api/`)

| Skill | Description |
|-------|-------------|
| [authentication](skills/api/authentication/SKILL.md) | Authentication patterns for Core, Integrator, and Task APIs |
| [using-the-api](skills/api/using-the-api/SKILL.md) | Common API usage patterns, request/response conventions |

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

Claude Code follows `@`-imports transitively — referencing `CLAUDE.md` pulls in all 18 skills automatically.

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

2. **Create the skill directory and file:**
   ```bash
   mkdir -p skills/concepts/my-new-skill
   touch skills/concepts/my-new-skill/SKILL.md
   ```

3. **Add YAML frontmatter** — only `name` and `description` are supported:
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
   - `description` should be a single sentence summarizing the skill's scope
   - Do NOT use `tags`, `version`, or other attributes — they are not supported by the Agent Skills Standard

4. **Write the content:**
   - Keep each skill under ~500 lines / ~5,000 tokens for progressive disclosure
   - Use code blocks with language tags for examples
   - Cross-reference other skills by relative path: `See the Pagination skill (\`concepts/pagination\`)`
   - Keep content generic — avoid references to specific project codebases or environments

5. **Register the skill** in these files:
   - `CLAUDE.md` — add an `@skills/...` import line
   - `README.md` — add a row to the appropriate skills table
   - `.cursor/rules/kinetic-platform.mdc` or `kinetic-front-end.mdc` — add an `@` import
   - `.github/copilot-instructions.md` — add to the skill list at the bottom

### Updating an Existing Skill

Edit the `SKILL.md` file directly. No other files need to change unless you rename the skill folder.

### Renaming or Moving a Skill

If you rename a skill folder, update all references:
- `SKILL.md` frontmatter `name` (must match new folder name)
- `CLAUDE.md` import path
- `README.md` table link
- `.cursor/rules/*.mdc` import paths
- `.github/copilot-instructions.md`
- Cross-references in other `SKILL.md` files

### Style Guidelines

- **Be factual** — document observed behavior, not assumptions
- **Include code examples** — show real API calls, payloads, and response shapes
- **Document gotchas** — call out non-obvious behavior, common mistakes, and error messages
- **Stay generic** — skills should apply to any Kinetic Platform project, not just one codebase
