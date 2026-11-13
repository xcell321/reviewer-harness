---
name: system-design
description: '68 system design rules distilled from system-design-primer (377k stars) — CAP tradeoffs, load balancing, database scaling, availability math, and how the pieces of a real SaaS fit together.'
---

## Skill: system-design

### Purpose

68 system design rules for designing or reviewing a system's architecture — CAP tradeoffs, load balancing, database scaling, availability math, and how the pieces of a real SaaS fit together.
It prevents designing without constraints and scaling by guesswork: scope first, name the trade-off, and scale last.

### When to use

When to use: designing or reviewing a system's architecture — a new app, a growing service, or any time the question is "how do the pieces fit and scale?" rather than "why is this endpoint slow?" Apply when choosing databases, splitting services, adding caching layers, or planning for traffic growth.

| Trigger | Example |
| --- | --- |
| Designing a new app or service architecture | "Design the architecture for a new app" |
| Reviewing how a growing service fits and scales | "How do the pieces fit and scale?" |
| Choosing databases, splitting services, or adding caching layers | "Should we shard, cache, or split this service?" |
| Planning for traffic growth | "Plan for ten times the current traffic" |

Do NOT use when: the question is why this endpoint is slow — `nodejs-quality` owns backend performance patterns for that case. Security depth belongs to `owasp-top10` and `api-security`, and REST contract design belongs to `api-design`.

### Rules

Every rule below is distilled from donnemartin/system-design-primer (cited per rule). Nothing here is invented — if the primer doesn't cover a topic, it is labeled "general practice" instead. Pairs with `nodejs-quality` (its Backend Performance section: caching patterns, latency numbers, backpressure, golden signals) — this skill covers the architecture around it.

### Start with the problem, not the stack
1. **Scope first.** Before designing anything, pin down users, use cases, inputs/outputs, expected data volume, requests/second, and read-to-write ratio. A design without constraints is guesswork.
*Source: donnemartin/system-design-primer — `README.md`, "How to approach a system design interview question", Step 1*

2. **Sketch a high-level design** of the main components and their connections, and justify each choice. If you can't justify a component, it doesn't belong yet.
*Source: donnemartin/system-design-primer — `README.md`, "How to approach", Step 2*

3. **Design core components in depth** (e.g. for a URL shortener: hash generation, collision handling, storage choice, lookup path). The happy path is easy — the core component is where designs fail.
*Source: donnemartin/system-design-primer — `README.md`, "How to approach", Step 3*

4. **Scale last.** Identify bottlenecks against the constraints, then apply load balancing, horizontal scaling, caching, and sharding as needed — every choice is a trade-off, so state what you give up.
*Source: donnemartin/system-design-primer — `README.md`, "How to approach", Step 4*

5. **Latency is time per action; throughput is actions per unit of time.** Aim for maximal throughput with acceptable latency — do not optimize one while ignoring the other.
*Source: donnemartin/system-design-primer — `README.md`, "Latency vs throughput"*

6. **Use back-of-the-envelope math** (powers-of-two table, latency numbers) to sanity-check estimates before committing to a design. 1 KB ≈ 10³, 1 MB ≈ 10⁶, 1 GB ≈ 10⁹, 1 TB ≈ 10¹² bytes — rough sizing first, precise calculation second.
*Source: donnemartin/system-design-primer — `README.md`, "Appendix" (powers of two) and "How to approach"*

### CAP theorem — pick your trade-off
7. **In a distributed system you can only guarantee two of consistency, availability, partition tolerance** — and since networks are unreliable, partition tolerance is effectively mandatory, so the real choice is consistency vs availability.
*Source: donnemartin/system-design-primer — `README.md`, "CAP theorem"*

8. **Choose CP** (consistency + partition tolerance) when the business needs atomic reads and writes; a partitioned node may time out. Money movement, inventory counts, seat reservations.
*Source: donnemartin/system-design-primer — `README.md`, "CAP theorem" (CP)*

9. **Choose AP** (availability + partition tolerance) when the system must keep working despite errors or when eventual consistency is acceptable; reads may return stale data. Feeds, likes, comments.
*Source: donnemartin/system-design-primer — `README.md`, "CAP theorem" (AP)*

10. **Weak consistency:** after a write, reads may or may not see it (best effort). Fits real-time use cases — VoIP, video chat, multiplayer games (e.g. memcached).
*Source: donnemartin/system-design-primer — `README.md`, "Consistency patterns" (weak)*

