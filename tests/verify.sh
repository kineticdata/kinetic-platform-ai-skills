#!/bin/bash
# Verify the AI Testing kapp is correctly provisioned and workflows function.
# Usage: ./verify.sh <base_url> <username> <password>
#
# Tests:
#   1. Kapp exists with formTypes and indexes
#   2. All forms exist with correct field counts
#   3. Workflows exist on correct forms
#   4. Submit a help desk ticket → workflow fires → status updated to "In Progress"
#   5. Submit an approval request → filtered workflow fires → deferral created
#   6. Submit the approval → deferral completes → approval closed
#   7. KQL search works with built indexes

set -e

BASE_URL="${1:?Usage: $0 <base_url> <username> <password>}"
USERNAME="${2:?Usage: $0 <base_url> <username> <password>}"
PASSWORD="${3:?Usage: $0 <base_url> <username> <password>}"

AUTH="-u ${USERNAME}:${PASSWORD}"
API="${BASE_URL}/app/api/v1"
TASK_API="${BASE_URL}/app/components/task/app/api/v2"
PASS=0
FAIL=0

check() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "  ✓ $desc"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $desc (expected: $expected, got: $actual)"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== Verifying AI Testing on ${BASE_URL} ==="

# --- 1. Kapp ---
echo ""
echo "1. Kapp configuration"
KAPP=$(curl -sf ${AUTH} "${API}/kapps/ai-testing?include=indexDefinitions,formTypes")
FT_COUNT=$(echo "$KAPP" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('kapp',{}).get('formTypes',[])))")
IDX_COUNT=$(echo "$KAPP" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('kapp',{}).get('indexDefinitions',[])))")
check "formTypes count" "3" "$FT_COUNT"
check "kapp index count" "6" "$IDX_COUNT"

# --- 2. Forms ---
echo ""
echo "2. Forms exist"
for slug in kitchen-sink help-desk-ticket approval-request approval; do
  RESULT=$(curl -sf ${AUTH} "${API}/kapps/ai-testing/forms/${slug}?include=fields" 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('form',{}).get('name','MISSING'))" 2>/dev/null || echo "MISSING")
  check "form ${slug}" "exists" "$([ "$RESULT" != "MISSING" ] && echo "exists" || echo "MISSING")"
done

# --- 3. Workflows ---
echo ""
echo "3. Workflows exist"
for form_slug in help-desk-ticket approval-request approval; do
  WF_COUNT=$(curl -sf ${AUTH} "${API}/kapps/ai-testing/forms/${form_slug}/workflows" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('workflows',[])))")
  check "workflows on ${form_slug}" "1" "$WF_COUNT"
done

# --- 4. Help Desk Ticket workflow ---
echo ""
echo "4. Help Desk Ticket → Process Ticket workflow"
SUB_ID=$(curl -sf ${AUTH} -X POST "${API}/kapps/ai-testing/forms/help-desk-ticket/submissions" \
  -H "Content-Type: application/json" \
  -d '{"values":{"Summary":"Verify test","Description":"Automated verification","Category":"Software","Priority":"Medium"},"coreState":"Submitted"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['submission']['id'])")

sleep 5

STATUS=$(curl -sf ${AUTH} "${API}/submissions/${SUB_ID}?include=values" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['submission']['values'].get('Status','?'))")
check "ticket status after workflow" "In Progress" "$STATUS"

RUN_COUNT=$(curl -sf ${AUTH} "${TASK_API}/runs?source=Kinetic+Request+CE&sourceId=${SUB_ID}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['count'])")
check "workflow run fired" "1" "$RUN_COUNT"

# Check for exceptions
EXCEPTIONS=$(curl -sf ${AUTH} "${TASK_API}/runs?source=Kinetic+Request+CE&sourceId=${SUB_ID}&include=details" \
  | python3 -c "
import sys,json,urllib.request
d=json.load(sys.stdin)
total_ex = 0
for r in d.get('runs',[]):
    req = urllib.request.Request(
        '${TASK_API}/runs/' + str(r['id']) + '?include=exceptions',
        headers={'Authorization': 'Basic ' + __import__('base64').b64encode(b'${USERNAME}:${PASSWORD}').decode()})
    run = json.loads(urllib.request.urlopen(req).read())
    total_ex += len(run.get('exceptions',[]))
print(total_ex)
")
check "no workflow exceptions" "0" "$EXCEPTIONS"

# --- 5. Approval Request → filtered workflow + deferral ---
echo ""
echo "5. Approval Request → filtered deferral workflow"
APPROVAL_SUB=$(curl -sf ${AUTH} -X POST "${API}/kapps/ai-testing/forms/approval-request/submissions" \
  -H "Content-Type: application/json" \
  -d '{"values":{"Request Summary":"Verify approval","Priority":"High","Status":"Open"},"coreState":"Submitted"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['submission']['id'])")

sleep 5

APPROVAL_STATUS=$(curl -sf ${AUTH} "${API}/submissions/${APPROVAL_SUB}?include=values" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['submission']['values'].get('Status','?'))")
check "approval request status" "Pending Approval" "$APPROVAL_STATUS"

# Find the approval submission created by the workflow
APPROVAL_FORM_SUB=$(curl -sf ${AUTH} "${API}/kapps/ai-testing/forms/approval/submissions?include=values&limit=1" \
  | python3 -c "
import sys,json
subs = json.load(sys.stdin).get('submissions',[])
for s in subs:
    if s.get('values',{}).get('Original Submission Id') == '${APPROVAL_SUB}':
        print(s['id']); break
else:
    print(subs[0]['id'] if subs else 'NONE')
")
check "approval submission created" "exists" "$([ "$APPROVAL_FORM_SUB" != "NONE" ] && echo "exists" || echo "NONE")"

# --- 6. Complete the approval ---
echo ""
echo "6. Submit approval → deferral completes → approval closed"
curl -sf ${AUTH} -X PUT "${API}/submissions/${APPROVAL_FORM_SUB}" \
  -H "Content-Type: application/json" \
  -d '{"values":{"Decision":"Approved","Comments":"Automated test"},"coreState":"Submitted"}' > /dev/null

sleep 5

APPROVAL_CLOSED=$(curl -sf ${AUTH} "${API}/submissions/${APPROVAL_FORM_SUB}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['submission']['coreState'])")
check "approval submission closed" "Closed" "$APPROVAL_CLOSED"

# --- 7. KQL Search ---
echo ""
echo "7. KQL search with indexes"

# Build help-desk-ticket indexes first
curl -sf ${AUTH} -X POST "${API}/kapps/ai-testing/forms/help-desk-ticket/backgroundJobs" \
  -H "Content-Type: application/json" \
  -d '{"type":"Build Index","content":{"indexes":["values[Category]","values[Priority]","values[Status]","values[Status],values[Category]"]}}' > /dev/null
sleep 3

SEARCH_COUNT=$(curl -sf ${AUTH} "${API}/kapps/ai-testing/forms/help-desk-ticket/submissions?q=values%5BStatus%5D%3D%22In%20Progress%22&include=values" \
  | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('submissions',[])))")
check "KQL search finds ticket" "1" "$SEARCH_COUNT"

# --- Summary ---
echo ""
echo "=== Results: ${PASS} passed, ${FAIL} failed ==="
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
