---
name: users-teams-security
description: User and team CRUD, memberships, and management patterns for the Kinetic Platform.
---

# Users, Teams, and Security

---

## Users

### User Properties

**Base properties** (always returned):

| Property | Type | Description |
|----------|------|-------------|
| `username` | `string` | **Required on create.** Unique login identifier. Can be changed via PUT (old username immediately 404s). |
| `displayName` | `string\|null` | Human-readable display name |
| `email` | `string\|null` | Email address |
| `spaceAdmin` | `boolean` | Space administrator flag. Default: `false` |
| `enabled` | `boolean` | Account active flag. **Default: `false` on create** (must explicitly set `true`) |
| `allowedIps` | `string` | IP allowlist (e.g., `"192.168.1.0/24"`). Empty string if unset |
| `timezone` | `string\|null` | Timezone identifier (e.g., `"US/Central"`) |
| `preferredLocale` | `string\|null` | Locale (e.g., `"en_US"`) |

**Include-dependent properties:**

| Property | Include | Description |
|----------|---------|-------------|
| `attributes` | `attributes` | Admin-managed key-value metadata array: `[{"name":"Manager","values":["jane"]}]` |
| `profileAttributes` | `profileAttributes` | User-editable personal data array |
| `attributesMap` | `attributesMap` | Object form: `{"Manager":["jane"]}` |
| `profileAttributesMap` | `profileAttributesMap` | Object form of profile attributes |
| `memberships` | `memberships` | Array of `{"team":{"name":"...","slug":"..."}}` objects |
| `authorization` | `authorization` | Permissions object: `{"Modification": true}` |
| `createdAt` | `details` | ISO timestamp |
| `createdBy` | `details` | Username of creator |
| `updatedAt` | `details` | ISO timestamp |
| `updatedBy` | `details` | Username of last updater |
| `invitedBy` | `details` | Username or null |

### User Attributes vs Profile Attributes

- **User Attributes** — admin-managed. Drive workflow routing, security, and access control. Not user-editable. Examples: `Manager`, `Department`, `ClearanceLevel`.
- **Profile Attributes** — user-editable. For preferences and contact info. Examples: `Phone Number`, `Preferred Language`, `Office Location`.

Both require **attribute definitions** to be created under Definitions > Attributes before use.

### Core API Endpoints

| Operation | Method | Path |
|-----------|--------|------|
| List Users | GET | `/app/api/v1/users` |
| Get User | GET | `/app/api/v1/users/{username}` |
| Create User | POST | `/app/api/v1/users` |
| Update User | PUT | `/app/api/v1/users/{username}` |
| Delete User | DELETE | `/app/api/v1/users/{username}` |
| Current User | GET | `/app/api/v1/me` |

**`/me` response is flat** — properties at top level, not nested under `user`:
```json
{ "username": "jane.doe", "displayName": "Jane Doe", "email": "jane@example.com", "spaceAdmin": true, "enabled": true }
```

### Searching/Filtering Users

The `q` parameter supports KQL on the users endpoint:

```
GET /users?q=username="james.davies@kineticdata.com"
GET /users?q=username =* "james"
```

Searchable fields: `username`, `displayName`, `email`, `enabled`, `spaceAdmin`. The `=*` (starts-with) operator requires `orderBy` on the same field.

### `include` Parameter

- `attributes` / `attributesMap`
- `profileAttributes` / `profileAttributesMap`
- `memberships`
- `authorization` — returns `{"Modification": true/false}`
- `details` — adds `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `invitedBy`

### Pagination (Users List)

The users list supports keyset pagination:
- `limit` — max results per page (default varies)
- `nextPageToken` — returned in response when more results exist; pass as `pageToken` on next request
- `messages` — array, typically empty; may contain deprecation warnings

```json
{
  "messages": [],
  "nextPageToken": "bW9sb3d1.bqdf6pqy4y275uehdy3nuf2fb",
  "users": [...]
}
```

**No search/filter parameter** — the `q` parameter does NOT work on users (`"Unexpected \"term\" -- ^term"` error). To find users, you must page through all results.

### User CRUD Examples

**Create user** (only `username` is required):
```json
POST /app/api/v1/users
{
  "username": "jane.doe@example.com",
  "displayName": "Jane Doe",
  "email": "jane.doe@example.com",
  "enabled": true,
  "spaceAdmin": false,
  "password": "SecurePass123!",
  "attributes": [
    {"name": "Manager", "values": ["boss@example.com"]},
    {"name": "Phone Number", "values": ["555-0100"]}
  ],
  "profileAttributes": [
    {"name": "Phone Number", "values": ["555-0199"]}
  ],
  "memberships": [
    {"team": {"name": "Default"}},
    {"team": {"name": "Role::Employee"}}
  ]
}
```

Response (base properties only, no includes):
```json
{
  "user": {
    "allowedIps": "",
    "displayName": "Jane Doe",
    "email": "jane.doe@example.com",
    "enabled": true,
    "preferredLocale": null,
    "spaceAdmin": false,
    "timezone": null,
    "username": "jane.doe@example.com"
  }
}
```

**Minimal create** — only username required. Note defaults:
```json
POST /app/api/v1/users
{"username": "minimal.user"}
// Result: enabled=false, displayName=null, email=null, spaceAdmin=false
```

**Update user:**
```json
PUT /app/api/v1/users/jane.doe@example.com
{
  "displayName": "Jane Smith",
  "timezone": "US/Central",
  "allowedIps": "192.168.1.0/24",
  "preferredLocale": "en_US",
  "attributes": [
    {"name": "Phone Number", "values": ["555-0200"]},
    {"name": "Manager", "values": ["new.boss@example.com"]}
  ]
}
```

**Clear attributes** — set to empty array:
```json
PUT /app/api/v1/users/jane.doe@example.com
{"attributes": []}
```

**Delete user:**
```
DELETE /app/api/v1/users/jane.doe@example.com
→ {"user": "jane.doe@example.com"}   (200 OK)
```

### User Error Responses

```json
// 404 — user not found
{"error": "Unable to locate the nonexistent@example.com User", "correlationId": "...", "statusCode": 404}

