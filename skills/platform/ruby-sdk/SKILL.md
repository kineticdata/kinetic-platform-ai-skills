---
name: ruby-sdk
description: Kinetic Ruby SDK (kinetic_sdk gem) for environment provisioning, data migrations, and scripted administration of Core, Task, and Integrator APIs.
---

# Kinetic Ruby SDK

The `kinetic_sdk` gem provides Ruby clients for automating Kinetic Platform operations — environment provisioning, data migrations, bulk operations, and scripted administration.

---

## Clients

| Client | Class | API | Base URL Pattern |
|--------|-------|-----|-----------------|
| Core | `KineticSdk::Core` | v1 | `{server}/{space_slug}/app/api/v1` |
| Task | `KineticSdk::Task` | v2 | `{server}/app/api/v2` |
| Integrator | `KineticSdk::Integrator` | v1 | `{server}/app/integrator/api` |
| Agent | `KineticSdk::Agent` | v1 | `{server}/app/api/v1` |
| Bridgehub | `KineticSdk::Bridgehub` | v1 | `{server}/app/manage-api/v1` |
| Filehub | `KineticSdk::Filehub` | v1 | `{server}/app/api/v1` |
| Discussions | `KineticSdk::Discussions` | v1 | JWT-authenticated |

Core, Task, and Integrator are the most commonly used for provisioning and migrations.

---

## Initialization

### Core SDK — Space User

```ruby
space_sdk = KineticSdk::Core.new({
  space_server_url: "https://myspace.kinops.io",
  space_slug: "myspace",
  username: "admin",
  password: "secret",
  options: {
    log_level: "info",
    export_directory: "/path/to/exports/core",
  },
})
```

### Core SDK — System User (No Space)

```ruby
system_sdk = KineticSdk::Core.new({
  app_server_url: "http://localhost:8080/kinetic",
  username: "configuration-user",
  password: "password",
  options: { log_level: "info" },
})
```

### Task SDK

```ruby
task_sdk = KineticSdk::Task.new({
  app_server_url: "#{proxy_url}/task",
  username: "admin",
  password: "secret",
  options: {
    log_level: "info",
    export_directory: "/path/to/exports/task",
  },
})
```

### Integrator SDK

```ruby
integrator_sdk = KineticSdk::Integrator.new({
  space_server_url: "https://myspace.kinops.io",
  space_slug: "myspace",
  username: "admin",
  password: "secret",
  options: {
    export_directory: "/path/to/exports/integrator",
    oauth_client_id: "admin",
    oauth_client_secret: "secret",
  },
})
```

The Integrator SDK uses JWT bearer tokens for space-level access. `oauth_client_id` and `oauth_client_secret` are required in options.

### Common Options

| Option | Default | Description |
|--------|---------|-------------|
| `log_level` | `"off"` | `off`, `error`, `warn`, `info`, `debug` |
| `log_output` | `"STDOUT"` | `STDOUT` or `STDERR` |
| `max_redirects` | `5` | Max HTTP redirects to follow |
| `gateway_retry_limit` | `5` | Retries on gateway errors (502/503/504) |
| `gateway_retry_delay` | `1.0` | Seconds between retries |
| `ssl_verify_mode` | `"none"` | `none` or `peer` |
| `ssl_ca_file` | `nil` | PEM certificate path for SSL verification |
| `export_directory` | `nil` | Directory for import/export operations |

---

## Response Object

All methods return a `KineticHttpResponse`:

```ruby
response = space_sdk.find_kapps
response.status         # => 200  (integer)
response.code           # => "200" (string)
response.content        # => { "kapps" => [...] }  (parsed JSON hash)
response.content_string # => raw JSON string
response.message        # => "OK"
response.headers        # => response headers hash
response.exception      # => StandardError or nil
```

---

## Core SDK — Key Methods

### Space

```ruby
space_sdk.find_space(params)                           # GET space
space_sdk.update_space(body)                            # PUT space
space_sdk.export_space                                  # Export full space to export_directory
space_sdk.import_space(slug)                            # Import from export_directory
space_sdk.add_space_attribute(name, value)              # Add/update attribute
```

### Kapps

```ruby
space_sdk.add_kapp(name, slug, properties)              # Create kapp
space_sdk.find_kapps(params)                            # List kapps
space_sdk.find_kapp(slug, params)                       # Get kapp
space_sdk.update_kapp(slug, properties)                 # Update kapp
space_sdk.delete_kapp(slug)                             # Delete kapp
```

### Forms

```ruby
space_sdk.add_form(kapp_slug, properties)               # Create form
space_sdk.find_forms(kapp_slug, params)                 # List forms
space_sdk.find_form(kapp_slug, form_slug, params)       # Get form
space_sdk.update_form(kapp_slug, form_slug, properties) # Update form
space_sdk.delete_form(kapp_slug, form_slug)             # Delete form
```

