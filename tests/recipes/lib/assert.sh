#!/bin/bash
# Assertion helpers for recipe verifiers.
# Source after lib/api.sh:  source "$(dirname "$0")/lib/assert.sh"
#
# Provides:
#   PASS, FAIL counters
#   check    — equality assertion with descriptive output
#   check_ne — inequality assertion
#   check_in — substring assertion
#   report   — print summary, exit non-zero if any failures

PASS=0
FAIL=0

check() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "  ✓ $desc"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $desc"
    echo "      expected: $expected"
    echo "      actual:   $actual"
    FAIL=$((FAIL + 1))
  fi
}

check_ne() {
  local desc="$1" not_expected="$2" actual="$3"
  if [ "$not_expected" != "$actual" ]; then
    echo "  ✓ $desc"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $desc (got the value we expected NOT to see: $actual)"
    FAIL=$((FAIL + 1))
  fi
}

check_in() {
  local desc="$1" needle="$2" haystack="$3"
  if [[ "$haystack" == *"$needle"* ]]; then
    echo "  ✓ $desc"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $desc (substring '$needle' not in result)"
    FAIL=$((FAIL + 1))
  fi
}

report() {
  echo ""
  echo "Result: $PASS passed, $FAIL failed"
  [ "$FAIL" -eq 0 ]
}
