---
name: users-teams-security
description: Users, Teams, Memberships, Security Definitions (KSL), Attribute Definitions, Submission Activities, and access control patterns for the Kinetic Platform.
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

## Security Definitions (KSL)

Security definitions are JavaScript expressions that evaluate to `true` (grant access) or `false` (deny). They control who can view, create, modify, or delete platform resources.

**Space admins bypass all security definitions** — always test as a non-admin user.

### Two Distinct Security Layers

The platform has two separate security systems with **different languages**:

| Layer | Scope | Language | Where |
|-------|-------|----------|-------|
| **Core Platform** | Forms, Kapps, Submissions, Space, Teams, Users | **JavaScript** | Space & Kapp security definitions |
| **Task Engine** | Workflow categories, sources, console, API access | **Ruby** (jRuby) | Task policy rules |

Do not mix syntax between layers.

### Security Policy Definitions vs Security Policies

- **Security Policy Definition** = a named, typed, reusable rule (the "what")
- **Security Policy** = the assignment of a definition to a specific endpoint (the "where")

A definition has four fields — **all are required**:

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | **Required.** Unique identifier within scope (appears in dropdown selectors). Can be renamed via PUT. |
| `type` | `string` | **Required.** One of the valid types (see below). Determines scope and available bindings. |
| `rule` | `string` | **Required.** JavaScript expression that MUST evaluate to `true` or `false`. |
| `message` | `string` | **Required.** Denial message shown when rule returns `false`. |

### Valid Security Policy Types (Verified)

The API accepts exactly these type values (at both space and kapp level):
- `"Discussion"`
- `"File Resource"`
- `"Form"`
- `"Kapp"`
- `"Space"`
- `"Submission"`
- `"Team"`
- `"User"`

Any other value returns: `Type must be "Discussion", "File Resource", "Form", "Kapp", "Space", "Submission", "Team", or "User"`

**Cross-level types are allowed** — you can create a "Space" type policy at kapp level (it will be stored but may not be usable in that context).

### Definition Types and Scopes

#### Space-Level Types (Space > Definitions > Security)

| Type | Available Bindings | Used For |
|------|-------------------|----------|
| **Space** | `identity()`, `space()` | Space display, user/team CRUD, datastore access, WebAPI execution |
| **Team** | `identity()`, `space()`, `team()` | Team-specific policies |
| **User** | `identity()`, `space()`, `user()` | User-specific policies |
| **Datastore Form** | `identity()`, `space()`, `form()` | Datastore form display/modification |
| **Datastore Submission** | `identity()`, `space()`, `form()`, `submission()` | Datastore submission access/modification |

#### Kapp-Level Types (Kapp > Definitions > Security)

| Type | Available Bindings | Used For |
|------|-------------------|----------|
| **Kapp** | `identity()`, `space()`, `kapp()` | Kapp display/modification, form creation, submission support |
| **Form** | `identity()`, `space()`, `kapp()`, `form()` | Form display/modification |
| **Submission** | `identity()`, `space()`, `kapp()`, `form()`, `values()`, `submission()` | Submission display/modification |

Space-level definitions cannot be applied within a Kapp.

### Available Binding Functions

| Type | Available Bindings |
|------|-------------------|
| Space | `identity()`, `space()`, `team()`, `user()` |
| Kapp | `identity()`, `space()`, `kapp()` |
| Form | `identity()`, `space()`, `kapp()`, `form()` |
| Submission | `identity()`, `space()`, `kapp()`, `form()`, `values()`, `submission()` |
| Team | `identity()`, `team()` |
| User | `identity()`, `user()` |

### KSL Core Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `identity('username')` | `string` | Current user's username |
| `identity('email')` | `string` | Current user's email |
| `identity('teams')` | `string[]` | Current user's team names |
| `identity('spaceAdmin')` | `boolean` | Whether user is a space admin |
| `identity('attribute:Name')` | `string[]` | User attribute value |
| `values('fieldName')` | `any` | Submission field value |
| `submission('createdBy')` | `string` | Submission metadata |
| `form('slug')` | `string` | Form property |
| `kapp('slug')` | `string` | Kapp property |
| `space('slug')` | `string` | Space property |
| `hasIntersection(a, b)` | `boolean` | True if arrays share any element (inline JS helper, not a platform built-in) |

