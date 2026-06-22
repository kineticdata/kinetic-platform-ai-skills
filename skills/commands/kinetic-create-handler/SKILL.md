---
name: kinetic-create-handler
description: Scaffold a new custom Kinetic Task handler — directory layout, init.rb, node.xml, info.xml, packaging script
argument-hint: "<handler-name-with-version> <one-line-description>"
user-invocable: true
---

# Create a Custom Task Handler

The user wants to write a new Task handler — a small JRuby program loaded into the Task engine that exposes node parameters, calls something (an external API, a database, a transformation), and returns results. Custom handlers are the fallback when `system_integration_v1` + Operations can't cover the use case (AWS SigV4, JCR/LDAP, custom protocols, binary streaming).

Parse the argument for: handler name (typically `vendor_action_v1` — snake_case + `_v` + version), and a one-line description.

> **Tooling:** the platform skill `platform/handler-development` is the authoritative reference for what each file means and how the engine loads handlers. This command turns that documentation into a generated, runnable scaffold.

## Step 0: Read Reference

Read **`platform/handler-development`** before generating any code. The handler model (zero dependencies, Java HttpURLConnection rather than `net/http`, ZIP packaging with specific top-level layout, info-value vs parameter distinction) is precise and unforgiving.

## Step 1: Confirm Naming

Naming conventions (enforced by the engine — wrong names load but never execute):

- **Directory name:** matches the `definitionId` (`acme_invoice_send_v1`). All lowercase, underscores, `_v{N}` suffix.
- **Class name:** PascalCase of the directory name (`AcmeInvoiceSendV1`).
- **`definitionId` in `node.xml`:** must match the directory exactly. The ZIP filename is what the import endpoint actually reads to derive the class name; rename carefully.

Ask the user for the vendor/system prefix if unclear. The class name has to be unique across all handlers installed in the target Task engine.

## Step 2: Plan Parameters and Results

For each handler, enumerate:

- **Info values** (`info.xml`) — set ONCE per environment, system-wide secrets/config. Examples: API base URL, OAuth client_id/client_secret, region. Never per-invocation.
- **Parameters** (`node.xml`) — passed in per workflow node. Examples: invoice ID, recipient email, action type. These are ERB-evaluated at node execution time.
- **Results** (`node.xml`) — keys exposed to downstream nodes via `@results['Node Name']['Key']`. Always include `Handler Error Message` even if your handler never errors — convention saves downstream nodes from `IndexError`.

Capture the shape before generating code; renaming a result later means updating every workflow that references it.

## Step 3: Generate the Directory Layout

```
acme_invoice_send_v1/
├── handler/
│   └── init.rb              # The Ruby class
├── process/
│   ├── node.xml             # Parameters + results declarations
│   └── info.xml             # Info-value declarations
├── test/
│   ├── simple_input.rb      # Variable bindings for local testing
│   └── simple_output.xml    # Expected result XML
└── README.md                # Description + setup + usage
```

## Step 4: Generate `handler/init.rb`

