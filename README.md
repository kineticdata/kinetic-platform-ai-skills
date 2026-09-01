# Kinetic Platform AI Skills

A shareable AI skills library for building on the Kinetic Platform. Organized following the [Agent Skills Standard](https://agentskills.io) for compatibility with Claude Code, Cursor, GitHub Copilot, Codex, and other AI coding tools.

## Skills

<!-- BEGIN GENERATED:skills -->
### Recipes — Step-by-Step Guides

| Skill | Description |
|-------|-------------|
| [create-submission-form](skills/recipes/create-submission-form/SKILL.md) | "Create a form via API with fields |
| [add-approval-workflow](skills/recipes/add-approval-workflow/SKILL.md) | Build an approval/deferral workflow where a submission waits for someone's decision |
| [connect-external-system](skills/recipes/connect-external-system/SKILL.md) | Wire up a Connection/Operation to call an external REST API from workflows or forms |
| [build-paginated-list](skills/recipes/build-paginated-list/SKILL.md) | "Show a filterable |
| [build-service-portal](skills/recipes/build-service-portal/SKILL.md) | "Build a complete self-service portal (catalog |

### Concepts — Platform Fundamentals

| Skill | Description |
|-------|-------------|
| [api-basics](skills/concepts/api-basics/SKILL.md) | "Make any REST API call — endpoints |
| [form-engine](skills/concepts/form-engine/SKILL.md) | "Understand form JSON schema |
| [kapp-lifecycle](skills/concepts/kapp-lifecycle/SKILL.md) | "Kapp create/update/delete |
| [form-events-expressions](skills/concepts/form-events-expressions/SKILL.md) | "Form events (load/submit/change/click) |
| [kql-and-indexing](skills/concepts/kql-and-indexing/SKILL.md) | "Write search queries |
| [pagination](skills/concepts/pagination/SKILL.md) | "Page through results — pageToken |
| [workflow-engine](skills/concepts/workflow-engine/SKILL.md) | "Understand the execution model (trees |
| [workflow-xml](skills/concepts/workflow-xml/SKILL.md) | "Handler reference — handler definition IDs |
| [workflow-creation](skills/concepts/workflow-creation/SKILL.md) | "Create/manage workflows — Core API two-step creation |
| [task-api-reference](skills/concepts/task-api-reference/SKILL.md) | "Call the Task API v2 directly — trees/runs/handlers/sources endpoints |
| [integrations](skills/concepts/integrations/SKILL.md) | "Set up Connections/Operations (preferred) |
| [file-resources](skills/concepts/file-resources/SKILL.md) | "Stream files from external systems (S3 |
| [loghub-api](skills/concepts/loghub-api/SKILL.md) | "Read real-time platform logs — endpoint |
| [decision-frameworks](skills/concepts/decision-frameworks/SKILL.md) | "Choose between approaches — which integration type |
| [architectural-patterns](skills/concepts/architectural-patterns/SKILL.md) | "Implement approvals |
| [robots](skills/concepts/robots/SKILL.md) | "Scheduled automation — robot-definitions/executions/next-execution forms |
| [webapis-and-webhooks](skills/concepts/webapis-and-webhooks/SKILL.md) | Create custom REST endpoints (WebAPIs) or event-driven triggers (webhooks) |
| [users-and-teams](skills/concepts/users-and-teams/SKILL.md) | "Manage users/teams — CRUD |
| [security-policies](skills/concepts/security-policies/SKILL.md) | "KSL security expressions |
| [attribute-definitions](skills/concepts/attribute-definitions/SKILL.md) | "Define custom metadata on space/kapp/form/user/userProfile/team/category — per-scope endpoints |
| [submission-activities](skills/concepts/submission-activities/SKILL.md) | "Per-submission audit trail / timeline — /submissions/{id}/activities CRUD |
| [models](skills/concepts/models/SKILL.md) | Query external data from forms via bridge models and bridged resources |
| [ruby-sdk](skills/concepts/ruby-sdk/SKILL.md) | "Script admin operations |
| [template-provisioning](skills/concepts/template-provisioning/SKILL.md) | "Export/import entire spaces |

### Front-End — React Portal Development

| Skill | Description |
|-------|-------------|
| [bootstrap](skills/front-end/bootstrap/SKILL.md) | "Set up a new React portal — installation |
| [portal-patterns](skills/front-end/portal-patterns/SKILL.md) | "Portal architecture — routing |
| [forms](skills/front-end/forms/SKILL.md) | "Render forms in React — CoreForm component |
| [data-fetching](skills/front-end/data-fetching/SKILL.md) | "Fetch submissions/data in React — useData |
| [mutations](skills/front-end/mutations/SKILL.md) | "Create/update/delete submissions from React — executeIntegration |
| [state](skills/front-end/state/SKILL.md) | "Manage portal state — regRedux |
| [testing](skills/front-end/testing/SKILL.md) | "Test portal components |
| [accessibility](skills/front-end/accessibility/SKILL.md) | "ARIA patterns for pagination |

### API Reference

| Skill | Description |
|-------|-------------|
| [authentication](skills/api/authentication/SKILL.md) | "Authenticate API calls — Basic Auth |
| [using-the-api](skills/api/using-the-api/SKILL.md) | "Understand API conventions — space-level endpoints |
| [platform-mcp](skills/api/using-the-api/PLATFORM-MCP.md) | "Use when running the Kinetic Platform MCP server locally — install and auth |
| [core](skills/api/core/SKILL.md) | "Look up Core API v1 endpoint URLs |
| [integrator](skills/api/integrator/SKILL.md) | "Look up Integrator REST endpoint shapes for connections + operations (OAuth-only |
| [task](skills/api/task/SKILL.md) | "Look up Task API v2 endpoint shapes for trees |

### Platform — Handlers, Bugs, Troubleshooting

| Skill | Description |
|-------|-------------|
| [handler-development](skills/platform/handler-development/SKILL.md) | "Build a custom Task handler — zero-dependency architecture |
| [known-bugs](skills/platform/known-bugs/SKILL.md) | "Check confirmed platform bugs with symptoms |
| [troubleshooting](skills/platform/troubleshooting/SKILL.md) | "Diagnose workflow failures |
| [sso-and-identity](skills/platform/sso-and-identity/SKILL.md) | "SAML/SSO/OIDC configuration |

### Commands — Slash-Command Skills (user-invocable)

| Skill | Description |
|-------|-------------|
| [kinetic-new-app](skills/commands/kinetic-new-app/SKILL.md) | "Scaffold a complete application — forms |
| [kinetic-workflow](skills/commands/kinetic-workflow/SKILL.md) | "Create a workflow tree (event-triggered |
| [kinetic-create-connection](skills/commands/kinetic-create-connection/SKILL.md) | Create a Connection + Operations for an external system via the Integrator API |
| [kinetic-create-handler](skills/commands/kinetic-create-handler/SKILL.md) | "Scaffold a custom Task handler — init.rb |
| [kinetic-debug-run](skills/commands/kinetic-debug-run/SKILL.md) | Debug a workflow execution — find failures and diagnose root causes |
| [kinetic-test-workflow](skills/commands/kinetic-test-workflow/SKILL.md) | Test a workflow with synthetic input + assertions on per-node outputs |
| [kinetic-explain-workflow](skills/commands/kinetic-explain-workflow/SKILL.md) | Export and explain a workflow tree in human-readable form |
| [kinetic-export-form](skills/commands/kinetic-export-form/SKILL.md) | Export a single form's definition to JSON for version control |
| [kinetic-health](skills/commands/kinetic-health/SKILL.md) | Run a comprehensive platform health check |
| [kinetic-indexes](skills/commands/kinetic-indexes/SKILL.md) | Audit and manage search indexes for a form |
| [kinetic-bump-indexes](skills/commands/kinetic-bump-indexes/SKILL.md) | Analyze a form's KQL queries and recommend + build the minimum compound indexes |
| [kinetic-kql](skills/commands/kinetic-kql/SKILL.md) | Build KQL queries with index awareness (generation-only) |
| [kinetic-migrate](skills/commands/kinetic-migrate/SKILL.md) | Copy forms and data between kapps (same or different servers) |
| [kinetic-policy](skills/commands/kinetic-policy/SKILL.md) | Build KSL security-policy expressions for the ABAC model (generation-only) |
| [kinetic-audit-permissions](skills/commands/kinetic-audit-permissions/SKILL.md) | Resolve effective permissions on a kapp/form/submission |
| [kinetic-report](skills/commands/kinetic-report/SKILL.md) | Generate a branded PDF report (generation-only; needs the project's report-style module) |
| [kinetic-seed](skills/commands/kinetic-seed/SKILL.md) | Generate and load realistic seed data into a form |
<!-- END GENERATED:skills -->

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
   - `CLAUDE.md` — add a row t