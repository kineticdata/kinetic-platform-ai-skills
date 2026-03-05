---
name: template-provisioning
description: Template export/import structure, install.rb provisioning scripts, connection/operation JSON schema, and environment bootstrap patterns for the Kinetic Platform.
---

# Template Provisioning

---

## Template Directory Structure

A Kinetic project template contains exported platform configuration and an installation script:

```
template/
├── export/
│   ├── core/                          # Core API exports (space, kapps, forms, teams)
│   │   ├── space.json                 # Space definition (attributes, security policies, display settings)
│   │   └── space/
│   │       ├── spaceAttributeDefinitions.json
│   │       ├── userAttributeDefinitions.json
│   │       ├── userProfileAttributeDefinitions.json
│   │       ├── teamAttributeDefinitions.json
│   │       ├── securityPolicyDefinitions.json
│   │       ├── models/                # Bridge models
│   │       │   └── Users.json
│   │       ├── teams/                 # Team definitions (one file per team)
│   │       │   ├── Departments.json
│   │       │   ├── Departments-IT.json
│   │       │   └── Information Technology.json
│   │       ├── kapps/
│   │       │   ├── {kapp-slug}.json   # Kapp definition
│   │       │   └── {kapp-slug}/
│   │       │       ├── categories.json
│   │       │       ├── categoryAttributeDefinitions.json
│   │       │       ├── formAttributeDefinitions.json
│   │       │       ├── formTypes.json
│   │       │       ├── kappAttributeDefinitions.json
│   │       │       ├── securityPolicyDefinitions.json
│   │       │       └── forms/
│   │       │           ├── {form-slug}.json       # Form definition (fields, events, integrations)
│   │       │           └── {form-slug}/
│   │       │               └── workflows/
│   │       │                   └── submission-submitted/
│   │       │                       └── {workflow-name}.json
│   │       └── workflows/             # Space-level workflows
│   │           └── {event}/
│   │               └── {name}.json
│   ├── task/                          # Task API exports (workflows, handlers, sources)
│   │   ├── handlers/
│   │   │   └── {definition_id}.zip    # Handler packages
│   │   ├── sources/
│   │   │   ├── {source-name}.json     # Source definitions
│   │   │   └── {source-name}/
│   │   │       └── trees/
│   │   │           └── {tree-name}.xml
│   │   ├── routines/
│   │   │   └── {routine-name}.xml     # Global routines
│   │   ├── categories/
│   │   │   └── {category-name}.json
│   │   └── policyRules/
│   │       └── {rule-name}.json
│   └── integrator/                    # Integrator exports (connections, operations)
│       └── connections.json           # All connections with nested operations
├── tooling/
│   ├── Gemfile                        # Ruby dependencies (kinetic_sdk, deep_merge)
│   └── integrator.rb                  # Connection install/export helpers
└── install.rb                         # Main provisioning script
```

---

## install.rb — Provisioning Script

The install script provisions a new space from template exports. It receives a JSON configuration string as a CLI argument.

### Configuration JSON Structure

```json
{
  "core": {
    "api": "http://localhost:8080/kinetic/app/api/v1",
    "proxy_url": "http://localhost:8080/kinetic/foo/app/components",
    "server": "http://localhost:8080/kinetic",
    "space_slug": "foo",
    "space_name": "Foo",
    "service_user_username": "service_user_username",
    "service_user_password": "secret"
  },
  "task": {
    "api_v2": "http://localhost:8080/kinetic-task/app/api/v2",
    "component_type": "task",
    "server": "http://localhost:8080/kinetic-task",
    "space_slug": "foo",
    "signature_secret": "1234asdf5678jkl;"
  },
  "http_options": {
    "oauth_client_id": "my-oauth-id",
    "oauth_client_secret": "my-oauth-secret",
    "log_level": "info",
    "gateway_retry_limit": 5,
    "gateway_retry_delay": 1.0,
    "ssl_ca_file": "/app/ssl/tls.crt",
    "ssl_verify_mode": "peer"
  },
  "data": {
    "requesting_user": {
      "username": "joe.user",
      "displayName": "Joe User",
      "email": "joe.user@google.com"
    },
    "users": [{ "username": "joe.user" }],
    "space": {
      "attributesMap": {
        "Platform Host URL": ["http://localhost:8080"]
      }
    },
    "handlers": {
      "kinetic_core_system_api_v1": {
        "api_username": "admin",
        "api_password": "password",
        "api_location": "http://localhost:8080/app/api/v1"
      }
    },
    "smtp": {
      "server": "smtp.gmail.com",
      "port": "587",
      "tls": "true",
      "username": "user@gmail.com",
      "password": "secret",
      "from_address": "noreply@example.com"
    }
  }
}
```

