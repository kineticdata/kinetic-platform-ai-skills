---
name: kinetic-explain-workflow
description: Export and explain a Kinetic workflow tree in human-readable format
argument-hint: "<tree title or partial name>"
user-invocable: true
---

# Explain a Workflow Tree

The user wants to understand what a Kinetic workflow does. They provide a tree title or partial name.

## Step 1: Connect and Find the Tree

1. Connect to the Kinetic Platform using `mcp__kinetic-platform__connect`
2. Search for the tree:
   - Try `list_trees` with `source=Kinetic Request CE` to get all trees
   - Filter by the user's search term (partial match on name or title)
   - If multiple matches, show them and ask the user to pick one
3. Get tree details: `get_tree` with `include=details`

## Step 2: Export the Tree Definition

Use `export_tree` with the full tree title.

**If export fails** (known bug on some servers), fall back to `get_tree` with `include=treeJson`. The `treeJson` field contains the same node/connector data in JSON format.

## Step 3: Classify the Tree Type

Determine the type from `sourceGroup`:
- **UUID pattern** (e.g., `3d440511-d011-4167-9de4-244a6fc19974`) → **Event-triggered workflow** (fires on form submission events)
- **`WebApis > {kapp}`** → **WebAPI tree** (HTTP endpoint)
- **Other string** → **Routine** (reusable sub-workflow called by other trees)

## Step 4: Analyze and Explain

### Tree Metadata
- **Name** and full title
- **Type** (event/WebAPI/routine)
- **Trigger event** (for event trees: Created/Updated/Closed)
- **Status** (Active/Inactive)
- **Source kapp/form** (if determinable)

### Node-by-Node Walkthrough

Follow the tree from the Start node through all connectors:

1. Start at `system_start_v1` (id="start")
2. Follow `Complete` connectors to the next node(s)
3. For each node, describe:
   - **Handler** — what it does (email, API call, wait, echo, return, etc.)
   - **Parameters** — key configuration values (with ERB expressions decoded)
   - **Deferral** — if the node defers (waits), note the duration
4. Note branching: multiple connectors from one node = conditional branching
   - Connector `value` = Ruby condition expression
   - Empty value = unconditional (always fires)
5. Note `Create` connectors (fire on deferral entry) vs `Complete` (fire after finish)

### Error Handling
- Does the tree have error handling nodes?
- Any `error_handling` parameters set to "Raise Error" vs "Error Message"?

### Return Values
- For WebAPI trees: what does the Return node output? (`content`, `content_type`, `response_code`)
- For event trees: what status/description does it return?

## Step 5: Generate Output

### Summary
A 2-3 sentence plain-English description of what the workflow does.

### Flow Diagram
ASCII diagram showing the execution path:

```
[Start]
   │
   ▼
[Build Email Body] (echo)
   │ input: "Hello <%= @values['Name'] %>"
   │
   ▼
[Send Notification] (smtp_email_send)
   │ to: <%= @values['Email'] %>
   │ subject: "Your request has been received"
   │
   ▼
[Update Status] (kinetic_core_api_v1)
   │ PUT /submissions/<%= @source['Id'] %>
   │ body: {"values":{"Status":"Notified"}}
   │
   ▼
[Done] (tree_return)
   └─ status: "Complete"
```

### Potential Issues
Flag any concerns:
- Missing error handling
- Hardcoded values that should be dynamic
- Duplicate node ID suffixes
- Wrong Return node parameter set for the tree type
- Deferrable nodes missing Create/Update message types

### Handler Reference
List each handler used with a link to its definition:
```
Handlers used:
  - system_start_v1 (Start node)
  - utilities_echo_v1 (String builder)
  - smtp_email_send_v1 (Email sender)
  - system_tree_return_v1 (Return/complete)
```
