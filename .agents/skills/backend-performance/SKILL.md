---
name: backend-performance
description: 10 backend performance rules — caching, timeouts, retries, idempotency, and database speed. Make your API fast and resilient instead of just working.
---

## Skill: backend-performance

When to use: building or reviewing any backend — API endpoints, database queries, or background jobs. Apply when the app feels slow, hangs, or breaks under repeated requests.

These 10 rules turn a backend that "works on my machine" into one that stays fast and doesn't fall over. If a rule doesn't apply, say why.

### Make it fast
1. **Cache what doesn't change often.** Don't hit the database for the same answer twice. Cache read-heavy, slow-changing data (configs, user profiles, product lists) with a short TTL. Invalidate the cache when the data changes — a stale cache is worse than no cache.
2. **Index the columns you query by.** A query on an unindexed column scans every row. Add indexes on foreign keys, `WHERE` columns, and `ORDER BY` columns. Check with `EXPLAIN` before assuming a query is fast.
3. **Kill N+1 queries.** Loading 100 items then querying inside a loop = 101 queries. Fetch related data in one query instead (JOIN, `IN (...)`, or eager loading). Count your queries per request — if it grows with the data, it's N+1.

### Make it resilient
4. **Set timeouts on everything.** No network call without a timeout. A downstream service that hangs forever will hang your request forever. Pick a timeout that matches the operation (fast for reads, longer for writes), then fail fast and tell the caller.
5. **Retry with exponential backoff.** Transient failures (network blips, brief overload) deserve a second chance — but don't hammer a struggling server. Retry 2–3 times with growing delays (1s, 2s, 4s), plus jitter so retries don't synchronize. Never retry non-idempotent writes blindly (see rule 6).
6. **Make writes idempotent.** If a request can arrive twice (retry, double-click, network replay), the second one must not create a duplicate. Use idempotency keys on write endpoints, or design operations so repeating them is safe (upsert instead of insert, `DELETE` is naturally idempotent).
7. **Pool your connections.** Opening a new database connection per request is slow and exhausts the server. Use a connection pool with a sensible max size. Never leak connections — always release them back, even on error.

### Make it observable
8. **Log with context.** A log line that says "error" helps nobody. Log what happened, which request, which user, and how long it took. Include a request ID so you can trace one request across services and log lines.
9. **Measure before optimizing.** Don't guess what's slow — time it. Log slow queries (anything over ~200ms), track endpoint latency (p50/p99), and watch memory growth. Fix the slowest thing first; ignore the rest until it matters.
10. **Paginate large lists.** Never return "all rows" to a client. Paginate with limit/offset or cursor-based pagination. Cap the page size so one request can't dump the whole table into memory.

### Quick check before shipping
- [ ] Repeated reads are cached with a TTL
- [ ] Hot query columns have indexes (`EXPLAIN` checked)
- [ ] No query inside a loop (N+1 eliminated)
- [ ] Every external call has a timeout
- [ ] Retries use backoff, not blind hammering
- [ ] Write endpoints are idempotent or documented as not
- [ ] Connections come from a pool, released on every path
- [ ] Large lists are paginated with a capped page size

### Learn more (official sources)
- Caching strategies: https://aws.amazon.com/caching/best-practices/
- N+1 and query optimization: https://use-the-index-luke.com/
- Retry guidance: https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/
- Idempotency: https://stripe.com/blog/idempotency
- Connection pooling: https://node-postgres.com/features/pooling

Apply this playbook to the following: $ARGUMENTS