### Installation Phases

The install script runs in four sequential phases:

#### Phase 1: Core (Space, Kapps, Forms, Teams)

```ruby
space_sdk = KineticSdk::Core.new({
  space_server_url: vars["core"]["server"],
  space_slug: vars["core"]["space_slug"],
  username: vars["core"]["service_user_username"],
  password: vars["core"]["service_user_password"],
  options: http_options.merge({ export_directory: "#{core_path}" }),
})

# Clean precreated artifacts
(space_sdk.find_kapps.content["kapps"] || []).each do |kapp|
  space_sdk.delete_kapp(kapp["slug"])
end
space_sdk.delete_space_security_policy_definitions

# Import space (reads from export_directory/space.json and space/ subdirectory)
space_sdk.import_space(vars["core"]["space_slug"])

# Set environment-specific space attributes
space_sdk.update_space({
  "attributesMap" => {
    "Web Server Url" => [vars["core"]["server"]],
  }.merge(vars_space_attributes_map),
  "name" => vars["core"]["space_name"],
})

# Create additional users
(vars["data"]["users"] || []).each { |user| space_sdk.add_user(user) }
```

#### Phase 2: Task (Handlers, Sources, Routines, Trees)

```ruby
task_sdk = KineticSdk::Task.new({
  app_server_url: "#{vars["core"]["proxy_url"]}/task",
  username: vars["core"]["service_user_username"],
  password: vars["core"]["service_user_password"],
  options: http_options.merge({ export_directory: "#{task_path}" }),
})

# Clean playground data
task_sdk.delete_categories
task_sdk.delete_groups
task_sdk.delete_users
task_sdk.delete_policy_rules

# Import access keys (conditional create/update)
Dir["#{task_path}/access-keys/*.json"].each do |file|
  access_key = JSON.parse(File.read(file))
  not_installed = task_sdk.find_access_key(access_key["identifier"]).status == 404
  access_key["secret"] = "SETME"
  not_installed ?
    task_sdk.add_access_key(access_key) :
    task_sdk.update_access_key(access_key["identifier"], access_key)
end

# Import in dependency order
task_sdk.import_groups
task_sdk.import_handlers(true)          # force overwrite
task_sdk.import_policy_rules

# Import sources with environment-specific properties
Dir["#{task_path}/sources/*.json"].each do |file|
  source = JSON.parse(File.read(file))
  not_installed = task_sdk.find_source(source["name"]).status == 404
  source["properties"] = task_source_properties[source["name"]] || {}
  not_installed ? task_sdk.add_source(source) : task_sdk.update_source(source)
end

# Configure handler info values (SMTP, API credentials)
task_sdk.find_handlers.content["handlers"].each do |handler|
  if handler_configs.has_key?(handler["definitionId"])
    task_sdk.update_handler(handler["definitionId"], {
      "properties" => handler_configs[handler["definitionId"]],
    })
  end
end

# Set engine properties
task_sdk.update_engine({
  "Max Threads" => "5",
  "Sleep Delay" => "1",
  "Trigger Query" => "'Selection Criterion'=null",
})

# Import routines, categories, trees (order matters)
task_sdk.import_routines(true)
task_sdk.import_categories
task_sdk.import_trees(true)

# Import Core API workflows (space/kapp/form-level)
space_sdk.import_workflows(core_path)
```

