---
name: kinetic-new-app
description: Scaffold a complete Kinetic Platform application with forms, indexes, seed data, and UI
argument-hint: "<app-name> <description>"
user-invocable: true
---

# Scaffold a New Kinetic Application

The user wants to create a new application on the Kinetic Platform. Parse the argument for the app name (dash-separated slug) and description.

## Step 1: Read Reference Docs

Before scaffolding, read:
- The **API Basics** platform skill — Core API reference
- The **KQL & Indexing** platform skill — KQL and index management

## Step 2: Plan the Application

Ask the user to confirm (or propose based on description):
- **Kapp slug** (dash-separated, lowercase) — cannot change after creation
- **Form definitions** — name, slug, fields (with types), which fields need indexes
- **User-facing or admin?** → `apps/<name>/` vs `admin_apps/<name>/`
- **Seed data needed?**

## Step 3: Create Files

Generate these files in `apps/<name>/` (or `admin_apps/<name>/`):

### `setup.mjs`
- Creates kapp (handle 409 AND `uniqueness_violation` in 400 response)
- Creates forms with full page structure via `buildPages(fields)` helper
- Sets `submissionLabelExpression` on each form
- Pure Node.js — no npm dependencies, ES module (`.mjs`)

### `build_indexes.mjs`
- **Always preserve the 5 system indexes:** closedBy, createdBy, handle, submittedBy, updatedBy
- Add `values[*]` indexes for every field used in KQL queries
- Add compound indexes for multi-field AND queries: `{"parts":["values[A]","values[B]"]}`
- Build step: `POST /forms/{form}/backgroundJobs` with `{"type":"Build Index","content":{"indexes":[...]}}`
- Poll until status changes from "New" to "Built"
- Kinetic auto-names compound indexes by joining parts with commas

### `seed.mjs`
- Generates realistic fake data matching field names
- Concurrency=10 with `Promise.allSettled`
- Progress reporting to stdout
- Separate large datasets into `*-data.mjs` if >20 records
- Always create as Submitted: include `coreState: "Submitted"`
- Cleanup function: paginate FORWARD with pageToken, parallel deletes (batches of 10)

### `index.html`
- Single HTML file, all CSS/JS inline — NO npm, NO build step
- **Topbar pattern** (required for base server injection):
  - Class: `.topbar` (NOT `.top-bar`)
  - Contains: `<div class="logo">`, `<div class="spacer">`, `<div class="user-info">`
  - Logout: `onclick="doLogout()"` (NOT `logout()`)
- **User-info pattern:** `<strong id="user-display">` + `<button class="logout-btn">`
- Follow branding.md color scheme and component styles
- Client-side pagination: max 25 records per fetch, Prev/Next with pageToken
- No `collectAll()` — show one page at a time
- Core API submission lists have no total count — show "Page N" not "Page N of M"

## Step 4: Register in Base Server

The app needs registration in `apps/base/server.mjs` (or `admin_apps/base/server.mjs`):

1. **APP_REGISTRY** — add entry with `name`, `slug`, `description`
2. **APPS array** — add entry for the launcher (with `picker: false` unless it's a meta-app)
3. **APP_ABOUT** — add description for the About modal
4. **API routes** (if app has custom server endpoints) — add `/api/<slug>/*` route handler

After registration, remind user: **restart port 3011** (or 4000 for admin) — `lsof -ti:3011 | xargs kill; cd apps/base && node server.mjs &`

## Step 5: Provision on Server

Run in order:
1. `node setup.mjs` — creates kapp and forms
2. `node build_indexes.mjs` — creates and builds indexes
3. `node seed.mjs` — loads sample data (if applicable)

## Critical Rules

- **No npm dependencies** — pure Node.js built-ins only (http, https, fs, path, crypto)
- **Form slug discipline** — NEVER change form slugs after creation; code and data are tied to them
- **ES modules** — all server files use `.mjs` extension
- **HTTP 500 for missing fields** — verify form field definitions match before submitting
- **Uniqueness violations return 400** (not 409) — check `e.message.includes("uniqueness_violation")`
