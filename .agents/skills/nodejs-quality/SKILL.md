---
name: nodejs-quality
description: '93 Node.js backend rules distilled from nodebestpractices (105k stars) — the 62 quality rules (error handling, project structure, code style, testing, production, Node-specific security, Docker) plus the merged backend-performance (19) and devops-basics (12) rule sets. Excludes what system-design, api-security, and owasp-top10 cover.'
---

## Skill: nodejs-quality

### Purpose

93 checkable rules for writing and reviewing Node.js code — error handling, project structure, code style, testing, production, Node-specific security, and Docker, plus the merged Backend Performance and DevOps Basics rule sets. It prevents swallowed errors, thin tests, spaghetti structure, and production surprises.

### When to use

When to use: writing or reviewing Node.js code — a new endpoint, a new service, a refactor, or any time the question is "is this code correct, testable, and shippable?" — performance and deployment questions are covered by this skill's own merged sections (Backend Performance, DevOps Basics) below. Apply when errors are swallowed, tests are thin, files are spaghetti, or production surprises keep happening.

| Trigger | Example |
| --- | --- |
| Writing Node.js code | "Add a `GET /users/:id` endpoint" |
| Reviewing Node.js code | "Is this service correct, testable, and shippable?" |
| A performance or deployment question about a Node service | Covered by this skill's merged Backend Performance and DevOps Basics sections below |

Do NOT use when: the question is API security design (`api-security`), an OWASP web-application audit (`owasp-top10`), or architecture and scaling design (`system-design`) — this skill excludes what those cover and points to them instead.

### Rules

Every rule below is distilled from goldbergyoni/nodebestpractices (cited per rule: the `sections/` file and the README section). Nothing here is invented — if the repo doesn't cover a topic, it is labeled "general practice" instead. Rules covered by `system-design`, `api-security`, or `owasp-top10` are NOT repeated here; the skill points to them instead. (`backend-performance` and `devops-basics` were merged into this skill on 2026-11-13 — their rules are the two Merged sections at the end.)

### Error handling — the biggest gap
1. **Use async/await (or promises) for async errors — never callbacks.** Callbacks force error checks everywhere, nest deeply, and break try/catch flow. Async/await gives one try/catch for the whole chain plus `finally` for cleanup.
*Source: goldbergyoni/nodebestpractices — `sections/errorhandling/asyncerrorhandling.md` (README §2.1)*

2. **Throw one AppError type with name, HTTP code, and an `isOperational` flag — never strings, never a different class per error.** Throwing a string loses the stack trace; many error classes add nothing over one class with properties. Mark operational errors (known, understood — e.g. invalid input, failed HTTP call) `isOperational: true`; programmer errors (bugs — reading undefined, leaking pool) are unmarked and must crash the process, because the app may be in an inconsistent state.
*Source: goldbergyoni/nodebestpractices — `sections/errorhandling/useonlythebuiltinerror.md` (§2.2) + `sections/errorhandling/operationalvsprogrammererror.md` (§2.3)*

3. **Handle errors in one centralized handler object — never inside middleware.** The middleware only catches and forwards; the handler logs, fires metrics (Prometheus/CloudWatch/Sentry), and decides crash-vs-respond. Otherwise request errors, startup errors, cron-job errors, and queue-consumer errors each get handled differently.
*Source: goldbergyoni/nodebestpractices — `sections/errorhandling/centralizedhandling.md` (§2.4)*

4. **Document API errors in OpenAPI/Swagger (or GraphQL schema).** State every error status up front (e.g. 409 when the name already exists) so callers can render the right UX. A caller that doesn't know what errors can happen cannot be correct except by accident.
*Source: goldbergyoni/nodebestpractices — `sections/errorhandling/documentingusingswagger.md` (§2.5)*

5. **Subscribe to `uncaughtException` and `unhandledRejection`; crash on untrusted errors, log-and-continue on operational ones.** A promise rejection without `.catch` vanishes silently — the `unhandledRejection` handler is the safety net. On `uncaughtException`, run the centralized handler, then `process.exit(1)` unless the error is trusted/operational; run under a restarter (PM2/systemd/Kubernetes) so the crash restores clean state. **Security note:** never let invalid user input crash the process — validate first and wrap all routes with a catch, or an attacker can DoS you by sending the same crashing request repeatedly; alert at critical severity on every crash.
*Source: goldbergyoni/nodebestpractices — `sections/errorhandling/shuttingtheprocess.md` (§2.6) + `sections/errorhandling/catchunhandledpromiserejection.md` (§2.10) + README §6.23*

6. **Use a mature logger (Pino), never `console.log`.** Log frequently at levels (debug/info/error), with JSON context objects, and query/filter logs with the logger's API or a log viewer. (JSON structured format itself is covered by the DevOps Basics section below, rule 8 — this rule is about the logger choice.)
*Source: goldbergyoni/nodebestpractices — `sections/errorhandling/usematurelogger.md` (§2.7)*

7. **Test error flows, not just happy paths.** Assert that the right exception type is thrown, that the API returns the right HTTP error code, and that the logger records the mandatory fields (name, status, stack, message) on failure. Also test that uncaught exceptions reach the logger.
*Source: goldbergyoni/nodebestpractices — `sections/errorhandling/testingerrorflows.md` (§2.8)*

