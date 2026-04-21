#!/bin/bash
# Provision the AI Testing kapp on a Kinetic Platform environment.
# Usage: ./provision.sh <base_url> <username> <password>
#
# Example:
#   ./provision.sh https://james.kinops.io james.davies@kineticdata.com 'password'
#
# This script creates:
#   - ai-testing kapp with formTypes and system indexes
#   - Kinetic Platform connection with List Users, Create Submission, Update Submission operations
#   - kitchen-sink form (all field types, properties, choices, constraints, expressions)
#   - approval-request form (filtered workflow with deferral)
#   - approval form (trigger completion)
#   - Request Approval workflow (system_integration_v1, deferral)
#   - Complete Approval workflow (trigger + close)
#
# Prerequisites: curl, python3
# To tear down: DELETE /kapps/ai-testing (cascading delete removes forms, submissions, workflows)

set -e

BASE_URL="${1:?Usage: $0 <base_url> <username> <password>}"
USERNAME="${2:?Usage: $0 <base_url> <username> <password>}"
PASSWORD="${3:?Usage: $0 <base_url> <username> <password>}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

AUTH="-u ${USERNAME}:${PASSWORD}"
API="${BASE_URL}/app/api/v1"
TASK_API="${BASE_URL}/app/components/task/app/api/v2"

echo "=== Provisioning AI Testing kapp on ${BASE_URL} ==="

# --- Step 1: Create kapp ---
echo "Creating ai-testing kapp..."
curl -sf ${AUTH} -X POST "${API}/kapps" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AI Testing",
    "slug": "ai-testing",
    "status": "Active",
    "formTypes": [{"name": "Service"}, {"name": "Test"}, {"name": "Approval"}],
    "indexDefinitions": [
      {"name": "type", "parts": ["type"], "unique": false},
      {"name": "coreState", "parts": ["coreState"], "unique": false},
      {"name": "createdBy", "parts": ["createdBy"], "unique": false},
      {"name": "submittedBy", "parts": ["submittedBy"], "unique": false},
      {"name": "type,coreState,submittedBy", "parts": ["type","coreState","submittedBy"], "unique": false},
      {"name": "type,coreState,createdBy", "parts": ["type","coreState","createdBy"], "unique": false}
    ]
  }' > /dev/null
echo "  Done."

# --- Step 2: Build kapp indexes ---
echo "Building kapp indexes..."
curl -sf ${AUTH} -X POST "${API}/kapps/ai-testing/backgroundJobs" \
  -H "Content-Type: application/json" \
  -d '{"type": "Build Index", "content": {"indexes": ["type","coreState","createdBy","submittedBy","type,coreState,submittedBy","type,coreState,createdBy"]}}' > /dev/null
echo "  Done."

# --- Step 3: Create Kinetic Platform connection + operations ---
echo "Getting OAuth token..."
TOKEN=$(curl -s ${AUTH} -X GET --max-redirs 0 -D - -o /dev/null \
  "${BASE_URL}/app/oauth/authorize?grant_type=implicit&response_type=token&client_id=system" \
  | grep -i "^location:" | head -1 | sed 's/.*access_token=\([^&]*\).*/\1/')

if [ -z "$TOKEN" ]; then
  echo "ERROR: Failed to get OAuth token"
  exit 1
fi