### KSL Binding Function Details

#### `identity(property, [defaultValue])`

| Property | Returns | Example |
|----------|---------|---------|
| `'username'` | Login identifier | `identity('username') === 'han.solo'` |
| `'authenticated'` | Boolean | `identity('authenticated')` |
| `'teams'` | Array of team names | `identity('teams').includes('Dept::HR')` |
| `'spaceAdmin'` | Boolean | `identity('spaceAdmin')` |
| `'attributes'` | Admin-set attributes (trusted) | |
| `'profileAttributes'` | User-editable attributes (untrusted) | |
| `'attribute:Name'` | Specific user attribute | `identity('attribute:Manager', ['nobody'])` |

Optional second arg = default when property is undefined.

#### `values(fieldName, [defaultValue])`
Submission field values. Only in **Submission** type definitions.

#### `submission(property)`

| Property | Returns |
|----------|---------|
| `'createdBy'` | Username of creator |
| `'updatedBy'` | Username of last updater |
| `'createdAt'` | Creation timestamp |
| `'anonymous'` | Boolean (anonymous submission) |
| `'sessionToken'` | Session token (for anonymous matching) |

#### `space(property)`, `kapp(property)`, `form(property)`
Access resource properties and attributes: `form('slug')`, `form('attribute:Owning Team')`.

### Expression Examples

```javascript
// Team-based access
identity('teams').includes('Department::HR')

// Owner-only (submission creator)
submission('createdBy') === identity('username')

// Field-value match (assigned individual)
values('Assigned Individual') === identity('username')

// Assigned team OR requester
hasIntersection(values('Assigned Team'), identity('teams')) ||
values('Requested By') === identity('username')

// Space admin OR specific team
identity('spaceAdmin') || identity('teams').includes('Role::Manager')
```

### `hasIntersection` Helper

Safely compares arrays, handling null/undefined and single values:

```javascript
hasIntersection(identity('teams'), ['Role::Employee'])
```

This is an **inline JS helper** commonly defined within expressions — not a platform built-in binding like `values()` or `identity()`. It works because expressions support raw JavaScript. For security definitions that need more complex list comparison, use the IIFE pattern:

```javascript
(function() {
  var list1 = identity('teams') || [];
  var list2 = (values('Assigned Team') || '').split(',');
  return list1.some(function(t) { return list2.indexOf(t) !== -1; });
})()
```

### Security Policies on Forms

Policies reference named definitions and control access operations:

```json
{
  "securityPolicies": [
    { "name": "Display", "rule": "Is Submitter" },
    { "name": "Modification", "rule": "HR Only" }
  ]
}
```

Common policy names: `Display`, `Modification`, `Creation`, `Submission`.

### Policy Endpoints

#### Space Security Endpoints

1. Space Display
2. User Access / Creation / Modification
3. Team Access / Creation / Modification / Membership Modification
4. Discussion Creation
5. Datastore Form Display / Modification
6. Datastore Submission Access / Modification
7. WebAPI Execution

#### Kapp Security Endpoints

1. Kapp Display / Modification
2. Form Creation
3. Submission Support
4. Default Form Display / Modification
5. Default Submission Display / Modification

#### Form Security Endpoints

1. Form Display / Modification
2. Submission Display / Modification
3. Allow Anonymous Submissions

### Policy Precedence (Inheritance)

**Form → Kapp → Space** (most specific wins). If a form has no explicit policy, the kapp default applies. If kapp has no default, space applies.

Kapp Modification rights grant access/create/modify for all contained forms and submissions. Form Modification rights grant access/create/modify for all form submissions.

### Best Practices

- Name definitions clearly: `Is Submitter`, `HR Only`, `Assigned Team Member`
- Always provide meaningful denial messages
- Test as a non-admin user (space admins bypass all security)
- Apply at the appropriate level (form vs kapp vs space)