#### Phase 3: Integrator (Connections and Operations)

```ruby
integrator_sdk = KineticSdk::Integrator.new({
  space_server_url: vars["core"]["server"],
  space_slug: vars["core"]["space_slug"],
  username: vars["core"]["service_user_username"],
  password: vars["core"]["service_user_password"],
  options: http_options.merge({
    export_directory: "#{integrator_path}",
    oauth_client_id: vars["core"]["service_user_username"],
    oauth_client_secret: vars["core"]["service_user_password"],
  }),
})

# Install connections with nested operations from connections.json
install_connections(integrator_sdk, integrator_path)

# Configure environment-specific connection credentials
integrator_sdk.find_connections.content.each do |connection|
  if connection_configs.has_key?(connection["name"])
    integrator_sdk.update_connection(connection["id"],
      connection.deep_merge!(connection_configs[connection["name"]])
    )
  end
end
```

#### Phase 4: Template-Specific (Users, Seed Data)

```ruby
# Create requesting user with random password
if vars["data"]["requesting_user"]
  space_sdk.add_user({
    "username" => vars["data"]["requesting_user"]["username"],
    "email" => vars["data"]["requesting_user"]["email"],
    "displayName" => vars["data"]["requesting_user"]["displayName"],
    "password" => KineticSdk::Utils::Random.simple(16),
    "enabled" => true,
    "spaceAdmin" => true,
    "memberships" => [],
    "profileAttributesMap" => {},
  })
end
```

---

## Connection/Operation JSON Schema

The `connections.json` file contains an array of connections, each with nested operations:

```json
[
  {
    "id": "uuid-string",
    "name": "Kinetic Platform",
    "type": "HTTP",
    "config": {
      "configType": "http",
      "baseUrl": "https://update.me",
      "auth": {
        "authType": "basic",
        "username": "changeit",
        "password": "changeit"
      }
    },
    "operations": [
      {
        "id": "uuid-string",
        "name": "Get Team",
        "notes": "",
        "config": {
          "path": "/app/api/v1/teams/{{Slug}}",
          "params": { "include": "attributesMap" },
          "body": null,
          "headers": {},
          "method": "GET"
        },
        "outputs": [
          {
            "name": "Name",
            "expression": "body.team?.name"
          },
          {
            "name": "Slug",
            "expression": "body.team?.slug"
          },
          {
            "name": "AttributesMap",
            "expression": "body.team?.attributesMap"
          }
        ]
      }
    ]
  }
]
```

### Operation Config

| Field | Description |
|-------|-------------|
| `path` | URL path relative to connection `baseUrl`. Supports `{{Variable Name}}` template variables |
| `method` | HTTP method: `GET`, `POST`, `PUT`, `PATCH`, `DELETE` |
| `params` | Query string parameters |
| `body` | Request body (JSON string or null) |
| `headers` | Additional headers |

### Template Variables

Input parameters use double-brace syntax in paths and body: `{{Variable Name}}`. These are mapped from form fields via `inputMappings` on the form's integration definition.

### Output Mappings

Each output has a `name` and a JavaScript `expression` that extracts values from the response:

```json
// Simple property access
{ "name": "Name", "expression": "body.team?.name" }

// Nested property with optional chaining
{ "name": "Manager", "expression": "body.team?.attributesMap?.Manager?.[0]" }

// Collection transform — returns array of mapped objects
{
  "name": "Teams",
  "expression": "body.teams",
  "children": [
    { "name": "Name", "expression": "current.name" },
    { "name": "Slug", "expression": "current.slug" }
  ]
}

// Submission values access
{ "name": "Status", "expression": "body.submission['values']['Status']" }
```

The `children` property transforms each item in a collection. Inside children, `current` references the current array element.

---

## Workflow JSON Format (Core API Workflows)

Form-level workflows exported via the Core API use a JSON format (distinct from the Task API XML format):

