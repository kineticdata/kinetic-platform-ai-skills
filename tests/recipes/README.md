# Recipe Verification

The skills in `skills/recipes/` are step-by-step guides. Like any documentation, they bit-rot — the platform changes, an API endpoint shifts, a referenced helper disappears. The scripts in this directory exercise each recipe end-to-end against a real environment and assert the expected outcome, so a CI run can catch drift before users do.

## Layout

```
tests/recipes/
├── README.md                       (this file)
├── lib/
│   ├── api.sh                      (curl wrappers, JSON pluck helpers)
│   └── assert.sh                   (PASS/FAIL helpers, exit codes)
├── create-submission-form.sh       (verifies recipes/create-submission-form/SKILL.md)
├── add-approval-workflow.sh        (verifies recipes/add-approval-workflow/SKILL.md)
├── connect-external-system.sh      (verifies recipes/connect-external-system/SKILL.md)
├── build-paginated-list.sh         (verifies recipes/build-paginated-list/SKILL.md)
└── run-all.sh                      (orchestrator — runs every recipe verifier)
```

## Usage

```bash
# Run a single recipe verifier
./tests/recipes/create-submission-form.sh https://demo.kinops.io <user> <pass>

# Run them all
./tests/recipes/run-all.sh https://demo.kinops.io <user> <pass>

# CI gate (exits 1 on any recipe-level failure)
./tests/recipes/run-all.sh "$KINETIC_SPACE" "$KINETIC_USER" "$KINETIC_PASS"
```

## Scaffold

This README and the orchestrator are scaffolded; the per-recipe verifiers are starter templates. **Each verifier must be filled in** to exercise the recipe it tests. The scaffold below is a complete example for `create-submission-form` — copy the pattern for other recipes.

## How a verifier works

Each script follows the recipe's steps in order and asserts the observable outcome at each step:

1. **Cleanup** — delete any kapp/form/data left over from a previous failed run.
2. **Execute** — follow the recipe verbatim against the live API.
3. **Assert** — at each step, query the API and compare against expected values.
4. **Cleanup** — leave the environment clean (or fail loudly if cleanup itself fails).

The scripts emit `✓` per pass and `✗` per fail; orchestrator exits with the count of failures.

## When to update a verifier

- The recipe was changed — update the verifier to match.
- The platform changed and the recipe is now wrong — fix the recipe, then update the verifier.
- A new step was added to the recipe — add the corresponding assertion.

Don't let verifiers diverge from recipes; the value is in lockstep.

## Limitations

- **Requires a real environment.** No mocking; tests run against `provision.sh`-style fixtures.
- **State is shared.** Recipe verifiers can step on each other if they use the same kapp/form slugs — keep slugs unique per verifier (`test-rec-form`, `test-rec-approval`, etc.) and include cleanup.
- **Some recipes need external systems.** `connect-external-system` ideally points at a mock server or a known stable third-party endpoint; consider running this verifier optional / gated.
