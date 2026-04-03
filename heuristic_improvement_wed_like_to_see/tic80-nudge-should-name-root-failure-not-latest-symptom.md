## TIC-80 Nudge Should Name the Root Failure

Observed across the `mellow-falcon` pizza-delivery rewrites.

### What happened

The heuristic correctly refused approval, but the nudge text often focused on the most recent visible symptom rather than the main blocker for progress.

Examples from the run:

- the cart had inconsistent state modeling, but the nudge was still framed around a narrower syntax/API cleanup
- the cart was still not runnable, but the feedback did not always clearly say that the rewrite needed a simpler, end-to-end playable loop

### Why this matters

If the nudge names only the latest small error, the model tends to patch that symptom and then produce another broad rewrite with the same root problem still intact.

That wastes turns and delays the actual goal: get to a cart that can be loaded, run, and playtested.

### Improvement we want

When a write has several concrete problems, the nudge should prioritize the root blocker:

- inconsistent game-state model
- invalid Lua structure
- missing or malformed palette footer
- helper logic that is not tied to real gameplay state

Then secondary issues can be mentioned after the main blocker.

### Desired effect

Move the heuristic from:

- "here is the next bug to fix"

to:

- "here is the smallest rewrite that would make this cart plausibly runnable and worth verifying"
