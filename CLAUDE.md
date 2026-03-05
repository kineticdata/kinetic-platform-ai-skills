# Kinetic Platform Skills

## How to Use These Skills
- **Before implementing** anything involving the Kinetic Platform API, workflows, forms, or React portals, consult the relevant skill files below.
- **When you discover** new patterns, corrections, or undocumented behavior about the Kinetic Platform, update the appropriate SKILL.md file.
- If no skill file covers a topic, create a new one following the structure in the README and register it here.
- Keep skills concise and example-driven. Avoid duplicating content across skills.

## Mandatory Rules
Always use `@kineticdata/react` for Kinetic Platform interactions in React portals. Prefer exported helpers (`KineticLib`, `fetch*`, `searchSubmissions`) and only use `bundle.apiLocation()` + `getCsrfToken()` when no helper exists.

`useData` is NOT exported by `@kineticdata/react` — it must be implemented as a project-local hook. See the Bootstrap skill.

## Platform Skills
@skills/platform/api-basics/SKILL.md
@skills/platform/kql-and-indexing/SKILL.md
@skills/platform/pagination/SKILL.md
@skills/platform/workflow-engine/SKILL.md
@skills/platform/workflow-xml/SKILL.md
@skills/platform/decision-frameworks/SKILL.md
@skills/platform/architectural-patterns/SKILL.md
@skills/platform/form-engine/SKILL.md
@skills/platform/integrations/SKILL.md
@skills/platform/webapis-and-webhooks/SKILL.md
@skills/platform/users-teams-security/SKILL.md
@skills/platform/ruby-sdk/SKILL.md
@skills/platform/template-provisioning/SKILL.md

## Front-End Skills
@skills/front-end/bootstrap/SKILL.md
@skills/front-end/forms/SKILL.md
@skills/front-end/data-fetching/SKILL.md
@skills/front-end/mutations/SKILL.md
@skills/front-end/state/SKILL.md
