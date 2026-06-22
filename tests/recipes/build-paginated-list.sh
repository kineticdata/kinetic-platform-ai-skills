#!/bin/bash
# Verifies skills/recipes/build-paginated-list/SKILL.md against a live environment.
#
# The recipe is a portal-rendering pattern, but its load-bearing platform behaviors
# are KQL-with-pagination, the pageToken/nextPageToken protocol, and orderBy with
# direction. This verifier exercises those at the API level.
#
# Steps:
#   1. Cleanup
#   2. Create kapp + form with indexed Status field
#   3. Bulk-create 30 submissions across two Status values
#   4. Paginate with limit=10; assert nextPageToken on first two pages, absent on third
#   5. Filter via KQL on Status, paginate; assert correct count
#   6. orderBy + direction=DESC; assert sort order
#   7. Cleanup
#
# Usage: ./tests/recipes/build-paginated-list.sh <base_url> <user> <pass>

DIR="$(dirname "$0")"
source "$DIR/lib/api.sh"
source "$DIR/lib/assert.sh"

KAPP_SLUG="test-rec-pagination"
FORM_SLUG="tickets"

echo "==> Recipe verifier: build-paginated-list"

# --- Step 1: Cleanup ---------------------------------------------------------
echo "Step 1: cleanup"
api_delete "$API/kapps/$KAPP_SLUG" > /dev/null || true

# --- Step 2: Create kapp + form + indexes -----------------------------------
echo "Step 2: create kapp + form"
api_post "$API/kapps" "{\"slug\":\"$KAPP_SLUG\",\"name\":\"Test Recipe — Pagination\"}" > /dev/null
check "kapp created" "200" "$LAST_STATUS"
api_put "$API/kapps/$KAPP_SLUG" '{"formTypes":[{"name":"Service","allowsAnonymous":false,"status":"Active"}]}' > /dev/null

FORM_BODY='{
  "name": "Tickets", "slug": "tickets", "status": "Active", "type": "Service", "anonymous": false,
  "pages": [{
    "name": "Page 1", "type": "page", "renderType": "submittable", "events": [],
    "elements": [
      { "type": "field", "name": "Status", "key": "status", "renderType": "text", "dataType": "string", "rows": 1, "label": "Status", "required": false, "enabled": true, "visible": true, "defaultValue": "Open", "defaultDataSource": "none", "constraints": [], "events": [], "renderAttributes": {}, "helpText": null, "omitWhenHidden": null, "pattern": null },
      { "type": "field", "name": "Summary", "key": "summary", "renderType": "text", "dataType": "string", "rows": 1, "label": "Summary", "required": false, "enabled": true, "visible": true, "defaultValue": null, "defaultDataSource": "none", "constraints": [], "events": [], "renderAttributes": {}, "helpText": null, "omitWhenHidden": null, "pattern": null },
      { "type": "button", "renderType": "submit-page", "name": "Submit", "label": "Submit", "visible": true, "enabled": true, "renderAttributes": {} }
    ]
  }],
  "indexDefinitions": [
    { "name": "values[Status]", "parts": ["values[Status]"], "unique": false }
  ]
}'
api_post "$API/kapps/$KAPP_SLUG/forms" "$FORM_BODY" > /dev/null
check "form created with index def" "200" "$LAST_STATUS"

# Build the index
api_post "$API/kapps/$KAPP_SLUG/forms/$FORM_SLUG/backgroundJobs" '{"type":"Build Index","content":{"indexes":[{"name":"values[Status]"}]}}' > /dev/null
echo "  waiting for index build..."
for i in $(seq 1 60); do
  RESP=$(api_get "$API/kapps/$KAPP_SLUG/forms/$FORM_SLUG?include=indexDefinitions")
  STATUS=$(echo "$RESP" | python3 -c 'import sys,json; d=json.load(sys.stdin); print([i for i in d["form"]["indexDefinitions"] if i["name"]=="values[Status]"][0].get("status",""))' 2>/dev/null || echo "")
  [ "$STATUS" = "Built" ] && break
  sleep 1
done
check "index built" "Built" "$STATUS"

# --- Step 3: Bulk-create 30 submissions (20 Open, 10 Closed) -----------------
echo "Step 3: bulk-create 30 submissions"
for i in $(seq 1 20); do
  api_post "$API/kapps/$KAPP_SLUG/forms/$FORM_SLUG/submissions" \
    "{\"values\":{\"Status\":\"Open\",\"Summary\":\"Ticket $i\"},\"coreState\":\"Submitted\"}" > /dev/null