// 400 — duplicate username
{"errorKey": "uniqueness_violation", "correlationId": "...", "error": "A user with the same normalized_username already exists.", "statusCode": 400}

// 500 — missing username on create
{"error": "A problem was encountered by the server, please contact an administrator."}
```

### User Gotchas (Verified)

- **`enabled` defaults to `false`** — always set `enabled: true` explicitly on create or the user cannot log in
- **Username is changeable via PUT** — setting `"username": "new@example.com"` renames the user. The old username immediately returns 404. Any memberships follow the user
- **Attributes can be set without a definition** — the API silently accepts attribute names that have no attribute definition. These values are stored but may not behave correctly in security expressions
- **Inline memberships work on create** — you can include `"memberships"` array in the POST body to add team memberships at creation time
- **No user search** — the `q` parameter is not supported on the users list endpoint. You must paginate through all users
- **PUT replaces attributes entirely** — if you PUT `attributes: [{"name":"A","values":["1"]}]`, any previously-set attributes B, C, etc. are removed. Include all attributes in every PUT

### Service Accounts (No API Keys)

**The platform does not issue API keys, personal access tokens, or any other per-user credential separate from the password.** There is no "API-key-only" user type and no endpoint to mint a key for an existing user. Specifically:

- `POST /users` and `PUT /users/{username}` accept `password` but expose **no** `apiKey` / `token` / `accessToken` field.
- The user object returned by `GET /users/{username}` has no key field.
- The Integrator Connection auth types named `api_key` / `raw_bearer_token` describe credentials for **external systems**, not credentials issued by Kinetic for Kinetic.

**Service-account pattern** — to give an automation, integration, or scheduled job its own identity, create a regular user:

```json
POST /app/api/v1/users
{
  "username": "eam-integration",
  "displayName": "EAM Integration Service",
  "email": "platform-ops@example.com",
  "enabled": true,
  "spaceAdmin": false,
  "password": "<long-random-string>",
  "memberships": [
    {"team": {"name": "Role::EAM Integration"}}
  ]
}
```

Then authenticate API calls as that user — Basic Auth for Core/Task, OAuth implicit grant for Integrator. The service-account's username is what `identity('username')` returns inside security policies, so policies can be locked to it directly:

```js
// On a WebAPI's Execution security policy:
identity('username') == "eam-integration"
```

**Rotation:** there is no separate key-rotation primitive. To rotate, `PUT /users/{username}` with a new `password` — every running integration using the old password breaks immediately, so coordinate the cutover.

**Best practices:**

- Use a dedicated user per integration (not a shared "service" user) so revocation and audit work.
- Disable interactive login risk by setting an email no human reads, and a password that exists only in the integration's secret store.
- Constrain blast radius via role-team membership + security policies, not by setting `spaceAdmin: true`.
- For IP-restricted environments, set `allowedIps` on the service-account user (e.g., `"10.0.0.0/8"`) so a leaked password is unusable from outside the integration's network.

---

## Teams

### Team Properties

**Base properties** (always returned):

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | **Required on create.** Team display name. |
| `slug` | `string` | Auto-generated MD5 hash of lowercase name. **Changes when team is renamed.** |
| `description` | `string\|null` | Team description |

**Include-dependent properties:**

| Property | Include | Description |
|----------|---------|-------------|
| `attributes` | `attributes` | Key-value metadata array: `[{"name":"Icon","values":["flask"]}]` |
| `memberships` | `memberships` | Array of `{"user":{"username":"..."}}` objects |
| `authorization` | `authorization` | Permissions object: `{"Membership Modification": true, "Modification": true}` |
| `createdAt` | `details` | ISO timestamp |
| `createdBy` | `details` | Username of creator |
| `updatedAt` | `details` | ISO timestamp |
| `updatedBy` | `details` | Username of last updater |

### Core API Endpoints

| Operation | Method | Path |
|-----------|--------|------|
| List Teams | GET | `/app/api/v1/teams` |
| Get Team | GET | `/app/api/v1/teams/{teamSlug}` |
| Create Team | POST | `/app/api/v1/teams` |
| Update Team | PUT | `/app/api/v1/teams/{teamSlug}` |
| Delete Team | DELETE | `/app/api/v1/teams/{teamSlug}` |

### Pagination (Teams List)

Same keyset pagination as users:
```json
{
  "messages": [],
  "nextPageToken": "MXN0IGJyaWdhZGU.130c5ny0otltwsao0m6szlt4c",
  "teams": [...]
}
```
Use `limit` and `pageToken` query params.

### Team CRUD Examples

**Create team:**
```json
POST /app/api/v1/teams
{
  "name": "API Test Team",
  "description": "Team created for API testing",
  "attributes": [
    {"name": "Icon", "values": ["flask"]},
    {"name": "Assignable", "values": ["True"]}
  ]
}
```

Response (base properties only):
```json
{
  "team": {
    "description": "Team created for API testing",
    "name": "API Test Team",
    "slug": "9169966765ff321ab3a255165f1c2b0b"
  }
}
```

**Update team:**
```json
PUT /app/api/v1/teams/{slug}
{
  "description": "Updated description",
  "attributes": [
    {"name": "Icon", "values": ["beaker"]},
    {"name": "Assignable", "values": ["False"]}
  ]
}
```

**Delete team:**
```
DELETE /app/api/v1/teams/{slug}
→ {"team": {"description":"...", "name":"...", "restorationToken":"fe8b4e74-...", "slug":"..."}}
```

Note: Delete response includes a `restorationToken` (UUID) which may be usable for undelete.

### Team Error Responses

```json
// 404 — team not found
{"error": "Unable to locate the {slug} Team", "correlationId": "...", "statusCode": 404}