11. **Eventual consistency:** after a write, reads will eventually see it (typically within ms); data replicates asynchronously. Fits highly available systems — DNS, email.
*Source: donnemartin/system-design-primer — `README.md`, "Consistency patterns" (eventual)*

12. **Strong consistency:** after a write, reads will see it; data replicates synchronously. Fits systems that need transactions — filesystems, RDBMS.
*Source: donnemartin/system-design-primer — `README.md`, "Consistency patterns" (strong)*

### Availability — design for failure
13. **Active-passive fail-over:** heartbeats between active and standby; if the heartbeat stops, the passive takes over the active's IP. Only the active handles traffic; downtime depends on hot vs cold standby.
*Source: donnemartin/system-design-primer — `README.md`, "Availability patterns" (active-passive)*

14. **Active-active fail-over:** both servers handle traffic and spread the load; public-facing needs DNS aware of both IPs, internal-facing needs app logic aware of both.
*Source: donnemartin/system-design-primer — `README.md`, "Availability patterns" (active-active)*

15. **Fail-over costs real things:** extra hardware and complexity, plus possible data loss if the active fails before new writes replicate to the passive.
*Source: donnemartin/system-design-primer — `README.md`, "Availability patterns" (disadvantages)*

16. **Availability is measured in 9s:** 99.9% ("three 9s") allows 8h 45m downtime/year; 99.99% ("four 9s") allows 52m 35s/year. Name the target before designing — "high availability" without a number means nothing.
*Source: donnemartin/system-design-primer — `README.md`, "Availability in numbers"*

17. **Components in sequence multiply availability down:** two 99.9% components in sequence = 99.8% total. Every hop in the chain costs you.
*Source: donnemartin/system-design-primer — `README.md`, "Availability in parallel vs in sequence"*

18. **Components in parallel multiply availability up:** two 99.9% components in parallel = 99.9999% total — use redundancy to raise availability.
*Source: donnemartin/system-design-primer — `README.md`, "Availability in parallel vs in sequence"*

### DNS and CDN — the front door
19. **DNS translates domain names to IPs**; it is hierarchical, and lower-level servers, browsers, and OSes cache mappings that can go stale during propagation — respect TTL.
*Source: donnemartin/system-design-primer — `README.md`, "Domain name system"*

20. **Use the right record type:** NS = name servers, MX = mail servers, A = name→IP, CNAME = name→name.
*Source: donnemartin/system-design-primer — `README.md`, "Domain name system"*

21. **Use managed DNS routing policies when needed:** weighted round-robin (maintenance, cluster-size balancing, A/B testing), latency-based, geolocation-based.
*Source: donnemartin/system-design-primer — `README.md`, "Domain name system"*

22. **DNS is a dependency and a risk:** lookups add slight delay, management is complex, and DNS DDoS can take a site offline even when the site itself is healthy.
*Source: donnemartin/system-design-primer — `README.md`, "Domain name system" (disadvantages)*

23. **Serve static content (HTML/CSS/JS, photos, video) from a CDN** close to the user — users get content from nearby data centers, and origin servers skip requests the CDN fulfills.
*Source: donnemartin/system-design-primer — `README.md`, "Content delivery network"*

24. **Push CDN:** you upload content on change; good for small/low-traffic sites or rarely updated content; minimizes traffic, maximizes storage.
*Source: donnemartin/system-design-primer — `README.md`, "Content delivery network" (push)*

25. **Pull CDN:** the CDN fetches from origin on first request; good for heavy-traffic sites; TTL controls cache lifetime; minimizes storage but can create redundant traffic on expiry.
*Source: donnemartin/system-design-primer — `README.md`, "Content delivery network" (pull)*

26. **CDN costs can be significant at scale** — weigh them against the costs of not using one. Content can go stale if updated before TTL expires, and using a CDN requires rewriting static-content URLs to point at it.
*Source: donnemartin/system-design-primer — `README.md`, "Content delivery network" (disadvantages)*

### Load balancing and reverse proxies
27. **Put a load balancer in front of app servers and databases** to keep requests off unhealthy servers, prevent overload, and eliminate a single point of failure.
*Source: donnemartin/system-design-primer — `README.md`, "Load balancer"*

28. **Terminate SSL at the load balancer** so backends skip expensive decrypt/encrypt work and you avoid installing certificates on every server.
*Source: donnemartin/system-design-primer — `README.md`, "Load balancer" (SSL termination)*

