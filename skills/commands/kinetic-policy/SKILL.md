---
name: kinetic-policy
description: Build KSL security policy expressions for the Kinetic ABAC model
argument-hint: "<who should have access>"
user-invocable: true
---

# Build a Security Policy

The user describes an access control requirement in plain language. Generate the correct KSL (Kinetic Security Language) expression and explain where to apply it.

## Step 1: Read Reference

Read `skills/platform/users-teams-security/SKILL.md` for the full ABAC model, KSL functions, policy types, and experiment findings.

## Step 2: Understand the Requirement

Parse the user's description to determine:
- **Who** should have access (submitter, team, role, everyone, admins only)
- **What** resource (space, kapp, form, submission)
- **What action** (display/read, modify/update, create)

## Step 3: Build the KSL Expression

### Available KSL Functions

| Function | Returns | Example |
|---|---|---|
| `identity('authenticated')` | `true` if logged in | Gate all access |
| `identity('username')` | Current user's username | Match against fields |
| `identity('attributeValue', 'Dept', 'IT')` | `true` if user has attribute | Role-based access |
| `team('Team Name')` | `true` if user is member | Team-based access |
| `submission('createdBy')` | Submission creator's username | Owner-only access |
| `submission('values[Field]')` | Field value from submission | Data-driven access |
| `submission('anonymous')` | `true` if anonymous submission | Public form access |
| `submission('sessionToken')` | Session token for anonymous | Anonymous edit access |

### Key Rules

- **Space admins ALWAYS bypass all policies** — even `false`. You cannot lock out admins.
- `false` = admins only (nobody else can access)
- `true` = everyone can access
- Policy `name` is **immutable after creation** — choose carefully

### 9 Common Patterns

1. **Admins only:** `false`
2. **All authenticated users:** `identity('authenticated')`
3. **Specific team:** `team('Support Team')`
4. **Multiple teams:** `team('Support Team') OR team('IT Team')`
5. **Owner only:** `identity('username') = submission('createdBy')`
6. **Owner + team:** `identity('username') = submission('createdBy') OR team('Support Team')`
7. **Department match:** `identity('attributeValue', 'Department', 'IT')`
8. **Field-based:** `identity('username') = submission('values[Assigned To]')`
9. **Anonymous submitters:** `submission('anonymous') AND submission('sessionToken') != ""`

## Step 4: Determine Policy Type and Placement

### Policy Scopes

| Level | Display (Read) | Modification (Write) | Other |
|---|---|---|---|
| **Space** | Space Display | Space Modification | — |
| **Kapp** | Kapp Display | Kapp Modification | Form Creation, Default Form Display, Default Form Modification, Default Submission Access, Default Submission Modification, Submission Support |
| **Form** | Form Display | Form Modification | — |
| **Submission** | Submission Access | Submission Modification | — |

- **Kapp "Default" policies** cascade down to forms/submissions unless overridden at form level
- **Submission policies** control per-record access — most granular level
- `Submission Support` — who can see the support tab in the Kinetic UI

## Step 5: Output

```
Requirement: "Only the submitter and Support Team can view their tickets"

Policy Type: Submission Access (on the tickets form)
KSL Expression:
  identity('username') = submission('createdBy') OR team('Support Team')

Apply at: Kapp → Default Submission Access
  (or Form-level if only for one specific form)

Name: "Submitter and Support Team Access"

Note: Space admins always bypass this policy.
```

### Setting Policies via API

Policies are set as security policy definitions on the kapp or form:

```
PUT /app/api/v1/kapps/{kapp}
{
  "securityPolicies": [{
    "name": "Submitter and Support Team Access",
    "type": "Submission Access",
    "message": "You do not have permission to view this submission",
    "rule": "identity('username') = submission('createdBy') OR team('Support Team')"
  }]
}
```

Warn the user: policy `name` cannot be changed after creation. Choose a clear, descriptive name.