echo "Creating Kinetic Platform connection..."
CONN_ID=$(python3 -c "
import json, urllib.request

data = json.dumps({
    'name': 'Kinetic Platform',
    'type': 'http',
    'config': {
        'configType': 'http',
        'baseUrl': '${BASE_URL}/app/api/v1',
        'auth': {'authType': 'basic', 'username': '${USERNAME}', 'password': '${PASSWORD}'}
    }
}).encode()

req = urllib.request.Request(
    '${BASE_URL}/app/integrator/api/connections',
    data=data,
    headers={'Authorization': 'Bearer ${TOKEN}', 'Content-Type': 'application/json'},
    method='POST'
)
resp = urllib.request.urlopen(req)
result = json.loads(resp.read())
print(result['id'])
")
echo "  Connection: ${CONN_ID}"

# Restart connection
python3 -c "
import json, urllib.request
req = urllib.request.Request(
    '${BASE_URL}/app/integrator/api/connections/${CONN_ID}/restart',
    data=b'{}',
    headers={'Authorization': 'Bearer ${TOKEN}', 'Content-Type': 'application/json'},
    method='POST'
)
urllib.request.urlopen(req)
"

echo "Creating operations..."
# Create operations and capture IDs
OP_IDS=$(python3 -c "
import json, urllib.request

operations = [
    {
        'name': 'List Users',
        'config': {
            'path': '/users/', 'params': {'include': '{{Include}}', 'limit': '{{Limit [0-1000]}}'},
            'body': {'raw': '', 'bodyType': 'raw'},
            'headers': {'accept': 'application/json', 'content-type': 'application/json'},
            'configType': 'http', 'method': 'GET',
            'includeEmptyParams': False, 'followRedirect': False, 'streamResponse': False
        },
        'outputs': {
            'Users': {'children': {'Display Name': 'current.displayName', 'Email': 'current.email', 'Username': 'current.username'}, 'value': 'body.users'},
            '_Error': {'value': 'body.error'}, '_Status Code': {'value': 'statusCode'}
        }
    },
    {
        'name': 'Create Submission',
        'config': {
            'path': '/kapps/{{Kapp*}}/forms/{{Form*}}/submissions', 'params': {},
            'body': {'raw': '{  \n  {{#Core State}}\n    \"coreState\": \"{{Core State}}\",\n  {{/Core State}}\n  {{#Values [Object]}}\n    \"values\": {{{Values [Object]}}},\n  {{/Values [Object]}}\n}', 'bodyType': 'raw'},
            'headers': {'accept': 'application/json', 'content-type': 'application/json'},
            'configType': 'http', 'method': 'POST',
            'includeEmptyParams': False, 'followRedirect': False, 'streamResponse': False
        },
        'outputs': {'Id': {'value': 'body.submission?.id'}, '_Error': {'value': 'body.error'}, '_Status Code': {'value': 'statusCode'}}
    },
    {
        'name': 'Update Submission',
        'config': {
            'path': '/submissions/{{Submission Id*}}', 'params': {},
            'body': {'raw': '{  \n  {{#Core State}}\n    \"coreState\": \"{{Core State}}\",\n  {{/Core State}}\n  {{#Values [Object]}}\n    \"values\": {{{Values [Object]}}},\n  {{/Values [Object]}}\n}', 'bodyType': 'raw'},
            'headers': {'accept': 'application/json', 'content-type': 'application/json'},
            'configType': 'http', 'method': 'PUT',
            'includeEmptyParams': False, 'followRedirect': False, 'streamResponse': False
        },
        'outputs': {'Id': {'value': 'body.submission?.id'}, '_Error': {'value': 'body.error'}, '_Status Code': {'value': 'statusCode'}}
    }
]

ids = {}
for op in operations:
    data = json.dumps(op).encode()
    req = urllib.request.Request(
        '${BASE_URL}/app/integrator/api/connections/${CONN_ID}/operations',
        data=data,
        headers={'Authorization': 'Bearer ${TOKEN}', 'Content-Type': 'application/json'},
        method='POST'
    )
    resp = urllib.request.urlopen(req)
    result = json.loads(resp.read())
    ids[op['name']] = result['id']
    print(f'{op[\"name\"]}={result[\"id\"]}')
")

LIST_USERS_OP=$(echo "$OP_IDS" | grep "List Users" | cut -d= -f2)
CREATE_SUB_OP=$(echo "$OP_IDS" | grep "Create Submission" | cut -d= -f2)
UPDATE_SUB_OP=$(echo "$OP_IDS" | grep "Update Submission" | cut -d= -f2)
echo "  List Users: ${LIST_USERS_OP}"
echo "  Create Submission: ${CREATE_SUB_OP}"
echo "  Update Submission: ${UPDATE_SUB_OP}"

# --- Step 4: Create forms ---
echo "Creating kitchen-sink form..."
# Swap connection/operation IDs in the fixture
python3 -c "
import json, sys
d = json.load(open('${SCRIPT_DIR}/fixtures/kitchen-sink-form.json'))['form']
for k in ['createdAt','createdBy','updatedAt','updatedBy']:
    d.pop(k, None)
for integ in d.get('integrations', []):
    if integ.get('name') == 'List Users':
        integ['connectionId'] = '${CONN_ID}'
        integ['operationId'] = '${LIST_USERS_OP}'
json.dump(d, open('/tmp/ks-form.json','w'))
"
curl -sf ${AUTH} -X POST "${API}/kapps/ai-testing/forms" \
  -H "Content-Type: application/json" \
  -d @/tmp/ks-form.json > /dev/null
echo "  Done."

echo "Creating approval-request form..."
curl -sf ${AUTH} -X POST "${API}/kapps/ai-testing/forms" \
  -H "Content-Type: application/json" \
  -d '{
  "name":"Approval Request","slug":"approval-request","status":"Active","type":"Service",
  "description":"Tests workflow filter, deferral pattern, and system_integration_v1",
  "submissionLabelExpression":"${form(\"name\")} — ${values(\"Request Summary\")}",
  "pages":[{"name":"Page 1","renderType":"submittable","type":"page","advanceCondition":null,"displayCondition":null,"displayPage":null,"events":[],
    "elements":[
      {"type":"section","renderType":null,"name":"Request Details","title":"Request Details","visible":true,"omitWhenHidden":null,"renderAttributes":{},
       "elements":[
         {"type":"field","renderType":"text","dataType":"string","name":"Request Summary","key":"f1","label":"Request Summary","enabled":true,"visible":true,"required":true,"requiredMessage":null,"defaultValue":null,"defaultDataSource":"none","defaultResourceName":null,"pattern":null,"constraints":[],"events":[],"omitWhenHidden":null,"renderAttributes":{},"rows":1},
         {"type":"field","renderType":"dropdown","dataType":"string","name":"Priority","key":"f3","label":"Priority","enabled":true,"visible":true,"required":true,"requiredMessage":null,"defaultValue":"Medium","defaultDataSource":"none","defaultResourceName":null,"pattern":null,"constraints":[],"events":[],"omitWhenHidden":null,"renderAttributes":{},"choicesDataSource":"custom","choicesRunIf":null,"choicesResourceName":null,"choices":[{"label":"Low","value":"Low"},{"label":"Medium","value":"Medium"},{"label":"High","value":"High"}]}
       ]},
      {"type":"section","renderType":null,"name":"System Fields","title":null,"visible":false,"omitWhenHidden":false,"renderAttributes":{},
       "elements":[
         {"type":"field","renderType":"text","dataType":"string","name":"Status","key":"f5","label":"Status","enabled":true,"visible":true,"required":false,"requiredMessage":null,"defaultValue":"Open","defaultDataSource":"none","defaultResourceName":null,"pattern":null,"constraints":[],"events":[],"omitWhenHidden":null,"renderAttributes":{},"rows":1}
       ]},
      {"type":"section","renderType":null,"name":"Footer","title":null,"visible":true,"omitWhenHidden":null,"renderAttributes":{},
       "elements":[{"type":"button","renderType":"submit-page","name":"Submit","label":"Submit Request","visible":true,"enabled":true,"renderAttributes":{}}]}
    ]}]
}' > /dev/null
echo "  Done."

echo "Creating approval form..."
curl -sf ${AUTH} -X POST "${API}/kapps/ai-testing/forms" \
  -H "Content-Type: application/json" \
  -d '{
  "name":"Approval","slug":"approval","status":"Active","type":"Approval",
  "description":"Tests deferral completion via utilities_create_trigger_v1 and system_integration_v1",
  "pages":[{"name":"Page 1","renderType":"submittable","type":"page","advanceCondition":null,"displayCondition":null,"displayPage":null,"events":[],
    "elements":[
      {"type":"section","renderType":null,"name":"Approval Details","title":"Approval Details","visible":true,"omitWhenHidden":null,"renderAttributes":{},
       "elements":[
         {"type":"field","renderType":"text","dataType":"string","name":"Approver","key":"f1","label":"Approver","enabled":false,"visible":true,"required":false,"requiredMessage":null,"defaultValue":null,"defaultDataSource":"none","defaultResourceName":null,"pattern":null,"constraints":[],"events":[],"omitWhenHidden":null,"renderAttributes":{},"rows":1},
         {"type":"field","renderType":"dropdown","dataType":"string","name":"Decision","key":"f2","label":"Decision","enabled":true,"visible":true,"required":true,"requiredMessage":"Please select a decision","defaultValue":null,"defaultDataSource":"none","defaultResourceName":null,"pattern":null,"constraints":[],"events":[],"omitWhenHidden":null,"renderAttributes":{},"choicesDataSource":"custom","choicesRunIf":null,"choicesResourceName":null,"choices":[{"label":"Approved","value":"Approved"},{"label":"Denied","value":"Denied"}]},
         {"type":"field","renderType":"text","dataType":"string","name":"Comments","key":"f3","label":"Comments","enabled":true,"visible":true,"required":false,"requiredMessage":null,"defaultValue":null,"defaultDataSource":"none","defaultResourceName":null,"pattern":null,"constraints":[],"events":[],"omitWhenHidden":null,"renderAttributes":{},"rows":3}
       ]},
      {"type":"section","renderType":null,"name":"System Fields","title":null,"visible":false,"omitWhenHidden":false,"renderAttributes":{},
       "elements":[
         {"type":"field","renderType":"text","dataType":"string","name":"Original Submission Id","key":"f4","label":"Original Submission Id","enabled":true,"visible":true,"required":false,"requiredMessage":null,"defaultValue":null,"defaultDataSource":"none","defaultResourceName":null,"pattern":null,"constraints":[],"events":[],"omitWhenHidden":null,"renderAttributes":{},"rows":1},
         {"type":"field","renderType":"text","dataType":"string","name":"Deferral Token","key":"f5","label":"Deferral Token","enabled":true,"visible":true,"required":false,"requiredMessage":null,"defaultValue":null,"defaultDataSource":"none","defaultResourceName":null,"pattern":null,"constraints":[],"events":[],"omitWhenHidden":null,"renderAttributes":{},"rows":1}
       ]},
      {"type":"section","renderType":null,"name":"Footer","title":null,"visible":true,"omitWhenHidden":null,"renderAttributes":{},
       "elements":[{"type":"button","renderType":"submit-page","name":"Submit","label":"Submit Decision","visible":true,"enabled":true,"renderAttributes":{}}]}
    ]}]
}' > /dev/null
echo "  Done."