### Submissions

```ruby
# Create
space_sdk.add_submission(kapp_slug, form_slug, payload)
# payload: { "values" => { "Field" => "value" } }

# Search with KQL
space_sdk.search_submissions(kapp_slug, form_slug, { "q" => 'values[Status]="Active"', "include" => "values" })

# Find by form (paginated)
space_sdk.find_form_submissions(kapp_slug, form_slug, { "include" => "values", "limit" => 25 })

# Find ALL (auto-paginates — memory intensive for large datasets)
space_sdk.find_all_form_submissions(kapp_slug, form_slug, { "include" => "values" })

# Single submission
space_sdk.find_submission(submission_id, { "include" => "details,values" })

# Patch (no validations, no webhooks — ideal for migrations)
space_sdk.patch_new_submission(kapp_slug, form_slug, {
  "values" => { "Field" => "value" },
  "coreState" => "Submitted",
  "createdAt" => "2026-01-15T10:30:00.000Z",
  "createdBy" => "admin",
  "updatedAt" => "2026-01-15T10:30:00.000Z",
  "updatedBy" => "admin",
  "submittedAt" => "2026-01-15T10:30:00.000Z",
  "submittedBy" => "admin",
})

# Delete
space_sdk.delete_submission(submission_id)
```

### Users

```ruby
space_sdk.add_user({
  "username" => "jane.doe",
  "email" => "jane@example.com",
  "displayName" => "Jane Doe",
  "password" => KineticSdk::Utils::Random.simple(16),
  "enabled" => true,
  "spaceAdmin" => false,
  "memberships" => [],
  "profileAttributesMap" => {},
})
space_sdk.find_users(params)
space_sdk.find_user(username, params)
space_sdk.update_user(username, properties)
space_sdk.delete_user({ "username" => username })
```

### Teams

```ruby
space_sdk.add_team({ "name" => "IT Support", "slug" => "it-support" })
space_sdk.find_teams(params)
space_sdk.find_team(team_name, params)
space_sdk.update_team(team_name, properties)
space_sdk.delete_team(team_name)
space_sdk.add_team_membership(team_name, username)
space_sdk.remove_team_membership(team_name, username)
```

### Webhooks

```ruby
space_sdk.add_webhook_on_kapp(kapp_slug, {
  "name" => "Submission Submitted",
  "event" => "Submission Submitted",
  "filter" => "",
  "url" => callback_url,
})
```

### Workflows

```ruby
space_sdk.export_workflows                              # Export to export_directory
space_sdk.import_workflows(export_path)                 # Import from path
space_sdk.find_kapp_workflows(kapp_slug, params)
space_sdk.find_form_workflows(kapp_slug, form_slug, params)
```

---

## Task SDK — Key Methods

### Trees and Routines

```ruby
task_sdk.find_trees(params)                             # List trees
task_sdk.import_trees(force_overwrite = false)           # Import from export_directory
task_sdk.import_tree(file_path, force_overwrite)         # Import single tree
task_sdk.delete_tree(tree_title)                         # Delete tree
task_sdk.delete_trees(source_name)                       # Delete all trees (optionally by source)

task_sdk.find_routines(params)                          # List routines
task_sdk.import_routines(force_overwrite = false)        # Import from export_directory
```

### Handlers

```ruby
task_sdk.find_handlers(params)                          # List handlers
task_sdk.find_handler(definition_id, params)            # Get handler
task_sdk.import_handlers(force_overwrite = false)        # Import from export_directory
task_sdk.import_handler(file_path, force_overwrite)      # Import single handler ZIP
task_sdk.update_handler(definition_id, { "properties" => info_values })
task_sdk.export_handlers                                # Export all to export_directory
```

### Sources

```ruby
task_sdk.add_source(source_hash)
task_sdk.find_sources(params)
task_sdk.find_source(name, params)
task_sdk.update_source(source_hash)
task_sdk.delete_source(name)
task_sdk.import_sources                                 # Import from export_directory
task_sdk.export_sources                                 # Export to export_directory
```

### Runs

```ruby
task_sdk.find_runs({ "include" => "details", "limit" => 25 })
task_sdk.delete_run(run_id)
```

### Categories, Groups, Policy Rules

```ruby
task_sdk.import_categories
task_sdk.import_groups
task_sdk.import_policy_rules
task_sdk.delete_categories
task_sdk.delete_groups
task_sdk.delete_policy_rules
```

### Engine Configuration

```ruby
task_sdk.update_engine({
  "Max Threads" => "5",
  "Sleep Delay" => "1",
  "Trigger Query" => "'Selection Criterion'=null",
})
```

