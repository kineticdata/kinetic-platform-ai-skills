#!/bin/bash
# Tear down the AI Testing kapp and connection from a Kinetic Platform environment.
# Usage: ./teardown.sh <base_url> <username> <password>

set -e

BASE_URL="${1:?Usage: $0 <base_url> <username> <password>}"
USERNAME="${2:?Usage: $0 <base_url> <username> <password>}"
PASSWORD="${3:?Usage: $0 <base_url> <username> <password>}"

AUTH="-u ${USERNAME}:${PASSWORD}"

echo "=== Tearing down AI Testing on ${BASE_URL} ==="

# Delete kapp (cascades to forms, submissions, workflows)
echo "Deleting ai-testing kapp..."
curl -sf ${AUTH} -X DELETE "${BASE_URL}/app/api/v1/kapps/ai-testing" > /dev/null 2>&1 && echo "  Deleted." || echo "  Not found (already deleted)."

# Delete Kinetic Platform connection
echo "Deleting connections..."
TOKEN=$(curl -s ${AUTH} -X GET --max-redirs 0 -D - -o /dev/null \
  "${BASE_URL}/app/oauth/authorize?grant_type=implicit&response_type=token&client_id=system" \
  | grep -i "^location:" | head -1 | sed 's/.*access_token=\([^&]*\).*/\1/')

if [ -n "$TOKEN" ]; then
  python3 -c "
import json, urllib.request
req = urllib.request.Request('${BASE_URL}/app/integrator/api/connections', headers={'Authorization': 'Bearer ${TOKEN}'})
for c in json.loads(urllib.request.urlopen(req).read()):
    if c['name'] == 'Kinetic Platform':
        urllib.request.Request('${BASE_URL}/app/integrator/api/connections/' + c['id'], headers={'Authorization': 'Bearer ${TOKEN}'}, method='DELETE')
        print(f'  Deleted connection: {c[\"name\"]}')
" 2>/dev/null || echo "  No connections to delete."
fi

echo "=== Teardown complete ==="
