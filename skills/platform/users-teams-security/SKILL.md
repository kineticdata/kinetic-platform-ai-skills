---
name: users-teams-security
description: Users, Teams, Memberships, Security Definitions (KSL), Attribute Definitions, Submission Activities, and access control patterns for the Kinetic Platform.
---

# Users, Teams, and Security

---

## Users

### User Properties

| Property | Description |
|----------|-------------|
| `username` | Unique login identifier |
| `displayName` | Human-readable display name |
| `email` | Email address |
| `spaceAdmin` | Boolean — space administrator |
| `enabled` | Boolean — account active |
| `attributes` | Admin-managed key-value metadata (e.g., Manager, Department) |
| `profileAttributes` | User-editable personal data (e.g., Phone Number) |
| `memberships` | Team membership objects |
| `attributesMap` | Object form of attributes (with `include=attributesMap`) |
| `profileAttributesMap` | Object form of profile attributes |

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
- `details` (timestamps: `createdAt`, `updatedAt`)

---

## Teams

### Team Properties

| Property | Description |
|----------|-------------|
| `name` | Team display name |
| `slug` | URL-safe identifier |
| `description` | Team description |
| `attributes` | Key-value metadata (e.g., Manager, Escalation Contact) |
| `memberships` | User membership objects |

### Core API Endpoints

| Operation | Method | Path |
|-----------|--------|------|
| List Teams | GET | `/app/api/v1/teams` |
| Get Team | GET | `/app/api/v1/teams/{teamSlug}` |
| Create Team | POST | `/app/api/v1/teams` |
| Update Team | PUT | `/app/api/v1/teams/{teamSlug}` |
| Delete Team | DELETE | `/app/api/v1/teams/{teamSlug}` |

### Team Slugs Are Auto-Generated UUIDs

**CRITICAL:** The `slug` field in `POST /teams` body is **ignored**. The platform auto-generates a UUID as the team slug. Always save the returned `slug` from the create response and use it for subsequent operations. Do not assume you can control team slugs.

### Memberships

| Operation | Method | Path |
|-----------|--------|------|
| Add Member | POST | `/app/api/v1/memberships` |
| Remove Member | DELETE | `/app/api/v1/memberships/{teamSlug}_{username}` |

**Add member body format:** `{ "team": { "slug": "..." }, "user": { "username": "..." } }`

**Delete identifier:** Concatenate team slug + underscore + username (e.g., `DELETE /memberships/abc123_john.doe`)

**WARNING:** The paths `/teams/{slug}/memberships` (nested under teams) return 404. Always use the top-level `/memberships` endpoint.

### Naming Conventions

Teams commonly use prefixed names indicating role:
- `Role::Employee`, `Role::Manager` — role-based
- `Department::HR`, `Department::Engineering` — department-based

The `identity('teams')` function in security expressions and form conditions returns these names.

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

A definition has four fields:

| Field | Description |
|-------|-------------|
| `name` | Unique identifier (appears in dropdown selectors) |
| `type` | Determines scope and available bindings |
| `rule` | JavaScript expression that MUST evaluate to `true` or `false` |
| `message` | Denial message shown when rule returns `false` |

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
| `hasIntersection(a, b)` | `boolean` | True if arrays share any element |

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

This is a built-in form expression function. For security definitions that need more complex list comparison, use the IIFE pattern:

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

- **Never use `profileAttributes` in security policies** — users can set their own profile attributes, creating a privilege escalation vector. Always use `identity('attribute:X')` (admin-set) for access control. Demonstrated: a policy checking `identity('profileAttribute:Nickname') === 'VIP'` was bypassed when a non-admin user set their own Nickname to "VIP" via `PUT /users/{username}` (profile attributes are accepted, user attributes are silently ignored for non-admins).
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

| Property | Description |
|----------|-------------|
| `name` | Reference key used in expressions and API |
| `description` | Purpose of the attribute |
| `allowsMultiple` | Boolean — whether it holds multiple values |

### Resource Types

| Resource | Example Attributes |
|----------|-------------------|
| Space | Theme, Default SLA Hours |
| Kapp | Icon, Description, Lifecycle Kapp Slug |
| Form | Icon, Assigned Team, SLA Hours, Notification Template |
| Category | Sort Order, Display Settings |
| User | Manager, Department, Region |
| User Profile | Phone Number, Preferred Language |
| Team | Escalation Contact, Support Level |

### Resolution Hierarchy

Attributes resolve from most-specific to least-specific:
1. **Form level** (highest priority)
2. **Kapp level**
3. **Space level** (lowest priority)

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

Created in Kinetic Console at **Definitions > Attributes** in Space or Kapp context. Definitions must exist before attributes can be assigned to entities.

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

### Include Params for Security Data
```
?include=securityPolicies                     # applied policies
?include=securityPolicyDefinitions            # available definitions
?include=securityPolicies,securityPolicyDefinitions  # both
```