```json
{
  "builderVersion": "",
  "schemaVersion": "1.0",
  "version": "",
  "processOwnerEmail": "",
  "lastId": 23,
  "name": "IT Support Request Submitted",
  "notes": "",
  "connectors": [
    {
      "from": "start",
      "to": "utilities_echo_v1_18",
      "label": "",
      "value": "",
      "type": "Complete"
    }
  ],
  "nodes": [
    {
      "id": "start",
      "name": "Start",
      "definitionId": "system_start_v1",
      "configured": true,
      "defers": false,
      "deferrable": false,
      "visible": false,
      "version": 1,
      "position": { "x": 10, "y": 10 },
      "parameters": [],
      "messages": [],
      "dependents": {
        "task": [
          { "label": "", "type": "Complete", "value": "", "content": "next_node_id" }
        ]
      }
    }
  ]
}
```

Key differences from Task API XML:
- `connectors` array (flat list of from/to pairs) replaces nested `<dependents>` XML
- `nodes` array replaces `<task>` elements
- `parameters` is an array of objects instead of XML elements
- `position` replaces `x`/`y` attributes
- Stored under `forms/{slug}/workflows/{event}/{name}.json`

---

## Export Tooling

The `tooling/integrator.rb` helper handles connection/operation export with sanitization:

```ruby
def export_connections(integrator_sdk, integrator_path)
  connections = []
  integrator_sdk.find_connections.content.each do |connection|
    operations = integrator_sdk.find_operations(connection["id"]).content
    operations = operations.map { |op| sanitize_exported_operation(op) }
    connection = sanitize_exported_connection(connection)
    connection["operations"] = operations
    connections << connection
  end
  File.write(File.join(integrator_path, "connections.json"), JSON.pretty_generate(connections))
end
```

**Sanitization removes:**
- Metadata fields: `insertedAt`, `updatedAt`, `lockVersion`, `status`
- HTTP connections: `baseUrl` → `"https://update.me"`, credentials → `"changeit"`

This ensures exported templates don't contain environment-specific secrets.

---

## Task Source Properties

Sources require environment-specific configuration during installation:

```ruby
task_source_properties = {
  "Kinetic Request CE" => {
    "Space Slug" => nil,
    "Web Server" => vars["core"]["server"],
    "Proxy Username" => vars["core"]["service_user_username"],
    "Proxy Password" => vars["core"]["service_user_password"],
  },
}
```

The `"Kinetic Request CE"` source is used by all kapp/form-level trees. Its properties tell the workflow engine how to call back to the Core API.

---

## SMTP Handler Configuration

The `smtp_email_send` handler requires info values for the SMTP server:

```ruby
{
  "smtp_email_send" => {
    "server" => "smtp.gmail.com",
    "port" => "587",
    "tls" => "true",
    "username" => "user@gmail.com",
    "password" => "secret"
  }
}
```

All handlers matching `smtp_email_send*` (including versioned variants like `smtp_email_send_v1`) get the same configuration.

---

## Import Order Dependencies

Artifacts must be imported in a specific order due to cross-references:

1. **Space definition** (creates kapps, forms, teams, attribute definitions)
2. **Task groups** (referenced by policy rules)
3. **Task handlers** (referenced by routines and trees)
4. **Task policy rules** (security for task API access)
5. **Task sources** (referenced by trees)
6. **Task routines** (referenced by trees)
7. **Task categories** (organizational)
8. **Task trees** (depend on handlers, sources, routines)
9. **Core API workflows** (form-level workflows, depend on core space being imported)
10. **Integrator connections and operations** (standalone, but forms reference operation IDs)

---

## Tooling Gemfile

```ruby
# template/tooling/Gemfile
source "https://rubygems.org"

gem "deep_merge"
gem "kinetic_sdk"
```

Run `bundle install` in the tooling directory before executing the install script. The install script handles this automatically:

```ruby
Dir.chdir(tooling_path) { system("bundle", "install") }
```