```ruby
class AcmeInvoiceSendV1
  def initialize(input)
    # Parse the input XML into info_values and parameters.
    require 'rexml/document'
    doc = REXML::Document.new(input)
    @info_values = {}
    @parameters = {}
    doc.elements.each('handler/infos/info') do |item|
      @info_values[item.attributes['name']] = item.text.to_s
    end
    doc.elements.each('handler/parameters/parameter') do |item|
      @parameters[item.attributes['name']] = item.text.to_s
    end
    # Set a debug logging flag from an info value if you want a runtime toggle
    @enable_debug_logging = @info_values['enable_debug_logging'].to_s.downcase == 'true'
  end

  def execute
    # Pure logic + Java built-ins only — no Gems, no Bundler.
    java_import java.net.HttpURLConnection
    java_import java.net.URL
    java_import java.io.OutputStreamWriter
    java_import java.io.BufferedReader
    java_import java.io.InputStreamReader

    # Read parameters
    invoice_id = @parameters['invoice_id']
    base_url   = @info_values['api_base_url']
    token      = @info_values['api_token']

    # Build request
    url  = URL.new("#{base_url}/invoices/#{invoice_id}/send")
    conn = url.openConnection
    conn.setRequestMethod('POST')
    conn.setRequestProperty('Authorization', "Bearer #{token}")
    conn.setRequestProperty('Content-Type', 'application/json')
    conn.setDoOutput(true)

    body = '{}'
    writer = OutputStreamWriter.new(conn.getOutputStream)
    writer.write(body)
    writer.flush
    writer.close

    status = conn.getResponseCode
    stream = status >= 400 ? conn.getErrorStream : conn.getInputStream
    reader = BufferedReader.new(InputStreamReader.new(stream))
    response = ''
    while (line = reader.readLine)
      response << line << "\n"
    end
    reader.close

    error_message = status >= 400 ? "HTTP #{status}: #{response}" : ''

    # Return results as XML — the engine parses this back out.
    <<~RESULTS
      <results>
        <result name="Status Code">#{status}</result>
        <result name="Response Body"><![CDATA[#{response}]]></result>
        <result name="Handler Error Message"><![CDATA[#{error_message}]]></result>
      </results>
    RESULTS
  end
end
```

> **Handler error idiom.** Catch exceptions inside `execute` and write them to `Handler Error Message` rather than letting them propagate — propagation produces `ENGINE Run Error` instead of the connector-evaluable error string downstream nodes expect.

## Step 5: Generate `process/node.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<taskDefinition id="acme_invoice_send_v1"
                name="Acme Invoice Send"
                schema_version="1.0"
                version="1">
  <author>Acme Co</author>
  <description>Send an invoice via the Acme Invoicing API.</description>

  <parameters>
    <parameter id="invoice_id" required="true" label="Invoice Id"
               tooltip="The Acme invoice identifier to send" />
  </parameters>

  <handler name="acme_invoice_send" version="1">
    <infos>
      <info name="api_base_url"></info>
      <info name="api_token"></info>
      <info name="enable_debug_logging">false</info>
    </infos>
    <parameters>
      <parameter id="invoice_id"></parameter>
    </parameters>
  </handler>

  <results format="xml">
    <result name="Status Code" />
    <result name="Response Body" />
    <result name="Handler Error Message" />
  </results>
</taskDefinition>
```

> **`<results>` declarations are load-bearing.** Only results declared here appear in the workflow builder's parameter pickers. A result returned by `init.rb` but not declared in `node.xml` is silently dropped from the picker (still readable via `@results['Node']['Key']` in ERB).

## Step 6: Generate `process/info.xml`

If your handler needs system-wide config (most do), `info.xml` declares the info-value fields the admin sets during handler import:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<info>
  <info-properties>
    <info-property id="api_base_url" required="true">
      <label>API Base URL</label>
      <tooltip>Acme Invoicing API base URL, e.g. https://api.acme.com/v1</tooltip>
    </info-property>
    <info-property id="api_token" required="true" sensitive="true">
      <label>API Token</label>
      <tooltip>Bearer token for the Acme API</tooltip>
    </info-property>
    <info-property id="enable_debug_logging" required="false">
      <label>Enable Debug Logging</label>
      <tooltip>Log request/response payloads for debugging</tooltip>
    </info-property>
  </info-properties>
</info>
```

`sensitive="true"` masks the value in the admin Console and on GET (consistent with the credential-masking pattern in `concepts/integrations`).

## Step 7: Generate `test/simple_input.rb` and `test/simple_output.xml`

The Test Harness reads `simple_input.rb` to compose the synthetic XML input for `init.rb`:

```ruby
# test/simple_input.rb
@info_values['api_base_url']        = 'https://staging.api.acme.com/v1'
@info_values['api_token']           = 'TEST_TOKEN_REPLACE_ME'
@info_values['enable_debug_logging'] = 'true'

@parameters['invoice_id'] = 'INV-12345'
```

`simple_output.xml` carries the expected results (used for regression diffs, not enforced — the harness just shows you actual vs expected):