29. **Use session persistence (sticky sessions)** — issue cookies routing a client to the same instance — when the app does not track sessions centrally. Better: store sessions centrally (DB or Redis) and stay stateless.
*Source: donnemartin/system-design-primer — `README.md`, "Load balancer" (session persistence)*

30. **Protect the load balancer itself:** run multiple LBs in active-passive or active-active mode, because a single LB is a single point of failure.
*Source: donnemartin/system-design-primer — `README.md`, "Load balancer"*

31. **Layer 4 balancing** decides on transport-layer info (source/destination IP and ports) without inspecting packet contents — faster, less flexible. **Layer 7 balancing** decides on application-layer info (headers, message, cookies) — e.g. video traffic to video servers, billing traffic to hardened servers — at the cost of more time and compute.
*Source: donnemartin/system-design-primer — `README.md`, "Load balancer" (Layer 4 / Layer 7)*

32. **Prefer horizontal scaling (more commodity machines) over vertical scaling (one bigger machine)** — cheaper and more available — but keep servers stateless and store sessions in a centralized store; downstream caches and databases must handle more simultaneous connections as you scale out.
*Source: donnemartin/system-design-primer — `README.md`, "Load balancer" (horizontal scaling)*

33. **Use a reverse proxy to centralize internal services behind one public interface** — it forwards client requests and returns responses, adding security (hide backend details, blacklist IPs, limit connections per client), SSL termination, compression, caching, and static-content serving.
*Source: donnemartin/system-design-primer — `README.md`, "Reverse proxy (web server)"*

34. **Load balancer vs reverse proxy:** an LB is useful with multiple servers doing the same function; a reverse proxy is useful even with a single server. NGINX and HAProxy can do both. A single reverse proxy is a single point of failure — plan fail-over if it fronts production traffic.
*Source: donnemartin/system-design-primer — `README.md`, "Reverse proxy" (vs load balancer, disadvantages)*

### Application layer — services
35. **Separate the web layer from the application (platform) layer** so each scales and is configured independently; adding an API means adding app servers, not necessarily web servers.
*Source: donnemartin/system-design-primer — `README.md`, "Application layer"*

36. **Follow the single responsibility principle:** small, autonomous services that work together; small teams with small services can plan more aggressively for growth.
*Source: donnemartin/system-design-primer — `README.md`, "Application layer"*

37. **Use microservices as independently deployable, small, modular services**, each running its own process and communicating through a well-defined lightweight mechanism to serve one business goal (e.g. user profile, follower, feed, search, photo upload as separate services).
*Source: donnemartin/system-design-primer — `README.md`, "Application layer" (microservices)*

38. **Use service discovery** (Consul, Etcd, Zookeeper) so services find each other by registered name/address/port; verify integrity with health checks, often over an HTTP endpoint; the built-in key-value store can hold config and shared data.
*Source: donnemartin/system-design-primer — `README.md`, "Application layer" (service discovery)*

39. **Microservices cost complexity** in deployments and operations versus a monolith — do not adopt them without a reason.
*Source: donnemartin/system-design-primer — `README.md`, "Application layer" (disadvantages)*

### Databases — scaling the data layer
40. **RDBMS transactions guarantee ACID:** atomicity (all or nothing), consistency (valid state to valid state), isolation (concurrent = serial), durability (committed stays committed).
*Source: donnemartin/system-design-primer — `README.md`, "Database" (RDBMS)*

41. **Master-slave replication:** master serves reads and writes, replicating writes to slaves that serve only reads; if the master dies the system can run read-only until a slave is promoted — but promotion needs extra logic.
*Source: donnemartin/system-design-primer — `README.md`, "Database" (master-slave replication)*

42. **Master-master replication:** both masters serve reads and writes and coordinate on writes; either can fail and the system keeps reading and writing — but you need an LB or app logic to pick where to write, most systems are loosely consistent or slower to write, and conflict resolution grows with more write nodes and latency.
*Source: donnemartin/system-design-primer — `README.md`, "Database" (master-master replication)*

43. **Replication risks (both modes):** data loss if the master fails before writes replicate; read replicas can bog down replaying heavy writes; more slaves = more replication lag; replication adds hardware and complexity.
*Source: donnemartin/system-design-primer — `README.md`, "Database" (replication disadvantages)*

