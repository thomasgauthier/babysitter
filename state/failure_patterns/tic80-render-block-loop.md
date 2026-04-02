## Pattern

- The cart loads and "runs", but rendering never reaches the screen because `TIC()` returns early.
- This often happens inside state checks or input handling branches.

## Signals

- `tic80ctl` says the cart is running, but the screen stays black or static.
- Frame count advances in playtest, but no draw calls appear to execute.
- `return` appears inside a state branch before the draw logic.

## Response

- Remove early `return` statements from `TIC()` when they skip drawing.
- Require a screenshot or MP4 before treating the cart as working.
- Do not confuse engine liveness with visible gameplay.