```xml
<results>
  <result name="Status Code">200</result>
  <result name="Response Body"><![CDATA[{"id":"INV-12345","sent":true}]]></result>
  <result name="Handler Error Message"><![CDATA[]]></result>
</results>
```

## Step 8: Generate `README.md`

```markdown
# acme_invoice_send_v1

Send an Acme invoice via the Acme Invoicing API.

## Parameters

| Name        | Required | Description                          |
| ----------- | -------- | ------------------------------------ |
| invoice_id  | yes      | The Acme invoice identifier to send  |

## Info Values

| Name                  | Required | Description                                        |
| --------------------- | -------- | -------------------------------------------------- |
| api_base_url          | yes      | API base URL                                       |
| api_token             | yes      | Bearer token (sensitive — masked on read)          |
| enable_debug_logging  | no       | "true" to log request/response payloads            |

## Results

| Name                   | Description                          |
| ---------------------- | ------------------------------------ |
| Status Code            | HTTP status code returned by the API |
| Response Body          | Raw response body                    |
| Handler Error Message  | Empty on success; HTTP error on fail |

## Build & Install

```bash
zip -r acme_invoice_send_v1.zip handler/ process/ test/ README.md
# Then in the Kinetic admin Console: Plugins → Handlers → Import
# Or via the Task API:
# POST {server}/app/components/task/app/api/v2/handlers (multipart, field=package)
```
```

## Step 9: Package and Provide Install Instructions

```
acme_invoice_send_v1.zip   ← the file the admin imports
```

The handler import endpoint expects multipart with field name `package`. Add `?force=true` to overwrite an existing handler of the same `definitionId`. See `api/task/handlers.md` and `platform/handler-development` for the curl shape.

## Step 10: Report

```
Generated handler: acme_invoice_send_v1
  Directory: ./acme_invoice_send_v1/
  Files:
    ✓ handler/init.rb                 (Ruby execute method)
    ✓ process/node.xml                (parameters + results)
    ✓ process/info.xml                (info values: api_base_url, api_token, enable_debug_logging)
    ✓ test/simple_input.rb            (test bindings)
    ✓ test/simple_output.xml          (expected results)
    ✓ README.md

Next steps:
  1. cd acme_invoice_send_v1 && zip -r ../acme_invoice_send_v1.zip .
  2. Import via Console (Plugins → Handlers → Import) OR
     curl -u user:pass -F package=@acme_invoice_send_v1.zip "<server>/app/components/task/app/api/v2/handlers"
  3. Set info values in the Console (Plugins → Handlers → Acme Invoice Send → Edit)
  4. Add a node to a tree with definitionId=acme_invoice_send_v1 and test via /kinetic-test-workflow
```

## Critical Rules

- **No Gems, no Bundler, no external requires beyond `rexml` and `json`.** The Task engine loads each handler in isolation; Gem support is not consistent. Use Java built-ins for HTTP, crypto, base64 (`java.util.Base64`, `javax.crypto.Mac`, etc.).
- **Class name must match the ZIP filename.** `acme_invoice_send_v1.zip` → `AcmeInvoiceSendV1`. The engine derives the class name from the filename, not from `node.xml`.
- **`definitionId` everywhere.** Directory name, `node.xml` `id`, the import filename (sans `.zip`) — all identical.
- **Catch exceptions in `execute`.** Don't let them propagate. Write the error text to `Handler Error Message` so connector expressions can branch on it.
- **`sensitive="true"` on secret info values.** Otherwise the Console shows them in plain text.
- **Test the import on a non-production engine first.** Failed handler imports can leave the engine in a half-loaded state; bouncing the Task service usually fixes it but disrupts running workflows.

## Related Skills

- `platform/handler-development` — full handler reference (HTTP patterns, auth patterns, JWT, OAuth, JSON parsing).
- `api/task/handlers.md` — the import endpoint contract.
- `concepts/workflow-xml` — how to wire your new handler into a tree's `treeJson`.
- `commands/kinetic-test-workflow` — exercise the new handler from a tree.
