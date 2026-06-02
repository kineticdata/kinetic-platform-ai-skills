---
name: integrations
description: "Use when integrating Kinetic with an external REST/SQL system or debugging one — Connections & Operations via the Integrator API ({server}/app/integrator/api, OAuth implicit grant, bare-array responses), legacy Bridges/Bridge Adapters, workflow Handlers, File Resources, LogHub, handler-import gotchas, or Kinetic Agent management."
---

# Integrations

Kinetic provides four integration mechanisms. See the Decision Frameworks skill for guidance on when to use each.

---

## Connections & Operations (Modern Default)

The current, recommended approach for integrating with external systems.

### Connections

A **Connection** represents an external system. It stores:
- Base URL
- Authentication (API Key, Bearer Token, OAuth 2.0, Basic Auth)
- Default headers
- Connection type: HTTP (REST API) or SQL Database (PostgreSQL, SQL Server)

Connections are created and managed in the Space console under Plugins > Connections.

**Integrator REST API:** Connections and Operations can also be managed programmatically via the Integrator API at `{server}/app/integrator/api`. This API uses **OAuth 2.0 implicit grant** authentication (not Basic Auth like the Core/Task APIs). See the API Basics skill for the full OAuth flow. Key endpoints:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/connections` | List all connections |
| POST | `/connections` | Create a connection |
| PUT | `/connections/{id}` | Update a connection (deep-merge credentials) |
| GET | `/connections/{id}/operations` | List operations for a connection |
| POST | `/connections/{id}/operations` | Create an operation |
| PUT | `/connections/{id}/operations/{opId}` | Update an operation |
| DELETE | `/connections/{id}/operations/{opId}` | Delete an operation |
| POST | `/connections/{id}/restart` | Restart a connection |
| POST | `/execute` | Execute an operation directly |
| GET | `/export` | Export all connections and operations |
| POST | `/import` | Import connections and operations |
| POST | `/import/validate` | Validate import payload |
| GET | `/healthz` | Health check (messaging + node process) |
| GET | `/version` | Integrator version info |
| POST | `/operations-search` | Search operations across connections |

**Important:** The Integrator API returns **bare arrays** for list endpoints (not wrapped in an object like Core API). Example: `GET /connections` returns `[{...}, {...}]`, not `{"connections": [...]}`.

**OAuth token response details:** The redirect Location header fragment contains additional metadata beyond the access token:
- `scope=full_access`
- `spaceSlug=demo`
- `displayName=...`
- `spaceAdmin=true/false`
- `email=...`
- `username=...`

This metadata can be useful for confirming the token's identity and permissions without a separate API call.

**Connection response shape:**
```json
{
  "id": "a2ffa6fa-...",
  "name": "ServiceNow Production",
  "type": "http",
  "config": { "configType": "http", "baseUrl": "https://instance.service-now.com", "auth": null, "caCert": null, "testPath": "" },
  "status": { "healthy": true, "events": [{"message": "Started", "timestamp": "...", "kind": "normal"}] },
  "secrets": {},
  "description": "",
  "documentationLink": "",
  "insertedAt": "2024-12-19T17:44:32Z",
  "lockVersion": 2,
  "updatedAt": "2024-12-19T17:44:32Z"
}
```

**Operation response shape:**
```json
{
  "id": "f865d438-...",
  "name": "Fetch Incident",
  "connectionId": "a2ffa6fa-...",
  "config": {
    "configType": "http",
    "method": "GET",
    "path": "/tables/{{table_name}}",
    "params": {},
    "headers": {},
    "body": {"form": {}, "bodyType": "www_form_urlencoded"},
    "includeEmptyParams": false,
    "followRedirect": false,
    "streamResponse": false
  },
  "outputs": {
    "Assignee": {"value": ""},
    "Description": {"value": ""},
    "Incident Number": {"value": ""}
  },
  "notes": "",
  "documentationLink": "",
  "insertedAt": "...",
  "lockVersion": 3,
  "updatedAt": "..."
}
```

**Note:** Operation `outputs` is an **object** (keyed by output name), not an array. Each output has a `value` field for mapping expressions. The `config.path` supports `{{variable}}` Mustache template syntax for dynamic paths. The asterisk-suffixed form `{{Param*}}` is one authoring convention; plain `{{Param}}` is the more common form in observed operations (the asterisk variant is uncommon). Both substitute the same way — the asterisk is part of the parameter's literal key, not a Mustache flag. See the Mustache-syntax table further down.

**Connection auth types (observed from live API):**

| `config.auth.authType` | Fields | Use For |
|------------------------|--------|---------|
| `null` (no auth object) | `auth: null` | APIs using header-based auth via secrets, or no auth |
| `"basic"` | `username`, `password` (password always null in responses) | Basic Auth APIs |
| `"raw_bearer_token"` | `header`, `prefix`, `token` (token always null in responses) | Bearer token APIs (e.g., OpenAI) |

**Gotcha — secrets are always null in responses:** The API redacts secret values. `"secrets": {"Open API Key": null}` means a secret named "Open API Key" exists but its value is hidden. You must set secrets via POST/PUT, and they will never be readable back.

**NEVER modify connection auth credentials via API.** Connection passwords (especially for the built-in "Kinetic Platform" connection) are set when the system is provisioned and should not be changed. The GET response masks passwords as `null` — if you PUT back `password: null` or a different password, you will **permanently break the connection** with no way to recover the original credentials. Only modify non-auth fields (name, description, operations) via API. Auth changes should only be done through the admin console by someone who knows the current credentials.

### Base URL strategy — bake the common path prefix into the Connection

When an external API has a stable path prefix that every endpoint shares (e.g. `/api/v1`, `/rest/api/3`, `/services/data/v59.0`), put that prefix in the Connection's `baseUrl`, not in every Operation's `path`.

**Why this matters:**
- Kinetic concatenates `connection.baseUrl + operation.config.path` to form the request URL. If the prefix is in `baseUrl`, every Operation's `path` is short and readable. If you put the prefix in each Operation, you'll repeat `/api/v1` 50 times — every typo or version bump is a global edit.
- The `testPath` field in the Connection is also relative to `baseUrl`. With the prefix baked in, `testPath` can be a meaningful health-check endpoint like `/employees/directory` rather than `/api/v1/employees/directory`.
- If a small subset of endpoints lives on a different prefix (e.g. `/api/v1_1/...` revisions), put those in a **separate Connection** rather than mixing prefixes within one. Connections are cheap.

**Examples:**

| External API | `baseUrl` | Sample Operation `path` |
|--------------|-----------|-------------------------|
| BambooHR | `https://acme.bamboohr.com/api/v1` | `/employees/{{Employee Id}}` |
| Kinetic Platform (Core API) | `https://demo.kinops.io/app/api/v1` | `/space`, `/kapps/{{Kapp Slug}}/forms` |
| ServiceNow | `https://acme.service-now.com/api/now` | `/table/incident/{{Sys Id}}` |
| Jira Cloud | `https://acme.atlassian.net/rest/api/3` | `/issue/{{Issue Key}}` |
| Salesforce | `https://acme.my.salesforce.com/services/data/v59.0` | `/sobjects/Account/{{Id}}` |

