---
name: submission-activities
description: "Use when reading, creating, updating, or deleting submission activity records — the per-submission audit trail / timeline. Covers the /submissions/{id}/activities CRUD endpoints, the include=activities,activities.details fetch pattern, activity properties (type, label, description, data), workflow-generated activities (created/submitted/updated/closed/approval/assignment), and the React useData usage pattern for timeline UIs."
---

# Submission Activities

Activity records attached to submissions documenting lifecycle progression — an audit trail / timeline. Each submission can carry zero-to-many activity records.

## API Endpoints

| Operation | Method | Path |
|-----------|--------|------|
| List Activities | GET | `/app/api/v1/submissions/{id}/activities` |
| Create Activity | POST | `/app/api/v1/submissions/{id}/activities` |
| Get Activity | GET | `/app/api/v1/submissions/{id}/activities/{activityId}` |
| Update Activity | PUT | `/app/api/v1/submissions/{id}/activities/{activityId}` |
| Delete Activity | DELETE | `/app/api/v1/submissions/{id}/activities/{activityId}` |

## Including in a Submission Fetch

Activities can be loaded inline with the submission rather than via a separate call:

```
GET /submissions/{id}?include=activities,activities.details
```

- `activities` — timeline entries (sparse — type, label, timestamps)
- `activities.details` — full activity data including the `data` JSON and full description. **Required to render work-notes-style content.**

## Activity Properties

| Property | Description |
|----------|-------------|
| `type` | Activity type — e.g. `Comment`, `Status Change`, workflow event names |
| `label` | Short label shown in timeline UIs |
| `description` | Detail text — the body of the activity |
| `data` | Arbitrary JSON data — used for structured payloads (assignment changes, approval decisions, etc.) |
| `createdAt` / `createdBy` | When and by whom (returned with `include=details`) |

## Workflow-Generated Activities

Prebuilt workflow routines automatically create activity records at lifecycle points. Common types:

- Submission created
- Submission submitted
- Submission updated
- Submission closed
- Approval decisions (Approved / Denied)
- Assignment changes (Team assigned, Individual assigned, reassignment)

Custom workflows can write additional activities via `POST /submissions/{id}/activities` (or through a routine that wraps it).

## React Usage

```js
const params = useMemo(
  () => submissionId
    ? { id: submissionId, include: 'details,values,activities,activities.details' }
    : null,
  [submissionId],
);
const { response } = useData(fetchSubmission, params);
const activities = response?.submission?.activities || [];
```

For rendering a timeline component, sort by `createdAt` (the API returns activities in arrival order which is usually but not always chronological).

## Gotchas

- **Activities are NOT included by default.** You must request them via `include=activities` (or `include=activities.details` for the full payload).
- **`details` adds timestamp/author fields**, but `activities.details` adds the activity's *own* details (`data`, full description) — they're independent. Most timeline UIs want `include=details,values,activities,activities.details`.
- **Deleting a submission deletes its activities** (cascade). Activities are not first-class records — they belong to their parent submission.
- **No bulk activity API.** To write multiple activities for one submission you POST each individually. For high-volume use cases, a workflow routine is cheaper than N HTTP calls.

## Related Skills

- **`api/core`** — the submissions reference covers the `/submissions/{id}/activities` endpoints.
- **`concepts/workflow-engine`** — workflows that auto-generate activities use prebuilt activity-writing routines.
- **`concepts/architectural-patterns`** — for "audit trail by separate kapp" patterns when activities aren't enough.
