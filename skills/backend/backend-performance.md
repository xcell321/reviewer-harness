---
name: backend-performance
description: 19 backend performance rules distilled from nodebestpractices (105k stars), system-design-primer, the PostgreSQL concurrency docs, and the OWASP Business Logic cheat sheet — event loop, caching, idempotency, backpressure, race conditions, and the latency numbers that tell you what's actually slow.
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