### Security Gotchas

- **Never use `profileAttributes` in security policies** — users can set their own profile attributes, creating a privilege escalation vector. Always use `identity('attribute:X')` (admin-set) for access control.
- **`identity('attribute:X')` may return an array or string** — always handle both: `if (cl instanceof Array) cl = cl[0];`
- **Submission Display policies redact values, not hide submissions** — unauthorized users can still see that submissions exist and who created them, just not the field values.
- **Kapp Display policy is UI-enforced, not API-enforced** — users may still access kapp resources via REST API even when Display policy blocks them. Form Display IS API-enforced.
- **Security policies evaluate AFTER the database query** — if a search returns >25 submissions the user cannot access, the entire query may fail. Use KQL to pre-scope results.
- **WebAPIs with no security policy run with Space Admin permissions** — always assign a policy. The platform returns 401 automatically on policy failure; do not manually return 401 in workflow Return nodes.
- **`PUT /users/{username}` may clear passwords** — when updating user attributes, include the password in the same PUT call or re-set immediately after.
- **Security policies on forms must be arrays** — `[{"endpoint": "Display", "name": "PolicyName"}]`, NOT objects. Wrong format returns a Java cast error.
- Form endpoint names: `Display`, `Modification`, `Submission Access`, `Submission Modification`
- Kapp endpoint names: `Display`, `Modification`, `Form Creation`, `Default Form Display`, `Default Form Modification`, `Default Submission Access`, `Default Submission Modification`, `Submission Support`

---

## Attribute Definitions

Attribute definitions declare the schema for custom metadata on platform resources.

### Properties

**Base properties** (always returned):

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | **Required on create.** Reference key used in expressions and API. |
| `description` | `string\|null` | Purpose of the attribute |
| `allowsMultiple` | `boolean` | Whether multiple values are allowed. Default: `false` |

**With `include=details`:**

| Property | Type | Description |
|----------|------|-------------|
| `createdAt` | `string` | ISO timestamp |
| `createdBy` | `string` | Username of creator |
| `updatedAt` | `string` | ISO timestamp |
| `updatedBy` | `string` | Username of last updater |

### API Endpoints by Scope

#### Space-Level Attribute Definitions

| Resource | List/Create | Get/Update/Delete |
|----------|------------|-------------------|
| Space | `GET/POST /app/api/v1/spaceAttributeDefinitions` | `GET/PUT/DELETE /app/api/v1/spaceAttributeDefinitions/{name}` |
| User | `GET/POST /app/api/v1/userAttributeDefinitions` | `GET/PUT/DELETE /app/api/v1/userAttributeDefinitions/{name}` |
| User Profile | `GET/POST /app/api/v1/userProfileAttributeDefinitions` | `GET/PUT/DELETE /app/api/v1/userProfileAttributeDefinitions/{name}` |
| Team | `GET/POST /app/api/v1/teamAttributeDefinitions` | `GET/PUT/DELETE /app/api/v1/teamAttributeDefinitions/{name}` |
| Datastore Form | `GET/POST /app/api/v1/datastoreFormAttributeDefinitions` | `GET/PUT/DELETE /app/api/v1/datastoreFormAttributeDefinitions/{name}` |

#### Kapp-Level Attribute Definitions

| Resource | List/Create | Get/Update/Delete |
|----------|------------|-------------------|
| Kapp | `GET/POST /app/api/v1/kapps/{slug}/kappAttributeDefinitions` | `GET/PUT/DELETE /app/api/v1/kapps/{slug}/kappAttributeDefinitions/{name}` |
| Form | `GET/POST /app/api/v1/kapps/{slug}/formAttributeDefinitions` | `GET/PUT/DELETE /app/api/v1/kapps/{slug}/formAttributeDefinitions/{name}` |
| Category | `GET/POST /app/api/v1/kapps/{slug}/categoryAttributeDefinitions` | `GET/PUT/DELETE /app/api/v1/kapps/{slug}/categoryAttributeDefinitions/{name}` |

