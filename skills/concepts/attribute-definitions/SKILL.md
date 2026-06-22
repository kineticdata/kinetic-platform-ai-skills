---
name: attribute-definitions
description: "Use when creating, updating, or querying attribute definitions on Kinetic resources — space, kapp, form, user, userProfile, team, category. Covers the per-scope endpoint paths (and the kapp-scoped vs space-scoped path distinction), the `allowsMultiple` flag and what it does (and doesn't) enforce, the resolution hierarchy (form → kapp → space), response wrapper keys, and the gotcha that attributes can be set with no matching definition. For using attributes inside security policies, see `security-policies` (binding functions). For reading attribute values from React, see `front-end/state` (`getAttributeValue`)."
---

# Attribute Definitions

Attribute definitions declare the schema for custom metadata attached to platform resources. They control what attribute names show up in the admin console and what `allowsMultiple` flag a UI should respect — they do NOT enforce that attribute values match the schema. (See "Gotchas" below.)

## Properties

**Base properties** (always returned):

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | **Required on create.** Reference key used in expressions and API. |
| `description` | `string\|null` | Purpose of the attribute |
| `allowsMultiple` | `boolean` | Whether multiple values are allowed. Default: `false`. **UI hint only** — not enforced by the API. |

**With `include=details`:**

| Property | Type | Description |
|----------|------|-------------|
| `createdAt` | `string` | ISO timestamp |
| `createdBy` | `string` | Username of creator |
| `updatedAt` | `string` | ISO timestamp |
| `updatedBy` | `string` | Username of last updater |

---

## API Endpoints by Scope

### Space-Level Attribute Definitions

| Resource | List/Create | Get/Update/Delete |
|----------|------------|-------------------|
| Space | `GET/POST /app/api/v1/spaceAttributeDefinitions` | `GET/PUT/DELETE /app/api/v1/spaceAttributeDefinitions/{name}` |
| User | `GET/POST /app/api/v1/userAttributeDefinitions` | `GET/PUT/DELETE /app/api/v1/userAttributeDefinitions/{name}` |
| User Profile | `GET/POST /app/api/v1/userProfileAttributeDefinitions` | `GET/PUT/DELETE /app/api/v1/userProfileAttributeDefinitions/{name}` |
| Team | `GET/POST /app/api/v1/teamAttributeDefinitions` | `GET/PUT/DELETE /app/api/v1/teamAttributeDefinitions/{name}` |
| Datastore Form (legacy) | `GET/POST /app/api/v1/datastoreFormAttributeDefinitions` | `GET/PUT/DELETE /app/api/v1/datastoreFormAttributeDefinitions/{name}` |

### Kapp-Level Attribute Definitions

| Resource | List/Create | Get/Update/Delete |
|----------|------------|-------------------|
| Kapp | `GET/POST /app/api/v1/kapps/{slug}/kappAttributeDefinitions` | `GET/PUT/DELETE /app/api/v1/kapps/{slug}/kappAttributeDefinitions/{name}` |
| Form | `GET/POST /app/api/v1/kapps/{slug}/formAttributeDefinitions` | `GET/PUT/DELETE /app/api/v1/kapps/{slug}/formAttributeDefinitions/{name}` |
| Category | `GET/POST /app/api/v1/kapps/{slug}/categoryAttributeDefinitions` | `GET/PUT/DELETE /app/api/v1/kapps/{slug}/categoryAttributeDefinitions/{name}` |

**Important:** Kapp-level attribute definitions (`kappAttributeDefinitions`, `formAttributeDefinitions`, `categoryAttributeDefinitions`) are NOT accessible at the space level. The paths `/app/api/v1/kappAttributeDefinitions` and `/app/api/v1/formAttributeDefinitions` return 404. You MUST use the kapp-scoped path.

Exception: `datastoreFormAttributeDefinitions` IS at the space level (not kapp-scoped).

---

## CRUD Examples

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

---

## Response Wrapper Names

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

---

## Error Responses

```json
// 400 — duplicate name
{"error": "Invalid Space.\n    User attribute definition names must be unique and there are 2 with the name \"X\"",
 "statusCode": 400}
```

---

## Resource Types

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

## Resolution Hierarchy

Attributes resolve from most-specific to least-specific:
1. **Form level** (highest priority)
2. **Kapp level**
3. **Space level** (lowest priority)

---

## Gotchas (Verified)

- **Attributes can be set without a matching definition** — the API silently stores attribute values even if no attribute definition exists for that name. **Typos in attribute names go undetected.**
- **`allowsMultiple` is not enforced by the API** — even with `allowsMultiple: false`, you can store multiple values in the array. The flag is for UI hints only.
- **Definitions must exist before they appear in the admin console** — while the API allows setting arbitrary attributes, the console UI only shows attributes with definitions.
- **Duplicate definition names error at save time** — the error message says "there are 2 with the name" because the server tries to add the new one alongside the existing one.
- **Kapp-level definitions are isolated** — form attribute definitions in kapp "services" are completely separate from those in kapp "queue". A "Short Description" form attribute in one kapp does not exist in another.
- **`details` include adds timestamps** — without it, you only get name, description, allowsMultiple.
- **DELETE returns the deleted object** — useful for confirmation/logging.
- **PUT replaces, doesn't merge.** Sending `{"allowsMultiple": true}` without including `description` will wipe the description. Send the full body.

---

## Reading Attribute Values

Attribute values on a resource come back as `attributesMap` — a `{name: [values]}` shape where values are always arrays even when `allowsMultiple` is false.

```js
// Always returns arrays — access with [0]
space.attributesMap["Lifecycle Kapp Slug"]  // → ["platform-one"]
space.attributesMap["Lifecycle Kapp Slug"]?.[0]  // → "platform-one"

// Use getAttributeValue helper for safety (front-end/state skill)
getAttributeValue(form, 'Icon', 'forms')  // → icon name or 'forms'
```

See the `front-end/state` skill for the `getAttributeValue` implementation.

## Management

Created in Kinetic Console at **Definitions > Attributes** in Space or Kapp context, or programmatically via the REST API endpoints above.

## Related Skills

- **`security-policies`** — uses attribute values inside KSL expressions via the `identity('attributeValue', ...)` binding.
- **`users-and-teams`** — user/team CRUD which also accepts attribute values.
- **`front-end/state`** — the `getAttributeValue` reader helper.
