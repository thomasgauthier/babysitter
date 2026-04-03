## TIC-80 Heuristic Should Prioritize Runnability Over Format Polish

Observed in the current `mellow-falcon` run.

### What happened

The model kept getting nudged on structural and formatting issues, but the guidance sometimes over-weighted cosmetic or footer-level fixes relative to the larger objective.

Examples:

- palette footer length
- `cls()` placement
- exact API-family wording

Those are real issues, but they are not always the highest-value next step when the cart still has broken state flow or impossible gameplay logic.

### Why this matters

The overarching objective is not a pretty diff.

It is:

1. produce a cart that runs
2. verify it at runtime
3. only then refine the remaining details

If the nudge over-focuses on formatting polish while the cart is still logically broken, the model spends its next turn in the wrong part of the state space.

### Improvement we want

When a draft is still far from runnable, the heuristic should lead with the runnability problem:

- invalid Lua or engine shape
- inconsistent state model
- broken pickup/delivery flow
- behavior that cannot be verified yet

Formatting issues should stay in the nudge, but they should not dominate it when the cart is still structurally unfit for runtime verification.

### Desired effect

Make the heuristic better at selecting the next move that advances the actual objective, not just the nearest visible textual defect.