done
for i in $(seq 21 30); do
  api_post "$API/kapps/$KAPP_SLUG/forms/$FORM_SLUG/submissions" \
    "{\"values\":{\"Status\":\"Closed\",\"Summary\":\"Ticket $i\"},\"coreState\":\"Submitted\"}" > /dev/null
done
check "30 submissions created" "200" "$LAST_STATUS"

# --- Step 4: Paginate with limit=10 ------------------------------------------
echo "Step 4: paginate the full list with limit=10"
P1=$(api_get "$API/kapps/$KAPP_SLUG/forms/$FORM_SLUG/submissions?limit=10&include=values")
P1_COUNT=$(echo "$P1" | python3 -c 'import sys,json; print(len(json.load(sys.stdin).get("submissions",[])))' 2>/dev/null)
TOKEN1=$(pluck "$P1" 'nextPageToken')
check "page 1 has 10 records" "10" "$P1_COUNT"
check_ne "page 1 has a nextPageToken" "" "$TOKEN1"

P2=$(api_get "$API/kapps/$KAPP_SLUG/forms/$FORM_SLUG/submissions?limit=10&include=values&pageToken=$(printf '%s' "$TOKEN1" | python3 -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.stdin.read().strip()))')")
P2_COUNT=$(echo "$P2" | python3 -c 'import sys,json; print(len(json.load(sys.stdin).get("submissions",[])))' 2>/dev/null)
TOKEN2=$(pluck "$P2" 'nextPageToken')
check "page 2 has 10 records" "10" "$P2_COUNT"
check_ne "page 2 has a nextPageToken" "" "$TOKEN2"

P3=$(api_get "$API/kapps/$KAPP_SLUG/forms/$FORM_SLUG/submissions?limit=10&include=values&pageToken=$(printf '%s' "$TOKEN2" | python3 -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.stdin.read().strip()))')")
P3_COUNT=$(echo "$P3" | python3 -c 'import sys,json; print(len(json.load(sys.stdin).get("submissions",[])))' 2>/dev/null)
TOKEN3=$(pluck "$P3" 'nextPageToken')
check "page 3 has 10 records" "10" "$P3_COUNT"
check "page 3 has no nextPageToken" "" "$TOKEN3"

# --- Step 5: Filter via KQL --------------------------------------------------
echo "Step 5: KQL filter by Status"
OPEN=$(api_get "$API/kapps/$KAPP_SLUG/forms/$FORM_SLUG/submissions?q=values%5BStatus%5D%20%3D%20%22Open%22&limit=25")
OPEN_COUNT=$(echo "$OPEN" | python3 -c 'import sys,json; print(len(json.load(sys.stdin).get("submissions",[])))' 2>/dev/null)
check "20 Open tickets matched" "20" "$OPEN_COUNT"

CLOSED=$(api_get "$API/kapps/$KAPP_SLUG/forms/$FORM_SLUG/submissions?q=values%5BStatus%5D%20%3D%20%22Closed%22&limit=25")
CLOSED_COUNT=$(echo "$CLOSED" | python3 -c 'import sys,json; print(len(json.load(sys.stdin).get("submissions",[])))' 2>/dev/null)
check "10 Closed tickets matched" "10" "$CLOSED_COUNT"

# --- Step 6: orderBy + direction ---------------------------------------------
echo "Step 6: orderBy createdAt direction=ASC"
ASC=$(api_get "$API/kapps/$KAPP_SLUG/forms/$FORM_SLUG/submissions?q=values%5BStatus%5D%20%3D%20%22Open%22&orderBy=createdAt&direction=ASC&limit=5&include=details")
DESC=$(api_get "$API/kapps/$KAPP_SLUG/forms/$FORM_SLUG/submissions?q=values%5BStatus%5D%20%3D%20%22Open%22&orderBy=createdAt&direction=DESC&limit=5&include=details")
FIRST_ASC=$(echo "$ASC" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d["submissions"][0]["createdAt"])' 2>/dev/null)
FIRST_DESC=$(echo "$DESC" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d["submissions"][0]["createdAt"])' 2>/dev/null)
check_ne "ASC first record differs from DESC first record" "$FIRST_ASC" "$FIRST_DESC"

# --- Step 7: Cleanup ---------------------------------------------------------
echo "Step 7: cleanup"
api_delete "$API/kapps/$KAPP_SLUG" > /dev/null
check "test kapp deleted" "200" "$LAST_STATUS"

report
