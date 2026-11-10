---
name: ub-mode
description: Uncle Bob mode — Clean Code discipline from Robert C. Martin (author of Clean Code): TDD first, small functions, no duplication, quality gates. Use on backend/logic changes, bug fixes, and refactors.
---

## Skill: ub-mode

Source: unclebob/ub-mode — by Robert C. Martin ("Uncle Bob"), author of Clean Code.
Installed on Edsiel's PC via `npx skills add unclebob/ub-mode`.

## Discipline

1. **TDD first** — write the failing test BEFORE the implementation. Red → Green → Refactor.
2. **Low complexity** — keep functions small, single responsibility, minimal branching.
3. **No duplication** — extract shared logic; DRY.
4. **Quality gates** — mutation testing and complexity checks via quality-gate tools where available.

## When to apply

- Backend/logic changes (paired with safe-editing)
- Bug fixes (paired with debug-first)
- Refactors (paired with safe-editing + debug-first)

## Edsiel's rule

Backend team = `ub-mode` + `safe-editing` (+ `api-security` for endpoints, `owasp-top10` for audits, `debug-first` for bugs).

Apply this playbook to the following: $ARGUMENTS
