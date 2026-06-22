---
name: sso-and-identity
description: "Use when configuring SSO/SAML/OAuth/OIDC identity providers for a Kinetic space — IdP-managed user lifecycle, JIT provisioning, attribute mapping, the relationship between SSO identity and the underlying Kinetic user record, Basic Auth fallback for service accounts, and the SSO-vs-API-key distinction (the platform issues no per-user PATs)."
---

# SSO and Identity

This skill covers how Kinetic spaces integrate with external identity providers (SAML, OAuth/OIDC, LDAP) and how that interacts with the underlying user record system. It does NOT cover security policies (`concepts/security-policies` is authoritative for KSL access rules) — this is the identity layer that feeds policies; security policies are the authorization layer that consumes identity.

## What Kinetic Issues vs. What It Doesn't

- **Kinetic issues:** Kinetic user records (`/users`), passwords (for users who have local auth enabled), session cookies, and OAuth bearer tokens for the **Integrator API only**.
- **Kinetic does NOT issue:** per-user Personal Access Tokens (PATs), API keys, machine-to-machine credentials. There is no "API key only" account type.
- **Implication for service accounts:** create a regular Kinetic user with a strong password, mark `spaceAdmin: true` if appropriate, and use **Basic Auth** for Core/Task API access. This is the only mechanism for machine-to-machine API use. See `concepts/users-and-teams` "Service Accounts" for the pattern.

---

## Authentication Modes

A Kinetic space can have any combination of these active simultaneously:

| Mode | Used for | Configuration |
|---|---|---|
| **Local password** | Direct portal login with the password stored on the user record | Always available unless the user has `enabled: false` |
| **SAML 2.0 SSO** | Browser SSO with an enterprise IdP (Okta, Azure AD, Ping, ADFS) | Space-level config in the Console under Security / SAML |
| **OIDC / OAuth 2.0** | Browser SSO with a modern OAuth provider | Space-level config |
| **LDAP** | Direct credential validation against an LDAP/AD directory | Space-level config; users still need Kinetic user records, but password validation is delegated |
| **Basic Auth on API** | Server-to-server API calls; the only API auth for Core/Task | Always available for users with a local password |
| **OAuth bearer (Integrator)** | Integrator API only — separate API surface | `client_id=system` implicit grant; see `api/authentication` |

Pick the right combination per environment: a typical enterprise deployment is SAML SSO for the portal + Basic Auth on the Core API for service accounts.

---

## SAML 2.0 — Configuration Shape

Configuration is space-level. Set via the Console (`Space > Security > SAML`) or via the Space PUT:

```
PUT /app/api/v1/space
{
  "attributesMap": {
    "SAML Enabled": ["true"],
    "SAML Entity ID":          ["https://kinetic.example.com/space-name"],
    "SAML SSO URL":            ["https://idp.example.com/sso/saml"],
    "SAML SLO URL":            ["https://idp.example.com/slo/saml"],
    "SAML Certificate":        ["-----BEGIN CERTIFICATE-----\n..."],
    "SAML Signature Algorithm":["RSA-SHA256"]
  }
}
```

Attribute names are platform-defined; check the Console field labels to confirm the exact attribute keys for your platform version. The IdP needs:

- **SP Entity ID:** what Kinetic identifies as in the SAML request (`SAML Entity ID` above).
- **ACS URL (Assertion Consumer Service):** `https://<space>.kinops.io/app/oauth/saml/consume` (or `/kinetic/<space>/app/oauth/saml/consume` for customer-managed).
- **NameID format:** typically `emailAddress` or `persistent`. The value becomes the Kinetic username on JIT provisioning if you don't override with an attribute.
- **Required SAML attributes:** at minimum `email`. Optional: `displayName`, `givenName`, `familyName`, and any custom attributes you want to flow into Kinetic user attributes (see Attribute Mapping below).

---

## OIDC / OAuth — Configuration Shape

For OIDC providers (Auth0, Okta OIDC, Google Workspace, Azure AD OIDC mode):

```
PUT /app/api/v1/space
{
  "attributesMap": {
    "OIDC Enabled":          ["true"],
    "OIDC Issuer":           ["https://login.example.com/realms/main"],
    "OIDC Client Id":        ["kinetic-portal"],
    "OIDC Client Secret":    ["<secret>"],
    "OIDC Scopes":           ["openid profile email"],
    "OIDC Redirect URI":     ["https://<space>.kinops.io/app/oauth/oidc/callback"]
  }
}
```

The flow uses authorization code with PKCE in modern platform versions. Tokens are validated against the issuer's JWKS; the platform extracts claims for username/email and persists a Kinetic user record on first login (JIT).

---

## JIT Provisioning

When a user authenticates via SSO for the first time and **`enableSsoJitProvisioning`** is true on the space (default behavior in most platform versions), Kinetic creates a user record with:

- `username` ← SAML NameID or OIDC `preferred_username` / `sub`
- `email` ← SAML `email` attribute or OIDC `email` claim
- `displayName` ← `displayName` / `name` / first+last claim
- `spaceAdmin` ← `false` (always — JIT never auto-grants admin)
- `enabled` ← `true`
- `allowedIps` ← `null`

Subsequent logins update the user record's last-login attributes but do NOT overwrite username/email — those are immutable after first login. If the IdP changes someone's email, the Kinetic record carries the original; address by manually updating the user.

**Memberships and attributes are NOT JIT-provisioned by default.** A user logs in, gets a record, and has zero team memberships and no Kinetic-stored attributes. Two ways to handle:

1. **Attribute mapping** (next section) — propagate SAML/OIDC attributes into Kinetic user attributes on every login.
2. **Onboarding workflow** — bind a workflow to the `User Created` event that assigns memberships based on the user's attributes (e.g. derive team from `Department`).