// 400 — missing name
{"error": "Invalid Team.\n    Name must not be blank", "correlationId": "...", "statusCode": 400}

// 400 — duplicate name
{"errorKey": "uniqueness_violation", "error": "A team with the same slug already exists.", "statusCode": 400}
```

### Memberships

| Operation | Method | Path | Body |
|-----------|--------|------|------|
| Add Member | POST | `/app/api/v1/memberships` | `{"team":{"name":"..."},"user":{"username":"..."}}` |
| Remove Member | *(see below)* | | |

**Add membership** — use team name OR slug:
```json
POST /app/api/v1/memberships
{"team": {"name": "Role::Employee"}, "user": {"username": "jane@example.com"}}
// OR
{"team": {"slug": "a0093227b6c60c6d3eabe96f73cafccb"}, "user": {"username": "jane@example.com"}}
```

Response:
```json
{
  "membership": {
    "team": {"name": "Role::Employee", "slug": "a0093227..."},
    "user": {"username": "jane@example.com"}
  }
}
```

**Remove membership** — there is NO `DELETE /memberships` endpoint (returns 405 Method Not Allowed). Instead, update the team with the desired memberships array:
```json
PUT /app/api/v1/teams/{slug}
{"memberships": []}  // removes ALL members
// OR include only the members you want to keep:
{"memberships": [{"user": {"username": "keep.this.user@example.com"}}]}
```

**Duplicate membership** — adding a user who is already a member silently succeeds (idempotent, returns 200 with the membership object). No error is raised.

### Naming Conventions and Hierarchy

Teams use the `::` separator for hierarchical naming:
- `Role::Employee`, `Role::Manager` — role-based
- `Department::HR`, `Department::Engineering` — department-based
- `1st Brigade::Alpha Company::1st Platoon::1st Squad` — deep hierarchy

Sub-teams are just teams with `::` in their name. There is no formal parent-child relationship in the data model — it is purely a naming convention. Each "sub-team" is a fully independent team with its own slug, memberships, and attributes.

The `identity('teams')` function in security expressions returns these full names.

### Team Gotchas (Verified)

- **Slug is an MD5 hash of the lowercase name** — it is NOT user-controllable and NOT stable. Renaming a team changes its slug immediately
- **Old slug returns 404 after rename** — any code or bookmarks referencing the old slug break immediately. There is no redirect or alias
- **Memberships survive renames** — when a team is renamed, all memberships are preserved under the new slug
- **No DELETE endpoint for memberships** — `DELETE /memberships` returns 405. Remove members by PUTting the team with the desired memberships array
- **PUT on team replaces attributes entirely** — same as users. Include all attributes in every PUT or they get removed
- **PUT with `memberships: []` removes all members** — this is the only way to remove memberships via the API
- **Duplicate membership creation is idempotent** — no error, returns 200
- **Team deletion returns `restorationToken`** — suggests soft-delete with potential undelete capability

---

For security policies, KSL expressions, attribute definitions, and activities, see the Security Policies skill (`concepts/security-policies`).
