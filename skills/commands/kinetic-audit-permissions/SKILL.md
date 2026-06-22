---
name: kinetic-audit-permissions
description: Resolve and explain effective permissions on a Kinetic kapp, form, or submission — who can do what, which security policies evaluate, which attributes drive access
argument-hint: "<kapp-slug> [<form-slug> [<submissionId>]] [--as <username>]"
user-invocable: true
---

# Audit Effective Permissions

The user wants to understand who can do what on a kapp, form, or specific submission — useful before deploying a security change, while debugging a 500/403 issue, or during a compliance review. Parse the argument for kapp slug, optional form slug, optional submission id, and optional `--as <username>` to evaluate from a specific user's perspective.

> **Tooling:** Core REST API + `concepts/security-policies` semantics. The platform doesn't expose a single "explain permissions" endpoint; this command synthesizes the answer from policy definitions, assignments, and (for the `--as` mode) the `include=authorization` introspection.

## Step 0: Read Reference

Read:
- `concepts/security-policies` — KSL definition shape, two-layer (Core JS / Task Ruby) model, space-admin bypass.
- `concepts/kapp-lifecycle` — how kapps assign security policies via `securityPolicies[]` with endpoints (`Display`, `Modification`, `Default Submission Access`, etc.).
- `platform/known-bugs` Bug 5 — failing `Display` expressions return 500 instead of 403 and poison `GET /kapps`.

## Step 1: Resolve Scope

Determine which endpoints to audit based on the argument:

| Argument | Endpoints audited |
|---|---|
| `<kapp>` only | Kapp Display, Kapp Modification, Form Creation, Default Form Display, Default Form Modification, Default Submission Access, Default Submission Modification, Submission Support |
| `<kapp> <form>` | All of the above PLUS Form Display, Form Modification, Submission Access (form-level if defined), Submission Modification (form-level if defined) |
| `<kapp> <form> <submissionId>` | All of the above PLUS submission-specific evaluation: does THIS submission's values + the current user satisfy the policies? |

## Step 2: Fetch Inputs

```
GET /app/api/v1/kapps/{kappSlug}?include=securityPolicies,details
GET /app/api/v1/kapps/{kappSlug}/securityPolicyDefinitions?include=details   # kapp-scoped definitions
GET /app/api/v1/securityPolicyDefinitions?include=details                    # space-scoped definitions
```

If a form is in scope:

```
GET /app/api/v1/kapps/{kappSlug}/forms/{formSlug}?include=securityPolicies,details
```

If a submission is in scope:

```
GET /app/api/v1/submissions/{submissionId}?include=details,values,form.attributes,authorization
```

`include=authorization` in the submission GET returns `{ "Access": bool, "Modification": bool, "Support": bool }` reflecting the **current authenticated caller's** effective access. With `--as <username>`, you'll need to authenticate as that user (a separate token / Basic Auth) to get accurate values.

## Step 3: Map Endpoints to Definitions

For each `securityPolicies[]` entry on the kapp/form, look up the named definition and capture:

- **Definition `rule`** — the KSL JavaScript expression.
- **Definition `type`** — Space / Kapp / Form / Submission / Team / User / etc.
- **`message`** — the user-facing denial reason.

Build a table:

```
Endpoint                              Policy Name                  Rule (truncated)
------                                -----------                  ----------------
Kapp Display                          Authenticated Users          identity('authenticated')
Kapp Modification                     Admins Only                  false
Default Form Display                  Authenticated Users          identity('authenticated')
Default Submission Access             Owner or Support             identity('username') === submission('createdBy') || team('Support')
Default Submission Modification       (none assigned)              (defaults to no policy → admins only)
```

If an endpoint has **no policy assigned**, note that the default depends on the endpoint: most "Default Submission" endpoints fall back to "admins only" when unset.

## Step 4: Identify Referenced Bindings

For each rule, list the bindings used (`identity`, `team`, `submission`, `values`, `kapp`, `form`, `space`) and any specific attributes/teams referenced. This surfaces dependencies that must be present for the policy to evaluate correctly:

```
Owner or Support depends on:
  - identity('username')                  always present
  - submission('createdBy')               available at submission scope
  - team('Support')                       requires a team named "Support" to exist
```

If a referenced team or attribute doesn't exist, the policy will silently evaluate to `false` for everyone — flag it as a likely misconfiguration.

## Step 5: Evaluate "as user" (if `--as <username>` provided)

Authenticate as the target user (Basic Auth with their credentials, or impersonation if your environment supports it). Then:

```
GET /app/api/v1/me                                   # confirm identity
GET /app/api/v1/kapps/{kappSlug}?include=authorization
GET /app/api/v1/kapps/{kappSlug}/forms/{formSlug}?include=authorization
GET /app/api/v1/submissions/{submissionId}?include=authorization
```

The `authorization` include returns booleans per endpoint that reflect the platform's actual policy evaluation. Combine with the rule analysis from Step 3 to produce a **why** for each verdict:

```
User: alice (memberships: Engineering, Approvers; not spaceAdmin)

Kapp services:
  Display:       ✓ Allow      (rule: identity('authenticated') — alice is logged in)
  Modification:  ✗ Deny       (rule: false — admins only)

Form maintenance-request:
  Display:       ✓ Allow      (inherits Kapp Display)
  Modification:  ✗ Deny       (rule: identity('attributeValue', 'Role', 'Admin') — alice has no Role=Admin)

Submission abc-123-...:
  Access:        ✓ Allow      (rule: owner or Support team — alice created this submission)
  Modification:  ✗ Deny       (rule: owner during Draft only — submission is Submitted)
  Support:       ✗ Deny       (rule: team('Support') — alice is not a member)
```

## Step 6: Surface Risks

Highlight conditions that often indicate a misconfiguration:

- **Any policy expression that throws.** A rule referencing a non-existent attribute (`identity('attributeValue', 'Department', 'X')` when no `Department` definition exists) typically evaluates to `false`, but in some configurations throws — which triggers Bug 5 (500 instead of 403).
- **`profileAttributes` in any rule.** User-controllable — privilege escalation risk. Should use `identity('attribute:X')` (admin-set) instead.
- **`Default Submission Access` set to `identity('authenticated')`.** All authenticated users can read everything. Often intended for a specific kapp but accidentally permissive.
- **No policy on `Submission Modification`.** Default is admins-only, but explicit policies are clearer in audit.
- **Cross-level type mismatches.** A "Space" type policy assigned at kapp level — stored but may not be usable.

## Step 7: Report

```
Permission audit: services / maintenance-request

Configuration:
  Kapp policies:
    Display              → "Authenticated Users"     (identity('authenticated'))
    Modification         → "Admins Only"             (false)
    Default Submission Access → "Owner or Support"   (owner OR team Support)

  Form policies (override kapp defaults):
    Display              → (inherits Kapp Display)
    Modification         → "Admins Only"             (false)

Risk findings:
  ⚠ Policy "Owner or Support" references team('Support') — no team named "Support" found in space. The team part of this rule will never match.
  ✓ No use of profileAttributes — admin-set attributes only.
  ✓ Submission Modification explicitly restricted.

Effective access for alice (as queried via --as alice):
  Kapp Display:         ✓
  Kapp Modification:    ✗ (rule: false)
  Form Display:         ✓ (inherits)
  Submission abc-123:
    Access:             ✓ (owner — alice created this submission)
    Modification:       ✗ (no form-level modification policy; defaults to admins-only)
    Support:            ✗ (alice not in Support team — and team doesn't exist)
```

## Step 8: Suggest Fixes

When the audit surfaces issues:

```
Suggested fixes:
  1. Create the "Support" team referenced by "Owner or Support" policy, or update the rule
     to reference an existing team. As-written, this rule reduces to owner-only access.
     POST /app/api/v1/teams { "name": "Support" }

  2. Form Modification has no per-form override, so it inherits Kapp Modification = false.
     If submitters should be able to edit their own Draft submissions, define a "Submission
     Modification" policy on the form referencing identity('username') === submission('createdBy')
     AND submission('coreState') === 'Draft'.
```

## Critical Rules

- **Space admins ALWAYS bypass.** You cannot lock out admins, and an audit "as <admin>" always shows everything as Allow regardless of policy rules.
- **Policy expressions evaluate AFTER the database query.** Performance impact scales with result-set size, not request count.
- **`Display` failures poison `GET /kapps`.** A single failing kapp-Display policy returns 500 for the entire list to non-admin callers. Audit Display policies first when a kapp suddenly becomes invisible.
- **`include=authorization` reflects the requesting user.** To audit "as someone else," authenticate as them. Don't infer effective access from rule structure alone — bindings interact in non-obvious ways.
- **Renaming a policy definition orphans assignments.** The kapp/form `securityPolicies[]` array references the definition by name; renaming the definition breaks every assignment.

## Related

- `concepts/security-policies` — KSL language reference.
- `concepts/kapp-lifecycle` — how kapps assign policies.
- `commands/kinetic-policy` — generate new policy expressions.
- `platform/known-bugs` Bug 5 — the 500-instead-of-403 / GET-kapps poisoning bug.
