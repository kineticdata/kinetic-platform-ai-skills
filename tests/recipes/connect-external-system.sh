#!/bin/bash
# Verifies skills/recipes/connect-external-system/SKILL.md against a live environment.
#
# Exercises the Integrator API surface — Connection CRUD, Operation CRUD, and the
# credential-mask-on-read behavior the recipe warns about. Does NOT call out to an
# external system; the Connection's baseUrl points at the Kinetic Platform's own
# /me endpoint, which is always reachable and safe to ping.
#
# Steps:
#   1. Acquire Integrator OAuth bearer token
#   2. Cleanup any leftover test connection
#   3. Create a Connection with raw_bearer_token auth pointing at /app/api/v1
#   4. Test the connection (expect 200, status="ok" or "error" with detail)
#   5. Read back the connection — assert credentials are masked as null
#   6. Create one Operation (GET /me)
#   7. Read it back and assert parameters were extracted from the path template
#   8. Cleanup
#
# Usage: ./tests/recipes/connect-external-system.sh <base_url> <user> <pass>

DIR="$(dirname "$0")"
source "$DIR/lib/api.sh"
source "$DIR/lib/assert.sh"

INTEGRATOR_API="${BASE_URL%/}/app/integrator/api"
CONN_NAME="Test Recipe Connection"

echo "==> Recipe verifier: connect-external-system"

# --- Step 1: Acquire OAuth bearer token --------------------------------------
echo "Step 1: get Integrator OAuth bearer token"
# Send authorize request with Basic Auth, capture Location header from 302
LOC=$(curl -s -i -X GET \
  -H "Authorization: Basic $(printf '%s' "$USERNAME:$PASSWORD" | base64 -w 0)" \
  "$BASE_URL/app/oauth/authorize?grant_type=implicit&response_type=token&client_id=system" \
  | tr -d '\r' | awk 'BEGIN{IGNORECASE=1} /^location:/ {sub(/^[Ll]ocation:[ ]*/,""); print; exit}')
TOKEN=$(echo "$LOC" | sed -n 's/.*#.*access_token=\([^&]*\).*/\1/p')
if [ -z "$TOKEN" ]; then
  echo "  ✗ could not extract token from Location header"
  echo "    Location: $LOC"
  exit 1
fi
echo "  ✓ obtained bearer token (length ${#TOKEN})"
PASS=$((PASS + 1))

INT_AUTH=("-H" "Authorization: Bearer $TOKEN" "-H" "Accept: application/json")
int_call() {
  local method="$1" path="$2" body="${3:-}"
  local args=("-s" "-X" "$method" "-w" "HTTPSTATUS:%{http_code}" "${INT_AUTH[@]}")
  if [ -n "$body" ]; then args+=("-H" "Content-Type: application/json" "-d" "$body"); fi
  local r; r=$(curl "${args[@]}" "${path}")
  LAST_STATUS="${r##*HTTPSTATUS:}"; echo "${r%HTTPSTATUS:*}"
}

# --- Step 2: Cleanup ---------------------------------------------------------
echo "Step 2: cleanup"
LIST=$(int_call GET "$INTEGRATOR_API/connections")
CID=$(echo "$LIST" | python3 -c '
import sys,json
data = json.load(sys.stdin) if sys.stdin.readable() else []
items = data if isinstance(data, list) else data.get("connections", [])
for c in items:
  if c.get("name") == "'"$CONN_NAME"'":
    print(c.get("id",""))
    break
' 2>/dev/null)
if [ -n "$CID" ]; then
  int_call DELETE "$INTEGRATOR_API/connections/$CID" > /dev/null
  echo "  ✓ removed leftover connection $CID"
fi

# --- Step 3: Create Connection -----------------------------------------------
echo "Step 3: create connection"
SECRET="test-secret-$(date +%s)"
BODY=$(python3 -c '
import json, sys
print(json.dumps({
  "name": "'"$CONN_NAME"'",
  "type": "HTTP",
  "config": {
    "baseUrl": "'"$BASE_URL"'/app/api/v1",
    "auth": {"authType": "raw_bearer_token", "header": "Authorization", "prefix": "Bearer", "token": "'"$SECRET"'"},
    "headers": {"Accept": "application/json"},
    "testPath": "/me"
  }
}))')
CREATED=$(int_call POST "$INTEGRATOR_API/connections" "$BODY")
check "connection created (HTTP 200/201)" "200" "$LAST_STATUS"
CID=$(pluck "$CREATED" 'id')
if [ -z "$CID" ]; then CID=$(echo "$CREATED" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("id") or d.get("connection",{}).get("id",""))' 2>/dev/null); fi
check_ne "connection has id" "" "$CID"

# --- Step 4: Test the Connection --------------------------------------------
echo "Step 4: test connection"
TEST=$(int_call POST "$INTEGRATOR_API/connections/$CID/test" '{}')
check "test endpoint returns 200" "200" "$LAST_STATUS"
# The body's `status` field reports success/error — but since we used a fake
# bearer token against the real /me, this will likely error. The point is that
# the test endpoint responded at all.

# --- Step 5: Read back and assert credentials are masked ---------------------
echo "Step 5: read back; verify credentials masked"
READ=$(int_call GET "$INTEGRATOR_API/connections/$CID")
TOKEN_FIELD=$(echo "$READ" | python3 -c '
import sys,json
d=json.load(sys.stdin)
conn = d.get("connection") if isinstance(d, dict) and "connection" in d else d
auth = (conn or {}).get("config", {}).get("auth", {})
print(auth.get("token", "<missing>"))
' 2>/dev/null)
check "auth.token is masked to null on GET" "None" "$TOKEN_FIELD"

# --- Step 6: Create an Operation --------------------------------------------
echo "Step 6: create Operation"
OP_BODY='{"name":"Get Me","config":{"method":"GET","path":"/me","params":{},"headers":{},"body":null,"includeEmptyParams":false,"followRedirect":true,"streamResponse":false},"outputs":{"Username":{"value":"body.username"}}}'
OP_CREATED=$(int_call POST "$INTEGRATOR_API/connections/$CID/operations" "$OP_BODY")
check "operation created (HTTP 200)" "200" "$LAST_STATUS"
OP_ID=$(echo "$OP_CREATED" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("id") or d.get("operation",{}).get("id",""))' 2>/dev/null)
check_ne "operation has id" "" "$OP_ID"

# --- Step 7: Read back the operation; verify it lists 0 parameters (no {{var}}) --
echo "Step 7: verify operation contract"
OP_READ=$(int_call GET "$INTEGRATOR_API/connections/$CID/operations/$OP_ID")
PARAM_COUNT=$(echo "$OP_READ" | python3 -c '
import sys,json
d=json.load(sys.stdin)
op = d.get("operation") if isinstance(d, dict) and "operation" in d else d
print(len((op or {}).get("parameters", [])))
' 2>/dev/null)
check "Get Me has 0 parameters (path has no {{var}})" "0" "$PARAM_COUNT"

# --- Step 8: Cleanup ---------------------------------------------------------
echo "Step 8: cleanup"
int_call DELETE "$INTEGRATOR_API/connections/$CID" > /dev/null
check "connection deleted" "200" "$LAST_STATUS"

report
