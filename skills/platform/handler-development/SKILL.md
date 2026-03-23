---
name: handler-development
description: Building custom Kinetic Task handlers — zero-dependency architecture, file structure, authentication patterns, HTTP helpers, testing, packaging, and the complete handler catalog.
---

# Handler Development

Handlers are small programs that perform specific units of work within Kinetic workflows. Each handler wraps a single API call or operation, making it reusable across multiple workflow trees.

---

## Architecture: Zero Dependencies

Kinetic handlers use a **zero-dependency architecture** — no external gems, no package managers, no build tools. Everything is built on:

- **Ruby standard library** — for handler logic
- **Java built-ins** — `java.net.HttpURLConnection`, `java.net.URI`, `javax.crypto` for HTTP and crypto
- **JRuby bridge** — Ruby code calls Java classes directly via `java_import`

This design ensures handlers work on any Kinetic Task installation without dependency management.

---

## Handler File Structure

Every handler follows a strict 5-file structure across 3 directories:

```
handler-name_v1/
├── handler/
│   └── init.rb          ← Main executable (initialize + execute methods)
├── process/
│   ├── node.xml         ← Parameters, results, UI configuration
│   └── info.xml         ← System-wide config properties (info values)
└── test/
    ├── simple_input.rb  ← Test variable bindings
    └── simple_output.xml ← Expected results for validation
```

### `handler/init.rb` — The Executable

Two required methods:

```ruby
class HandlerNameV1
  def initialize(input)
    # Parse node.xml config values
    @info_values = {}
    REXML::Document.new(input).root.elements.each("handler/infos/info") do |node|
      @info_values[node.attribute("name").value] = node.text.to_s
    end

    # Parse runtime parameters
    @parameters = {}
    REXML::Document.new(input).root.elements.each("handler/parameters/parameter") do |node|
      @parameters[node.attribute("name").value] = node.text.to_s
    end
  end

  def execute
    # Perform the actual work (API call, data transformation, etc.)
    # Return results as XML string
    <<-RESULTS
    <results>
      <result name="Response Body">#{escape(@response_body)}</result>
      <result name="Handler Error Message">#{escape(@error_message)}</result>
    </results>
    RESULTS
  end
end
```

### `process/node.xml` — Parameter & Result Definitions

```xml
<?xml version="1.0" encoding="UTF-8"?>
<taskDefinition id="handler_name_v1" name="Handler Name" schema_version="1.0" version="1">
    <author>Developer Name</author>
    <description>What this handler does</description>
    <helpurl></helpurl>
    <visible>true</visible>
    <deferrable>false</deferrable>
    <parameters>
        <parameter id="method" label="Method" required="true"
                   tooltip="HTTP method" menu="GET,POST,PUT,DELETE">GET</parameter>
        <parameter id="url" label="URL" required="true"
                   tooltip="Full URL to call"></parameter>
        <parameter id="body" label="Body" required="false"
                   tooltip="Request body (for POST/PUT)" dependsOnId="method"
                   dependsOnValue="POST,PUT"></parameter>
    </parameters>
    <handler name="handler_name" version="1" />
    <results format="xml">
        <result name="Response Body" />
        <result name="Handler Error Message" />
    </results>
</taskDefinition>
```

**Key parameter attributes:**
- `menu` — comma-separated dropdown options
- `dependsOnId` / `dependsOnValue` — conditional visibility (show only when another param has a specific value)
- `required` — boolean for UI validation

### `process/info.xml` — System Configuration

```xml
<?xml version="1.0" encoding="UTF-8"?>
<taskDefinition id="handler_name_v1" name="Handler Name" schema_version="1.0" version="1">
    <author>Developer Name</author>
    <description>System configuration for handler</description>
    <helpurl></helpurl>
    <visible>false</visible>
    <deferrable>false</deferrable>
    <parameters>
        <parameter id="api_server" label="API Server" required="true"
                   tooltip="Base URL of the target API">https://api.example.com</parameter>
        <parameter id="api_token" label="API Token" required="true"
                   tooltip="Authentication token"></parameter>
    </parameters>
    <handler name="handler_name" version="1" />
    <results format="xml" />
</taskDefinition>
```

