---
name: kinetic-seed
description: Generate and load realistic seed data into a Kinetic form
argument-hint: "<kapp-slug> <form-slug> [count]"
user-invocable: true
---

# Generate Seed Data

The user wants to populate a Kinetic form with realistic test data. Parse the argument for kapp slug, form slug, and optional record count (default: 25).

## Step 1: Connect and Read Form Definition

1. Connect to the Kinetic Platform using `mcp__kinetic-platform__connect`
2. Get form details: `mcp__kinetic-platform__get_form` with `kappSlug`, `formSlug`, `include=details`
3. Parse the form's pages → sections → elements to extract field names and types
4. Note any required fields

## Step 2: Design Data

Based on field names, generate appropriate realistic data:

- **Name/Title fields** — realistic names, titles, descriptions
- **Status fields** — cycle through common statuses (Open, In Progress, Closed, etc.)
- **Date fields** — ISO format dates within a reasonable range
- **Email fields** — realistic email addresses
- **Priority fields** — Low, Medium, High, Critical
- **Description/Notes** — brief realistic text (2-3 sentences)
- **Category fields** — match actual dropdown values if known (check existing submissions first)

**Always verify field names match the form definition exactly.** Posting values for fields that don't exist on the form returns HTTP 500 (not 400).

## Step 3: Generate the Seed Script

Create `apps/<kapp>/seed.mjs` (or appropriate location):

```javascript
// Pattern: pure Node.js, ES module, no npm dependencies
import https from 'https';

const KINETIC_URL = process.env.KINETIC_URL || 'https://your-server.example.com';
const USERNAME = process.env.USERNAME || 'your-username';
const PASSWORD = process.env.PASSWORD || 'your-password';
const KAPP = '{kapp-slug}';
const FORM = '{form-slug}';
const COUNT = parseInt(process.argv[2]) || 25;
const CONCURRENCY = 10;
```

### Key patterns:

- **Concurrency control:** process in batches of 10 with `Promise.allSettled`
- **Progress reporting:** log `Created {n}/{total}` after each batch
- **Create as Submitted:** include `coreState: "Submitted"` in POST body (not Draft)
- **Error handling:** log failures but continue (don't abort on single record failure)
- **Large datasets:** separate data into `*-data.mjs` file if >20 records of complex content

### Cleanup function:

```javascript
async function cleanup() {
  // Paginate FORWARD with pageToken — NOT re-fetching page 1
  // (deletion pagination gotcha: re-fetching page 1 misses later pages)
  let pageToken = null;
  let deleted = 0;
  do {
    const page = await listSubmissions(KAPP, FORM, 25, pageToken);
    if (!page.submissions?.length) break;
    // Delete in parallel batches of 10
    for (let i = 0; i < page.submissions.length; i += 10) {
      const batch = page.submissions.slice(i, i + 10);
      await Promise.all(batch.map(s => deleteSubmission(s.id)));
      deleted += batch.length;
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
  console.log(`Deleted ${deleted} records`);
}
```

**No bulk delete API** — only `DELETE /submissions/{id}` one at a time. Parallel batches of 10 are ~10x faster than sequential.

## Step 4: Run

```bash
node seed.mjs          # default count
node seed.mjs 50       # custom count
node seed.mjs cleanup  # remove seeded data
```

## Critical Rules

- **Verify field values match form definition** — HTTP 500 for undefined fields
- **Always create as Submitted** — `{values: {...}, coreState: "Submitted"}`
- **No npm dependencies** — pure Node.js built-ins
- **Verify categories/dropdowns** — check existing submissions or form definition for valid values
- **Deletion pagination** — paginate forward with pageToken, don't re-fetch page 1 after deleting
