# Kinetic Skills

A reusable knowledge library for building on and integrating with the Kinetic Platform. Organized into two domains — platform API/workflow knowledge and React portal patterns — with thin tool-specific wrappers that reference the skill files without duplicating content.

## Domains

### Platform (`platform/`)
Core API, workflows, KQL, data model, and lessons learned for working directly with the Kinetic Platform REST API and Task engine.

### React (`react/`)
Patterns for building Kinetic React portals using `@kineticdata/react` and `KineticLib`.

---

## File Index

### Platform

| File | Description |
|------|-------------|
| `platform/core-api.md` | Base URLs, auth, all Core API v1 and Task API v2 endpoints, pagination (including 1000-record cap + keyset pagination), KQL operators and gotchas, index definitions, response shapes |
| `platform/workflows.md` | Workflow engine concepts (trees, routines, nodes, handlers, deferrals, looping), Task API v2 reference, XML schema, handler IDs, ERB context variables, and UI-building lessons learned |

### React

| File | Description |
|------|-------------|
| `react/bootstrap.md` | KineticLib setup, app context fetching (space/profile/kapp), environment configuration for local dev |
| `react/forms.md` | KineticForm wrapper, CoreForm usage, globals.jsx, custom widgets and date pickers |
| `react/data-fetching.md` | `defineKqlQuery` pattern, `useData` / `usePaginatedData` hooks, datastore query conventions |
| `react/mutations.md` | `executeIntegration` helper, submission create/fetch/delete, profile and kapp/space update patterns |
| `react/state.md` | `regRedux` helper, `appActions`/`themeActions`/`viewActions`, `getAttributeValue`, confirmation modal, toast system, user role detection, utility helpers, `useRouteChange`, `useSwipe` |

### References

| File | Description |
|------|-------------|
| `references/core.json` | OpenAPI 3.0 spec for the Kinetic Core API |

---

## How to Use

### Claude Code

**Per-project** — add to your project's `CLAUDE.md`:
```markdown
@/path/to/kinetic-skills/CLAUDE.md
```

**Global (all projects)** — add to `~/.claude/CLAUDE.md`:
```markdown
@/path/to/kinetic-skills/CLAUDE.md
```

**Relative path (portable across machines)** — if `kinetic-skills` sits alongside your projects:
```markdown
@../kinetic-skills/CLAUDE.md
```

Claude Code follows `@`-imports transitively, so referencing `CLAUDE.md` pulls in all skill files automatically. On first use you'll be prompted to approve the imports; after that it's automatic.

Or reference individual skill files if you only need part of the library:
```markdown
@/path/to/kinetic-skills/platform/core-api.md
```

### Cursor
The `.cursor/rules/` directory contains two rules files that auto-apply based on file type:
- `kinetic-platform.mdc` — activates for `.js`/`.ts`/`.rb` files
- `kinetic-react.mdc` — activates for `.jsx`/`.tsx` files

Copy or symlink the `.cursor/` directory into your project root.

### GitHub Copilot
Copy `.github/copilot-instructions.md` into your project's `.github/` directory.

### Generic / Other Tools
Point your tool at the relevant skill files directly. Each file is self-contained plain markdown with no tool-specific syntax.
