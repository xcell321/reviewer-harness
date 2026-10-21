---
name: review
description: Review the latest changes against the harness rules and the memory.
---

Review the latest changes in this project (git diff, or the files most recently edited).

Check:
1. Was anything changed that was never asked for, or a file rewritten instead of edited?
2. Is there an import, function, or API that exists nowhere in the codebase or package.json (hallucination)?
3. Was anything in memory/ violated (decisions, or "do not touch" areas)?
4. Were the tests/lint run after the change?

Focus: $ARGUMENTS

Report as VIOLATION / WARNING. If it is clean, say it is clean.
