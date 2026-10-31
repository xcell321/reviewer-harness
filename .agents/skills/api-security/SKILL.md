---
name: api-security
description: 12 API security rules — apply to every backend endpoint you build or review. No anonymous backdoors, no leaked secrets.
---

## Skill: api-security

When to use: building or reviewing any API — REST, GraphQL, or internal endpoints.

Apply these 12 rules to every endpoint. If a rule doesn't apply, say why.

### Authentication & Access
1. **Authenticate every call.** No anonymous backdoors. Every endpoint requires a valid credential — no "internal" or "debug" routes left open.
2. **Check object access.** Verify the caller owns the resource: *your* ID, not anyone's ID. Never trust an ID from the request without checking ownership.
3. **Use least-privilege keys.** Read-only keys where possible. Separate keys per environment. Never reuse an admin key for a client.

### Input & Transport
4. **Validate input.** Reject what you didn't expect. Whitelist shapes with a schema (e.g. Zod); never trust raw request bodies, query params, or headers.
5. **HTTPS only.** No plain-text tokens, ever. Redirect HTTP to HTTPS. Set Secure cookies.
6. **No secrets in URLs.** URLs end up in logs, browser history, and referrer headers. Put tokens in headers, never in query strings or paths.

### Tokens & Sessions
7. **Short-lived tokens.** Leaks expire fast. Access tokens in minutes, refresh tokens in days — never permanent. Rotate on sensitive actions.
8. **Rate limit.** Slow down brute force. Throttle auth endpoints aggressively (e.g. 5 attempts/minute); throttle the rest by reasonable use.

### Observability & Hygiene
9. **Log auth failures.** Spot attacks early. Log failed logins, invalid tokens, and permission denials with IP and timestamp — but never log the secret itself.
10. **Version your API.** Retire old weak endpoints. Keep `/v1`, `/v2` explicit; deprecate with a sunset date, don't silently change behavior.
11. **Limit response data.** Send only what's needed. Don't return full user objects, internal IDs, or stack traces to clients. Filter fields per role.
12. **Inventory endpoints.** You can't guard what you forgot. Keep a list of every route; audit it when adding features. Remove dead endpoints.

### Quick check before shipping
- [ ] Every route has auth (or a documented reason it doesn't)
- [ ] IDs in requests are ownership-checked
- [ ] Inputs are schema-validated
- [ ] No secrets in URLs or logs
- [ ] Auth endpoints are rate-limited

Apply this playbook to the following: $ARGUMENTS