### Access Keys

```ruby
task_sdk.find_access_key(identifier)
task_sdk.add_access_key({ "identifier" => "key-id", "secret" => "secret" })
task_sdk.update_access_key(identifier, properties)
```

---

## Integrator SDK — Key Methods

### Connections

```ruby
integrator_sdk.add_connection(properties)
integrator_sdk.find_connections(params)
integrator_sdk.find_connection(connection_id, params)
integrator_sdk.update_connection(connection_id, properties)
integrator_sdk.delete_connection(connection_id)
```

### Operations

```ruby
integrator_sdk.add_operation(connection_id, properties)
integrator_sdk.find_operations(connection_id, params)
integrator_sdk.find_operation(connection_id, operation_id, params)
integrator_sdk.update_operation(connection_id, operation_id, properties)
integrator_sdk.delete_operation(connection_id, operation_id)
integrator_sdk.execute_operation(connection_id, operation_id, parameters)
```

---

## Common Migration Patterns

### Bulk Data Migration with Patch

Use `patch_new_submission` to import historical data with preserved timestamps:

```ruby
records.each_with_index do |record, i|
  response = space_sdk.patch_new_submission(kapp_slug, form_slug, {
    "values" => record["values"],
    "coreState" => "Submitted",
    "createdAt" => record["createdAt"],
    "createdBy" => record["createdBy"] || "migration",
    "updatedAt" => record["updatedAt"] || record["createdAt"],
    "updatedBy" => record["updatedBy"] || "migration",
    "submittedAt" => record["submittedAt"] || record["createdAt"],
    "submittedBy" => record["submittedBy"] || "migration",
  })
  puts "#{i + 1}/#{records.length} - #{response.status}" if (i + 1) % 100 == 0
end
```

PATCH does not trigger validations or webhooks — ideal for migrations.

### Export and Re-Import Between Environments

```ruby
# Export from source
source_sdk = KineticSdk::Core.new(source_config)
source_sdk.export_space

# Import to target
target_sdk = KineticSdk::Core.new(target_config)
target_sdk.import_space(space_slug)
```

### Paginated Data Collection

```ruby
def collect_all_submissions(sdk, kapp, form, params = {})
  all = []
  params = { "include" => "details,values", "limit" => "500" }.merge(params)
  loop do
    response = sdk.find_form_submissions(kapp, form, params)
    submissions = response.content["submissions"] || []
    all.concat(submissions)
    break unless response.content["nextPageToken"]
    params["pageToken"] = response.content["nextPageToken"]
  end
  all
end
```

Remember: Core API has a 1000-record cap per query window. For forms with >1000 submissions, use keyset pagination with `createdAt` filters (see the Pagination skill).

### Conditional Create/Update

```ruby
response = task_sdk.find_source(name)
if response.status == 404
  task_sdk.add_source(source_hash)
else
  task_sdk.update_source(source_hash)
end
```

### Bulk Handler Configuration

```ruby
handler_configs = {
  "smtp_email_send" => {
    "server" => "smtp.gmail.com",
    "port" => "587",
    "tls" => "true",
    "username" => "user@gmail.com",
    "password" => "secret",
  },
  "kinetic_core_system_api_v1" => {
    "api_username" => "admin",
    "api_password" => "password",
    "api_location" => "http://localhost:8080/app/api/v1",
  },
}

task_sdk.find_handlers.content["handlers"].each do |handler|
  id = handler["definitionId"]
  if handler_configs.has_key?(id)
    task_sdk.update_handler(id, { "properties" => handler_configs[id] })
  elsif id.start_with?("smtp_email_send")
    task_sdk.update_handler(id, { "properties" => handler_configs["smtp_email_send"] })
  end
end
```

---

## Utility Helpers

```ruby
# Generate random password
KineticSdk::Utils::Random.simple(16)        # => "a1b2c3d4e5f6g7h8"

# URL-encode tree titles for API paths
task_sdk.encode("Kinetic Request CE :: abc123 :: Submitted")

# Deep merge for nested hash updates (requires deep_merge gem)
connection.deep_merge!(overrides)
```

---

## Error Handling

```ruby
response = space_sdk.find_kapp(slug)

case response.status
when 200
  kapp = response.content["kapp"]
when 404
  puts "Not found"
when 400..499
  puts "Client error: #{response.message} - #{response.content_string}"
when 500..599
  puts "Server error: #{response.message}"
end

# Network errors
if response.exception
  puts "Exception: #{response.exception.message}"
end
```

---

## Installation

```ruby
# Gemfile
gem "kinetic_sdk"
gem "deep_merge"   # for nested hash merging in install scripts
```

```bash
bundle install
```

Or install directly:
```bash
gem install kinetic_sdk
```
