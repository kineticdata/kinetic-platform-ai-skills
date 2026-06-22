---
name: security-policies
description: "Use when controlling who can view/create/modify/delete Kinetic resources — writing or debugging KSL security definitions (JavaScript rules), creating/assigning security policies to form/kapp/space endpoints, using binding functions (identity, values, submission), defining attribute definitions, or setting Task engine (Ruby) policy rules. Covers core-platform vs Task-engine language differences, space-admin bypass, and access denied/403 troubleshooting."
---

# Security Policies

Access control for the Kinetic Platform — security policy definitions, KSL expressions, attribute definitions, submission activities, and Task engine policy rules. For user/team CRUD and memberships, see Users & Teams (`concepts/users-and-teams`).

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
| **Space** | `identity()`, `space()` | Space display, user/team CRUD, WebAPI execution |
| **Team** | `identity()`, `space()`, `team()` | Team-specific policies |
| **User** | `identity()`, `space()`, `user()` | User-specific policies |
| **Datastore Form** | `identity()`, `space()`, `form()` | Legacy space-level form policies (v5 compatibility) |
| **Datastore Submission** | `identity()`, `space()`, `form()`, `submission()` | Legacy space-level submission policies (v5 compatibility) |

**Note:** "Datastore Form" and "Datastore Submission" types are legacy from v5 when forms could exist at the space level. In v6+, all forms live within kapps — use Kapp-level Form and Submission types for all new work. The legacy types still exist in the API for backward compatibility.

#### Kapp-Level Types (Kapp > Definitions > Security)

| Type | Available Bindings | Used For |
|------|-------------------|----------|
| **Kapp** | `identity()`, `space()`, `kapp()` | Kapp display/modification, form creation, submission support |
| **Form** | `identity()`, `space()`, `kapp()`, `form()` | Form display/modification |
| **Submission** | `identity()`, `space()`, `kapp()`, `form()`, `values()`, `submission()` | Submission display/modification |

Space-level definitions cannot be applied within a Kapp.

**Binding availability rule:** `identity()` is available everywhere; a definition's scope determines which context bindings it adds (`space()` everywhere a space exists, plus `team()`/`user()`/`kapp()`/`form()`/`values()`/`submission()` per scope — see the per-scope tables above).

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

> **`hasIntersection(a, b)`** is NOT a platform built-in — it is an inline JS helper (returns `true` if two arrays share any element) commonly defined within expressions. It is listed separately from the table above for this reason. See the "`hasIntersection` Helper" section below.

> **Not a valid binding: `values_previous()`.** `@values_previous` exists in workflow-node ERB context (see `workflow-engine`), but `values_previous(...)` is NOT a valid KSL binding for security policies or workflow filters. The Core API accepts the expression at registration time without complaint, but at runtime it returns nil/empty, so any change-detection filter using it never matches. For change detection in workflow filters, see the workaround pattern in `workflow-engine`.

> **KSL bindings must use function-call syntax.** `values('Status')` is correct; `values["Status"]` is silently accepted at registration but never matches at runtime — the policy/filter just doesn't fire, and no error is logged. Same class of failure as `values_previous()` above and `@requested_by` in form-event workflows. The full CORRECT/WRONG examples for filters live in `workflow-engine/SKILL.md` under "Workflow Filters"; the same syntax rule applies to all KSL contexts (security policies, filters, mappings).

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

Moved to **`concepts/attribute-definitions`**. Security policies use attributes via the `identity('attributeValue', 'Department', 'IT')` binding, but the schema, per-scope endpoints, `allowsMultiple` semantics, and resolution hierarchy live in the dedicated skill.

## Submission Activities

Moved to **`concepts/submission-activities`**. The `/submissions/{id}/activities` CRUD endpoints, `include=activities,activities.details` fetch pattern, and workflow-generated activity types are documented there.

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