**Trailing-slash rule:** Don't put a trailing slash on `baseUrl` and always start `path` with a leading `/`. Kinetic concatenates them literally — `https://x/api/v1` + `/employees` → `https://x/api/v1/employees`. A trailing slash on baseUrl combined with a leading slash on path produces a double slash that some servers reject.

**When NOT to bake in a prefix:** APIs whose endpoints span unrelated paths (e.g. one Operation hits `/v1/users` and another hits `/internal/admin/sync`). In that case keep `baseUrl` at the host only and put the full path on each Operation.

### Operations

An **Operation** defines a specific action within a Connection:
- HTTP method (GET, POST, PUT, PATCH, DELETE)
- Endpoint path (relative to connection base URL, with `{{param}}` placeholders for path variables)
- Request body template (Mustache syntax with `{{param}}` and `{{{param}}}` for unescaped)
- Output mappings (extract values from the response using dot notation)

Operations are testable from the platform UI before being used in forms or workflows.

**Creating operations via API** (Integrator API, requires OAuth):

```
POST /app/integrator/api/connections/{connectionId}/operations
```

**Operation schema:**

```json
{
  "name": "Operation Name",
  "config": {
    "configType": "http",
    "method": "GET|POST|PUT|PATCH|DELETE",
    "path": "/your/endpoint/{{PathParam}}",
    "params": {"queryParam": "{{Query Param}}"},
    "body": {
      "bodyType": "raw",
      "raw": "Mustache template string for request body"
    },
    "headers": {"accept": "application/json", "content-type": "application/json"},
    "includeEmptyParams": false,
    "followRedirect": false,
    "streamResponse": false
  },
  "outputs": {
    "OutputName": {"value": "body.response.field"},
    "_Error": {"value": "body.error"},
    "_Status Code": {"value": "statusCode"}
  }
}
```

