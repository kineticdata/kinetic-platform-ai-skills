#!/bin/bash
# Verifies skills/recipes/create-submission-form/SKILL.md against a live environment.
#
# Steps:
#   1. Cleanup — delete any leftover test kapp/form
#   2. Create kapp + form using the recipe's worked PUT body
#   3. Assert form was created with the expected field count
#   4. Add indexes per the recipe
#   5. Build indexes via background job; poll until built
#   6. Create a submission via API; assert success
#   7. Search via KQL on the indexed field; assert it returns the submission
#   8. Cleanup
#
# Usage: ./tests/recipes/create-submission-form.sh <base_url> <user> <pass>

DIR="$(dirname "$0")"
source "$DIR/lib/api.sh"
source "$DIR/lib/assert.sh"

KAPP_SLUG="test-rec-form"
FORM_SLUG="maintenance-request"

echo "==> Recipe verifier: create-submission-form"

# --- Step 1: Cleanup ---------------------------------------------------------
echo "Step 1: cleanup any previous run"
api_delete "$API/kapps/$KAPP_SLUG" > /dev/null || true

# --- Step 2: Create kapp -----------------------------------------------------
echo "Step 2: create kapp"
api_post "$API/kapps" "{\"slug\":\"$KAPP_SLUG\",\"name\":\"Test Recipe — Form\"}" > /dev/null
check "kapp created (HTTP 200)" "200" "$LAST_STATUS"

# Register formType for type-based KQL
api_put "$API/kapps/$KAPP_SLUG" '{"formTypes":[{"name":"Service","allowsAnonymous":false,"status":"Active"}]}' > /dev/null
check "formTypes registered" "200" "$LAST_STATUS"

# --- Step 3: Create form with the recipe's PUT body --------------------------
# (Embedded inline — a real verifier would source this from the recipe's example block
#  or a separate fixture file derived from it. Kept inline here for clarity.)
echo "Step 3: create form per recipe"
FORM_BODY='{
  "name": "Maintenance Request", "slug": "maintenance-request",
  "status": "Active", "type": "Service", "anonymous": false,
  "submissionLabelExpression": "${form(\"name\")} — ${values(\"Location\")}",
  "pages": [{
    "name": "Page 1", "type": "page", "renderType": "submittable", "events": [],
    "elements": [
      { "type": "section", "name": "Request Details", "title": "Request Details", "visible": true, "omitWhenHidden": null, "renderAttributes": {},
        "elements": [
          { "type": "field", "name": "Location", "key": "location", "renderType": "text", "dataType": "string", "rows": 1, "label": "Location", "required": true, "enabled": true, "visible": true, "defaultValue": null, "defaultDataSource": "none", "constraints": [], "events": [], "renderAttributes": {}, "helpText": null, "omitWhenHidden": null, "pattern": null },
          { "type": "field", "name": "Status", "key": "status", "renderType": "text", "dataType": "string", "rows": 1, "label": "Status", "required": false, "enabled": false, "visible": true, "defaultValue": "New", "defaultDataSource": "none", "constraints": [], "events": [], "renderAttributes": {}, "helpText": null, "omitWhenHidden": null, "pattern": null }
        ]
      },
      { "type": "button", "renderType": "submit-page", "name": "Submit Button", "label": "Submit", "visible": true, "enabled": true, "renderAttributes": {} }
    ]
  }]
}'
RESP=$(api_post "$API/kapps/$KAPP_SLUG/forms" "$FORM_BODY")
check "form created (HTTP 200)" "200" "$LAST_STATUS"

FIELD_COUNT=$(pluck "$RESP" 'form.pages[0].elements[0].elements' | python3 -c 'import sys,json; print(len(json.load(sys.stdin)))' 2>/dev/null || echo "0")
check "form has 2 fields" "2" "$FIELD_COUNT"

# --- Step 4: Add indexes -----------------------------------------------------
echo "Step 4: add and build indexes"
api_put "$API/kapps/$KAPP_SLUG/forms/$FORM_SLUG" '{"indexDefinitions":[{"name":"values[Status]","parts":["values[Status]"],"unique":false}]}' > /dev/null
check "indexDefinitions PUT (HTTP 200)" "200" "$LAST_STATUS"

api_post "$API/kapps/$KAPP_SLUG/forms/$FORM_SLUG/backgroundJobs" '{"type":"Build Index","content":{"indexes":[{"name":"values[Status]"}]}}' > /dev/null
check "build index job created" "200" "$LAST_STATUS"

# Poll for built status
echo "  waiting for index build..."
for i in $(seq 1 60); do
  RESP=$(api_get "$API/kapps/$KAPP_SLUG/forms/$FORM_SLUG?include=indexDefinitions")
  STATUS=$(echo "$RESP" | python3 -c 'import sys,json; d=json.load(sys.stdin); print([i for i in d["form"]["indexDefinitions"] if i["name"]=="values[Status]"][0].get("status",""))' 2>/dev/null || echo "")
  if [ "$STATUS" = "Built" ]; then break; fi
  sleep 1
done
check "index built within 60s" "Built" "$STATUS"

# --- Step 5: Submit a submission and search by KQL ---------------------------
echo "Step 5: submit + KQL search"
RESP=$(api_post "$API/kapps/$KAPP_SLUG/forms/$FORM_SLUG/submissions" '{"values":{"Location":"Building A","Status":"New"},"coreState":"Submitted"}')
check "submission created" "200" "$LAST_STATUS"

# Query by indexed field
SEARCH=$(api_get "$API/kapps/$KAPP_SLUG/forms/$FORM_SLUG/submissions?q=values%5BStatus%5D%20%3D%20%22New%22&limit=10")
check "KQL search succeeded" "200" "$LAST_STATUS"
RESULT_COUNT=$(echo "$SEARCH" | python3 -c 'import sys,json; print(len(json.load(sys.stdin).get("submissions",[])))' 2>/dev/null || echo "0")
check_ne "search returned results" "0" "$RESULT_COUNT"

# --- Step 6: Cleanup ---------------------------------------------------------
echo "Step 6: cleanup"
api_delete "$API/kapps/$KAPP_SLUG" > /dev/null
check "test kapp deleted" "200" "$LAST_STATUS"

report
