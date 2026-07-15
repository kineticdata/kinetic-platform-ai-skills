---
name: kapp-lifecycle
description: "Use when creating, updating, deleting, or configuring Kinetic Kapps end-to-end — POST /kapps body shape, kapp formTypes (must be registered before type-based KQL works), kapp fields and indexDefinitions, kapp attributes, kapp categories and category attributes, kapp security policy assignment, and the PUT-replaces-but-cross-property-merges behavior on update. Read when scaffolding a new application kapp from scratch or hardening an existing one."
---

# Kapp Lifecycle

A **Kapp** (Kinetic Application) is the top-level container under a Space. Each kapp owns forms, workflows, submissions, indexes, categories, attributes, webhooks, WebAPIs, and security policy definitions. Most platform configuration lives at kapp scope; this skill is the canonical reference for kapp-level CRUD and the cross-cutting behaviors that bite people on first deploy.

For forms inside a kapp, see `concepts/form-engine`. For workflows bound to a kapp/form, see `concepts/workflow-creation`. For kapp-level KQL indexes vs form-level indexes, see `concepts/kql-and-indexing` (this skill covers the kapp-index part).

---

## Kapp Object — Top-Level Properties

A kapp's JSON shape (with `include=details,attributes,formTypes,categories,indexDefinitions`):

| Property | Type | Description |
|---|---|---|
| `slug` | string | **Permanent identifier** — cannot change after creation. Code and URLs reference it. |
| `name` | string | Display name (mutable). |
| `description` | string | Free-text description (mutable). |
| `formTypes` | array of `{name, allowsAnonymous, status}` | Allowed `type` values for forms in this kapp. **Must be registered before `?q=type=...` KQL works.** |
| `indexDefinitions` | array of `{name, parts[], unique, status}` | Kapp-level (cross-form) indexes. Limited to common columns — see "Kapp Indexes vs Form Indexes." |
| `categories` | array of `{slug, name, attributesMap}` | Optional grouping for forms within the kapp. |
| `attributesMap` | `{name: [values]}` | Custom metadata. Definitions registered separately — see `concepts/attribute-definitions`. |
| `bundlePath` / `bundleConfig` | string / object | Where the kapp's UI bundle is served from and any per-kapp overrides. Implementation-specific. |
| `securityPolicies` | array | Names of security policy definitions assigned to this kapp's lifecycle points. See "Security Assignment." |
| `loginPage` / `displayType` / `displayValue` | strings | Authentication and landing-page behavior (used by hosted Kapp routes, not custom React portals). |
| `createdAt` / `updatedAt` / `createdBy` / `updatedBy` | strings | Timestamps with `include=details`. |

---

## Create a Kapp

```
POST /app/api/v1/kapps
Content-Type: application/json

{
  "slug": "services",
  "name": "Service Catalog",
  "description": "Self-service request portal"
}
```

`slug` is required. Everything else can be set on this call or PUT later. Successful response: `{ "kapp": {...} }` with the canonical object.

**Slug rules:** lowercase, dashes/underscores allowed, must be unique within the space, **immutable** after creation. Choose carefully — every URL, security policy reference, and workflow `sourceGroup` mentions the slug.

**Derive the slug from the name unless explicitly told otherwise.** When creating a kapp, default the slug to a slugified version of the `name`: lowercase it, and replace spaces (and other separators) with single dashes. Only deviate when the user explicitly specifies a different slug.

| Name | Default slug |
|---|---|
| `K-Kinetic Test` | `k-kinetic-test` |
| `K Kinetic Test` | `k-kinetic-test` |
| `Service Catalog` | `service-catalog` |
| `HR Forms` | `hr-forms` |

---

## Update a Kapp — Merge Behavior

```
PUT /app/api/v1/kapps/{kappSlug}
Content-Type: application/json
```

**`PUT` merges across top-level properties but replaces within them.** This is the most-misunderstood kapp behavior:

- Sending `{"name": "New Name"}` updates the name and leaves `formTypes`, `indexDefinitions`, `categories`, etc. untouched.
- Sending `{"formTypes": [{"name": "Service", ...}]}` **replaces the entire `formTypes` array**. Any types you didn't include are removed.
- Same for `indexDefinitions`, `categories`, `securityPolicies`. Array properties are replace-not-merge **within** the property; the property itself is merge-not-replace **at the top level**.

**Safe-update pattern:**

```js
// Always GET first when modifying an array property
const { kapp } = await fetch(`/app/api/v1/kapps/${slug}?include=formTypes,indexDefinitions,categories`);
const updated = {
  formTypes: [
    ...kapp.formTypes,
    { name: 'Service', allowsAnonymous: false, status: 'Active' },
  ],
};
await fetch(`/app/api/v1/kapps/${slug}`, { method: 'PUT', body: JSON.stringify(updated) });
```

If you skip the merge and PUT just `{formTypes: [{name: 'Service'}]}`, every existing form type is dropped — and any form whose `type` no longer matches a registered formType becomes unfilterable via `?q=type=...` until the type is re-added.

---

## Delete a Kapp

```
DELETE /app/api/v1/kapps/{kappSlug}
```

**Cascading delete** — all forms, submissions, indexes, categories, workflows bound to the kapp's `platformItemId` are deleted. There is no soft-delete; the `Form Restored` / `Team Restored` events do not apply at kapp scope. Workflows bound to specific forms inside the kapp are also dropped; workflows bound to the *space* survive.

Returns 200 + the deleted kapp body. There is no "are you sure" prompt in the API — wire one into your tooling if you expose `DELETE /kapps/{slug}` to users.

---

## formTypes — Why Registration Matters

Every form has a `type` field (`"Service"` / `"Approval"` / etc.). The `type` value is stored on the form record but **only filterable via KQL when the type is registered in the kapp's `formTypes` array**.

```
GET /app/api/v1/kapps/{slug}/forms?q=type="Service"
```

Without `formTypes: [{name: "Service", ...}]` on the kapp, this query returns 400 ("requires index definition for type") even though every form record carries the value. Register types **before** bulk-creating forms.

**formType entry shape:**

| Field | Description |
|---|---|
| `name` | The exact string forms will set as `type` (case-sensitive) |
| `allowsAnonymous` | If `true`, forms of this type can be submitted without authentication |
| `status` | `"Active"` or `"Inactive"` — inactive types still match historical filters but new forms can't use them |

Typical service-portal kapp registers: `Service`, `Approval`, `Task`, `Action`. Approval-only kapps may register just `Approval`. The names are project-specific.

---

## Kapp Indexes vs Form Indexes

Two index scopes coexist on the same kapp:

| Scope | What it indexes | What it cannot index | Endpoint |
|---|---|---|---|
| **Kapp index** | Common columns across all forms: `coreState`, `createdBy`, `submittedBy`, `closedBy`, `updatedBy`, `handle`, `type` | `values[<field>]` — kapp indexes **cannot reference value fields**. Trying returns 500 with "field was not found." | `PUT /kapps/{slug}` with `indexDefinitions: [...]` |
| **Form index** | Anything on the form including `values[<field>]` | Nothing — form indexes are the only way to index `values[]` | `PUT /kapps/{slug}/forms/{form}` with `indexDefinitions: [...]` |

**Kapp-level KQL** uses the kapp endpoint (`GET /kapps/{slug}/submissions?q=...`) and needs **kapp indexes** to satisfy any non-trivial filter. Form-level KQL (`GET /kapps/{slug}/forms/{form}/submissions?q=...`) uses **form indexes**.

### Standard kapp index pattern

For a kapp where you'll search across all forms by `type` and `coreState`:

```json
{
  "indexDefinitions": [
    { "name": "type",                "parts": ["type"],                  "unique": false },
    { "name": "coreState",           "parts": ["coreState"],             "unique": false },
    { "name": "type_coreState",      "parts": ["type", "coreState"],     "unique": false },
    { "name": "createdBy_coreState", "parts": ["createdBy", "coreState"], "unique": false }
  ]
}
```

### Build the indexes after definition

Definitions are metadata; index data must be built separately:

```
POST /app/api/v1/kapps/{kappSlug}/backgroundJobs
{ "type": "Build Index", "content": { "indexes": [ { "name": "type_coreState" } ] } }
```

Poll `GET /kapps/{slug}/backgroundJobs` until the job completes; the index `status` field transitions `New → Building → Built`. Cap the poll loop with a max wait (5 minutes typical); a stuck build won't time out on its own.

**Kapp indexes created via Ruby SDK / template import are buildable via this background-job endpoint.** Kapp `values[<field>]` indexes are NOT possible — that's a form-level concern, period.

---

## Categories — Optional Grouping Within a Kapp

Categories let you group forms within a kapp (e.g., "IT Services", "HR Forms", "Facilities"). Forms reference categories via the form's `categorizations` array (not the kapp's `categories`).

```
GET    /app/api/v1/kapps/{kappSlug}/categories
POST   /app/api/v1/kapps/{kappSlug}/categories
GET    /app/api/v1/kapps/{kappSlug}/categories/{slug}
PUT    /app/api/v1/kapps/{kappSlug}/categories/{slug}
DELETE /app/api/v1/kapps/{kappSlug}/categories/{slug}
```

Category shape:

```json
{
  "slug": "it-services",
  "name": "IT Services",
  "attributesMap": { "Icon": ["computer"], "Sort Order": ["1"] }
}
```

`Icon`, `Sort Order`, and any other custom attributes require category-attribute *definitions* (see `concepts/attribute-definitions` — `categoryAttributeDefinitions` is kapp-scoped).

**Putting a form in a category** is done on the form, not the category:

```json
PUT /kapps/{kapp}/forms/{form}
{
  "categorizations": [
    { "category": { "slug": "it-services" } }
  ]
}
```

A form can sit in multiple categories. Category deletion does NOT delete the forms; the categorization entries are orphaned and the forms lose that grouping label.

---

## Kapp Attributes

Kapp attributes carry kapp-level configuration (theme JSON, integration endpoints, feature flags). They require *definitions* (see `concepts/attribute-definitions`) and are set on the kapp via `attributesMap`:

```json
PUT /kapps/{slug}
{
  "attributesMap": {
    "Theme":         ["{\"primary\":\"#0066cc\"}"],
    "Default Form":  ["request"],
    "SLA Hours":     ["48"]
  }
}
```

Values are always arrays — even when the definition has `allowsMultiple: false`. Read with `?.[0]` on the array.

**Resolution hierarchy** when an attribute could resolve to multiple scopes (form → kapp → space): see the resolution-hierarchy table in `concepts/attribute-definitions`. Kapp falls between form (most specific) and space (least specific).

---

## Security Assignment

A kapp doesn't define security policies — it *assigns* them. Policy definitions live at space or kapp scope (`POST /app/api/v1/kapps/{slug}/securityPolicyDefinitions`). The kapp record carries a `securityPolicies` array indicating which named policy applies to which lifecycle point.

```json
{
  "securityPolicies": [
    { "name": "Kapp Display",                       "endpoint": "Display" },
    { "name": "Kapp Modification",                  "endpoint": "Modification" },
    { "name": "Default Form Display",               "endpoint": "Default Form Display" },
    { "name": "Default Submission Access",          "endpoint": "Default Submission Access" },
    { "name": "Default Submission Modification",    "endpoint": "Default Submission Modification" },
    { "name": "Submission Support",                 "endpoint": "Submission Support" }
  ]
}
```

The **`name`** values reference policy definitions you created earlier; the **`endpoint`** values are fixed strings the platform recognizes (`Display`, `Modification`, `Form Creation`, `Default Form Display`, `Default Form Modification`, `Default Submission Access`, `Default Submission Modification`, `Submission Support`).

**"Default" policies cascade.** A `Default Submission Access` policy on the kapp applies to every form's submissions unless that form has its own `Submission Access` policy. Apply the broadest policy at kapp level and override on specific forms.

For the policy expression syntax itself, see `concepts/security-policies`. Bug 5 in `platform/known-bugs` is critical: a failing `Display` policy expression on any kapp poisons `GET /kapps` for non-admins. Test policies as a non-admin before deploying.

---