**Important:** Kapp-level attribute definitions (`kappAttributeDefinitions`, `formAttributeDefinitions`, `categoryAttributeDefinitions`) are NOT accessible at the space level. The paths `/app/api/v1/kappAttributeDefinitions` and `/app/api/v1/formAttributeDefinitions` return 404. You MUST use the kapp-scoped path.

Exception: `datastoreFormAttributeDefinitions` IS at the space level (not kapp-scoped).

### Attribute Definition CRUD Examples

**Create:**
```json
POST /app/api/v1/userAttributeDefinitions
{
  "name": "Department",
  "description": "User's organizational department",
  "allowsMultiple": false
}
→ {"userAttributeDefinition": {"allowsMultiple": false, "description": "User's organizational department", "name": "Department"}}
```

**Get single:**
```json
GET /app/api/v1/spaceAttributeDefinitions/Web%20Server%20Url
→ {"spaceAttributeDefinition": {"allowsMultiple": false, "description": "Url of the request web server...", "name": "Web Server Url"}}
```

**Update:**
```json
PUT /app/api/v1/userAttributeDefinitions/Department
{
  "description": "Updated description",
  "allowsMultiple": true
}
→ {"userAttributeDefinition": {"allowsMultiple": true, "description": "Updated description", "name": "Department"}}
```

**Delete:**
```
DELETE /app/api/v1/userAttributeDefinitions/Department
→ {"userAttributeDefinition": {"allowsMultiple": true, "description": "...", "name": "Department"}}   (200, returns deleted object)
```

### Response Wrapper Names

Each endpoint uses a specific wrapper key in the response:

| Endpoint | List key | Single key |
|----------|----------|------------|
| `spaceAttributeDefinitions` | `spaceAttributeDefinitions` | `spaceAttributeDefinition` |
| `userAttributeDefinitions` | `userAttributeDefinitions` | `userAttributeDefinition` |
| `userProfileAttributeDefinitions` | `userProfileAttributeDefinitions` | `userProfileAttributeDefinition` |
| `teamAttributeDefinitions` | `teamAttributeDefinitions` | `teamAttributeDefinition` |
| `datastoreFormAttributeDefinitions` | `formAttributeDefinitions` | *(not tested)* |
| `kappAttributeDefinitions` (kapp-scoped) | `kappAttributeDefinitions` | *(not tested)* |
| `formAttributeDefinitions` (kapp-scoped) | `formAttributeDefinitions` | *(not tested)* |
| `categoryAttributeDefinitions` (kapp-scoped) | `categoryAttributeDefinitions` | *(not tested)* |

### Attribute Definition Error Responses

```json
// 400 — duplicate name
{"error": "Invalid Space.\n    User attribute definition names must be unique and there are 2 with the name \"X\"",
 "statusCode": 400}
```

### Resource Types

| Resource | Example Attributes |
|----------|-------------------|
| Space | Theme, Default SLA Hours, Web Server Url, Company Name |
| Kapp | Icon, Description, Lifecycle Kapp Slug |
| Form | Icon, Assigned Team, SLA Hours, Notification Template, Short Description |
| Category | Sort Order, Icon |
| User | Manager, Department, Region, Phone Number, CRM Account Id |
| User Profile | Phone Number, Preferred Language |
| Team | Icon, Assignable, Escalation Contact, Unit Level |
| Datastore Form | Datastore Configuration, Datastore Hidden |

### Resolution Hierarchy

Attributes resolve from most-specific to least-specific:
1. **Form level** (highest priority)
2. **Kapp level**
3. **Space level** (lowest priority)

### Attribute Gotchas (Verified)

