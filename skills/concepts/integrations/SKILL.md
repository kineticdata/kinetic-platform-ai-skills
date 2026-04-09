---
name: integrations
description: Connections/Operations (modern), Bridges (legacy), Handlers (workflow), and File Resources for integrating the Kinetic Platform with external systems.
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
- Connection type: HTTP (REST API) or SQL Database (PostgreSQL, MySQL, SQL Server)

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

**Note:** Operation `outputs` is an **object** (keyed by output name), not an array. Each output has a `value` field for mapping expressions. The `config.path` supports `{{variable}}` template syntax for dynamic paths (`{{Param*}}` marks required params).

**Connection auth types (observed from live API):**

| `config.auth.authType` | Fields | Use For |
|------------------------|--------|---------|
| `null` (no auth object) | `auth: null` | APIs using header-based auth via secrets, or no auth |
| `"basic"` | `username`, `password` (password always null in responses) | Basic Auth APIs |
| `"raw_bearer_token"` | `header`, `prefix`, `token` (token always null in responses) | Bearer token APIs (e.g., OpenAI) |

**Gotcha — secrets are always null in responses:** The API redacts secret values. `"secrets": {"Open API Key": null}` means a secret named "Open API Key" exists but its value is hidden. You must set secrets via POST/PUT, and they will never be readable back.

**Output mapping expression syntax:**
- `body.teams` — access response body JSON properties
- `body.teams?.length ?? 0` — null-safe access with default values (JavaScript-style)
- `current.name` — iterate over array items (used inside `children` maps for list outputs)
- `statusCode` — HTTP response status code
- Convention: outputs prefixed with `_` (like `_Error`, `_Status Code`, `_Count`, `_Exists`) are metadata outputs, not business data

### Operations

An **Operation** defines a specific action within a Connection:
- HTTP method (GET, POST, PUT, PATCH, DELETE)
- Endpoint path (relative to connection base URL)
- Input parameters (mapped from form fields or workflow context)
- Output mappings (extract values from the response)

Operations are testable from the platform UI before being used in forms or workflows.

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

## Bridges (Legacy — Non-REST Systems)

A legacy framework for real-time data lookups in forms. Use only when the target system lacks a REST API.

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

- Target system requires a Java SDK/library (no REST API)
- Existing bridge adapters are already deployed
- Common adapters: LDAP, JIRA (legacy), Kinetic Core, custom databases

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
| **Real-time capable** | Yes (forms, kapp integrations) | Yes (forms) | No (async workflows only) | Yes (file streaming) |