44. **Federation (functional partitioning):** split the DB by function (forums, users, products) — less read/write traffic per DB, less replication lag, more data fits in memory (better cache locality), parallel writes with no central master serializing them.
*Source: donnemartin/system-design-primer — `README.md`, "Database" (federation)*

45. **Sharding:** distribute data across databases so each manages a subset (e.g. shard users by last-name initial or geography) — less traffic, less replication, more cache hits, smaller indexes/faster queries, one shard down doesn't stop the others (but add replication to avoid data loss).
*Source: donnemartin/system-design-primer — `README.md`, "Database" (sharding)*

46. **Sharding risks:** app logic must work with shards (complex SQL); distribution can go lopsided (power users overload one shard) and rebalancing is complex — consistent hashing reduces data moved during rebalancing; cross-shard joins are complex.
*Source: donnemartin/system-design-primer — `README.md`, "Database" (sharding disadvantages)*

47. **Denormalization:** duplicate data across tables to avoid expensive joins and improve read performance at the cost of write performance; use materialized views (PostgreSQL, Oracle) to keep redundant copies consistent. Reads often outnumber writes 100:1 or even 1000:1, so a join-heavy read is very expensive.
*Source: donnemartin/system-design-primer — `README.md`, "Database" (denormalization)*

48. **Benchmark and profile before optimizing:** benchmark with load tools (e.g. `ab`) and profile with the slow query log to find real bottlenecks. Then tighten the schema (`CHAR` for fixed-length, `TEXT` for large blocks, `DECIMAL` for currency, `NOT NULL` where applicable), index columns you query (`SELECT`, `GROUP BY`, `ORDER BY`, `JOIN` — usually B-trees), avoid expensive joins, and partition hot spots into separate tables.
*Source: donnemartin/system-design-primer — `README.md`, "Database" (SQL tuning)*

### NoSQL — when relational doesn't fit
49. **NoSQL = key-value, document, wide-column, or graph stores; data is denormalized and joins move into application code; most NoSQL lacks true ACID and favors eventual consistency.** BASE (basically available, soft state, eventually consistent) chooses availability over consistency.
*Source: donnemartin/system-design-primer — `README.md`, "Database" (NoSQL)*

50. **Key-value store (abstraction: hash table):** O(1) reads/writes, often memory- or SSD-backed; high performance for simple or rapidly-changing data such as a cache layer — but limited operations push complexity to the app layer. **Document store (abstraction: key-value with documents as values):** documents (XML/JSON/binary) hold all info for one object, queryable by internal structure; flexible schema, good for occasionally changing data (MongoDB, CouchDB, DynamoDB).
*Source: donnemartin/system-design-primer — `README.md`, "Database" (key-value store, document store)*

51. **Wide column store (abstraction: nested map):** columns grouped in families, keys in lexicographic order for selective range retrieval, timestamps for versioning/conflict resolution; high availability and scalability for very large datasets (Bigtable, HBase, Cassandra). **Graph database (abstraction: graph):** nodes are records, arcs are relationships; optimized for complex relationships with many foreign keys or many-to-many links (e.g. social networks); newer, fewer tools, often REST-only access.
*Source: donnemartin/system-design-primer — `README.md`, "Database" (wide column store, graph database)*

52. **Choose SQL when:** structured data, strict schema, relational data, complex joins, transactions, clear scaling patterns, established tooling, fast index lookups. **Choose NoSQL when:** semi-structured/flexible schema, non-relational, no complex joins, TB–PB scale, data-intensive workloads, very high IOPS (clickstream/log ingest, leaderboards, shopping carts, hot tables, metadata tables).
*Source: donnemartin/system-design-primer — `README.md`, "Database" (SQL or NoSQL)*

### Caching layers (patterns live in nodejs-quality's Backend Performance section)
53. **Cache at every layer:** client (OS/browser), CDN, web server/reverse proxy (e.g. Varnish — serves static and dynamic content without contacting app servers), database (tune built-in defaults), and application (in-memory Redis/Memcached between app and storage — RAM is faster than disk).
*Source: donnemartin/system-design-primer — `README.md`, "Cache" (client/CDN/web server/database/application caching)*

54. **Prefer in-memory caches (Redis/Memcached) over file-based caching** — file-based caching makes cloning and auto-scaling harder. Redis adds persistence and built-in structures (sorted sets, lists).
*Source: donnemartin/system-design-primer — `README.md`, "Cache" (application caching)*

