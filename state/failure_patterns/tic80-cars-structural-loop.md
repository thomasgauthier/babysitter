## Pattern

- The model proposes a TIC-80 cart that is structurally wrong in deterministic ways.
- After a correction, it repeats the same write or a lightly edited variant instead of rewriting from the constraint set.

## Observed Branches

- Wrong callback family: `update`, `draw`, `input` instead of `function TIC()`.
- Wrong runtime helpers: `drawtext`, `is_key_pressed`, `TIC.width`, `TIC.height`.
- Palette footer moved to the top of the file and kept there across retries.
- Later draft added an undefined variable while trying to add gameplay (`obstacleY`).
- After one exact structural `steer`, the model could go silent with `status` still showing `running` and no new filtered output.
- A stopped run could still dump a latent bad `write` request into the next unread `poll`, too late for a normal typed response.

## Operator Response

- Do not approve these writes just to reach runtime.
- Use one focused nudge only when the cart is otherwise structurally sound and the fix is local.
- If the write is wrong in the same structural way again, disapprove instead of layering on more nudges.
- If the next write is materially identical, stop the run rather than spending more turns on the same file.
- If a post-`steer` turn stays `running` with no new visible work, stop it after one bounded wait instead of assuming hidden progress.
