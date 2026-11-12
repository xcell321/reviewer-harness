---
name: owasp-top10
description: OWASP Top 10 web security risks — check every app against these before shipping. The industry standard for web security.
---

## Skill: owasp-top10

When to use: building, reviewing, or auditing any web application or API.

The OWASP Top 10 is the industry-standard list of the most critical web security risks. Check every app against these before shipping.

### The 10 risks (2021 edition)
1. **Broken Access Control.** Users can act outside their permissions. Fix: deny by default; check ownership on every request; never rely on client-side hiding. *Source: https://owasp.org/Top10/A01_2021-Broken_Access_Control/*
2. **Cryptographic Failures.** Sensitive data exposed or weakly protected. Fix: encrypt in transit (TLS) and at rest; use strong algorithms; never store plain-text secrets. *Source: https://owasp.org/Top10/A02_2021-Cryptographic_Failures/*
3. **Injection.** Untrusted data sent to an interpreter (SQL, NoSQL, OS, LDAP). Fix: parameterized queries; validate and sanitize all input; least-privilege DB accounts. *Source: https://owasp.org/Top10/A03_2021-Injection/*
4. **Insecure Design.** Missing or ineffective security controls by design. Fix: threat-model new features; use secure design patterns; write abuse cases. *Source: https://owasp.org/Top10/A04_2021-Insecure_Design/*
5. **Security Misconfiguration.** Default configs, open cloud storage, verbose errors, missing headers. Fix: hardened configs; remove defaults; minimal error details; security headers. *Source: https://owasp.org/Top10/A05_2021-Security_Misconfiguration/*
6. **Vulnerable Components.** Outdated libraries with known CVEs. Fix: inventory dependencies; patch promptly; remove unused packages. *Source: https://owasp.org/Top10/A06_2021-Vulnerable_and_Outdated_Components/*
7. **Authentication Failures.** Weak login, session, or credential handling. Fix: MFA where possible; strong password policy; secure session management; rate-limit logins. *Source: https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/*
8. **Software & Data Integrity Failures.** Unverified updates, CI/CD tampering, insecure deserialization. Fix: verify signatures; secure pipelines; avoid deserializing untrusted data. *Source: https://owasp.org/Top10/A08_2021-Software_and_Data_Integrity_Failures/*
9. **Logging & Monitoring Failures.** Breaches go undetected. Fix: log auth events, input validation failures, and access-control denials; alert on anomalies; retain logs securely. *Source: https://owasp.org/Top10/A09_2021-Security_Logging_and_Monitoring_Failures/*
10. **Server-Side Request Forgery (SSRF).** App fetches attacker-chosen URLs. Fix: validate and whitelist URLs; block internal network access; disable unused URL schemas. *Source: https://owasp.org/Top10/A10_2021-Server-Side_Request_Forgery_%28SSRF%29/*

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
