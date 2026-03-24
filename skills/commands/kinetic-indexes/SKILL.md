---
name: kinetic-indexes
description: Audit and manage search indexes for a Kinetic form
argument-hint: "<kapp-slug> <form-slug>"
user-invocable: true
---

# Audit & Manage Form Indexes

The user provides a kapp slug and form slug. Audit the form's current indexes, identify gaps, and fix them.

## Step 1: Connect and Read Current State

1. Connect to the Kinetic Platform using `mcp__kinetic-platform__connect`
2. Get the form details: `mcp__kinetic-platform__get_form` with `include=indexDefinitions,details`
3. Note the current index definitions

## Step 2: Find KQL Queries in Codebase

Search the codebase for queries against this form:

- Grep for the form slug in `apps/`, `admin_apps/`, and server files
- Look for `q=` query parameters, `values[` patterns, KQL strings
- Look for `list_form_submissions` or `search_submissions` calls with this form
- Check `seed.mjs`, `server.mjs`, `index.html` files in the app directory

## Step 3: Analyze Index Coverage

For each KQL query found, determine required indexes:

- **Single equality** (`values[X]="y"`) → needs `{"parts":["values[X]"]}`
- **Multi-field AND** (`values[X]="y" AND values[Z]="w"`) → needs compound `{"parts":["values[X]","values[Z]"]}`
- **Range on trailing field** (`values[X]="y" AND values[Date]>="start"`) → compound `{"parts":["values[X]","values[Date]"]}`
- **`coreState` filtering** — uses query param, no index needed (unless using KQL `coreState="Submitted"`)

## Step 4: Report

Output a table:

```
Form: {kapp}/{form}

Current Indexes:
  ✓ closedBy (system)
  ✓ createdBy (system)
  ✓ handle (system)
  ✓ submittedBy (system)
  ✓ updatedBy (system)
  ✓ values[Status] (custom)
  ✗ values[Status],values[Priority] (MISSING — needed for dashboard query)

Queries Found:
  1. server.mjs:45 — values[Status]="Open" AND values[Priority]="High"
     → Needs compound index: values[Status],values[Priority]
  2. index.html:230 — values[Category]="Bug"
     → Needs index: values[Category]

Actions Needed:
  - Add compound index: {"parts":["values[Status]","values[Priority]"]}
  - Add index: {"parts":["values[Category]"]}
  - Build all new indexes
```

## Step 5: Fix (if user approves)

Generate or update `build_indexes.mjs` with:

1. **GET current indexes** (preserve all existing, especially the 5 system indexes)
2. **PUT updated index definitions** (add missing ones)
3. **POST backgroundJobs** to build each new index
4. **Poll** until all indexes show status "Built" (not "New")

### Critical Rules

- **Always preserve 5 system indexes:** closedBy, createdBy, handle, submittedBy, updatedBy
- Kinetic **auto-names compound indexes** by joining parts: `"values[Status],values[Priority]"`
- New indexes return **empty results** (not errors) until built — easy to miss
- Build via: `POST /forms/{form}/backgroundJobs` with `{"type":"Build Index","content":{"indexes":["values[Field]"]}}`
- Poll: `GET /forms/{form}/backgroundJobs/{id}` until status is "Built"