**Mustache template syntax for path and body:**

Standard Mustache only — no Kinetic-specific extensions. There is **no** `{{Name*}}` "required" suffix; an asterisk inside a tag is taken literally as part of the parameter name (your input would render as `Name*` in the operation's parameter list). Required-ness is derived from where the variable appears: path variables are always required; body and query variables are optional unless the operation logic enforces them.

| Syntax | Purpose | Example |
|--------|---------|---------|
| `{{Name}}` | HTML-escaped parameter value | Path: `/users/{{Username}}` |
| `{{{Name}}}` | Unescaped value (for raw JSON objects) | Body: `"data": {{{JSON Payload}}}` |
| `{{#Name}}...{{/Name}}` | Conditional block — included only when parameter has a value | Optional body fields |
| `{{^Name}}...{{/Name}}` | Inverted section — included only when parameter is empty | Default-value fallbacks |

**Output mapping expressions:**

| Expression | Purpose |
|------------|---------|
| `body.field` | Access response body JSON property |
| `body.field?.nested` | Null-safe access |
| `body.field?.length ?? 0` | Default value |
| `current.field` | Iterate array items (inside `children` maps) |
| `statusCode` | HTTP response status code |

**For list operations** (returning arrays), use `children` inside an output to iterate:

```json
"outputs": {
  "Items": {
    "value": "body.results",
    "children": {
      "Name": "current.name",
      "Id": "current.id"
    }
  }
}
```

**`children` use plain string expressions, NOT object wrappers.** Top-level outputs are objects (`{"value": "expression"}`), but `children` entries are bare strings (`"Name": "current.name"`). A common mistake is mirroring the top-level shape inside `children` — `{"Name": {"value": "current.name"}}` does not work. Stick to the asymmetry: top-level = objects with `value` key; `children` = string-to-expression map.

**The `*` suffix is part of the parameter's *key*, not a Mustache flag.** If an operation's path or body uses `{{Year*}}`, the parameter's literal key is `Year*` — every caller (workflow node parameters, form `inputMappings`, direct execute payloads) must use that exact key, asterisk included. Passing `Year` without the asterisk against a `{{Year*}}` placeholder causes a silent miss: the placeholder isn't substituted and the request goes out malformed. The reverse holds for plain placeholders — passing `Year*` against a `{{Year}}` placeholder also misses. Match whatever the operation defines. In observed operations the asterisk variant is uncommon; plain `{{Param}}` is the more frequently observed authoring choice. The asterisk convention is one way to surface required-ness in the placeholder text itself — not a platform-level requirement.

### Integrator REST API — Detailed Schema

The Integrator API (v6.1.6) is available at `/app/integrator/api/`. Most endpoints require JWT/Bearer authentication. Unprotected: `/healthz`, `/version`.

#### Connection Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/connections` | List all connections |
| POST | `/connections` | Create a connection |
| GET | `/connections/{id}` | Get a connection |
| PUT/PATCH | `/connections/{id}` | Update a connection |
| DELETE | `/connections/{id}` | Delete a connection |
| POST | `/connections/{id}/test` | Test connection (accepts optional config overrides) |
| POST | `/connections/{id}/restart` | Restart a connection |

#### Operation Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/connections/{connection_id}/operations` | List operations for a connection |
| POST | `/connections/{connection_id}/operations` | Create an operation |
| GET | `/connections/{connection_id}/operations/{id}` | Get an operation |
| PUT/PATCH | `/connections/{connection_id}/operations/{id}` | Update an operation |
| DELETE | `/connections/{connection_id}/operations/{id}` | Delete an operation |

#### Execution & Utility Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/execute` | Execute an operation (optional `?debug` query param for raw response) |
| POST | `/operations/inspect` | Detect input parameters in an operation config |
| POST | `/transform/test` | Test output transformation expressions |
| GET | `/healthz` | Health check (unprotected) |
| GET | `/version` | Build version info (unprotected) |

**Integrator API list endpoints return bare arrays.** Unlike Core API endpoints — which wrap collections in an envelope object (e.g., `{"connections": [...], "nextPageToken": "..."}`) — Integrator API list endpoints (`GET /connections`, `GET /connections/{id}/operations`, etc.) return the array directly at the top level: `[{"id": "...", "name": "..."}, ...]`. Code that assumes a wrapping object (`response.connections`) will fail; index into the response itself.

#### Connection Schema

```json
{
  "id": "uuid",
  "type": "http" | "postgres" | "mssql",
  "name": "string (required)",
  "description": "",
  "documentationLink": "",
  "config": { "configType": "http|postgres|mssql", ... },
  "secrets": {},
  "status": { "healthy": false },
  "lockVersion": 0
}
```

#### Connection Config by Type

**HTTP (`configType: "http"`):**
- `baseUrl` (required) — endpoint base address
- `testPath` — path used for connection testing
- `caCert` — trusted CA x509 certificate (optional)
- `auth` — one of:
  - `basic` — `{ authType: "basic", username, password }`
  - `raw_bearer_token` — `{ authType: "raw_bearer_token", header: "Authorization", prefix: "Bearer", token }`
  - `client_credentials` — `{ authType: "client_credentials", tokenUrl, clientId, clientSecret, clientAuth: "basic_auth"|"www_form_urlencoded", scope }`
  - `http_bearer_token` — dynamic token via a separate HTTP operation with `tokenOutput` and `expirationOutput` expressions

**PostgreSQL (`configType: "postgres"`):**
- `host`, `port`, `username`, `password`, `database` (all required)
- `poolSize` (default: 5, min: 1)
- `caCert` (optional)

**SQL Server (`configType: "mssql"`):**
- `host`, `port`, `username`, `password`, `database` (all required)
- `instance` (optional)
- `poolSize` (default: 5, min: 1)
- `caCert` (optional)

#### Operation Schema

```json
{
  "id": "uuid",
  "name": "string (required)",
  "connectionId": "uuid (required)",
  "config": { "configType": "http|postgres|mssql", ... },
  "outputs": {},
  "notes": null,
  "documentationLink": ""
}
```

#### Operation Config by Type

**HTTP (`configType: "http"`):**
- `method` (required) — `GET|POST|PUT|DELETE|PATCH`
- `path` (required) — appended to connection's `baseUrl`
- `body` — `{ bodyType: "raw", raw }` | `{ bodyType: "www_form_urlencoded", form }` | `{ bodyType: "multipart_form", parts: [{ name, content, contentType?, fileName? }] }`
- `params` — query parameters (object of string values)
- `headers` — request headers (values: string or string array)
- `followRedirect` (default: false)
- `streamResponse` (default: false)
- `includeEmptyParams` (default: false)

**PostgreSQL (`configType: "postgres"`):**
- `statement` (required) — SQL query with `$1, $2, ...` placeholders
- `parameters` — array of values bound to positional placeholders

**SQL Server (`configType: "mssql"`):**
- `statement` (required) — SQL query with `@name` placeholders
- `parameters` — object mapping named placeholders to values

#### Operation Outputs

A map of named expressions that extract values from the response:
```json
{
  "outputs": {
    "Total Count": { "value": "body.count" },
    "Items": {
      "value": "body.submissions",
      "children": {
        "Id": { "value": "id" },
        "Name": { "value": "values.Name" }
      }
    }
  }
}
```

**API schema rules:**
- `body.bodyType` must be `"raw"` — the API rejects `"json"` and `"www_form_urlencoded"`
- Do NOT include `inputs` or `outputChildren` fields — the API rejects them
- Convention: prefix metadata outputs with `_` (e.g., `_Error`, `_Status Code`, `_Count`)

#### Execute Request

```json
POST /api/execute
{
  "connectionId": "uuid (required)",
  "operationId": "uuid (use saved operation)",
  "operation": { ... },
  "parameters": { "param_name": "value" }
}
```

- Use `operationId` to run a saved operation, or inline an `operation` object.
- `parameters` provides runtime values for templated inputs.
- Add `?debug` query param for detailed response: `{ duration, outputs, raw: { statusCode, headers, body } }`.

### Common Connection + Operation Patterns

Customer Integrator usage varies widely. Some spaces have a handful of connections wired to a single SaaS. Others maintain dozens of connections and hundreds of operations as a shared catalog the React portal and workflows pull from over time. Example and demo spaces don't represent that full range — they tend to wire only what's needed for tutorials or specific patterns. The shapes below name common patterns observed across the example spaces we've examined, with brief notes on what each frequently handles. Treat this section as vocabulary; specific spaces will mix, simplify, or extend as their needs require.

**Connection types.** HTTP connections are the most common in practice, but the Integrator also supports `postgres` and `mssql` adapters (documented in the detailed schema below). When you encounter a non-HTTP connection, the `config.configType` field tells you which adapter is in play.

**Common auth patterns:**
- `basic` — username + password, frequently used to wrap API keys for SaaS that accept Basic auth
- `raw_bearer_token` — a pre-shared bearer token configured on the connection
- No `auth` block at all — endpoints where the auth secret is embedded in the URL itself (incoming-webhook URLs are the archetypal example, e.g. Slack's `https://hooks.slack.com/services/<T...>/<B...>/<token>`)

OAuth `client_credentials` and `http_bearer_token` (dynamic-token-fetch) flows are also available in the Integrator and documented in the detailed schema below. Spaces vary — pick the auth type that matches what the target system expects.

**The "library ahead of need" pattern.** In observed spaces, a large share of defined operations are referenced from no workflow and no form. That's not a sign of stale code — it's a common authoring pattern: operations get defined as a reusable catalog, callable from workflows / forms / direct `executeIntegration` calls as those callsites are built. Treat unused operations as inventory rather than dead code unless other signals (deletion comments, deprecated naming) suggest otherwise.

**Three invocation contexts.** A defined operation can be invoked from any of these:
1. **Workflows** — via the `system_integration_v1` handler (see `Usage in Workflows` below and `concepts/workflow-xml`).
2. **Forms** — via field-level `defaultResourceName` / `choicesResourceName`, or page/field event-level `integrationResourceName` (see `Usage in Forms` below).
3. **Direct `executeIntegration` calls** from React portal code — exposed at the kapp or form level (see `Kapp-Level Integrations` below and `front-end/mutations`).

The same operation can be invoked from any combination of contexts. In practice, operations often sit firmly on one side or the other (workflow OR form) rather than both — but that's a per-space tendency, not a platform constraint.

**Webhook-URL-embedded auth.** A common shape for outgoing webhook integrations: the connection has no `auth` block, and the secret is part of the connection's `baseUrl` or the operation's `path`. Slack Hooks (`hooks.slack.com/services/{team}/{channel}/{token}`) is the canonical example. The "secret in URL" approach is fine for fire-and-forget webhooks where the URL itself is the credential, but obviously not for any system that requires auth in headers.

---

### Usage in Forms

Operations appear on forms via the `integrations` array:

```json
{
  "integrations": [
    {
      "name": "Departments",
      "connectionId": "1415539c-...",
      "operationId": "7750b186-...",
      "inputMappings": {
        "Include": "attributesMap",
        "Limit [integer]": "1000",
        "Query": "name =* \"Departments::\""
      }
    }
  ]
}
```

**Populating dropdowns:**
```json
{
  "choicesDataSource": "integration",
  "choicesResourceName": "Departments",
  "choicesResourceProperty": "Teams",
  "choices": {
    "label": "${integration('Name')}",
    "value": "${integration('Slug')}"
  }
}
```

**Setting field values on change:**
```json
{
  "type": "Change",
  "action": "Set Fields",
  "integrationResourceName": "Get Team",
  "mappings": [
    { "field": "Manager", "value": "${integration('AttributesMap')['Manager']}" }
  ]
}
```

Input mappings can reference field values: `"${values('Department')}"`.

**Form-level `integrations` array is one mechanism; bundle-config aliases are another.** In some portals, forms leave the top-level `integrations` array null/empty — instead, the field-level `defaultResourceName` / `choicesResourceName` strings are aliases defined at the kapp's `bundle.config.integrations` JSX level (the React portal's globals), which maps each name to a real connection+operation pair at runtime. Walking the form JSON alone tells you *which integration names a form references*, not *which operations those names resolve to* — for the latter you need the kapp's bundle config. See `front-end/forms` and `front-end/portal-patterns` for portal-side details. The form-level `integrations` array remains a valid alternative, especially for self-contained forms whose integration use isn't shared across the kapp.

### Usage in Workflows

Operations are executed via the `system_integration_v1` handler:

```xml
<task definition_id="system_integration_v1" name="Close Submission Integrator">
    <parameters>
        <parameter id="connection">1415539c-...</parameter>
        <parameter id="operation">3ad53519-...</parameter>
        <parameter id="parameters.Core State">Closed</parameter>
        <parameter id="parameters.Submission Id*"><%= @submission['Id'] %></parameter>
    </parameters>
</task>
```

### Kapp-Level Integrations

Operations can be exposed at the kapp level with security policies. The frontend calls them via:

```
POST /integrations/kapps/{kappSlug}/forms/{formSlug}/{integrationName}
POST /integrations/kapps/{kappSlug}/{integrationName}
```

See the Mutations skill (`front-end/mutations`) for the `executeIntegration` helper.

---

## Bridges

Bridges (with their associated Models) are a coexisting integration mechanism alongside Connections + Operations — both are in active use across Kinetic Platform deployments. Bridges shine when a target system benefits from a stable typed data view (forms populating dropdowns from external data), and they're the path for non-REST sources (SQL, LDAP, file systems, Java-SDK-only systems) reached through a custom bridge adapter. The summary below covers the architecture and form-side usage; the detailed treatment — including qualification-query styles (named-structure vs Adhoc), SQL adapter gotchas, cross-form `K.api` calls, and the attachment-name extraction pattern — lives in `concepts/models/SKILL.md`.

### Architecture

```
Bridge Adapter (Java code)
  → runs on Kinetic Agent (harness)
    → Bridge (configured instance with connection info)
      → Bridge Model (data mapping + query abstraction)
        → Bridged Resource (exposed on form for permissioning)
```

### Components

**Bridge Adapter:** Java program that performs the actual integration. Installed on the Kinetic Agent.

**Bridge:** A configured instance of an adapter. Stores connection properties (URL, credentials, etc.). Created in the Space console.

**Bridge Model:** An abstraction layer that maps:
- Customer-defined data models (attributes) to the adapter's expected format
- Query qualifications (parameterized filters)
- Attribute mappings (which fields to return)

**Bridged Resource:** Exposed on a form via the `bridgedResources` array. Provides permissioning — if a user can view the form, they can execute the bridge resource.

### Usage in Forms

```json
{
  "bridgedResources": [
    {
      "name": "People",
      "model": "People",
      "qualification": "Login ID = ${values('Login ID')}",
      "attributes": ["First Name", "Last Name", "Email"]
    }
  ]
}
```

**JavaScript API:**
```javascript
K('bridgedResource[People]').load({
  attributes: ['First Name', 'Last Name'],
  values: { 'Login ID': K('field[Login ID]').value() },
  success: function(data) { /* populate fields */ },
  error: function(error) { /* handle error */ }
});
```

### When to Use

- Target system is reached through a non-REST adapter (SQL, LDAP, custom databases, Java SDK)
- A bridge for the target system already exists in your space and is the established pattern
- Form-side dropdown population would benefit from a stable model layer with declared attributes and qualifications
- Common bridge types: `kinetic-platform` (internal data — Users, Teams, datastore Submissions), SQL adapters, LDAP, and HTTP/REST sources via the Adhoc structure

---

## Handlers (Workflow-Only)

Small Ruby programs executed within workflows. Legacy for most use cases, but still needed for complex logic that can't be expressed as a single REST call.

### File Structure

```
handler/
  init.rb          ← Ruby code (initialize + execute methods)
process/
  node.xml         ← Parameters, results, configuration
  info.xml         ← System-wide config properties (info values)
test/
  simple_input.rb  ← Test variable bindings
  simple_output.xml ← Expected results
```

### Handler Code Pattern

```ruby
class KineticRequestCeUserRetrieveV1
  def initialize(input)
    # Retrieve config from node.xml
    @info_values = {}
    @parameters = {}
    # ... parse input XML
  end

  def execute
    # Perform API interaction
    # Return results as XML
    <<-RESULTS
    <results>
      <result name="Username">#{@user['username']}</result>
      <result name="Handler Error Message"></result>
    </results>
    RESULTS
  end
end
```

### Key Details

- **Class naming:** Remove underscores from ZIP filename, capitalize each word (e.g., `kinetic_request_ce_user_retrieve_v1.zip` → `KineticRequestCeUserRetrieveV1`)
- **Results in node.xml:** Only results declared in `node.xml` appear in workflow builder dropdowns. Extra results from Ruby code are returned but not discoverable.
- **Info values:** System-wide configuration (connection URLs, API keys) set during handler import in the console
- **Testing:** Use the Kinetic Test Harness for local development before uploading
- **Upload:** ZIP the handler directory and import via Task API (`POST /handlers`) or console UI

### Where Handlers Run

- **Default:** In the Kinetic Task workflow engine (server-side)
- **Agent handlers:** Execute on a remote Kinetic Agent for cross-network integrations
- **Always async:** Workflows are asynchronous — handlers are not suitable for real-time client-side interactions

### Common System Handlers

| Definition ID | Purpose |
|---------------|---------|
| `system_start_v1` | Workflow entry point |
| `system_tree_return_v1` | Return results from a routine |
| `system_integration_v1` | Execute a Connection/Operation |
| `utilities_create_trigger_v1` | Complete or update a deferred task |
| `utilities_echo_v1` | Pass-through for debugging |

---

## File Resources

Similar to Bridges but optimized for streaming files rather than data payloads.

### Architecture

```
File Adapter (installed on Agent)
  → File Resource (configured instance)
    → Streams files to the frontend
```

### Use Cases

- Displaying knowledge articles from an external CMS
- Streaming files from S3 or SharePoint
- Serving documents from legacy document management systems

### When to Use

Only when you need to stream file content from an external system into the Kinetic UI. For standard file upload/download on forms, use the built-in `attachment` field type.

---

## Integration Comparison

| Feature | Connections/Operations | Bridges | Handlers | File Resources |
|---------|----------------------|---------|----------|----------------|
| **Era** | Modern (default) | Legacy | Legacy | Specialized |
| **Use in forms** | Yes (integrations) | Yes (bridgedResources) | No | Yes |
| **Use in workflows** | Yes (system_integration_v1) | No | Yes | No |
| **Kapp-level exposure** | Yes (with security policy) | No | No | No |
| **Runs on** | Kinetic Platform | Kinetic Agent | Task Engine / Agent | Kinetic Agent |
| **Code required** | No (low-code config) | Java adapter | Ruby handler | Java adapter |
| **Supports** | REST APIs, SQL databases | Any (via adapter) | Any (via Ruby) | File streaming |

---

## LogHub API (Real-Time Logs)

The LogHub API provides access to real-time platform logs.

### Endpoint

```
GET /app/loghub/api/v1/logs?limit=25&format=ndjson&start={ISO}&end={ISO}&tail=true
```

### Authentication

Requires **Bearer JWT** (NOT Basic Auth). The JWT must be signed with the space's `oauthSigningKey` using HMAC-SHA256.

JWT payload:
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

Retrieve the signing key: `GET /app/api/v1/space?include=details` → `space.oauthSigningKey`

### Response Format

NDJSON (one JSON object per line). The last line is metadata with `nextPageToken`.

### Log Entry Fields

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
| `app.correlationId` | Request correlation ID |

### Availability

**Not available on all servers.** Check whether the LogHub endpoint exists before building features that depend on it.

---

## Handler Import & Management Gotchas

### Binary Upload Requires Raw Buffer

When uploading handler ZIPs through a Node.js proxy, the request body must be a raw `Buffer`. Using `.toString()` corrupts the ZIP file:

```js
// WRONG — corrupts binary data
const body = await req.text();

// CORRECT — preserve raw bytes
const body = Buffer.from(await req.arrayBuffer());
```

The handler import endpoint is `POST /handlers` (Task API v2) with multipart form data, field name `package`. Add `?force=true` to overwrite an existing handler.

### Connection Test Always Returns 200

`POST /connections/{id}/test` **always returns HTTP 200** — even when the connection fails. Check the `status` field in the response body:

```js
const result = await testConnection(id);
if (result.status === 'error') {
  // Connection failed — result.message has details
}
```

**`status: error` is not the same as the Connection being broken.** The test endpoint pings `baseUrl + testPath`. Two common cases produce `status: error` on a working Connection:

- **Empty `testPath` against a `/app/api/v1/` baseUrl** — the bare Core API root doesn't have a route, so the test GETs `https://.../app/api/v1/` and gets a 404. The Connection's auth and Operations still work fine when invoked. For self-pointing Connections, set `testPath` to a known-good GET endpoint (e.g., `"space"` if `baseUrl` ends at `/app/api/v1/`, or `"/space"` if it doesn't).
- **External APIs with no health endpoint at root** — same issue. Pick a no-side-effect GET that the system actually serves.

The only definitive Connection-level test is invoking a real Operation. Verified May 2026 against a self-pointing Kinetic Platform Connection: `testPath: ""` returned `status: error` even though every workflow run using the Connection's Operations succeeded with 200 responses.

### `submissions-search` requires form-level indexes on every queried field

The `POST /kapps/{kapp}/forms/{form}/submissions-search` endpoint (a common shape for Operations like "Find Vendor by Email" or "Find Submission by Ticket ID") behaves like KQL: every `values[Field]` referenced in the `q` expression must have a form-level index defined AND built. Operations that use this endpoint return 400 with `"The query requires one of the following index definitions to exist: values[<Field>]"` until the index is in place.

Kapp-level indexes don't satisfy form-level queries — and kapp-level indexes cannot reference `values[<Field>]` paths at all (they 500 with "field was not found" because kapp-level indexes are scoped to common columns like `coreState`, `createdBy`, `type`). The index must be on the form.

Setup sequence when defining a submissions-search Operation:

1. Add the field to the form's `indexDefinitions` array (e.g., `[{name: "values[Contact Email]", parts: [{path: "values[Contact Email]"}], unique: false}]`)
2. PUT the form — the index appears at `status: "New"`
3. POST a `backgroundJob` of type `"Build Index"` referencing the index name
4. Wait for the job to complete (status: `Completed`); the index is now queryable

Verified May 2026 — built a `values[Contact Email]` index on a form, then `Find by Email` Operations against it succeeded. Skipping the index build leaves the Operation broken indefinitely. Cross-reference: `kql-and-indexing/SKILL.md` documents the same rule for direct KQL queries.

### `system_integration_v1` has no `error_handling` lever

Unlike `kinetic_core_api_v1` (which has the `error_handling: Error Message | Raise Error` parameter to soft-catch handler failures), `system_integration_v1` has no equivalent. Two failure modes hit the workflow hard:

- **Output expression throws** when the response shape doesn't match what the expression accesses. If an Operation's outputs include `body.submissions[0]?.id` and the response is a 400 error body with no `submissions` field, the chained `[0]?.id` still throws `Cannot read properties of undefined (reading '0')` at the engine. The node fails with `RuntimeError`, lands in `/errors`, and halts the workflow.
- **4xx/5xx HTTP responses** from the upstream system also surface as `RuntimeError` unless every output expression is defensive enough to survive the error response shape.

**Defensive output expressions are mandatory.** Use `?.` chains on every nested access, and `??` defaults on every value that might be missing:

```js
// Brittle — throws on a 400 error body
"id": {"value": "body.submissions[0].id"}

// Defensive — returns null if anything in the chain is missing
"id": {"value": "body.submissions?.[0]?.id ?? null"}

// Count with default
"count": {"value": "body.submissions?.length ?? 0"}
```

Observed: a 400 from `/submissions-search` (pre-index) burned a workflow run when an output expression assumed the `submissions` array existed.

### Handler Properties Format Mismatch

The GET and PUT endpoints use different formats:

- **GET** `/handlers/{id}?include=properties` returns: `[{name, value, type, required}, ...]`
- **PUT** `/handlers/{id}` accepts: `{properties: {"name": "value", ...}}` (flat key-value object)

### SMTP Handler Gmail Configuration

| Property | Value |
|----------|-------|
| `server` | `smtp.gmail.com` |
| `port` | `587` |
| `tls` | `true` |
| `username` | Gmail address |
| `password` | Gmail App Password (NOT regular password) |

### Kinetic Agent CRUD

Agents are managed via the Core API:

```
GET/POST   /app/api/v1/platformComponents/agents
PUT/DELETE /app/api/v1/platformComponents/agents/{slug}
```

Body: `{ "slug": "my-agent", "url": "https://agent.example.com", "secret": "shared-secret" }`
