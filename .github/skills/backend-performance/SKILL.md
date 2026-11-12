---
name: backend-performance
description: '10 backend performance rules distilled from nodebestpractices (105k stars) and system-design-primer — event loop, caching, idempotency, backpressure, and the latency numbers that tell you what''s actually slow.'
---

## Skill: backend-performance

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
- [ ] Retries use backoff; queues have caps with 503 on overflow
- [ ] Connections come from a sized pool, released on every path
- [ ] Slowest path measured against the latency scale — biggest number attacked first
- [ ] Four golden signals are tracked (errors, latency, throughput, saturation)

### Learn more (official sources)
- Node.js best practices (105k stars): https://github.com/goldbergyoni/nodebestpractices
- System design primer: https://github.com/donnemartin/system-design-primer
- Don't block the event loop (Node.js docs): https://nodejs.org/en/docs/guides/dont-block-the-event-loop/
- Latency numbers: https://github.com/donnemartin/system-design-primer#latency-numbers-every-programmer-should-know

Apply this playbook to the following: $ARGUMENTS