55. **Cache by query or by object:** hashing the query as the key suffers expiration problems (one cell change invalidates many cached queries); object-level caching lets the app assemble datasets into objects, evict on underlying change, and use workers to assemble asynchronously. Good candidates: user sessions, fully rendered pages, activity streams, user-graph data.
*Source: donnemartin/system-design-primer — `README.md`, "Cache" (query level / object level)*

56. **Cache-aside, write-through, write-behind, refresh-ahead** — the four patterns, their staleness and failure tradeoffs, live in `nodejs-quality`'s Backend Performance section, rules 3–4. Use this skill for *where* to cache; use that skill for *how* each pattern behaves.
*Source: donnemartin/system-design-primer — `README.md`, "Cache" (cache-aside, write-through, write-behind, refresh-ahead); see also `nodejs-quality` (Backend Performance section)*

### Asynchronism — work off the request path
57. **Move expensive work off the request path:** async workflows reduce request times for slow operations and let you pre-compute (e.g. periodic aggregation) in advance.
*Source: donnemartin/system-design-primer — `README.md`, "Asynchronism"*

58. **Message queues** (Redis as simple broker — messages can be lost; RabbitMQ — AMQP, self-managed; Amazon SQS — hosted, higher latency, possible duplicate delivery): app publishes a job and notifies the user of status; a worker picks it up, processes it, signals completion — the user is never blocked.
*Source: donnemartin/system-design-primer — `README.md`, "Asynchronism" (message queues)*

59. **Task queues** receive tasks + data, run them, deliver results; they support scheduling and run compute-intensive jobs in the background (e.g. Celery, mainly Python).
*Source: donnemartin/system-design-primer — `README.md`, "Asynchronism" (task queues)*

