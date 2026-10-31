---
name: owasp-top10
description: OWASP Top 10 web security risks — check every app against these before shipping. The industry standard for web security.
---

## Skill: owasp-top10

When to use: building, reviewing, or auditing any web application or API.

The OWASP Top 10 is the industry-standard list of the most critical web security risks. Check every app against these before shipping.

### The 10 risks (2021 edition)
1. **Broken Access Control.** Users can act outside their permissions. Fix: deny by default; check ownership on every request; never rely on client-side hiding.
2. **Cryptographic Failures.** Sensitive data exposed or weakly protected. Fix: encrypt in transit (TLS) and at rest; use strong algorithms; never store plain-text secrets.
3. **Injection.** Untrusted data sent to an interpreter (SQL, NoSQL, OS, LDAP). Fix: parameterized queries; validate and sanitize all input; least-privilege DB accounts.
4. **Insecure Design.** Missing or ineffective security controls by design. Fix: threat-model new features; use secure design patterns; write abuse cases.
5. **Security Misconfiguration.** Default configs, open cloud storage, verbose errors, missing headers. Fix: hardened configs; remove defaults; minimal error details; security headers.
6. **Vulnerable Components.** Outdated libraries with known CVEs. Fix: inventory dependencies; patch promptly; remove unused packages.
7. **Authentication Failures.** Weak login, session, or credential handling. Fix: MFA where possible; strong password policy; secure session management; rate-limit logins.
8. **Software & Data Integrity Failures.** Unverified updates, CI/CD tampering, insecure deserialization. Fix: verify signatures; secure pipelines; avoid deserializing untrusted data.
9. **Logging & Monitoring Failures.** Breaches go undetected. Fix: log auth events, input validation failures, and access-control denials; alert on anomalies; retain logs securely.
10. **Server-Side Request Forgery (SSRF).** App fetches attacker-chosen URLs. Fix: validate and whitelist URLs; block internal network access; disable unused URL schemas.

### Quick check before shipping
- [ ] Access control tested (try accessing another user's data)
- [ ] No secrets in code, logs, or URLs
- [ ] All inputs validated; queries parameterized
- [ ] Dependencies up to date; no known CVEs
- [ ] Auth endpoints rate-limited; sessions secure
- [ ] Errors don't leak stack traces or internals
- [ ] Security headers set (CSP, HSTS, X-Frame-Options)

### Learn more
- OWASP Top 10: https://owasp.org/Top10/
- Cheat Sheet Series: https://cheatsheetseries.owasp.org/
- Test your app: https://github.com/OWASP/wstg
- Practice: https://github.com/juice-shop/juice-shop

Apply this playbook to the following: $ARGUMENTS