# --- Step 5: Create workflows ---
echo "Creating Request Approval workflow..."
WF1=$(curl -sf ${AUTH} -X POST "${API}/kapps/ai-testing/forms/approval-request/workflows" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Request Approval\", \"event\": \"Submission Submitted\", \"type\": \"Tree\", \"status\": \"Active\", \"filter\": \"values('Status') == 'Open'\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "  Workflow: ${WF1}"

# Upload treeJson — using system_integration_v1
python3 -c "
import json
tree = {
    'treeJson': {
        'builderVersion': '', 'schemaVersion': '1.0', 'version': '', 'processOwnerEmail': '',
        'lastId': 4, 'name': 'Request Approval',
        'notes': 'Uses system_integration_v1. Filtered on Status=Open.',
        'connectors': [
            {'from': 'start', 'to': 'si_1', 'label': '', 'value': '', 'type': 'Complete'},
            {'from': 'si_1', 'to': 'si_2', 'label': '', 'value': '', 'type': 'Complete'},
            {'from': 'si_2', 'to': 'echo_3', 'label': '', 'value': '', 'type': 'Complete'}
        ],
        'nodes': [
            {'configured': True, 'defers': False, 'deferrable': False, 'visible': False,
             'name': 'Start', 'messages': [], 'id': 'start', 'position': {'x': 10, 'y': 10}, 'version': 1,
             'parameters': [], 'definitionId': 'system_start_v1',
             'dependents': {'task': [{'label': '', 'type': 'Complete', 'value': '', 'content': 'si_1'}]}},
            {'configured': True, 'defers': False, 'deferrable': False, 'visible': True,
             'name': 'Set Status Pending', 'messages': [], 'id': 'si_1', 'position': {'x': 200, 'y': 10}, 'version': 1,
             'parameters': [
                 {'id': 'connection', 'value': '${CONN_ID}', 'dependsOnId': '', 'dependsOnValue': '', 'description': '', 'label': '', 'menu': '', 'required': True},
                 {'id': 'operation', 'value': '${UPDATE_SUB_OP}', 'dependsOnId': '', 'dependsOnValue': '', 'description': '', 'label': '', 'menu': '', 'required': True},
                 {'id': 'parameters.Submission Id*', 'value': \"<%= @submission['Id'] %>\", 'dependsOnId': '', 'dependsOnValue': '', 'description': '', 'label': '', 'menu': '', 'required': False},
                 {'id': 'parameters.Values [Object]', 'value': '{\"Status\": \"Pending Approval\"}', 'dependsOnId': '', 'dependsOnValue': '', 'description': '', 'label': '', 'menu': '', 'required': False}
             ],
             'definitionId': 'system_integration_v1',
             'dependents': {'task': [{'label': '', 'type': 'Complete', 'value': '', 'content': 'si_2'}]}},
            {'configured': True, 'defers': True, 'deferrable': True, 'visible': True,
             'name': 'Create Approval', 'messages': [], 'id': 'si_2', 'position': {'x': 400, 'y': 10}, 'version': 1,
             'parameters': [
                 {'id': 'connection', 'value': '${CONN_ID}', 'dependsOnId': '', 'dependsOnValue': '', 'description': '', 'label': '', 'menu': '', 'required': True},
                 {'id': 'operation', 'value': '${CREATE_SUB_OP}', 'dependsOnId': '', 'dependsOnValue': '', 'description': '', 'label': '', 'menu': '', 'required': True},
                 {'id': 'parameters.Kapp*', 'value': 'ai-testing', 'dependsOnId': '', 'dependsOnValue': '', 'description': '', 'label': '', 'menu': '', 'required': False},
                 {'id': 'parameters.Form*', 'value': 'approval', 'dependsOnId': '', 'dependsOnValue': '', 'description': '', 'label': '', 'menu': '', 'required': False},
                 {'id': 'parameters.Core State', 'value': 'Draft', 'dependsOnId': '', 'dependsOnValue': '', 'description': '', 'label': '', 'menu': '', 'required': False},
                 {'id': 'parameters.Values [Object]', 'value': \"<%= {Approver: @submission['Created By'], 'Original Submission Id': @submission['Id'], 'Deferral Token': @task['Deferral Token']}.to_json %>\", 'dependsOnId': '', 'dependsOnValue': '', 'description': '', 'label': '', 'menu': '', 'required': False}
             ],
             'definitionId': 'system_integration_v1',
             'dependents': {'task': [{'label': '', 'type': 'Complete', 'value': '', 'content': 'echo_3'}]}},
            {'configured': True, 'defers': False, 'deferrable': False, 'visible': True,
             'name': 'Log Result', 'messages': [], 'id': 'echo_3', 'position': {'x': 600, 'y': 10}, 'version': 1,
             'parameters': [
                 {'id': 'input', 'value': \"Approval completed. Decision: <%= @results['Create Approval'] %>\", 'dependsOnId': '', 'dependsOnValue': '', 'description': '', 'label': '', 'menu': '', 'required': True}
             ],
             'definitionId': 'utilities_echo_v1',
             'dependents': ''}
        ]
    }
}
json.dump(tree, open('/tmp/wf1-tree.json', 'w'))
"
curl -sf ${AUTH} -X PUT "${API}/workflows/${WF1}" \
  -H "Content-Type: application/json" \
  -d @/tmp/wf1-tree.json > /dev/null
echo "  Tree uploaded."

echo "Creating Complete Approval workflow..."
WF2=$(curl -sf ${AUTH} -X POST "${API}/kapps/ai-testing/forms/approval/workflows" \
  -H "Content-Type: application/json" \
  -d '{"name": "Complete Approval", "event": "Submission Submitted", "type": "Tree", "status": "Active"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "  Workflow: ${WF2}"

python3 -c "
import json
tree = {
    'treeJson': {
        'builderVersion': '', 'schemaVersion': '1.0', 'version': '', 'processOwnerEmail': '',
        'lastId': 3, 'name': 'Complete Approval',
        'notes': 'Completes deferral and closes approval submission via system_integration_v1',
        'connectors': [
            {'from': 'start', 'to': 'trigger_1', 'label': '', 'value': '', 'type': 'Complete'},
            {'from': 'trigger_1', 'to': 'si_2', 'label': '', 'value': '', 'type': 'Complete'}
        ],
        'nodes': [
            {'configured': True, 'defers': False, 'deferrable': False, 'visible': False,
             'name': 'Start', 'messages': [], 'id': 'start', 'position': {'x': 10, 'y': 10}, 'version': 1,
             'parameters': [], 'definitionId': 'system_start_v1',
             'dependents': {'task': [{'label': '', 'type': 'Complete', 'value': '', 'content': 'trigger_1'}]}},
            {'configured': True, 'defers': False, 'deferrable': False, 'visible': True,
             'name': 'Complete Deferral', 'messages': [], 'id': 'trigger_1', 'position': {'x': 200, 'y': 10}, 'version': 1,
             'parameters': [
                 {'id': 'action_type', 'value': 'Complete', 'dependsOnId': '', 'dependsOnValue': '', 'description': '', 'label': '', 'menu': '', 'required': True},
                 {'id': 'deferral_token', 'value': \"<%= @values['Deferral Token'] %>\", 'dependsOnId': '', 'dependsOnValue': '', 'description': '', 'label': '', 'menu': '', 'required': True},
                 {'id': 'deferred_variables', 'value': '<results><result name=\"Decision\"><%= @values[\"Decision\"] %></result><result name=\"Comments\"><%= @values[\"Comments\"] %></result></results>', 'dependsOnId': '', 'dependsOnValue': '', 'description': '', 'label': '', 'menu': '', 'required': False},
                 {'id': 'message', 'value': \"Approval decision: <%= @values['Decision'] %>\", 'dependsOnId': '', 'dependsOnValue': '', 'description': '', 'label': '', 'menu': '', 'required': False}
             ],
             'definitionId': 'utilities_create_trigger_v1',
             'dependents': {'task': [{'label': '', 'type': 'Complete', 'value': '', 'content': 'si_2'}]}},
            {'configured': True, 'defers': False, 'deferrable': False, 'visible': True,
             'name': 'Close Approval', 'messages': [], 'id': 'si_2', 'position': {'x': 400, 'y': 10}, 'version': 1,
             'parameters': [
                 {'id': 'connection', 'value': '${CONN_ID}', 'dependsOnId': '', 'dependsOnValue': '', 'description': '', 'label': '', 'menu': '', 'required': True},
                 {'id': 'operation', 'value': '${UPDATE_SUB_OP}', 'dependsOnId': '', 'dependsOnValue': '', 'description': '', 'label': '', 'menu': '', 'required': True},
                 {'id': 'parameters.Submission Id*', 'value': \"<%= @submission['Id'] %>\", 'dependsOnId': '', 'dependsOnValue': '', 'description': '', 'label': '', 'menu': '', 'required': False},
                 {'id': 'parameters.Core State', 'value': 'Closed', 'dependsOnId': '', 'dependsOnValue': '', 'description': '', 'label': '', 'menu': '', 'required': False}
             ],
             'definitionId': 'system_integration_v1',
             'dependents': ''}
        ]
    }
}
json.dump(tree, open('/tmp/wf2-tree.json', 'w'))
"
curl -sf ${AUTH} -X PUT "${API}/workflows/${WF2}" \
  -H "Content-Type: application/json" \
  -d @/tmp/wf2-tree.json > /dev/null
echo "  Tree uploaded."

echo ""
echo "=== Provisioning complete ==="
echo "Kapp: ${BASE_URL}/app/api/v1/kapps/ai-testing"
echo "Connection: ${CONN_ID}"
echo "Operations: List Users=${LIST_USERS_OP}, Create=${CREATE_SUB_OP}, Update=${UPDATE_SUB_OP}"
echo ""
echo "To tear down: curl -u '${USERNAME}:${PASSWORD}' -X DELETE '${API}/kapps/ai-testing'"