---

## Attribute Mapping

To flow IdP attributes into Kinetic user attributes, configure the mapping at the space level. The exact attribute names depend on platform version; common shape:

```
{
  "SAML Attribute Map": [
    "{\"saml\": \"http://schemas.microsoft.com/ws/2008/06/identity/claims/role\", \"user\": \"Role\"}",
    "{\"saml\": \"http://schemas.xmlsoap.org/ws/2005/05/identity/claims/department\", \"user\": \"Department\"}",
    "{\"saml\": \"http://schemas.example.com/employeeId\", \"user\": \"Employee Id\"}"
  ]
}
```

Each entry maps a SAML claim URI (or OIDC claim name) to a Kinetic user attribute name. **The target user attribute must have a definition** (`POST /userAttributeDefinitions`) — if it doesn't, the value is silently dropped on login.

Mapping runs on every login, not just JIT. If an IdP attribute changes (the user moves teams in the directory), the next portal login propagates the change into the Kinetic user record.

**Memberships from groups** is a special case. Most platform versions support a `SAML Group Attribute` config that pulls a multi-value SAML claim and maps each group string to a Kinetic team membership. Format and exact behavior depend on platform version — check the Console docs for your install.

---

## SSO + Basic Auth Coexistence

Enabling SSO does NOT disable Basic Auth on the Core/Task API. Both work for the same user record:

- A user can SSO into the portal (browser session) AND a script can Basic-Auth against the API as the same user with the user's local password — if the user has one.
- For SSO-only users (provisioned via JIT, no local password), Basic Auth against the API fails with 401. To enable Basic Auth for such a user, an admin must set a password explicitly.

The pattern for service accounts in an SSO environment:

1. Create a regular user manually (`POST /users`) with a strong local password.
2. Mark it appropriately (`spaceAdmin: true` if needed; or a dedicated `Service Account: true` attribute that policies key off).
3. Do NOT enroll the service account in the IdP. It only ever authenticates via Basic Auth on the API.
4. Document which scripts use which service account; rotate passwords on a schedule.

---

## Single Logout (SLO)

Some platform versions support SAML SLO — clicking Sign Out in the Kinetic portal triggers an SLO request back to the IdP, which can then sign the user out of every connected SP. Configuration mirrors SSO (separate SLO URL on the IdP side). OIDC has a similar "end_session_endpoint" pattern.

If SLO is misconfigured, the symptom is: the user clicks Sign Out, Kinetic redirects to the IdP, and the IdP either errors or redirects to a generic page. Test SLO end-to-end before enabling it in production.

---

## Allowed IPs

A separate per-user `allowedIps` field (CIDR list) gates ALL access — including SSO. If `allowedIps` is set and the user's source IP isn't in the list, login fails regardless of credentials or IdP assertions. Useful for admin-account hardening; brittle if applied broadly.

```
PUT /app/api/v1/users/{username}
{
  "allowedIps": "10.0.0.0/8,192.168.1.42/32"
}
```

Comma-separated CIDRs. An empty string or null means "no IP restriction." The platform doesn't validate the CIDR shape on write; a typo silently locks the user out.

---

## Troubleshooting

| Symptom | Likely cause | Investigation |
|---|---|---|
| SSO login redirects then lands on a Kinetic error page | SAML response signature failure, clock skew, or NameID format mismatch | Inspect the SAML response in the browser dev tools; check the IdP's signing cert matches what's configured; check server clock |
| User logs in but has no memberships | Group mapping not configured, or the group claim isn't in the SAML response | Inspect the SAML response for the expected group claim; verify `SAML Group Attribute` config |
| Attribute mapping doesn't populate | Target attribute definition doesn't exist | `GET /userAttributeDefinitions` — confirm the target attribute is defined |
| User created via JIT but `email` is empty | IdP didn't send the `email` attribute | Add `email` to the SAML claims sent by the IdP; without it the user record is partial |
| Basic Auth works for some users, not others | SSO-only users have no local password | Set a password manually for users that need API access |
| Session expires mid-portal-action | SSO session cookie expired; Kinetic session also expired | Verify the IdP session lifetime ≥ Kinetic session lifetime, or implement silent token refresh |
| 500 on first SSO login attempt | Often a missing user attribute definition referenced in the mapping config | Check server logs (or LogHub if available); add the missing attribute definition |

---

## Common Mistakes

- **Mapping IdP attributes to userProfile attributes.** `userProfile` attributes are user-controllable; an IdP-flowed value can be overwritten by the user via `PUT /me`. Always flow IdP attributes to `attributes` (admin-controllable), never `profileAttributes`.
- **Trusting `email` for identity.** Email addresses change. Use the IdP's stable identifier (`sub` in OIDC, persistent NameID in SAML) for the Kinetic username, and treat email as a display attribute that can be updated.
- **Provisioning admin via JIT.** JIT cannot set `spaceAdmin: true`. Bootstrap admins are created locally; SSO users are elevated via `PUT /users/{username}` after first login.
- **Forgetting service-account password rotation.** Service accounts are local users; their passwords don't rotate via the IdP. Schedule rotation explicitly.
- **Setting `allowedIps` on the service account that owns automation.** If the automation runs from a CI box, restrict to that CI's egress IP — not your office network.

---

## Related Skills

- `api/authentication` — Basic Auth + Integrator OAuth flows; SAML/OIDC are described there at a high level.
- `concepts/users-and-teams` — user CRUD, memberships, attribute manipulation.
- `concepts/attribute-definitions` — attribute definition CRUD that mapping depends on.
- `concepts/security-policies` — how identity (from SSO) feeds policy evaluation.
- `platform/known-bugs` — auth-related bugs surface here.
