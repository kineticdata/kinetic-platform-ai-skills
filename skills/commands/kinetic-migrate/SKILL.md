---
name: kinetic-migrate
description: Copy forms and data between Kinetic kapps (same or different servers)
argument-hint: "<source-kapp> <target-kapp> [form-slug]"
user-invocable: true
---

# Migrate Forms and Data Between Kapps

The user wants to copy form definitions and optionally submission data from one kapp to another. Parse the argument for source kapp, target kapp, and optional form slug (if omitted, migrate all forms).

## Step 1: Connect and Assess

1. Connect to the Kinetic Platform using `mcp__kinetic-platform__connect`
2. List forms in source kapp: `list_forms` with `include=details,indexDefinitions`
3. List forms in target kapp (if it exists): `list_forms`
4. Determine scope: single form or all forms

**Cross-server migration:** If source and target are on different servers, ask the user for credentials for both. This requires two separate connections — migrate by reading from one and writing to the other via direct API calls.

## Step 2: Plan the Migration

For each form to migrate, check:

- **Does the form already exist in target?** If yes, warn — form slugs cannot change after creation
- **Field definitions** — extract from pages → sections → elements
- **Index definitions** — both system and custom
- **Security policies** — note that policy names must be unique on the target
- **Submission count** — how much data to copy?

Present the plan to the user before proceeding:

```
Migration Plan: innovation → test-kapp

Forms to create:
  1. proposals (15 fields, 3 custom indexes, 42 submissions)
  2. votes (5 fields, 1 custom index, 128 submissions)

Forms skipped (already exist in target):
  - categories

Actions:
  1. Create form definitions (fields, pages)
  2. Create and build indexes
  3. Copy submissions (170 total)

Proceed? (y/n)
```

## Step 3: Create Form Definitions

For each form:

1. Extract full page structure from source form (`get_form` with `include=details`)
2. Create form in target kapp via `create_form` with:
   - Same slug, name, description
   - Same field definitions (names, types, required flags)
   - Same `submissionLabelExpression`
3. Handle conflicts: if form already exists, ask user whether to skip or overwrite fields

## Step 4: Create and Build Indexes

For each form:

1. Get index definitions from source form
2. **Always preserve 5 system indexes** on the target: closedBy, createdBy, handle, submittedBy, updatedBy
3. Add all custom indexes from the source
4. Build indexes: `POST /forms/{form}/backgroundJobs` for each new index
5. Poll until all indexes are "Built"

## Step 5: Copy Submissions (Optional)

Only if user confirms data copy:

1. **Paginate through source** — `limit=25`, follow `nextPageToken`
2. For each submission:
   - Extract `values` (field data)
   - Preserve `coreState` (Draft/Submitted/Closed)
   - **Do NOT copy** submission IDs (auto-generated), `createdAt`/`updatedAt` (set by server), `createdBy`/`updatedBy` (set to current user)
3. Create in target: `create_submission` with `values` and `completed` flag
   - Submitted: `completed=true` (default)
   - Draft: `completed=false`
   - Closed: create as Submitted, then update to `coreState: "Closed"`
4. Concurrency: batches of 10, progress reporting

## Step 6: Report

```
Migration Complete: innovation → test-kapp

Forms created: 2 (proposals, votes)
Forms skipped: 1 (categories — already existed)
Indexes built: 4
Submissions copied: 170 (42 proposals, 128 votes)
Errors: 0

Not migrated (manual steps needed):
  - Workflows (use /workflow to recreate)
  - Security policies (use /policy to create)
  - WebAPIs (use /workflow with WebAPI type)
```

## Critical Warnings

- **Form slugs are permanent** — cannot be changed after creation. Code and data reference them.
- **Submission IDs are auto-generated** — do not try to preserve source IDs.
- **Workflows must be recreated manually** — they reference platform-specific IDs (sourceGroup UUIDs).
- **Security policy names are immutable** — choose carefully during creation.
- **`createdBy`/`updatedBy` will reflect the migration user** — not the original submitter.
- **Closed submissions cannot be edited after creation** — create as Submitted first, then close.