60. **Do not queue what should be synchronous:** cheap calculations and real-time workflows are better inline — queues add delay and complexity. (Backpressure and 503-on-overflow live in `nodejs-quality`'s Backend Performance section, rule 6.)
*Source: donnemartin/system-design-primer — `README.md`, "Asynchronism" (disadvantages)*

### Communication — how services talk
61. **HTTP is a stateless request/response protocol:** GET reads (idempotent, safe, cacheable), POST creates/triggers (not idempotent), PUT creates/replaces (idempotent), PATCH partially updates, DELETE removes (idempotent). Use status codes for errors — don't reinvent them.
*Source: donnemartin/system-design-primer — `README.md`, "Communication" (HTTP, REST)*

62. **TCP guarantees delivery in order without corruption** (sequence numbers, checksums, ACKs, retransmission, flow + congestion control) — at the cost of delay and memory for many open connections; use connection pooling. Use TCP when all data must arrive intact (web servers, databases, SMTP, FTP, SSH). **UDP is connectionless and faster but unreliable** — datagrams may arrive out of order or not at all, no congestion control; it can broadcast. Use UDP when lowest latency matters, late data is worse than lost data, or you implement your own error correction (VoIP, video chat, streaming, real-time games).
*Source: donnemartin/system-design-primer — `README.md`, "Communication" (TCP, UDP)*

63. **RPC makes a remote call look like a local call** (client stub marshals id/args, server stub unmarshals and executes) — good for internal performance with hand-crafted native calls (Protobuf, Thrift, Avro), but clients couple tightly to the implementation, every new operation needs a new API, and debugging/caching is harder.
*Source: donnemartin/system-design-primer — `README.md`, "Communication" (RPC)*

64. **REST exposes data as resources via URIs + verbs + headers, stateless and cacheable** — minimize client/server coupling, prefer it for public HTTP APIs; its statelessness is great for horizontal scaling and partitioning. Its limits: resources that don't fit a simple hierarchy are awkward, the few verbs don't fit every action, nested resources need multiple round trips (bad on mobile), and new response fields bloat payloads for old clients.
*Source: donnemartin/system-design-primer — `README.md`, "Communication" (REST)*

65. **Choose by audience:** RPC for internal performance-critical communication, REST for public APIs; a native library/SDK when you know the target platform and performance/UX is the priority.
*Source: donnemartin/system-design-primer — `README.md`, "Communication" (RPC / REST comparison)*

### Security basics
66. **Encrypt in transit and at rest. Sanitize all user inputs** (and any user-exposed input parameters) to prevent XSS and SQL injection. **Use parameterized queries** to prevent SQL injection. **Apply the principle of least privilege.** (The primer's security section is short by its own admission — depth lives in `owasp-top10` and `api-security`.)
*Source: donnemartin/system-design-primer — `README.md`, "Security"*

### Back-of-the-envelope numbers
67. **Sequential throughput rules of thumb:** HDD ~30 MB/s, 1 Gbps Ethernet ~100 MB/s, SSD ~1 GB/s, main memory ~4 GB/s.
*Source: donnemartin/system-design-primer — `README.md`, "Appendix" (latency numbers, handy metrics)*

68. **Round-trip budget:** ~6–7 world-wide round trips per second, ~2,000 round trips per second within a data center — design chatty protocols accordingly. (The full latency table — L1 ~0.5ns, RAM ~100ns, SSD ~150µs, HDD ~10ms — lives in `nodejs-quality`'s Backend Performance section, rule 8.)
*Source: donnemartin/system-design-primer — `README.md`, "Appendix" (latency numbers, handy metrics)*

### Also apply (general practice — NOT in the primer, labeled honestly)
- **Rate limiting:** the primer names it only as an interview-question topic ("Design an API rate limiter") with no implementation guidance. For real rules, use `nodebestpractices` §6.2 (express-rate-limit, nginx, cloud load balancers) — see `api-security`.
- **Monitoring / observability / error tracking:** not covered in the primer. Track the four golden signals (errors, latency, throughput, saturation — see `nodejs-quality`'s Backend Performance section, rule 10) and use an APM product (Sentry free tier is a good start) to discover errors and downtime.
- **Autoscaling:** not a named topic in the primer; only horizontal scaling and cloning are discussed. In practice: scale on CPU/requests/latency metrics, never on vibes — and keep services stateless so new instances can join safely (rule 32).
- **CI/CD:** not covered in the primer. Automate typecheck → lint → test → build on every push so broken code never reaches main.

### Quick check before shipping
- [ ] Constraints scoped first (users, volume, requests/sec, read-to-write ratio)
- [ ] CAP choice named (CP vs AP) with the reason written down
- [ ] Availability target named in 9s; single points of failure identified
- [ ] Static content on a CDN; SSL terminated at the load balancer
- [ ] Servers stateless; sessions in a centralized store
- [ ] Database scaling named (replication vs federation vs sharding) with its risks
- [ ] SQL vs NoSQL choice justified against the decision table (rule 52)
- [ ] Slow work moved off the request path (message/task queue)
- [ ] Internal vs public communication chosen (RPC vs REST)
- [ ] Secrets encrypted in transit and at rest; inputs sanitized; queries parameterized

### Learn more (official sources)
- System design primer (377k stars): https://github.com/donnemartin/system-design-primer
- CAP theorem revisited: https://robertgreiner.com/cap-theorem-revisited/
- Node.js best practices (rate limiting, APM): https://github.com/goldbergyoni/nodebestpractices

### Validation gate

Before reporting the task done, check each line against the actual work:

- [ ] Constraints scoped first (users, volume, requests/sec, read-to-write ratio)
- [ ] CAP choice named (CP vs AP) with the reason written down
- [ ] Availability target named in 9s; single points of failure identified
- [ ] Static content on a CDN; SSL terminated at the load balancer
- [ ] Servers stateless; sessions in a centralized store
- [ ] Database scaling named (replication vs federation vs sharding) with its risks
- [ ] SQL vs NoSQL choice justified against the decision table (rule 52)
- [ ] Slow work moved off the request path (message/task queue)
- [ ] Internal vs public communication chosen (RPC vs REST)
- [ ] Secrets encrypted in transit and at rest; inputs sanitized; queries parameterized

### Examples

**Do:** scope the constraints first (users, volume, requests/second, read-to-write ratio), sketch the high-level design and justify each component, then scale last against the bottlenecks.

**Do not:** pick the stack first and design without constraints — a design without constraints is guesswork.

### Sources

Every rule cites its source inline (the *Source:* line under each rule).

- System design primer (377k stars): https://github.com/donnemartin/system-design-primer
- CAP theorem revisited: https://robertgreiner.com/cap-theorem-revisited/
- Node.js best practices (rate limiting, APM): https://github.com/goldbergyoni/nodebestpractices

### Changelog

- 1.0.0 — 2026-11-13 — Template retrofit; rules unchanged.

Apply this playbook to the following: $ARGUMENTS