Info values are set once during handler import — they're system-wide configuration, not per-invocation parameters.

---

## HTTP Requests (Java Built-ins)

Handlers use Java's `HttpURLConnection` directly — no external HTTP libraries:

```ruby
java_import java.net.HttpURLConnection
java_import java.net.URI
java_import java.io.BufferedReader
java_import java.io.InputStreamReader
java_import java.io.OutputStreamWriter

def make_request(method, url, body = nil, headers = {})
  conn = URI.new(url).toURL.openConnection
  conn.setRequestMethod(method)
  conn.setDoOutput(true) if body

  headers.each { |k, v| conn.setRequestProperty(k, v) }

  if body
    writer = OutputStreamWriter.new(conn.getOutputStream)
    writer.write(body)
    writer.flush
    writer.close
  end

  status = conn.getResponseCode
  stream = status >= 400 ? conn.getErrorStream : conn.getInputStream
  reader = BufferedReader.new(InputStreamReader.new(stream))
  response = ""
  while (line = reader.readLine)
    response += line
  end
  reader.close

  { status: status, body: response }
end
```

---

## Authentication Patterns

### Bearer Token

```ruby
headers = { "Authorization" => "Bearer #{@info_values['api_token']}" }
```

### Basic Auth

```ruby
java_import java.util.Base64
credentials = Base64.getEncoder.encodeToString(
  "#{@info_values['username']}:#{@info_values['password']}".to_java_bytes
)
headers = { "Authorization" => "Basic #{credentials}" }
```

### JWT (HMAC-SHA256)

```ruby
java_import javax.crypto.Mac
java_import javax.crypto.spec.SecretKeySpec

def generate_jwt(payload, secret)
  header = Base64.getUrlEncoder.withoutPadding.encodeToString(
    '{"alg":"HS256","typ":"JWT"}'.to_java_bytes
  )
  claims = Base64.getUrlEncoder.withoutPadding.encodeToString(
    JSON.generate(payload).to_java_bytes
  )
  signing_input = "#{header}.#{claims}"

  mac = Mac.getInstance("HmacSHA256")
  mac.init(SecretKeySpec.new(secret.to_java_bytes, "HmacSHA256"))
  signature = Base64.getUrlEncoder.withoutPadding.encodeToString(
    mac.doFinal(signing_input.to_java_bytes)
  )

  "#{signing_input}.#{signature}"
end
```

### OAuth 2.0 Client Credentials

```ruby
def get_oauth_token
  body = "grant_type=client_credentials" \
         "&client_id=#{@info_values['client_id']}" \
         "&client_secret=#{@info_values['client_secret']}"
  result = make_request("POST", @info_values['token_url'], body,
    { "Content-Type" => "application/x-www-form-urlencoded" })
  JSON.parse(result[:body])["access_token"]
end
```

---

## Error Handling Pattern

Handlers support two error modes via the `error_handling` parameter:

### Error Message Mode (Recommended)

Returns errors as results — the workflow can branch on success/failure:

```ruby
def execute
  begin
    result = make_request("GET", url, nil, headers)
    if result[:status] >= 400
      error_message = "HTTP #{result[:status]}: #{result[:body]}"
    end
  rescue => e
    error_message = e.message
  end

  <<-RESULTS
  <results>
    <result name="Response Body">#{escape(result&.dig(:body) || "")}</result>
    <result name="Handler Error Message">#{escape(error_message || "")}</result>
  </results>
  RESULTS
end
```

Workflow connector condition for branching:
```ruby
# Success path
@results['API Call']['Handler Error Message'].to_s.empty?

# Error path
!@results['API Call']['Handler Error Message'].to_s.empty?
```

### Raise Error Mode

Throws an exception — the engine stops and creates an error record:

