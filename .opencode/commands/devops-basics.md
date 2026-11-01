---
description: 10 DevOps rules distilled from nodebestpractices (105k stars) — Docker images, graceful shutdown, health checks, smart logging, and memory guards. Ship reliably instead of deploying by hand and hoping.
---

## Skill: devops-basics

When to use: containerizing an app, setting up deployment, adding observability, or reviewing anything that ships to production. Apply when deploys are manual, scary, or "works on my machine" only.

Every rule below is distilled from a reputable open-source repo (cited per rule). If a rule doesn't apply, say why.

### Build lean images
1. **Ship small base images.** A full Node.js image (~345MB) is roughly 10× the weight of its Alpine variant (~39MB); Slim is similarly tiny (~38MB). Smaller images pull faster, start faster, use less storage, and shrink the attack surface — fewer packages, fewer vulnerabilities. If the minimal image lacks build tools, install them in a separate build stage.
*Source: goldbergyoni/nodebestpractices — `sections/docker/smaller_base_images.md`*

2. **Prefer COPY over ADD; keep builds reproducible.** COPY only copies local files; ADD can silently fetch remote binaries — a supply-chain risk. Never run `apt-get update` inside the build: it produces a different image every time and needs elevated privileges. Use base images that their maintainers update frequently instead.
*Source: goldbergyoni/nodebestpractices — `sections/docker/generic-tips.md`*

3. **Run unprivileged and inspect what you ship.** Privileged containers have root-equivalent power over the host — almost never needed; use the `node` user baked into official Node images. Builds leak secrets and bloat (leftover files, dev dependencies) — inspect the final image with a tool like Dive to catch both.
*Source: goldbergyoni/nodebestpractices — `sections/docker/generic-tips.md`*

### Shut down like a professional
4. **Handle SIGTERM gracefully — don't let npm swallow it.** Orchestrators kill containers constantly (deploys, rescheduling, scaling) with SIGTERM and a ~30-second grace period. The app must: stop accepting new requests, finish in-flight ones, release resources, log, then exit. Anti-pattern: `CMD ["npm", "start"]` — npm sits between the signal and Node, so Node never receives it. Fix: `CMD ["node", "index.js"]` or run under Tini.
*Source: goldbergyoni/nodebestpractices — `sections/docker/graceful-shutdown.md`*

5. **Expose health checks so the platform routes around sickness.** The load balancer needs to know "don't send me traffic" during shutdown and "I'm broken, restart me" during failures. A `/health` (liveness) endpoint answers "am I alive?"; a readiness check answers "am I ready to serve?" Keep them lightweight — a health check that does heavy work becomes the outage.
*Source: goldbergyoni/nodebestpractices — `sections/docker/graceful-shutdown.md`*

6. **Keep a private ops endpoint — locked to admins.** Some diagnostics are app-specific (heap dumps, memory reports) and generic monitoring tools can't reach them. Expose them on a dedicated maintenance endpoint, but restrict it to admins — it can become a DDoS target. Use professional monitoring for the standard stuff; the custom endpoint is for the rest.
*Source: goldbergyoni/nodebestpractices — `sections/production/createmaintenanceendpoint.md`*

### Log so you can debug later
7. **Tag every log line with a request ID.** A production log is thousands of interleaved requests — without a shared ID you can't reconstruct one user's flow from the noise. Assign a unique transaction ID per request, attach it to every log statement, and propagate it downstream via an `x-transaction-id` header. In Node this needs AsyncLocalStorage (v14+) or a helper like cls-rtracer.
*Source: goldbergyoni/nodebestpractices — `sections/production/assigntransactionid.md`*

8. **Log structured, with context.** Format logs as JSON with timestamps, request IDs, user IDs, and operation types — readable by humans and machines. Log at transaction start and end so you can trace errors and spot the slowest endpoints. Never log secrets. If you can't reconstruct what happened from the logs, they're decoration.
*Source: goldbergyoni/nodebestpractices — `sections/production/smartlogging.md`*

### Guard the runtime
9. **Cap memory and hunt leaks.** Node's default heap target is ~1.5GB — on smaller machines cap it explicitly (e.g. `node --max_old_space_size=400 server.js`), because V8's stop-the-world garbage collector gets expensive near the limit. Prevent leaks: avoid globals, stream data instead of buffering it, scope with let/const. Find leaks by diffing heap dumps taken apart in time.
*Source: goldbergyoni/nodebestpractices — `sections/production/measurememory.md`*

10. **Monitor the four golden signals; save APM for scale.** Track error rate, latency, throughput, and saturation — plus Node specifics (process RAM, errors per minute, restarts). Full APM suites trace transactions end-to-end but carry a price tag: justified for large complex systems, overkill for a small app where the four signals plus good logs suffice.
*Source: goldbergyoni/nodebestpractices — `sections/production/monitoring.md`, `sections/production/apmproducts.md`*

### Also apply (general practice, beyond these repos)
- **Automate build + test on every push (CI)** — red build blocks the merge; nobody merges without green checks.
- **Version your API explicitly** (`/v1`, `/v2`) with semantic versioning; deprecate with a sunset date, never silently change shapes.
- **Migrate the database, don't hand-edit it** — versioned migration files, tested before production, reversible where possible.
- **Back up on a schedule and test the restore** — an untested backup is a hope, not a backup.

### Quick check before shipping
- [ ] Base image is Alpine/Slim (~40MB), built with COPY, no `apt-get update` inside
- [ ] Container runs as non-root user; final image inspected (no secrets, no bloat)
- [ ] App handles SIGTERM: drains requests, releases resources, exits cleanly
- [ ] `/health` endpoint exists, is lightweight, and is wired to the platform
- [ ] Every log line carries a request/transaction ID, propagated downstream
- [ ] Logs are JSON with timestamps and context; no secrets logged
- [ ] Memory is capped for the machine size; leak-hunting path is known
- [ ] Four golden signals are monitored with alerts on user-facing symptoms

### Learn more (official sources)
- Node.js best practices (105k stars): https://github.com/goldbergyoni/nodebestpractices
- Docker best practices: https://docs.docker.com/build/building/best-practices/
- Graceful shutdown in Node: https://github.com/goldbergyoni/nodebestpractices/tree/master/sections/docker
- Semantic versioning: https://semver.org/

Apply this playbook to the following: $ARGUMENTS
