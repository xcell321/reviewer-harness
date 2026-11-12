---
description: '62 Node.js quality rules distilled from nodebestpractices (105k stars) — error handling, project structure, code style, testing, production, Node-specific security, and Docker. Everything backend-performance, devops-basics, system-design, api-security, and owasp-top10 already cover is left out.'
---

## Skill: nodejs-quality

When to use: writing or reviewing Node.js code — a new endpoint, a new service, a refactor, or any time the question is "is this code correct, testable, and shippable?" rather than "is it fast?" (that's `backend-performance`) or "does it deploy?" (that's `devops-basics`). Apply when errors are swallowed, tests are thin, files are spaghetti, or production surprises keep happening.

Every rule below is distilled from goldbergyoni/nodebestpractices (cited per rule: the `sections/` file and the README section). Nothing here is invented — if the repo doesn't cover a topic, it is labeled "general practice" instead. Rules already covered by `backend-performance`, `devops-basics`, `system-design`, `api-security`, or `owasp-top10` are NOT repeated here; the skill points to them instead.

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

6. **Use a mature logger (Pino), never `console.log`.** Log frequently at levels (debug/info/error), with JSON context objects, and query/filter logs with the logger's API or a log viewer. (JSON structured format itself is covered by `devops-basics` rule 8 — this rule is about the logger choice.)
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

38. **Write production-ready code from day 1: twelve-factor, no env-branching in tests, `--trace-sync-io`.** Follow the twelve-factor guide; make dev match prod (docker-compose) and run the same code in tests — never `if (isTest)` branches. Use `--trace-sync-io` to find sync APIs on the request path. (Statelessness, caching, memory, logging, and error strategy are covered by `system-design` / `devops-basics` / error-handling rules above — this rule is the twelve-factor + dev-prod parity + sync-IO detection core of §5.9.) **Note:** README §4.8 (production-like e2e env) is flagged incomplete by the repo itself ("Missed -continue here, needs content") — the docker-compose guidance above is the repo's own §5.9 wording.
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

55. **Set memory limits in BOTH Docker and V8.** Docker limit = placement decisions and protecting neighbors; `--max-old-space-size` slightly below the container limit = GC starts on time. Without the V8 flag, Node under-utilizes the container and can crash at ~50–60% of host memory. (`devops-basics` rule 9 covers the V8 flag alone; the Docker-side pairing is the new part.)
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
- **CI/CD:** the repo has no CI section (its `citools.md` exists only in translations; `bumpversion.md` is an empty stub — "Title here", "Text", "code here"). Automate typecheck → lint → test → build on every push; red build blocks the merge. See `devops-basics` ("Also apply") for the same guidance.
- **Rate limiting:** lives in `api-security` rule 8 (repo §6.2) — not re-distilled here.
- **Caching patterns:** live in `backend-performance` rules 3–4 — not re-distilled here.
- **Twelve-factor + memory/leak testing:** the repo's §5.9 points at the twelve-factor guide and at testing memory/leaks during development — treat as pointers to `system-design` and `devops-basics`, not standalone rules.

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

### Learn more (official sources)
- Node.js best practices (105k stars): https://github.com/goldbergyoni/nodebestpractices
- System design primer: https://github.com/donnemartin/system-design-primer
- Twelve-factor app: https://12factor.net/
- Semantic versioning: https://semver.org/

Apply this playbook to the following: $ARGUMENTS