```ruby
if @parameters['error_handling'] == "Raise Error"
  raise "HTTP #{result[:status]}: #{result[:body]}"
end
```

---

## Handler Catalog

### System Handlers (Built-in)

| Definition ID | Purpose |
|---------------|---------|
| `system_start_v1` | Workflow entry point |
| `system_tree_return_v1` | Return results (dynamic params by tree type) |
| `system_wait_v1` | Timed delay (Second/Minute/Hour/Day/Week) |
| `system_noop_v1` | No-op passthrough / merge gate |
| `system_join_v1` | Wait for multiple branches (All/Any/Some) |
| `system_junction_v1` | Smart branch convergence |
| `system_loop_head_v1` | Loop entry (parallel iterations) |
| `system_loop_tail_v1` | Loop exit |
| `system_integration_v1` | Execute Connection/Operation |

### Kinetic Core Handlers

| Definition ID | Purpose |
|---------------|---------|
| `kinetic_core_api_v1` | Generic REST API call to Kinetic Core |
| `kinetic_request_ce_submission_create_v1` | Create submission |
| `kinetic_request_ce_submission_retrieve_v1` | Retrieve submission |
| `kinetic_request_ce_submission_update_v1` | Update submission |
| `kinetic_request_ce_user_retrieve_v1` | Retrieve user |
| `kinetic_request_ce_team_retrieve_v1` | Retrieve team |
| `kinetic_request_ce_notification_template_send_v1` | Send notification from template |
| `kinetic_request_ce_attribute_values_retrieve_v1` | Retrieve attribute values |

### Utility Handlers

| Definition ID | Purpose |
|---------------|---------|
| `utilities_echo_v1` | Pass-through for debugging (param: `input`) |
| `utilities_create_trigger_v1` | Complete/update a deferred task |
| `utilities_json_to_xml_v1` | Convert JSON to XML |
| `utilities_xml_to_json_v1` | Convert XML to JSON |

### SMTP Handlers

| Definition ID | Purpose |
|---------------|---------|
| `smtp_email_send_v1` | Send email via SMTP |
| `smtp_email_with_attachment_send_v1` | Send email with attachment |

---

## Testing

### Local Testing

Use the test files to validate handler logic:

1. Edit `test/simple_input.rb` with test variable bindings
2. Run handler locally against test input
3. Compare output against `test/simple_output.xml`

### Integration Testing

Deploy to a test environment and create a simple workflow:

```
Start → Handler Under Test → Echo (output results) → Return
```

Invoke via WebAPI with `timeout=30` to see results synchronously.

---

## Packaging & Deployment

### ZIP Structure

```bash
cd handler-name_v1/
zip -r ../handler-name_v1.zip handler/ process/ test/
```

The ZIP must contain the three directories at the root level.

### Import via Task API

```
POST /app/components/task/app/api/v2/handlers
Content-Type: multipart/form-data

Field name: package
Field value: (ZIP file binary)
```

Add `?force=true` to overwrite an existing handler with the same definition ID.

### Import via Node.js

```js
const FormData = require('form-data');
const fs = require('fs');

const form = new FormData();
form.append('package', fs.createReadStream('handler-name_v1.zip'));

await fetch(`${taskApiUrl}/handlers?force=true`, {
  method: 'POST',
  headers: { 'Authorization': `Basic ${btoa(user + ':' + pass)}`, ...form.getHeaders() },
  body: form,
});
```

**Important:** Binary uploads through a Node.js proxy must use raw `Buffer` — calling `.toString()` on the body corrupts the ZIP file.

### Configure Info Values

After import, set system-wide configuration:

```
GET /handlers/{definitionId}?include=properties
→ [{ "name": "api_server", "value": "", "type": "text", "required": true }, ...]

PUT /handlers/{definitionId}
{ "properties": { "api_server": "https://api.example.com", "api_token": "secret" } }
```

Note the format difference: GET returns an array of objects, PUT accepts a flat key-value object.
