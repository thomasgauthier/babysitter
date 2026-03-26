## Pattern

- The model proposes a TIC-80 cart that is structurally wrong in deterministic ways.
- After a correction, it repeats the same write or a lightly edited variant instead of rewriting from the constraint set.

## Observed Branches

- Wrong callback family: `update`, `draw`, `input` instead of `function TIC()`.
- Wrong runtime helpers: `drawtext`, `is_key_pressed`, `TIC.width`, `TIC.height`.
- Palette footer moved to the top of the file and kept there across retries.
- Later draft added an undefined variable while trying to add gameplay (`obstacleY`).

## Operator Response

- Do not approve these writes just to reach runtime.
- Use one focused nudge that names the exact wrong structures and required replacements.
- If the next write is materially identical, disapprove and consider stopping the run rather than spending more turns on the same file.
