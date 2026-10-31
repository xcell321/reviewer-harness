---
name: ux-edge-states
description: 10 UX states beyond the happy path — design every screen for empty, loading, error, offline, and success. The real test is what the UI does when nothing goes right.
---

## Skill: ux-edge-states

When to use: building or reviewing any screen, page, or component.

Your product works when everything goes right. The real test is what it does when nothing does. Run every screen through these 10 states before calling it done.

### States to design
1. **Empty state.** What does the screen say before there is any data? Never show a blank page. Explain what's missing and give a clear next action ("No sessions yet — create one").
2. **Loading state.** Make the wait feel short. Show a skeleton or spinner immediately; never freeze the UI with no feedback. For long waits, show progress.
3. **Error state.** Say what went wrong *and how to fix it*. "Something went wrong" is not enough. Include the cause and the recovery step ("Connection failed — check the backend is running, then Retry").
4. **No internet.** Never leave the user staring at a blank screen. Detect offline, show a clear banner, and queue actions for retry when back online.
5. **Slow network.** Show progress, not a frozen spinner. Use timeouts with friendly messages; allow cancel. Distinguish "loading" from "stuck".
6. **No search results.** Suggest something instead of a dead end. Show "No results for X" plus alternatives: clear filters, related items, or a create action.
7. **Permission denied.** Explain why and give a way back. Don't just hide the button — tell the user what permission is missing and how to get it (or who to ask).
8. **Session expired.** Save their work before logging out. Warn before expiry when possible; preserve form input and drafts across re-auth.
9. **Form validation.** Flag the mistake the moment it happens, not after submit. Inline errors next to the field; explain the rule ("Password needs 8+ characters").
10. **Success state.** Confirm it, celebrate it, then show what is next. A toast or checkmark plus the logical next action ("Session created — add your first terminal").

### Quick check before shipping
- [ ] Empty: screen explains what's missing + next action
- [ ] Loading: immediate feedback, no frozen UI
- [ ] Error: cause + recovery step, not just "failed"
- [ ] Offline/slow: detected and communicated
- [ ] Validation: inline, immediate, explanatory
- [ ] Success: confirmed + next step shown

### Anti-patterns
- Blank screens with no explanation.
- Generic "Something went wrong" with no recovery path.
- Spinners that never resolve and can't be cancelled.
- Losing user input on error, expiry, or navigation.
- Dead-end "no results" with no suggestions.
