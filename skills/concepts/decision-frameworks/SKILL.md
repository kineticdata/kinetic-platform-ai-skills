---
name: decision-frameworks
description: Decision trees for choosing between forms approaches, integration types, data storage patterns, and security models in the Kinetic Platform.
---

# Decision Frameworks

When building on the Kinetic Platform, there are multiple valid approaches for most tasks. This skill documents **when to use which approach** to help AI and developers make the right architectural choice.

---

## Forms: CoreForm vs Client-Side API

See the **Forms** skill (`front-end/forms`) for the full decision framework on when to use CoreForm vs client-side API forms.

---

## Integration Types

Kinetic has four integration mechanisms. Each serves a different purpose.

### Connections & Operations (Modern — Default Choice)

**What:** REST API and SQL database integrations configured in the platform UI. A Connection defines the system (base URL, auth, headers). Operations define specific actions (endpoints, HTTP methods, input/output mappings).

**Where it runs:** Server-side, within the Kinetic Platform.

**Use in:**
- **Forms** — populate dropdowns, default field values, trigger on field change (via `integrations` array on the form, `choicesDataSource: "integration"`)
- **Workflows** — execute operations as workflow steps (`system_integration_v1` handler)
- **Kapp-level integrations** — exposed via `/integrations/kapps/{kappSlug}/...` endpoint with security policies

**Choose when:**
- Integrating with any system that has a REST API or SQL database
- You want low-code configuration (no custom code deployment)
- You need the integration available in both forms and workflows
- This is the **default choice** for new integrations

**Key details:**
- Replaces both Bridges (for form data) and Handlers (for workflow actions) for REST/SQL systems
- Operations are testable from the platform UI
- Security policies can control who executes kapp-level integrations

### Bridges (Legacy — Non-REST Systems Only)

**What:** A legacy integration framework for real-time data lookups. Uses Bridge Adapters (custom Java code) running on the Kinetic Agent.

**Architecture:** Bridge Adapter (code) → Agent (harness) → Bridge (configured instance) → Bridge Model (data mapping) → Bridged Resource (exposed on form)

**Where it runs:** On the Kinetic Agent (a separate deployment, often in a DMZ).

**Choose when:**
- The target system does **not** have a REST API (requires SDK/library integration)
- Existing bridge adapters are already deployed and working
- Migrating to Connections/Operations isn't feasible yet

**Key concepts:**
- Bridge Adapters are Java programs that perform the actual integration
- Bridge Models abstract customer-defined data models and map queries to adapter expectations
- Bridged Resources are exposed on Forms for permissioning — if the user can see the form, they can execute the bridge
- This is the **legacy** approach; Connections/Operations replaces it for REST/SQL systems

### Handlers (Workflow-Only, Legacy)

**What:** Small Ruby programs executed within workflows. Each handler has a standardized folder structure (handler/init.rb, process/node.xml, test/input.rb).

**Where it runs:** In the Kinetic Task workflow engine (or on the Agent for agent-specific handlers).

**Choose when:**
- You need custom logic in a workflow that Connections/Operations can't handle
- Existing handlers are already deployed and working
- The integration requires complex data transformation or multi-step logic beyond a single REST call

**Key details:**
- Handlers are async-only — workflows are asynchronous, so handlers aren't suitable for real-time client-side interactions
- Developed and tested locally using Kinetic's Test Harness, then uploaded as ZIP files
- Class naming convention: remove underscores from ZIP filename, capitalize each word
- `init.rb` has `initialize` (setup) and `execute` (perform action + return results) methods
- `node.xml` defines parameters, results, and configuration
- Results defined in `node.xml` are available in workflow dropdowns; extra results from Ruby code won't appear

### File Resources (File Streaming)

**What:** Similar to Bridges but optimized for streaming files rather than data payloads. Uses File Adapters.

**Where it runs:** On the Kinetic Agent.

**Choose when:**
- Displaying files in the frontend that are sourced from external systems
- Examples: Knowledge Articles from a CMS, files from S3, documents from SharePoint

---

### Integration Decision Tree

