## Observed Weakness

- After an exact TIC-80 API reference read, the model can still produce another structurally wrong rewrite.
- In `rapid-willow`, the post-reference draft fixed button ids but still kept invalid `print(...)` argument order, bad reset assignment syntax, and an undefined coin color field.

## Heuristic

- Treat a successful TIC-80 reference read as a bounded recovery step, not as evidence that the next cart is safe to approve.
- After the reference read, inspect the next Lua write for the same small structural errors before resetting escalation.
- If the next rewrite is still structurally wrong after the reference read, prefer disapprove plus bounded stop over another speculative rewrite cycle.

## Why

- The reference read improved the surface API knowledge but did not eliminate the actual cart-shape mistakes.
- Letting that count as a reset would waste turns on a fourth rewrite with no runtime validation earned.
