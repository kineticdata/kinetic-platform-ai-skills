---
name: loghub-api
description: "Use when reading real-time platform logs via the LogHub API (/app/loghub/api/v1/logs) — building a log viewer, correlating requests by correlationId, tailing logs during development, or debugging cross-component (core ↔ task) flows. LogHub requires Bearer JWT signed with the space's oauthSigningKey (NOT Basic Auth), returns NDJSON, and is not available on all servers — check availability before depending on it."
---

# LogHub API (Real-Time Platform Logs)

The LogHub API exposes a streaming/queryable feed of Kinetic Core and Task engine logs. Useful for building log viewers, correlating requests across components, and debugging in environments where shell access to the server isn't available.

> **Not available on all servers.** LogHub is opt-in on the platform side. Verify the endpoint exists before depending on it — a missing LogHub returns 404 from the very first request, not a connection error.

## Endpoint

```
GET /app/loghub/api/v1/logs?limit=25&format=ndjson&start={ISO}&end={ISO}&tail=true
```

| Query param | Description |
|-------------|-------------|
| `limit` | Max log entries per response |
| `format` | Always `ndjson` for streaming-friendly output (one JSON object per line) |
| `start` / `end` | ISO 8601 time bounds |
| `tail` | `true` to follow new entries as they arrive |

## Authentication

Requires **Bearer JWT** — Basic Auth is rejected. The JWT must be signed with the space's `oauthSigningKey` using **HMAC-SHA256**.

### JWT payload

```json
{
  "clientId": "system",
  "displayName": "Admin",
  "email": "admin@example.com",
  "exp": 1234567890,
  "iss": "kinetic-data",
  "spaceAdmin": true,
  "spaceSlug": "my-space",
  "username": "admin"
}
```

### Retrieving the signing key

```
GET /app/api/v1/space?include=details
→ { space: { oauthSigningKey: "<base64-encoded HMAC secret>" } }
```

The signing key is space-admin-readable only. Treat it as a secret — anyone with `oauthSigningKey` can mint LogHub-authorized JWTs for the space.

## Response Format

NDJSON — one JSON object per line. The **last line** is metadata with `nextPageToken`:

```
{"timestamp":"2026-06-13T12:00:00.000Z","level":"INFO","message":"...",...}
{"timestamp":"2026-06-13T12:00:01.000Z","level":"ERROR","message":"...",...}
{"nextPageToken":"abc123","hasMore":true}
```

Parse line-by-line; the final metadata line is not a log entry.

## Log Entry Fields

| Field | Description |
|-------|-------------|
| `timestamp` | ISO 8601 timestamp |
| `level` | `INFO`, `DEBUG`, `WARN`, `ERROR` |
| `message` | Log message text |
| `app.component` | `core` or `task` |
| `app.user` | Username associated with the request |
| `app.requestPath` | API path |
| `app.requestMethod` | HTTP method |
| `app.responseStatus` | HTTP response code |
| `app.responseTime` | Response time in ms |
| `app.correlationId` | Request correlation ID — use to join Core ↔ Task spans |

## Patterns

**Joining a request across components.** A single user action can produce log lines in both `core` and `task`. Filter by `app.correlationId` to follow the full trace.

**Detecting failed runs early.** `app.component == "task"` and `level == "ERROR"` surfaces engine failures before they propagate to the `/errors` endpoint.

**Polling cadence.** With `tail=true`, the server holds the connection briefly to deliver new entries. For non-tailing polling, 1–5 second intervals are typical; the platform doesn't impose a hard rate limit but excessive polling is impolite.

## Related Skills

- **`api/authentication`** — broader auth patterns including OAuth bearer for the Integrator (different signing model).
- **`platform/troubleshooting`** — when LogHub isn't available, the fallbacks are `/notices`, `/errors`, and `/triggers?status=Failed`.
- **`concepts/task-api-reference`** — error-record endpoints that overlap with what LogHub surfaces for the `task` component.