- **Attributes can be set without a matching definition** — the API silently stores attribute values even if no attribute definition exists for that name. This means typos in attribute names go undetected.
- **`allowsMultiple` is not enforced by the API** — even with `allowsMultiple: false`, you can store multiple values in the array. The flag is for UI hints only.
- **Definitions must exist before they appear in the admin console** — while the API allows setting arbitrary attributes, the console UI only shows attributes with definitions.
- **Duplicate definition names error at save time** — the error message says "there are 2 with the name" because the server tries to add the new one alongside the existing one.
- **Kapp-level definitions are isolated** — form attribute definitions in kapp "services" are completely separate from those in kapp "queue". A "Short Description" form attribute in one kapp does not exist in another.
- **`details` include adds timestamps** — without it, you only get name, description, allowsMultiple.
- **DELETE returns the deleted object** — useful for confirmation/logging.

### Reading in Code

```js
// Always returns arrays — access with [0]
space.attributesMap["Lifecycle Kapp Slug"]  // → ["platform-one"]
space.attributesMap["Lifecycle Kapp Slug"]?.[0]  // → "platform-one"

// Use getAttributeValue helper for safety
getAttributeValue(form, 'Icon', 'forms')  // → icon name or 'forms'
```

See the State skill for the `getAttributeValue` implementation.

### Management

Created in Kinetic Console at **Definitions > Attributes** in Space or Kapp context, or programmatically via the REST API endpoints above.

---

## Submission Activities

Activity records attached to submissions documenting lifecycle progression — an audit trail / timeline.

### API Endpoints

| Operation | Method | Path |
|-----------|--------|------|
| List Activities | GET | `/app/api/v1/submissions/{id}/activities` |
| Create Activity | POST | `/app/api/v1/submissions/{id}/activities` |
| Get Activity | GET | `/app/api/v1/submissions/{id}/activities/{activityId}` |
| Update Activity | PUT | `/app/api/v1/submissions/{id}/activities/{activityId}` |
| Delete Activity | DELETE | `/app/api/v1/submissions/{id}/activities/{activityId}` |

### Including in Submission Fetch

```
GET /submissions/{id}?include=activities,activities.details
```

- `activities` — timeline entries
- `activities.details` — full activity data (required for work notes content)

### Activity Properties

| Property | Description |
|----------|-------------|
| `type` | Activity type (comment, status change, workflow event) |
| `label` | Short label |
| `description` | Detail text |
| `data` | Arbitrary JSON data |

### Workflow-Generated Activities

Prebuilt workflow routines automatically create activity records at lifecycle points:
- Submission created/submitted/updated/closed
- Approval decisions
- Assignment changes

### React Usage

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

---

## Task Engine Security (Ruby)

The Task engine has its own security layer using **Ruby** expressions (not JavaScript).

### Policy Rule Types

| Type | Controls |
|------|----------|
| **API Access** | Who can access Task REST API and triggers on sources |
| **Category Access** | Who can access workflow categories |
| **Console Access** | Who can access the workflow builder UI |
| **System Default** | Platform-wide default |

### KSL Variables (Ruby)

**`@identity`** — current user:
```ruby
@identity.username
@identity.is_member_of('Team::Admins')
```

**`@request`** — incoming HTTP request:
```ruby
@request.remote_addr
@request.params['token']
```

### Example Task Policy Rules

```ruby
# Team restriction
@identity.is_member_of('Team::Admins')

# IP restriction
['127.0.0.1', '10.0.0.5'].include?(@request.remote_addr)

# Pre-shared token
@request.params['token'] == 'my-secret-token'

# Combined
@identity.is_member_of('Team::Approvers') && ['192.168.1.100'].include?(@request.remote_addr)
```

### API Endpoints

```
GET/POST   /app/components/task/app/api/v2/policyRules/{type}
GET/PUT/DELETE /app/components/task/app/api/v2/policyRules/{type}/{name}
```

---

## Security API Reference

### Security Policy Definitions (CRUD)

**Space-level:**
```
GET/POST   /app/api/v1/securityPolicyDefinitions
GET/PUT/DELETE /app/api/v1/securityPolicyDefinitions/{name}
```

**Kapp-level:**
```
GET/POST   /app/api/v1/kapps/{kappSlug}/securityPolicyDefinitions
GET/PUT/DELETE /app/api/v1/kapps/{kappSlug}/securityPolicyDefinitions/{name}
```

Note: `{name}` in the URL must be URL-encoded (e.g., `API%20Test%20Policy`).