```
Need to integrate with an external system?
│
├─ Does it have a REST API or SQL database?
│   ├─ YES → Use Connections & Operations
│   └─ NO → Use Bridge with custom adapter on Agent
│
├─ Where is the integration needed?
│   ├─ In a Form (real-time, user-facing) → Connection/Operation or Bridge
│   ├─ In a Workflow (async, background) → Connection/Operation or Handler
│   ├─ Called from frontend code → Kapp-level integration (Connection/Operation with security policy)
│   └─ Called from external system → WebAPI (see WebAPIs and Webhooks skill)
│
├─ Is it file/document streaming?
│   └─ YES → File Resource with file adapter
│
└─ Does it need real-time response for the UI?
    ├─ YES → Do NOT use workflows (async, may have backlog)
    │         Use Connection/Operation in a form, or kapp-level integration
    └─ NO → Workflow with Connection/Operation or Handler is fine
```

---

## Data Storage Patterns

### When to Use What

| Need | Approach |
|------|----------|
| Transactional data (requests, incidents, orders) | Kapp form submissions |
| Reference/config data (departments, locations, SLA configs) | Kapp form submissions in a shared "Global" or "Config" kapp |
| Lookup data for form dropdowns from Kinetic data | Connection/Operation querying the Kinetic Core API itself |
| Lookup data from external systems | Connection/Operation or Bridge |
| Global configuration (theme, kapp slug, feature flags) | Space or Kapp attributes |
| Per-form configuration (icon, assigned team, SLA hours, notification template) | Form attributes |
| Per-user preferences | User Profile Attributes |

**Legacy note:** Prior to v6, Kinetic had dedicated "Datastore Forms" at the Space level with a different indexing strategy for reference data. In v6+, all forms are the same and only exist within Kapps. If reference data needs to be accessible across multiple kapps, create a shared kapp (e.g., "Global", "Shared", or "Config").

### Forms as Tables

Forms in Kinetic function like database tables:
- **Form** = table definition (fields = columns)
- **Submission** = row (field values = cell values)
- **No first-class relationships** — reference fields are plain text fields storing IDs (e.g., `Parent ID`, `Reference ID`, `SNOW SYS ID`)
- **Parent/child relationship** — submissions have a `parent` property that can store another submission's ID. The UI decides how to use it (e.g., open a modal showing the parent submission).
- **Form Type** property enables querying across forms — e.g., all forms with `type: "Approval"` to build a "My Approvals" view

### Attributes as Configuration

Attributes are key-value "tags" on Kinetic entities (Space, Kapp, Form, User, Team, Category). They drive configuration without code changes:

- **Form attribute `Assigned Team`** → workflow reads it to route work
- **Form attribute `SLA Hours`** → workflow reads it to set due dates
- **Form attribute `Notification Template Name - Create`** → workflow reads it to send the right email
- **Form attribute `Icon`** → UI reads it to display the right icon
- **Space attribute `Lifecycle Kapp Slug`** → portal reads it to determine which kapp to load

Attribute values are always arrays (even single values): `space.attributesMap["Key"][0]`.

---

## Workflow Execution Model

Understanding how workflows execute is critical for making the right architectural choice.

### Workflows Are Asynchronous

- Workflows (Trees) are triggered by **events**: user login, user created, team created, kapp created/updated, form submission created/submitted/updated, etc.
- Events fire at Space, Kapp, or Form level depending on the webhook configuration
- Workflows run in a queue — if many fire at once, the engine may have a **backlog**
- **Do not rely on workflows for real-time client-side execution** — use Connections/Operations in forms or kapp-level integrations instead

### WebAPIs Can Simulate Synchronous Behavior

WebAPIs expose workflows as REST endpoints. You can pass a timeout parameter to make them "act" synchronously, but the response time depends on engine load. See the WebAPIs and Webhooks skill for details.

### Bulk Submission Considerations

- **Mass Submit** (CSV via UI or API POST) — submissions ARE validated and DO trigger workflows. Plan for workflow backlog when bulk-submitting.
- **Mass Import** (CSV via UI or API PATCH) — submissions are NOT validated and do NOT trigger workflows. Use for data migration and backfill.
- When migrating data, consider disabling trees temporarily or using PATCH to avoid triggering thousands of workflow runs.
