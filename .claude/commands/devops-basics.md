---
description: 10 DevOps basics — CI/CD, Docker, logging, health checks, versioning, and backups. Ship reliably instead of deploying by hand and hoping.
---

## Skill: devops-basics

When to use: setting up deployment, automating builds, containerizing an app, or reviewing anything that ships to production. Apply when deploys are manual, scary, or "works on my machine" only.

These 10 rules turn "I copy files to the server" into a repeatable pipeline. If a rule doesn't apply, say why.

### Automate the pipeline
1. **Automate build and test (CI).** Every push should trigger a build and the test suite automatically — never "it passed on my laptop." A red build blocks the merge. No one merges without green checks.
2. **Make deploys one command (CD).** Deploying should be `git push` or one button, not a 20-step checklist from memory. Script every step: build, migrate, restart, verify. If a human has to remember the order, it will break at 2 AM.
3. **Containerize with Docker.** "Works on my machine" dies when the app ships with its own environment. Write a Dockerfile that builds from a pinned base image, installs only what's needed, and runs as a non-root user. One image, same behavior everywhere.

### Ship safely
4. **Version your API.** Clients depend on your endpoints. Keep versions explicit (`/v1`, `/v2`); never silently change a response shape. Deprecate with a sunset date and give callers time to migrate. Use semantic versioning (MAJOR.MINOR.PATCH) so a version number tells the story.
5. **Migrate the database, don't hand-edit it.** Every schema change is a versioned migration file, applied in order, reversible where possible. Never `ALTER TABLE` on production by hand. Test migrations on a copy first — a failed migration at deploy time is an outage.
6. **Keep rollbacks ready.** Every deploy must be undoable in minutes. Keep the previous image/build tagged, keep migrations reversible, and practice the rollback path before you need it. A deploy you can't roll back is a gamble.

### Watch it in production
7. **Add health checks.** Your app should answer "am I alive?" on a `/health` endpoint — and "am I ready?" separately if startup takes time. The platform (Docker, K8s, load balancer) uses these to restart sick instances and stop sending traffic to unready ones.
8. **Log so you can debug later.** Log to stdout in a structured format (JSON), one event per line, with timestamps and request IDs. Never log secrets. If you can't reconstruct what happened from the logs, the logs are decoration.
9. **Alert on what matters.** Alert on symptoms users feel (errors spiking, latency climbing, health check failing) — not on every metric wiggle. Every alert must have an owner and a runbook link. An alert nobody acts on is noise; delete it or fix the threshold.

### Don't lose data
10. **Back up before you need it.** Backups run automatically, on a schedule, and are tested by restoring — an untested backup is a hope, not a backup. Keep the 3-2-1 shape in mind: 3 copies, 2 different media, 1 offsite. Know your RPO (how much data you can lose) and RTO (how fast you must recover).

### Quick check before shipping
- [ ] Push triggers build + tests automatically (CI green before merge)
- [ ] Deploy is one command, fully scripted
- [ ] App runs in Docker from a pinned base image, non-root user
- [ ] API versions are explicit; breaking changes get a new version
- [ ] Schema changes are migration files, tested before production
- [ ] Previous build is tagged and rollback is practiced
- [ ] `/health` endpoint exists and is wired to the platform
- [ ] Logs are structured, timestamped, secret-free
- [ ] Alerts fire on user-facing symptoms with an owner
- [ ] Backups run on schedule and restores have been tested

### Learn more (official sources)
- CI/CD concepts: https://docs.github.com/en/actions
- Dockerfile best practices: https://docs.docker.com/build/building/best-practices/
- Semantic versioning: https://semver.org/
- Health checks: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Backup rule 3-2-1: https://www.nakivo.com/blog/knowledge-base/3-2-1-backup-rule/

Apply this playbook to the following: $ARGUMENTS
