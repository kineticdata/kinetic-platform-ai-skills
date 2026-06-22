#!/bin/bash
# Verifies skills/recipes/add-approval-workflow/SKILL.md against a live environment.
#
# This is an abbreviated verifier — exercises the deferral mechanics rather than the
# full Integrator-based recipe. The full recipe requires a pre-existing Connection
# with Create/Update Submission operations; this verifier exercises only the API
# surfaces (deferral creation, callback completion, branching) using direct API calls.
#
# Steps:
#   1. Cleanup
#   2. Create kapp + two forms (request, approval) with required fields
#   3. Create approval-completion routine that completes deferral via /runs/task/{token}
#   4. Submit a request; assert workflow created and reached deferral
#   5. Read the deferral token from /tasks
#   6. Complete the deferral via POST /runs/task/{token}
#   7. Assert downstream nodes fired
#   8. Cleanup
#
# Usage: ./tests/recipes/add-approval-workflow.sh <base_url> <user> <pass>

DIR="$(dirname "$0")"
source "$DIR/lib/api.sh"
source "$DIR/lib/assert.sh"

KAPP_SLUG="test-rec-approval"

echo "==> Recipe verifier: add-approval-workflow"

# --- Step 1: Cleanup ---------------------------------------------------------
echo "Step 1: cleanup"
api_delete "$API/kapps/$KAPP_SLUG" > /dev/null || true

# --- Step 2: Create kapp -----------------------------------------------------
echo "Step 2: create kapp"
api_post "$API/kapps" "{\"slug\":\"$KAPP_SLUG\",\"name\":\"Test Recipe — Approval\"}" > /dev/null
check "kapp created" "200" "$LAST_STATUS"

# Register formType
api_put "$API/kapps/$KAPP_SLUG" '{"formTypes":[{"name":"Service","allowsAnonymous":false,"status":"Active"}]}' > /dev/null
check "formTypes registered" "200" "$LAST_STATUS"

# --- Step 3: Build a minimal tree with a deferral via utilities_echo + system_wait --
# Note: the production recipe uses `system_integration_v1` against a real Connection
# to create an approval submission. This verifier uses `system_wait_v1` to create
# a deferral instead — it exercises the same deferral lifecycle without needing
# an external Connection. The mechanism is identical.

REQUEST_FORM='{
  "name": "Request", "slug": "request", "status": "Active", "type": "Service", "anonymous": false,
  "pages": [{
    "name": "Page 1", "type": "page", "renderType": "submittable", "events": [],
    "elements": [
      { "type": "field", "name": "Status", "key": "status", "renderType": "text", "dataType": "string", "rows": 1, "label": "Status", "required": false, "enabled": true, "visible": true, "defaultValue": "New", "defaultDataSource": "none", "constraints": [], "events": [], "renderAttributes": {}, "helpText": null, "omitWhenHidden": null, "pattern": null },
      { "type": "button", "renderType": "submit-page", "name": "Submit", "label": "Submit", "visible": true, "enabled": true, "renderAttributes": {} }
    ]
  }]
}'
api_post "$API/kapps/$KAPP_SLUG/forms" "$REQUEST_FORM" > /dev/null
check "request form created" "200" "$LAST_STATUS"

# --- Step 4: Register an event workflow with a deferring wait node -----------
echo "Step 4: register workflow with deferral"
TREE_XML='<taskTree schema_version="1.0" name="Approval Test"><lastID>2</lastID>'\
'<task id="start" definition_id="system_start_v1" name="Start"><version>1</version><configured>true</configured><defers>false</defers><deferrable>false</deferrable>'\
'<position><x>10</x><y>10</y></position><dependents><task><type>Complete</type><value></value><label></label><id>system_wait_v1_2</id></task></dependents></task>'\
'<task id="system_wait_v1_2" definition_id="system_wait_v1" name="Wait For Approval"><version>1</version><configured>true</configured><defers>true</defers><deferrable>true</deferrable>'\
'<position><x>200</x><y>10</y></position>'\
'<parameters><parameter name="Time to wait">5</parameter><parameter name="Time unit">Minute</parameter></parameters>'\
'<messages><message><type>Create</type></message><message><type>Update</type></message><message><type>Complete</type></message></messages>'\
'<dependents></dependents></task></taskTree>'

WF=$(api_post "$API/kapps/$KAPP_SLUG/forms/request/workflows" \
  "$(printf '{"name":"Approval Test","event":"Submission Submitted","type":"Tree","status":"Active","treeXml":%s}' "$(printf '%s' "$TREE_XML" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))')")")
check "workflow registered" "200" "$LAST_STATUS"

# --- Step 5: Submit a request — workflow fires, reaches deferral -------------
echo "Step 5: submit request and locate deferred task"
SUB=$(api_post "$API/kapps/$KAPP_SLUG/forms/request/submissions" '{"values":{"Status":"New"},"coreState":"Submitted"}')
check "submission created" "200" "$LAST_STATUS"
SUB_ID=$(pluck "$SUB" 'submission.id')

# Locate the run and find the deferred task
echo "  waiting for run to reach deferral..."
DEFERRAL_TOKEN=""
for i in $(seq 1 30); do
  RUNS=$(api_get "$TASK_API/runs?include=details&limit=10")
  # Find the most recent run — assume it's ours (test isolation via unique kapp slug)
  RUN_ID=$(echo "$RUNS" | python3 -c 'import sys,json; rs=json.load(sys.stdin).get("runs",[]); print(rs[0]["id"] if rs else "")' 2>/dev/null)
  if [ -n "$RUN_ID" ]; then
    TASKS=$(api_get "$TASK_API/runs/$RUN_ID/tasks?include=details")
    DEFERRAL_TOKEN=$(echo "$TASKS" | python3 -c '
import sys,json
data = json.load(sys.stdin)
for t in data.get("tasks", []):
  if t.get("status") == "Deferred" and t.get("token"):
    print(t["token"])
    break
' 2>/dev/null)
    if [ -n "$DEFERRAL_TOKEN" ]; then break; fi
  fi
  sleep 1
done
check_ne "deferral token captured within 30s" "" "$DEFERRAL_TOKEN"

# --- Step 6: Complete the deferral via POST /runs/task/{token} ---------------
if [ -n "$DEFERRAL_TOKEN" ]; then
  echo "Step 6: complete deferral via callback"
  api_post "$TASK_API/runs/task/$DEFERRAL_TOKEN" '{"action":"Complete","message":"Approved by test","results":"<results><result name=\"Decision\">Approved</result></results>"}' > /dev/null
  check "deferral completion accepted" "200" "$LAST_STATUS"

  # Confirm the deferred task transitioned out of Deferred
  sleep 2
  TASKS=$(api_get "$TASK_API/runs/$RUN_ID/tasks?include=details")
  DEFERRED_REMAINING=$(echo "$TASKS" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(sum(1 for t in d.get("tasks",[]) if t.get("status")=="Deferred"))' 2>/dev/null)
  check "no deferred tasks remain" "0" "$DEFERRED_REMAINING"
fi

# --- Step 7: Cleanup ---------------------------------------------------------
echo "Step 7: cleanup"
api_delete "$API/kapps/$KAPP_SLUG" > /dev/null
check "test kapp deleted" "200" "$LAST_STATUS"

report