### Security Policy CRUD Examples

**List definitions:**
```json
GET /app/api/v1/kapps/services/securityPolicyDefinitions
→ {
    "securityPolicyDefinitions": [
      {"name": "Admins", "message": "Must be an administrator.", "rule": "false", "type": "Kapp"},
      {"name": "Authenticated Users", "message": "Must be authenticated.", "rule": "identity('authenticated')", "type": "Kapp"},
      {"name": "Everyone", "message": "Everyone is allowed access.", "rule": "true", "type": "Kapp"},
      {"name": "Submitter", "message": "Must be the user that created the submission.",
       "rule": "(submission('anonymous') && submission('sessionToken') == identity('sessionToken'))\n|| (!submission('anonymous') && submission('createdBy') == identity('username'))",
       "type": "Submission"}
    ]
  }
```

**Get single definition:**
```json
GET /app/api/v1/kapps/services/securityPolicyDefinitions/Submitter
→ {"securityPolicyDefinition": {"name": "Submitter", "message": "...", "rule": "...", "type": "Submission"}}
```

**Create definition:**
```json
POST /app/api/v1/kapps/services/securityPolicyDefinitions
{
  "name": "Team Members Only",
  "message": "Must be a member of the assigned team.",
  "rule": "identity(\"teams\").indexOf(\"Role::Employee\") > -1",
  "type": "Form"
}
→ {"securityPolicyDefinition": {"name": "Team Members Only", "message": "...", "rule": "...", "type": "Form"}}
```

**Update definition** (can rename):
```json
PUT /app/api/v1/kapps/services/securityPolicyDefinitions/Team%20Members%20Only
{
  "name": "Team Members Only v2",
  "message": "Updated message.",
  "rule": "identity(\"authenticated\")",
  "type": "Form"
}
```

**Delete definition:**
```
DELETE /app/api/v1/kapps/services/securityPolicyDefinitions/Team%20Members%20Only%20v2
→ {"securityPolicyDefinition": {"name": "Team Members Only v2", ...}}   (200 OK, returns deleted object)
```

### Security Policy Error Responses

```json
// 400 — missing required fields
{"error": "Invalid Kapp.\n    The \"X\" security policy definition is invalid: Message must not be blank\n    The \"X\" security policy definition is invalid: Rule must not be blank\n    The \"X\" security policy definition is invalid: Type must be \"Discussion\", \"File Resource\", \"Form\", \"Kapp\", \"Space\", \"Submission\", \"Team\", or \"User\"",
 "statusCode": 400}

// 400 — duplicate name
{"error": "Invalid Kapp.\n    Security policy definition names must be unique and there are 2 with the name \"X\"",
 "statusCode": 400}

// 400 — invalid type
{"error": "... Type must be \"Discussion\", \"File Resource\", \"Form\", \"Kapp\", \"Space\", \"Submission\", \"Team\", or \"User\"",
 "statusCode": 400}
```

### Security Policy Gotchas (Verified)

- **All four fields are required** — name, message, rule, and type. Missing any returns a 400 with specific validation messages
- **Names must be unique within scope** — duplicate names at kapp level error on `"Invalid Kapp"`, at space level on `"Invalid Space"`
- **Policies can be renamed via PUT** — the URL uses the old name, and the body contains the new name
- **Delete returns the full deleted object** — useful for confirmation/undo
- **Cross-level types are accepted** — you can create a "Space" type policy at kapp level without error, though it may not function correctly
- **Policies are deleted with their kapp** — if a kapp is deleted, all its security policy definitions are removed
- **The "Admins" policy uses `false`** — returning `false` denies everyone except space admins (who bypass all security). This is the standard admin-only pattern
- **Real-world rules use IIFEs** — complex policies wrap logic in `(function(){ ... })()` for variable scoping and multi-step evaluation

### Include Params for Security Data
```
?include=securityPolicies                     # applied policies
?include=securityPolicyDefinitions            # available definitions
?include=securityPolicies,securityPolicyDefinitions  # both
```
