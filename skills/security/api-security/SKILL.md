---
name: api-security
description: 17 API security rules — apply to every backend endpoint you build or review. No anonymous backdoors, no leaked secrets.
version: 1.1.0
---

## Skill: api-security

### Purpose

17 API security rules for every backend endpoint, covering authentication and access, input and transport, tokens and sessions, observability, configuration, queries, and client-trust failures.
It prevents anonymous backdoors and leaked secrets.

### When to use

When to use: building or reviewing any API — REST, GraphQL, or internal endpoints.

| Trigger | Example |
| --- | --- |
| Building any API | "Add a REST endpoint for orders" |
| Reviewing any API | "Review this GraphQL endpoint for security" |
| Adding an internal endpoint | "Add an internal endpoint for sync jobs" |

Do NOT use when: the job is a full web-application risk audit (`owasp-top10`), API design and shape (`api-design`), or general Node.js code quality (`nodejs-quality`) — those skills own those cases instead.

### Rules

Apply these 17 rules to every endpoint. If a rule doesn't apply, say why.

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

### Configuration & Queries (added 2026-11-10 — the effectiveness test caught real flaws these rules did not cover)
13. **Restrict CORS to named origins — never `*`, never `*` with credentials.** A wildcard CORS policy lets any website read your users' authenticated responses. Name the exact origins the API serves; `Access-Control-Allow-Origin: *` combined with `Access-Control-Allow-Credentials: true` is a fail on sight. Test it in CI: send `Origin: https://evil.example` and fail if that origin is reflected. Note: the browser enforces this too — for a credentialed request the server must name an explicit origin, never `*`; if it sends `*` anyway, the browser blocks the response entirely (MDN CORS / Fetch Standard).
*Source: OWASP API Security Top 10 2023, API8:2023 Security Misconfiguration — "CORS accepting any origin with credentials" is a named example of the risk.*
14. **Use parameterized queries — never build queries by string concatenation.** Concatenating user input into a query string lets an attacker inject SQL (or NoSQL/OS/LDAP commands) as code. Use prepared statements / parameterized queries for every database call so input is always data, never syntax. The same ban covers ORM raw-query escape hatches (`sequelize.query()`, `.raw()`, `find_by_sql`) that accept a plain string.
*Source: OWASP Top 10 2021, A03:2021 Injection — parameterized queries (prepared statements) are the primary prevention for injection.*

### Never trust the client (added 2026-11-13 — gap check against the failures that actually ship in AI-built apps: in each rule below, something the client sent was treated as truth)
15. **A public env prefix makes the value public — never put a secret behind one.** Anything named `VITE_*` (Vite) or `NEXT_PUBLIC_*` (Next.js) is inlined into the JavaScript bundle every visitor downloads; minification and source-map settings do not hide it. Only values designed to be public may carry the prefix: API URLs, the Supabase anon/publishable key, a Stripe publishable key. A real secret that ever shipped with the prefix — a Supabase service_role key, an LLM API key, a Stripe secret key — is already public: move it behind a server route or Edge Function and rotate it.
*Source: Vite documentation, "Env Variables and Modes" — only variables prefixed with `VITE_` are exposed to client code, and "`VITE_*` variables should not contain any sensitive information"; OWASP API Security Top 10 2023, API8:2023 Security Misconfiguration.*
16. **Reject mass assignment — never bind a request body straight onto a record.** If an update accepts the raw body, a client can add fields the UI never sends: `role: "admin"`, `is_verified: true`, `balance: 999999`. Allowlist the exact fields each write endpoint accepts, reject unknown fields, and set server-owned fields (role, status, owner, timestamps) only on the server. The same rule covers money: a checkout total is computed on the server from product IDs, never taken from a price field in the request.
*Source: OWASP API Security Top 10 2023, API3:2023 Broken Object Property Level Authorization — the mass-assignment half (API3 merges the 2019 Excessive Data Exposure and Mass Assignment categories); CWE-915.*
17. **If the browser talks to the database, the database is the authorization layer.** When clients query Supabase or Firebase directly there is no API layer left to check ownership (rule 2) — the database policies are the only check. Enable Row Level Security on every client-exposed table (enabled with no policies = deny-all, the safe default), scope policies to the caller (`auth.uid() = user_id`), and include WITH CHECK on INSERT/UPDATE policies so a user cannot write rows under someone else's ID. A table with RLS off, or a per-user table with a `using (true)` policy, is a launch blocker. The anon key is public by design — the policy is the lock — and the service_role key bypasses RLS entirely, so it never reaches a client (rule 15).
*Source: Supabase documentation, "Row Level Security"; PostgreSQL documentation, "Row Security Policies".*

### Validation gate

Before reporting the task done, check each line against the actual work:

- [ ] Every route has auth (or a documented reason it doesn't)
- [ ] IDs in requests are ownership-checked
- [ ] Inputs are schema-validated
- [ ] No secrets in URLs or logs
- [ ] Auth endpoints are rate-limited
- [ ] CORS names exact origins (no `*`, no `*` + credentials)
- [ ] Every query is parameterized (no string concatenation into SQL)
- [ ] No real secret sits behind a `VITE_` / `NEXT_PUBLIC_` prefix
- [ ] Write endpoints allowlist fields — `role`, `status`, `price` cannot arrive from a request body
- [ ] Every client-exposed table has RLS enabled, policies scoped to `auth.uid()`

### Examples

**Do:** Require a valid credential on every endpoint, check that the caller owns the requested ID, and put the token in a header over HTTPS.

**Do not:** Leave an internal or debug route open without auth, trust an ID from the request without checking ownership, or put a token in a query string.

### Sources

- Rules 1–12 originate from the "12 API Security Rules" reel by Code Crack — the reel is their origin; their detailed wording in this file is general practice. Rules 13–17 cite their sources inline (OWASP; Vite, Supabase and PostgreSQL documentation).
- OWASP API Security Top 10: https://owasp.org/API-Security/
- OWASP Cheat Sheet Series (API Security): https://cheatsheetseries.owasp.org/
- OWASP Web Security Testing Guide: https://github.com/OWASP/wstg
- Practice on a vulnerable API: https://github.com/OWASP/crAPI
- Prevent committing secrets: https://github.com/awslabs/git-secrets

### Changelog

- 1.1.0 — 2026-11-13 — Added rules 15–17 ("Never trust the client"): public env-prefix secrets, mass assignment + server-side checkout pricing, RLS as the authorization layer. Effect-tested against a seeded vulnerable sample (baseline vs new audit).
- 1.0.0 — 2026-11-13 — Template retrofit; rules unchanged.
