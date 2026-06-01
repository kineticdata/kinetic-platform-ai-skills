---
name: kinetic-indexes
description: Audit and manage search indexes for a Kinetic form
argument-hint: "<kapp-slug> <form-slug>"
user-invocable: true
---

# Audit & Manage Form Indexes

The user provides a kapp slug and form slug. Audit the form's current indexes, identify gaps, and fix them.

> **Tooling:** these steps use the raw Core REST API (see the KQL & Indexing and API Basics skills for endpoints and auth). If you have an MCP server that wraps these calls, use its equivalent tools — but the raw API is the source of truth.

See the **KQL & Indexing** and **API Basics** platform skills for the full endpoint, auth, and index-management reference.

## Step 1: Read Current State

1. Get the form details, including its current index definitions:
   `GET /app/api/v1/kapps/{kapp}/forms/{form}?include=fields,indexDefinitions,attributesMap`
2. Note the current index definitions (each has a `parts` array of strings, e.g. `{"parts":["values[Status]"]}`)

## Step 2: Find KQL Queries in Codebase

Search the codebase for queries against this form:

- Grep for the form slug across your project's app/source directories and server files
- Look for `q=` query parameters, `values[` patterns, KQL strings
- Look for submission list/search calls against this form (e.g. `GET /app/api/v1/kapps/{kapp}/forms/{form}/submissions?q=...`)
- Check seed scripts, server files, and HTML/JS in the relevant app directory

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

Apply the changes via the raw Core REST API:

1. **GET current index definitions** (preserve all existing, especially the 5 system indexes):
   `GET /app/api/v1/kapps/{kapp}/forms/{form}?include=fields,indexDefinitions,attributesMap`
2. **PUT updated index definitions** (add the missing ones to the existing array):
   `PUT /app/api/v1/kapps/{kapp}/forms/{form}` with body `{"indexDefinitions":[...]}`. Each definition's `parts` is an array of strings, e.g. `{"parts":["values[Status]","values[Priority]"]}`.
3. **POST a background job** to build the new indexes:
   `POST /app/api/v1/kapps/{kapp}/forms/{form}/backgroundJobs` with body `{"type":"Build Index","content":{"indexes":[...]}}`
4. **Poll** the form's index status (re-GET the form with `include=indexDefinitions`) until each new index shows status "Built" (not "New")

### Critical Rules

- **Always preserve 5 system indexes:** closedBy, createdBy, handle, submittedBy, updatedBy
- Kinetic **auto-names compound indexes** by joining parts with commas: `"values[Status],values[Priority]"`
- New indexes return **empty results** (not errors) until built — easy to miss
- Build via: `POST /app/api/v1/kapps/{kapp}/forms/{form}/backgroundJobs` with `{"type":"Build Index","content":{"indexes":["values[Field]"]}}`
- Poll by re-reading the form (`GET .../forms/{form}?include=indexDefinitions`) until each new index's status is "Built"
