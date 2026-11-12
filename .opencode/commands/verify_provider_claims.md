---
description: 'Check a provider''s live documentation or the user''s verified setup before asserting its current availability, free tier, pricing, endpoints, or retired status.'
---

## Skill: verify_provider_claims

### Spot the claims that go stale

- Treat any statement about a third party's current state as a claim that can go stale, such as availability, free tier, pricing, endpoint URLs and ports, signup requirements, and retired or deprecated status.

- Pause before you assert one of these claims from memory, since model routing, pricing, and endpoints change faster than training data.

- Name the claim plainly in your own working notes before you check it, so you know exactly what you are verifying.

### Check the live source first

- Read the provider's current docs, README, changelog, or status page for the exact claim before you state it.

- Prefer the user's own verified setup, such as a screenshot, their config file, or a working connection, over documentation when the two disagree.

- Quote the source you checked when you present the claim, so the user can see where it came from.

- Say what changed when the live source contradicts your memory, instead of silently correcting yourself.

### Say what you could not verify

- State plainly when you could not check a claim, and give it as your best understanding rather than a fact.

- Recheck a provider fact you verified before when enough time has passed or the user reports a mismatch, instead of reusing it blindly.

- Keep dated provider facts with their source in memory when the user relies on them repeatedly, and recheck them before a new recommendation.

### Available connectors

- Use the runtime's own search and setup to find other connectors and related skills.

- If nothing here fits, look on the web for a maintained API or MCP server and set it up through the runtime's own connector/MCP setup, or build a custom connector.

### Alternatives for better results

- Ask the user to confirm the current state from their own screen when the provider's docs are vague, paywalled, or contradict each other, since their live setup settles the question fastest.

- Check the provider's changelog or release notes when a claim worked recently and now fails, since a quiet retirement or migration is the usual cause.

Apply this playbook to the following: $ARGUMENTS