8. **Fail fast: validate arguments at the top of every function with a dedicated library (Joi/Zod/validator).** Missing or wrong-typed arguments cause hidden bugs far from the cause (e.g. a forgotten `discount` param silently redirecting a user). Assertions come first, logic second.
*Source: goldbergyoni/nodebestpractices — `sections/errorhandling/failfast.md` (§2.11)*

9. **Always `return await` a promise before returning it, and declare the returning function `async`.** Without `await`, the caller function disappears from the stack trace (V8's zero-cost async stack traces only extend the chain on `await`), leaving a partial trace. The microtask cost of one extra `await` is negligible next to network/DB latency.
*Source: goldbergyoni/nodebestpractices — `sections/errorhandling/returningpromises.md` (§2.12)*

10. **Subscribe to the `'error'` event on EventEmitters and streams — try/catch cannot catch them.** Emitters (DB connections, message queues) throw outside try/catch; an unhandled emitter error crashes the process, or worse leaves it alive as a zombie with a key function dead. For EventTargets (web-standard emitters) there is no `'error'` event — errors land on the global handler, so at least decide crash-vs-continue there. Also set `{captureRejections: true}` so errors from async event handlers are caught.
*Source: goldbergyoni/nodebestpractices — README §2.13 (no dedicated section file exists for 2.13 — README is the only source)*

### Project structure
11. **Structure by business components, not by technical role.** Root folders per domain (`orders/`, `users/`, `payments/`), each self-contained with its own API, logic, data access, and tests; other components consume it only through its public interface. Never group by role (`controllers/`, `services/`, `models/`) — that produces a spaghetti monolith where every change can affect anything.
*Source: goldbergyoni/nodebestpractices — `sections/projectstructre/breakintcomponents.md` (§1.1)*

12. **Layer each component in 3 tiers: entry-points → domain → data-access.** Entry-points adapt the payload (HTTP, queue, cron) and call the domain; domain holds pure logic on plain JS objects, never `req`/`res`; data-access talks to the DB behind a repository interface. Never pass web objects into the domain layer — it blocks reuse by tests, jobs, and queues.
*Source: goldbergyoni/nodebestpractices — `sections/projectstructre/createlayers.md` (§1.2)*

13. **Wrap shared utilities as their own npm packages.** Put reusable modules in `libraries/<name>/` with their own `package.json` (main/exports = public interface), consumable via npm link, ts-paths, or a private registry. This stops clients coupling to a module's internals and makes the utility replaceable later. Wrap third-party utilities too, so swapping the library touches one place.
*Source: goldbergyoni/nodebestpractices — `sections/projectstructre/wraputilities.md` (§1.3)*

14. **Use environment-aware, secure, hierarchical config.** Combine config files with env-var overrides; keep secrets out of committed code; group keys hierarchically; validate at startup and fail fast if a required variable is missing (e.g. convict, zod, env-var). Never let the app start, persist data, and only then discover a mandatory key is absent.
*Source: goldbergyoni/nodebestpractices — `sections/projectstructre/configguide.md` (§1.4)*

15. **Choose the framework on consequences, not hype.** Express = unmatched ecosystem but minimal (web server only, no native async-await, barely maintained); Nest.js = batteries-included/OOP, best for large apps that can't split into small components, but heavy and opinionated; Fastify = recommended for reasonably-sized components/microservices built on plain Node mechanics. Compare the top 4 (Nest, Fastify, Express, Koa) before committing.
*Source: goldbergyoni/nodebestpractices — `sections/projectstructre/choose-framework.md` (§1.5)*

16. **Use TypeScript for type safety — sparingly.** Type the variables and function return types; avoid its ~50 advanced keywords and OOP constructs (abstract classes, namespaces) unless a real need arises. Research shows types catch ~15–20% of bugs; the other ~80% need tests. Over-sophisticated typing increases complexity, which itself breeds bugs.
*Source: goldbergyoni/nodebestpractices — `sections/projectstructre/typescript-considerations.md` (§1.6)*

### Code style
17. **Run ESLint + Prettier, plus Node-specific ESLint plugins** (eslint-plugin-node, eslint-plugin-security, eslint-plugin-mocha/jest). ESLint catches real anti-patterns (e.g. throwing unclassified errors); Prettier owns formatting. Node plugins catch Node-only faults like `require(variable)` paths that let attackers execute arbitrary scripts. Put the opening brace on the same line and let the formatter own semicolons — ASI pitfalls (e.g. a line starting with `[` or `(` joining the previous statement) cause real syntax errors.
*Source: goldbergyoni/nodebestpractices — `sections/codestylepractices/eslint_prettier.md` (§3.1–3.2) + README §3.3–3.4*

18. **Name every function, including closures and callbacks.** Anonymous functions are invisible in memory snapshots and profilers; named functions make production debugging possible.
*Source: goldbergyoni/nodebestpractices — README §3.5 (no section file)*

19. **Follow naming conventions: `lowerCamelCase` for variables/functions, `UpperCamelCase` for classes, `UPPER_SNAKE_CASE` for globals/statics.** Descriptive but short. The convention is what lets a reader tell a class (needs instantiation) from a plain function at a glance.
*Source: goldbergyoni/nodebestpractices — README §3.6 (no section file)*

20. **Prefer `const`, then `let`, never `var`.** `const` prevents reusing one variable for different purposes; `let` is block-scoped for genuine reassignment; `var` is function-scoped and obsolete in ES6.
*Source: goldbergyoni/nodebestpractices — README §3.7 (no section file)*

21. **Require modules at the top of the file, never inside functions.** Top-level requires make dependencies visible at a glance, fail fast at startup if a module or its dependency throws, and avoid blocking requests with synchronous loads at critical moments.
*Source: goldbergyoni/nodebestpractices — README §3.8 (no section file)*

22. **Give every module/folder an explicit entry point.** `index.js` re-exporting the public API, `package.json` `main`, or ESM `exports` — clients must never deep-import internal files. The entry point is the public contract; internals can change without breaking callers.
*Source: goldbergyoni/nodebestpractices — README §3.9 (no section file)*

23. **Use `===`, never `==`.** `==` coerces types (`0 == ""` is true, `false == "0"` is true); `===` requires the same type. Coercion bugs are silent.
*Source: goldbergyoni/nodebestpractices — README §3.10 (no section file)*

24. **Never put side effects outside functions.** No network/DB calls at module top level — they run the moment another file requires the module, before the framework, env vars, and monitoring are initialized, and they can't be mocked in tests. Put them in explicitly-called functions; use a factory/revealing-module pattern if something must run at load.
*Source: goldbergyoni/nodebestpractices — README §3.13 (no section file)*

### Testing
25. **Write API (component) tests first — before unit tests.** API tests are the easiest to write and give more coverage than unit tests (even codeless via Postman). Only after API coverage exists, add unit, DB, and performance tests. Unit-test-only suites commonly reach ~20% system coverage after long effort.
*Source: goldbergyoni/nodebestpractices — README §4.1 (no section file)*

26. **Name every test in 3 parts and structure it AAA.** Name: (1) unit under test, (2) scenario, (3) expected result — e.g. "When no price is specified, then the product status is pending approval". Body: Arrange (setup), Act (one line executing the unit), Assert (one line checking the result). A failing test name must explain the failure without reading the test code.
*Source: goldbergyoni/nodebestpractices — `sections/testingandquality/3-parts-in-name.md` (§4.2) + `sections/testingandquality/aaa.md` (§4.3)*

27. **Each test adds and acts on its own DB rows — no global fixtures/seeds.** Shared seed data couples tests: one test mutating a row breaks another that assumed it. Seed only the read-only query suites if performance forces a compromise.
*Source: goldbergyoni/nodebestpractices — `sections/testingandquality/avoid-global-test-fixture.md` (§4.5)*

28. **Tag tests so subsets can run alone** (`#cold`, `#api`, `#sanity`; e.g. `mocha --grep 'sanity'`). Fast smoke/IO-less tests run on every save; full e2e runs on pull requests. Running the whole suite (dozens of DB queries) on every small change is so slow developers stop running tests.
*Source: goldbergyoni/nodebestpractices — README §4.6 (no section file)*

29. **Measure coverage and fail the build below a threshold.** Coverage (Istanbul/NYC) is free, shows coverage drops, and exposes wrong test patterns — e.g. uncovered `catch` clauses mean only happy paths are tested.
*Source: goldbergyoni/nodebestpractices — README §4.7 (no section file)*

30. **Refactor regularly with static analysis in CI.** SonarQube/Code Climate find cross-file smells ESLint can't (duplication, complexity), track history, and fail the build on new smells. Linting checks style in one file; static analysis checks quality across files.
*Source: goldbergyoni/nodebestpractices — `sections/testingandquality/refactoring.md` (§4.9)*

31. **Mock external HTTP services (nock/Mock-Server) and test middleware in isolation.** Intercept outgoing requests to simulate errors, delays, and timeouts — hitting real services makes tests slow, flaky, and happy-path-only. Compensate with a few contract/e2e tests so drift isn't missed. Middleware affects most requests but tests as a pure function: invoke it with mocked `{req, res}` (node-mocks-http) and assert the status/behavior.
*Source: goldbergyoni/nodebestpractices — `sections/testingandquality/mock-external-services.md` (§4.10) + `sections/testingandquality/test-middlewares.md` (§4.11)*

32. **Fixed port in production, randomized (ephemeral, port 0) in testing.** Tests start the server in-process; parallel test runners collide on a fixed port. Port 0 lets the OS assign a free one.
*Source: goldbergyoni/nodebestpractices — `sections/testingandquality/randomize-port.md` (§4.12)*

33. **Test all five outcomes of every flow:** (1) the response (data, schema, HTTP status), (2) the new state (was the DB actually updated?), (3) outgoing calls (SMS/email/payment), (4) messages placed on queues, (5) observability (error logged, metric fired). Asserting only the response misses silent persistence and integration failures.
*Source: goldbergyoni/nodebestpractices — `sections/testingandquality/test-five-outcomes.md` (§4.13)*

### Production — ship it right
34. **Delegate CPU-heavy work to a reverse proxy — never do it in Node.** Gzip, SSL termination, static files, throttling: nginx/HAProxy/cloud services. Node's single thread doing infrastructural work starves application code. Same for frontend assets: serve them from nginx/S3/CDN (exception: server-side rendering).
*Source: goldbergyoni/nodebestpractices — `sections/production/delegatetoproxy.md` (§5.3) + `sections/production/frontendout.md` (§5.11)*

35. **Lock dependencies and install with `npm ci`.** Commit `package-lock.json` (exact versions, `--save-exact`) so every environment runs identical code; `npm ci` fails on package.json/lockfile mismatch and wipes `node_modules` first, while `npm install` silently drifts. Otherwise QA approves one version and production runs another.
*Source: goldbergyoni/nodebestpractices — `sections/production/lockdependencies.md` (§5.4) + `sections/production/installpackageswithnpmci.md` (§5.19)*

36. **Guard uptime with the right tool for the host — one layer only.** Bare metal: PM2 or systemd (restart on failure, clustering). Docker/Kubernetes/ECS: let the orchestrator restart and relocate — adding PM2 inside hides failures from the platform so it can't mitigate. Never stack cluster managers, Docker, and PM2 together.
*Source: goldbergyoni/nodebestpractices — `sections/production/guardprocess.md` (§5.5) + README §8.3 (`sections/docker/restart-and-replicate-processes.md`)*

37. **Utilize all CPU cores.** A naive Node deploy uses 1 of 4+ cores (~25% of the machine). Bare metal: Node `cluster` module or PM2 to spawn a process per core; orchestrated: replicate instances (the platform won't verify core usage for you).
*Source: goldbergyoni/nodebestpractices — `sections/production/utilizecpu.md` (§5.6)*

38. **Write production-ready code from day 1: twelve-factor, no env-branching in tests, `--trace-sync-io`.** Follow the twelve-factor guide; make dev match prod (docker-compose) and run the same code in tests — never `if (isTest)` branches. Use `--trace-sync-io` to find sync APIs on the request path. (Statelessness, caching, memory, logging, and error strategy are covered by `system-design` / the DevOps Basics section below / the error-handling rules above — this rule is the twelve-factor + dev-prod parity + sync-IO detection core of §5.9.) **Note:** README §4.8 (production-like e2e env) is flagged incomplete by the repo itself ("Missed -continue here, needs content") — the docker-compose guidance above is the repo's own §5.9 wording.
*Source: goldbergyoni/nodebestpractices — `sections/production/productioncode.md` (§5.9) + README §4.8 (incomplete in source — flagged honestly)*

39. **Pin the runtime: same Node version everywhere, LTS only, `NODE_ENV=production`.** One version across dev, CI, and prod (nvm/Volta/`.nvmrc`, Dockerfile, CI file); LTS releases (even versions) get ≥18 months of security/bug fixes, Current does not. Set `NODE_ENV=production` — libraries like Express change behavior (caching, diagnostics) based on it, and omitting it can badly degrade performance.
*Source: goldbergyoni/nodebestpractices — `sections/production/setnodeenv.md` (§5.15) + `sections/production/LTSrelease.md` (§5.17) + README §4.4*

40. **Design automated, atomic, zero-downtime deployments.** Many small automated deploys (Docker + CI) beat rare big manual ones: no manual steps, no downtime. Long scary deployments → fewer deployments → fewer features and more risk per deploy.
*Source: goldbergyoni/nodebestpractices — README §5.16 (no section file)*

41. **Log to stdout/stderr only — never hard-code a log destination.** The execution environment (container/orchestrator) routes the stream to Splunk/Elasticsearch/etc. If the app logs straight to a remote store, crash-time logs that explain the problem never arrive, and changing destinations requires a code change and deploy.
*Source: goldbergyoni/nodebestpractices — `sections/production/logrouting.md` (§5.18)*

### Node-specific security extras
42. **Enforce security lint rules** (`eslint-plugin-security`, plus git hooks like pre-commit secret scans). The linter catches `eval`, child-process use, and variable-based `require()` while code is being written — cheap in dev, expensive in production.
*Source: goldbergyoni/nodebestpractices — `sections/security/lintrules.md` (§6.1)*

43. **Limit request payload size at the edge or in middleware.** A huge JSON body makes the single thread work hard per request — a cheap DoS with few requests. Cap body size via reverse proxy/firewall or `body-parser` limits.
*Source: goldbergyoni/nodebestpractices — `sections/security/requestpayloadsizelimit.md` (§6.14)*

44. **Never `eval`, `new Function`, or pass dynamic code to `setTimeout`/`setInterval` — and never `require()`/import a path built from user input.** Evaluated user input = arbitrary code execution on the server. The same ban extends to `fs.readFile()` and any sensitive resource access with dynamic user-supplied paths. `eslint-plugin-security` catches both patterns.
*Source: goldbergyoni/nodebestpractices — `sections/security/avoideval.md` (§6.15) + `sections/security/safemoduleloading.md` (§6.17)*

45. **Never hand-roll regex on user input — use validator.js or check with safe-regex.** One crafted input can block the event loop for seconds (a 10-word validation once blocked it for 6s; `moment` had a ReDoS CVE in 2017). ReDoS is a single-thread DoS.
*Source: goldbergyoni/nodebestpractices — `sections/security/regex.md` (§6.16)*

46. **Run untrusted/plugin code in a sandbox.** Isolate dynamically loaded code (plugins, loaders) via a dedicated child process (with time limits and crash recovery), a serverless function, or a sandbox package — otherwise a malicious plugin can infinite-loop, exhaust memory, or read `process.env` secrets.
*Source: goldbergyoni/nodebestpractices — `sections/security/sandbox.md` (§6.18)*

47. **Avoid child processes; when unavoidable, use `execFile` and sanitize input.** `exec` with shell expansion + unsanitized user input = remote command execution / shell injection / data loss. `execFile` runs one command with arguments and no shell expansion.
*Source: goldbergyoni/nodebestpractices — `sections/security/childprocesses.md` (§6.19)*

48. **Protect the npm supply chain: enable 2FA on npm/Yarn and never publish secrets.** A hijacked maintainer password lets an attacker inject malicious code into widely-installed packages (the eslint incident). Use `.npmignore` or the `package.json` `files` allowlist so secrets never reach the registry.
*Source: goldbergyoni/nodebestpractices — README §6.21 + `sections/security/avoid_publishing_secrets.md` (§6.25)*

49. **Validate redirect targets — never redirect to user-supplied URLs unchecked.** Unvalidated redirects enable phishing (crafted links posted on forums/social media that look like your domain) and credential theft.
*Source: goldbergyoni/nodebestpractices — `sections/security/saferedirects.md` (§6.24)*

50. **Import built-ins with the `node:` protocol** (`import { createServer } from "node:http"`). Without the prefix, a typo (`event` instead of `events`) can resolve to a malicious typosquat package. Enforce with the `prefer-node-protocol` ESLint rule.
*Source: goldbergyoni/nodebestpractices — README §6.27 (no section file)*

### Docker extras
51. **Use multi-stage builds.** Build in one stage (dev deps, build tools), copy only production artifacts (`dist/`, `package.json`, lockfile) into a slim runtime stage, then `npm ci --production`. Build-only tools carry vulnerabilities and build-time secrets that must never ship.
*Source: goldbergyoni/nodebestpractices — `sections/docker/multi_stage_builds.md` (§8.1)*

52. **Let the orchestrator replicate and restart — don't run PM2/cluster inside containers.** Kubernetes/ECS knows placement, spread, and crash relocation; an in-container process manager hides failures from it (a crashing container gets restarted in place instead of relocated to a roomy instance).
*Source: goldbergyoni/nodebestpractices — `sections/docker/restart-and-replicate-processes.md` (§8.3)*

53. **Keep secrets and dev files out of the image: `.dockerignore` + no build-time secrets.** `.dockerignore` must exclude `.env`, `.aws`, `.npmrc`, and dev artifacts (also speeds builds; copy explicitly, never `COPY . .` blindly). Never pass secrets as build args — they persist in image history; use multi-stage copy-and-delete or Docker BuildKit secrets, which leave zero trace.
*Source: goldbergyoni/nodebestpractices — `sections/docker/docker-ignore.md` (§8.4) + `sections/docker/avoid-build-time-secrets.md` (§8.11)*

54. **Strip everything the runtime doesn't need.** Install dev deps for build/test, then ship production-only (`npm ci --production` in the final stage) — dev packages have hosted real breaches (eslint-scope). Also delete the npm cache after install (`npm cache clean`) — it duplicates dependencies and adds 10–50% image weight on an immutable image that will never install again.
*Source: goldbergyoni/nodebestpractices — `sections/docker/install-for-production.md` (§8.5) + `sections/docker/clean-cache.md` (§8.13)*

55. **Set memory limits in BOTH Docker and V8.** Docker limit = placement decisions and protecting neighbors; `--max-old-space-size` slightly below the container limit = GC starts on time. Without the V8 flag, Node under-utilizes the container and can crash at ~50–60% of host memory. (The DevOps Basics section below, rule 9, covers the V8 flag alone; the Docker-side pairing is the new part.)
*Source: goldbergyoni/nodebestpractices — `sections/docker/memory-limit.md` (§8.7)*

56. **Order Dockerfile layers for caching: least-changed on top, app code at the bottom.** Dependencies first, source last — then a tiny code change rebuilds nearly instantly instead of reinstalling everything.
*Source: goldbergyoni/nodebestpractices — `sections/docker/use-cache-for-shorter-build-time.md` (§8.8)*

57. **Pin an explicit image reference — never `latest`.** Use a versioned tag or, for determinism, a SHA256 digest. `latest` can silently deploy a breaking base-image change into production.
*Source: goldbergyoni/nodebestpractices — `sections/docker/image-tags.md` (§8.9)*

58. **Scan the final image, not just dependencies.** Image scanners check OS binaries too (OpenSSL, tar) — clean app code can still ship hacked via a vulnerable system binary. Run it as the last step before deployment, ideally in CI.
*Source: goldbergyoni/nodebestpractices — `sections/docker/scan-images.md` (§8.12)*

59. **Lint the Dockerfile** (e.g. hadolint). A linter catches root-as-production-user, unknown-source base images, and other best-practice violations before they ship.
*Source: goldbergyoni/nodebestpractices — `sections/docker/lint-dockerfile.md` (§8.15)*

### Gaps the test found (added 2026-11-10 — the effectiveness test caught real code these rules did not cover)

60. **Always send a response — never leave a request hanging.** Every code path, success AND error, must end the HTTP response. A handler that returns without responding leaves the client waiting until it times out — from the user's side the app looks dead, and no error is ever logged. The centralized error handler (rule 3) exists precisely so every failure still produces a response.
*Source: goldbergyoni/nodebestpractices — `sections/errorhandling/centralizedhandling.md` (§2.4) (the handler "will send a response") — the always-respond discipline itself is general practice, grounded in that rule*
*General practice: set server and request timeouts (e.g. `server.timeout`, per-route timeouts) so a hung handler fails loudly with a 503 instead of hanging forever — the repo has no timeout rule of its own.*

61. **Keep functions small — one job per function.** A function you cannot describe in one sentence is too big: split it until each piece does one thing. Giant functions hide bugs, cannot be unit-tested in isolation, and make every change risky.
*Source: NOT in nodebestpractices — labeled general practice. Cross-reference: `ub-mode` (CRAP < 10 per function, "one decision lives in one place").*

62. **No magic numbers — name every constant.** A bare `86400000` or `3` in code means nothing to the next reader and breaks silently when the value must change in one place but not another. Give it a named constant (`const MS_PER_DAY = 86_400_000`) at the top of its scope — the same discipline as rule 19's `MS_PER_DAY` example.
*Source: goldbergyoni/nodebestpractices — `sections/codestylepractices/eslint_prettier.md` (§3.1) (run ESLint; enable the `no-magic-numbers` rule) — the named-constants discipline itself is general practice.*

### Also apply (general practice — NOT in the repo, labeled honestly)
- **CI/CD:** the repo has no CI section (its `citools.md` exists only in translations; `bumpversion.md` is an empty stub — "Title here", "Text", "code here"). Automate typecheck → lint → test → build on every push; red build blocks the merge. See the DevOps Basics section below ("Also apply") for the same guidance.
- **Rate limiting:** lives in `api-security` rule 8 (repo §6.2) — not re-distilled here.
- **Caching patterns:** live in the Backend Performance section below, rules 3–4 — not re-distilled here.
- **Twelve-factor + memory/leak testing:** the repo's §5.9 points at the twelve-factor guide and at testing memory/leaks during development — treat as pointers to `system-design` and the DevOps Basics section below, not standalone rules.

### Quick check before shipping
- [ ] Errors use one AppError type with `isOperational`; centralized handler; uncaught/rejection handlers wired
- [ ] API errors documented (OpenAPI); error flows tested, not just happy paths
- [ ] Arguments validated at function tops (fail fast); promises `return await`ed
- [ ] Components structured by domain, 3-tier layers, no web objects in domain logic
- [ ] Config validated at startup; secrets out of committed code
- [ ] ESLint + Prettier + security plugin; `===` everywhere; no side effects at module top
- [ ] API tests first; tests named in 3 parts (AAA); no global fixtures; coverage threshold enforced
- [ ] Deps locked (`npm ci`); Node LTS pinned; `NODE_ENV=production`; zero-downtime deploys
- [ ] Logs to stdout only; no `eval`/dynamic `require()`; `node:` protocol on built-ins
- [ ] Multi-stage Docker build; `.dockerignore` set; image scanned and linted; no `latest` tag
- [ ] Every code path sends a response (no hung requests); functions do one job; no magic numbers (rules 60–62)

## Merged: backend-performance (2026-11-13)

The standalone `backend-performance` skill (19 rules) was merged into this skill on 2026-11-13; it is no longer a separate skill. Its full text follows, unchanged — cross-references to "backend-performance rules N" now mean the rules in this section.

When to use: building or reviewing any backend — API endpoints, database queries, or background jobs. Apply when the app feels slow, hangs, or breaks under repeated requests.

Every rule below is distilled from a reputable open-source repo (cited per rule). If a rule doesn't apply, say why.

### Don't block the machine
1. **Never block the event loop.** Node runs your code on a single thread — one slow synchronous operation (huge JSON parse, giant loop, unsafe regex) stalls every request behind it. Keep per-request work small; offload CPU-heavy jobs to a worker or separate service.
*Source: goldbergyoni/nodebestpractices — `sections/performance/block-loop.md`*

2. **Prefer native methods over utility libraries.** Native V8 methods (Array.map, String.indexOf) run roughly 50% faster than Lodash/Underscore equivalents — benchmarks show Lodash averaging ~146% more time per operation. If the platform already does it, drop the dependency. Enforce with `eslint-plugin-you-dont-need-lodash-underscore`.
*Source: goldbergyoni/nodebestpractices — `sections/performance/nativeoverutil.md`*

### Cache deliberately
3. **Put a cache in front of the database.** RAM reads take ~100ns; an SSD random read ~150µs; an HDD seek ~10ms. An in-memory cache (Redis, Memcached) absorbs traffic spikes so the database doesn't take the hit directly. Use an eviction policy like LRU to keep hot entries and drop cold ones.
*Source: donnemartin/system-design-primer — `README.md`, "Cache" section*

4. **Use cache-aside with a TTL — and know its tradeoffs.** Simplest pattern: check cache first; on miss, load from DB, store, return (lazy loading — only requested data gets cached). Every miss costs three trips, and cached data goes stale — mitigate with a time-to-live that forces refresh. Alternatives: write-through (never stale, slow writes) and write-behind (fast writes, data loss if cache dies).
*Source: donnemartin/system-design-primer — `README.md`, "Cache-aside" sections*

### Design for failure
5. **Build retries on idempotent operations.** GET, PUT, and DELETE can be repeated safely; POST and PATCH cannot — a retried POST creates duplicates. Any write endpoint that might be retried (network replay, double-click) needs an explicit idempotency mechanism such as idempotency keys. The protocol won't save you on POST.
*Source: donnemartin/system-design-primer — `README.md`, HTTP verb table*

6. **Apply backpressure; retry with exponential backoff.** When a work queue outgrows memory, throughput collapses — cap the queue, reject overflow with HTTP 503, and let clients retry later. Retries must use growing delays (not immediate hammering), or the retry storm finishes off the struggling server.
*Source: donnemartin/system-design-primer — `README.md`, "Asynchronism" section*

7. **Pool expensive connections.** Opening a TCP connection per request (app → database, server → cache) burns memory and setup cost each time. Reuse a bounded pool instead. Size it deliberately — too small starves throughput, too large wastes memory.
*Source: donnemartin/system-design-primer — `README.md`, "Communication" section*

### Measure, don't guess
8. **Know your latency numbers.** L1 cache ~0.5ns, RAM ~100ns, SSD ~150µs, datacenter round trip ~500µs, HDD seek ~10ms, cross-continent ~150ms. "The database is slow" usually means "we're doing disk or network round trips we could avoid." Measure first, then attack the biggest number.
*Source: donnemartin/system-design-primer — `README.md`, "Latency numbers every programmer should know"*

9. **Distinguish performance from scalability problems.** Slow for a single user = performance problem (fix the code/queries). Fast for one user but slow under load = scalability problem (add caching, pooling, capacity). The fix differs — diagnose before prescribing. Target: maximal throughput with acceptable latency.
*Source: donnemartin/system-design-primer — `README.md`, "Performance vs scalability"*

10. **Watch the four golden signals.** Error rate (users feel it immediately), latency (directly affects business), throughput (gives context to the other two), and saturation (90% CPU = no headroom). Node-specific: keep process RAM under ~1.4GB, track errors per minute and restarts.
*Source: goldbergyoni/nodebestpractices — `sections/production/monitoring.md`*

### Survive concurrent requests
11. **Treat every check-then-act as a race.** Any operation that reads a value, decides, then writes — check balance then debit, check the coupon is unused then redeem it, check the slot is free then book it — lets two concurrent requests both read the old value, both pass the check, and both write. Loyalty points get drained, balances go negative, single-use coupons get redeemed many times. If two requests can race, assume they will; the check and the act must be one atomic operation. (Idempotency keys, rule 5, cover retries — this rule covers simultaneous first attempts.)
*Source: OWASP Cheat Sheet Series — `Business_Logic_Security_Cheat_Sheet.md`, "Prevent Race Conditions on Sensitive Operations"*

12. **Lock the row when you read-then-write it.** In PostgreSQL, `SELECT ... FOR UPDATE` inside a transaction locks the row until commit — other writers and lockers wait, then see the updated row. Use `FOR NO KEY UPDATE` when you don't change key columns (weaker, blocks less). A plain `SELECT` takes no such lock: under MVCC it reads a snapshot and stops nobody.
*Source: PostgreSQL documentation — Chapter 13 "Concurrency Control", §13.3.2 "Row-Level Locks"*

13. **Prefer a conditional update over read-modify-write.** `UPDATE ... SET stock = stock - 1 WHERE stock > 0` makes the predicate part of the write itself — there is no window between check and act. Check the affected-row count: 0 rows means the condition no longer held at write time, so return the conflict error instead of writing.
*Source: OWASP Cheat Sheet Series — `Business_Logic_Security_Cheat_Sheet.md`, pattern reference (conditional decrement)*

14. **Back "exactly once" with a unique constraint.** One claim per donation, one redemption per coupon, one bonus per user: put a UNIQUE constraint on the natural key (e.g. `(user_id, bonus_type)`) and let the database reject the loser of the race. Application-level checks alone always leave a window — the constraint is the last line of defense.
*Source: OWASP Cheat Sheet Series — `Business_Logic_Security_Cheat_Sheet.md`, pattern reference (one-per-user bonus)*

15. **Know your isolation level — the default is weaker than you think.** PostgreSQL defaults to Read Committed: every statement sees a fresh snapshot, so invariants that span rows or statements can break under concurrency even though each statement looks correct. Repeatable Read gives one stable snapshot per transaction; Serializable additionally detects dangerous read/write patterns and aborts one side. Choose per invariant, not by habit.
*Source: PostgreSQL documentation — Chapter 13 "Concurrency Control", §13.2 "Transaction Isolation"*

16. **Retry serialization failures and deadlocks — they are normal outcomes, not bugs.** Repeatable Read and Serializable transactions can abort with SQLSTATE 40001 ("could not serialize access…"), and PostgreSQL automatically detects deadlocks and aborts one transaction to let the others finish. Wrap the whole transaction in a bounded retry loop; never surface a 40001 or a deadlock abort to the user as a 500.
*Source: PostgreSQL documentation — Chapter 13, §13.2.2–13.2.3 (SQLSTATE 40001) and §13.3.4 "Deadlocks"*

17. **Lock rows in a consistent order to prevent deadlocks.** When every transaction that touches multiple rows or tables locks them in the same order, circular waits mostly disappear. PostgreSQL detects the deadlocks that remain and aborts one side — which is why rule 16's retry loop must exist wherever explicit locking is used.
*Source: PostgreSQL documentation — Chapter 13, §13.3.4 "Deadlocks"*

18. **Use advisory locks when the resource isn't a row.** `pg_advisory_xact_lock` gives an application-defined lock for resources MVCC doesn't model — a job name, an external system, a whole workflow — and releases it automatically at transaction end. Advisory locks are cooperative: every code path that touches the resource must take the same lock, or it protects nothing.
*Source: PostgreSQL documentation — Chapter 13, §13.3.5 "Advisory Locks"*

19. **Write a test that races.** If two requests can race, a sequential test suite will never see the bug. Fire the same request concurrently (parallel calls against the real database) and assert the end state: the balance never goes negative, the coupon is redeemed exactly once, exactly one claim wins. The test documents the invariant as much as it verifies it.
*Source: OWASP Cheat Sheet Series — `Business_Logic_Security_Cheat_Sheet.md`, "Test Concurrency"*

### Also apply (general practice, beyond these repos)
- **Kill N+1 queries** — never query inside a loop; fetch related data with JOIN or `IN (...)`.
- **Index hot columns** — foreign keys, `WHERE` and `ORDER BY` columns; verify with `EXPLAIN`.
- **Set timeouts on every external call** — fail fast instead of hanging forever.
- **Paginate large lists** — never return "all rows"; cap page size.

### Quick check before shipping
- [ ] No synchronous heavy work on the request path (event loop stays free)
- [ ] No Lodash where a native method does the job
- [ ] Repeated reads are cached with a TTL and an invalidation plan
- [ ] Write endpoints are idempotent or carry idempotency keys
- [ ] Check-then-act operations are atomic — row lock, conditional update, or unique constraint, never a bare read-then-write
- [ ] Serialization failures (40001) and deadlocks are retried with a bounded loop, not surfaced as 500s
- [ ] Retries use backoff; queues have caps with 503 on overflow
- [ ] Connections come from a sized pool, released on every path
- [ ] Slowest path measured against the latency scale — biggest number attacked first
- [ ] Four golden signals are tracked (errors, latency, throughput, saturation)

### Learn more (official sources)
- Node.js best practices (105k stars): https://github.com/goldbergyoni/nodebestpractices
- System design primer: https://github.com/donnemartin/system-design-primer
- Don't block the event loop (Node.js docs): https://nodejs.org/en/docs/guides/dont-block-the-event-loop/
- Latency numbers: https://github.com/donnemartin/system-design-primer#latency-numbers-every-programmer-should-know
- PostgreSQL concurrency control (official docs, Ch. 13): https://www.postgresql.org/docs/current/mvcc.html
- OWASP Business Logic Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Business_Logic_Security_Cheat_Sheet.html

## Merged: devops-basics (2026-11-13)

The standalone `devops-basics` skill (12 rules) was merged into this skill on 2026-11-13; it is no longer a separate skill. Its full text follows, unchanged.

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
**Checkable criteria (general practice — thresholds are starting points, tune per product):** error rate — alert if 5xx > 1% of requests over 5 min; latency — p95 < 500ms on key routes; throughput — requests/min tracked, alert on a sudden drop vs the same hour last week; saturation — CPU or memory > 80% sustained 10 min. If a signal has no number and no alert, it isn't monitored.

11. **Pin the base image — never `FROM x:latest`.** `latest` is a moving pointer: the same Dockerfile builds a different image tomorrow, and a breaking upstream change ships silently. Pin a specific version (`FROM node:20.11.0-alpine`) — or a digest (`FROM node:20.11.0-alpine@sha256:…`) for production — and bump it intentionally after testing.
*Source: Docker best practices (docs.docker.com/build/building/best-practices); nodebestpractices examples pin versions (`FROM node:14.8.0-alpine`, `sections/docker/install-for-production.md`).*

12. **Cache dependencies in CI — don't reinstall the world on every push (general practice).** Cache `node_modules` keyed on the lockfile and Docker layers (BuildKit cache) so a green build takes minutes, not a full reinstall. A cache miss must still produce a correct build — never depend on the cache for correctness. (Note: nodebestpractices has no CI-caching rule — its `sections/docker/clean-cache.md` is about removing the cache from images, the opposite direction.)

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
- [ ] Base image pinned to a specific version/digest, never `latest`
- [ ] CI caches dependencies (lockfile-keyed) and Docker layers; a cache miss still builds correctly

### Learn more (official sources)
- Node.js best practices (105k stars): https://github.com/goldbergyoni/nodebestpractices
- Docker best practices: https://docs.docker.com/build/building/best-practices/
- Graceful shutdown in Node: https://github.com/goldbergyoni/nodebestpractices/tree/master/sections/docker
- Semantic versioning: https://semver.org/

### Validation gate

Before reporting the task done, check each line against the actual work:

- [ ] Errors use the one AppError type with `isOperational`, handled by the centralized handler (rules 2–3)
- [ ] Every code path sends a response — no hung requests (rule 60)
- [ ] Arguments are validated at function tops, fail fast; async errors flow through async/await, never callbacks (rules 8, 1)
- [ ] Error flows are tested, not just happy paths (rule 7)
- [ ] Dependencies are locked and installed with `npm ci`; Node LTS is pinned; `NODE_ENV=production` (rules 35, 39)
- [ ] Logs go to stdout only, through a mature logger — never `console.log` (rules 41, 6)
- [ ] No `eval`, dynamic `require()`, or hand-rolled regex on user input (rules 44–45)
- [ ] Docker builds are multi-stage and the image is pinned — never `latest` (rules 51, 57)

### Examples

**Do:** `throw new AppError('user not found', 404, true)` and let the centralized handler log it and send the response.

**Do not:** `throw "user not found"` inside a route, catch it in the middleware, and `console.log` it.

### Sources

Every rule cites its source inline (the *Source:* line under each rule).

- Node.js best practices (105k stars): https://github.com/goldbergyoni/nodebestpractices
- System design primer: https://github.com/donnemartin/system-design-primer
- Twelve-factor app: https://12factor.net/
- Semantic versioning: https://semver.org/

### Changelog

- 1.0.0 — 2026-11-13 — Template retrofit; rules unchanged.

Apply this playbook to the following: $ARGUMENTS
