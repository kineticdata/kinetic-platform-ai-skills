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
- Do NOT pass `timeline` or `direction` params to Core API submission endpoints — they return 400 errors

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

For full details see the skills library:
- `skills/platform/` — API basics, KQL & indexing, pagination, workflow engine, workflow XML schema, decision frameworks, architectural patterns, form engine, integrations, WebAPIs & webhooks, users/teams/security, Ruby SDK, template provisioning
- `skills/front-end/` — bootstrap, forms, data fetching, mutations, state management