## End-to-End Kapp Provisioning (Worked Example)

Provisioning a new service-catalog kapp from scratch:

```js
// 1. Create the kapp shell
await POST('/app/api/v1/kapps', {
  slug: 'services',
  name: 'Service Catalog',
  description: 'Self-service request portal',
});

// 2. Register formTypes (must precede form creation if you want type-based KQL)
await PUT('/app/api/v1/kapps/services', {
  formTypes: [
    { name: 'Service',  allowsAnonymous: false, status: 'Active' },
    { name: 'Approval', allowsAnonymous: false, status: 'Active' },
    { name: 'Task',     allowsAnonymous: false, status: 'Active' },
  ],
});

// 3. Add kapp-level indexes for cross-form search
await PUT('/app/api/v1/kapps/services', {
  indexDefinitions: [
    { name: 'type',           parts: ['type'],                unique: false },
    { name: 'coreState',      parts: ['coreState'],           unique: false },
    { name: 'type_coreState', parts: ['type', 'coreState'],   unique: false },
  ],
});

// 4. Build them
await POST('/app/api/v1/kapps/services/backgroundJobs', {
  type: 'Build Index',
  content: { indexes: [
    { name: 'type' }, { name: 'coreState' }, { name: 'type_coreState' },
  ]},
});

// 5. Categories (optional)
for (const cat of [
  { slug: 'it',         name: 'IT Services',  attributesMap: { 'Icon': ['computer'] } },
  { slug: 'facilities', name: 'Facilities',   attributesMap: { 'Icon': ['building'] } },
]) {
  await POST('/app/api/v1/kapps/services/categories', cat);
}

// 6. Attributes — kapp-level configuration (definitions must exist first)
await PUT('/app/api/v1/kapps/services', {
  attributesMap: {
    'Theme':        [JSON.stringify({ primary: '#0066cc' })],
    'Default Form': ['service-request'],
  },
});

// 7. Security — assign policies (definitions must exist first)
await PUT('/app/api/v1/kapps/services', {
  securityPolicies: [
    { name: 'Authenticated Users',          endpoint: 'Display' },
    { name: 'Admins Only',                  endpoint: 'Modification' },
    { name: 'Owner or Support',             endpoint: 'Default Submission Access' },
  ],
});
```

Forms, workflows, and individual security policy definitions are created against this kapp after the shell is in place. See `recipes/create-submission-form` for form provisioning and `concepts/workflow-creation` for binding workflows to forms inside this kapp.

---

## Gotchas

- **Slug is immutable.** Plan for it. Migrating a kapp to a new slug means cloning into a new kapp, copying data, then deleting the old one.
- **Default the slug from the name.** Slugify the `name` (lowercase, separators → dashes) unless the user explicitly gives a different slug. `K-Kinetic Test` → `k-kinetic-test`.
- **PUT merges top-level / replaces within arrays.** Always GET-then-PUT for `formTypes`, `indexDefinitions`, `categories`, `securityPolicies`.
- **formTypes must be registered before `?q=type=...` works.** Even though `type` is stored on every form.
- **Kapp indexes cannot reference `values[<field>]`.** Those are form-level concerns.
- **Indexes need building, not just defining.** Definitions are metadata; the `Build Index` background job creates the searchable structure.
- **`Default Form Display` cascades** to every form in the kapp unless overridden — set carefully.
- **Bug 5** (`platform/known-bugs`): a failing security-policy `Display` expression on any kapp poisons `GET /kapps` for non-admins across the entire space.
- **Deletion is cascading and irreversible.** No soft-delete / restore at kapp scope.

---

## Related Skills

- `concepts/api-basics` — base URLs, response wrappers, `include` parameter.
- `concepts/kql-and-indexing` — KQL syntax and index lifecycle details.
- `concepts/attribute-definitions` — kapp/category/form attribute definition CRUD.
- `concepts/security-policies` — KSL syntax for the policies you assign here.
- `concepts/template-provisioning` — for whole-space export/import that includes kapps.
- `recipes/build-service-portal` — putting it all together for an end-to-end portal.
- `commands/kinetic-new-app` — slash command that runs the worked example above.
