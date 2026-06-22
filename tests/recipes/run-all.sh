#!/bin/bash
# Run every recipe verifier in sequence. Continue past per-verifier failures so
# you see the full picture in one run. Exits with the count of failing verifiers.
#
# Usage: ./tests/recipes/run-all.sh <base_url> <user> <pass>

DIR="$(dirname "$0")"
BASE_URL="${1:?Usage: $0 <base_url> <user> <pass>}"
USERNAME="${2:?Usage: $0 <base_url> <user> <pass>}"
PASSWORD="${3:?Usage: $0 <base_url> <user> <pass>}"

VERIFIERS=(
  "$DIR/create-submission-form.sh"
  "$DIR/add-approval-workflow.sh"
  "$DIR/build-paginated-list.sh"
  "$DIR/connect-external-system.sh"
)

TOTAL=0
FAILED=0

for v in "${VERIFIERS[@]}"; do
  if [ ! -x "$v" ]; then
    echo "Skipping (not executable): $v"
    continue
  fi
  TOTAL=$((TOTAL + 1))
  echo ""
  echo "================================================================"
  echo "Running: $(basename "$v")"
  echo "================================================================"
  if "$v" "$BASE_URL" "$USERNAME" "$PASSWORD"; then
    :
  else
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo "================================================================"
echo "All recipe verifiers complete: $((TOTAL - FAILED))/$TOTAL passed"
echo "================================================================"

exit $FAILED
