#!/bin/bash
# Shared helpers for recipe verifiers.
# Source from each verifier:  source "$(dirname "$0")/lib/api.sh"
#
# Provides:
#   BASE_URL, USERNAME, PASSWORD, AUTH, API, TASK_API   (parsed from $1 $2 $3)
#   api_get, api_post, api_put, api_delete              (curl wrappers; emit body, status separately)
#   pluck                                                (jq-style extraction with python3 fallback)
#   die                                                  (error + exit 1)

set -euo pipefail

BASE_URL="${1:?Usage: $0 <base_url> <username> <password>}"
USERNAME="${2:?Usage: $0 <base_url> <username> <password>}"
PASSWORD="${3:?Usage: $0 <base_url> <username> <password>}"

AUTH=("-u" "${USERNAME}:${PASSWORD}")
API="${BASE_URL%/}/app/api/v1"
TASK_API="${BASE_URL%/}/app/components/task/app/api/v2"

# Capture both body and status in one curl call using -w 'HTTPSTATUS:%{http_code}'
api_call() {
  local method="$1" path="$2" body="${3:-}"
  local args=("-s" "-X" "$method" "-w" "HTTPSTATUS:%{http_code}" "${AUTH[@]}")
  args+=("-H" "Accept: application/json")
  if [ -n "$body" ]; then
    args+=("-H" "Content-Type: application/json" "-d" "$body")
  fi
  curl "${args[@]}" "${path}"
}

# Returns body to stdout, sets LAST_STATUS env var
api_get()    { local r; r=$(api_call GET    "$1");      LAST_STATUS="${r##*HTTPSTATUS:}"; echo "${r%HTTPSTATUS:*}"; }
api_post()   { local r; r=$(api_call POST   "$1" "$2"); LAST_STATUS="${r##*HTTPSTATUS:}"; echo "${r%HTTPSTATUS:*}"; }
api_put()    { local r; r=$(api_call PUT    "$1" "$2"); LAST_STATUS="${r##*HTTPSTATUS:}"; echo "${r%HTTPSTATUS:*}"; }
api_delete() { local r; r=$(api_call DELETE "$1");      LAST_STATUS="${r##*HTTPSTATUS:}"; echo "${r%HTTPSTATUS:*}"; }

# pluck '<json>' 'dot.path[0].field' — uses jq if present, else python3
pluck() {
  local json="$1" path="$2"
  if command -v jq >/dev/null 2>&1; then
    echo "$json" | jq -r ".$path // empty"
  else
    python3 -c "
import json, sys, re
data = json.loads(sys.argv[1])
path = sys.argv[2]
for part in re.findall(r'[^.\[\]]+|\[\d+\]', path):
  if part.startswith('['):
    data = data[int(part[1:-1])]
  else:
    data = data.get(part) if isinstance(data, dict) else None
  if data is None: break
print(data if data is not None else '')
" "$json" "$path"
  fi
}

die() { echo "FATAL: $*" >&2; exit 1; }
