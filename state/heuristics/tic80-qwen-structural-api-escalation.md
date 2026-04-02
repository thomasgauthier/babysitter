## Heuristic Gap

- In `jade-upland`, the heuristic stayed at `nudge` on a second structurally wrong TIC-80 rewrite.
- That second rewrite still contained multiple high-confidence API inventions after a prior exact nudge: `kdbp`, `rand`, `btnp(19)`, and wrong `print(...)` shape.

## Proposed Rule

- For TIC-80 Lua writes, escalate from `nudge` to `disapprove` when both conditions hold:
- the previous reviewed Lua write in the same run already received a structural nudge
- the new write still contains one or more guessed TIC-80 API names or impossible button-index patterns

## Concrete Signals

- `love.`
- `kdbp`, `kdb`, `kbds`
- `rand(` in plain Lua code without a local helper definition
- `TIC.w`, `TIC.h`, `TIC.font`
- `btn(...) == 3`
- `btnp(16)` and similar keyboard-style high button numbers in a simple gamepad-only cart
- `print(` with numeric-first argument order in a TIC-80 cart

## Why

- The first nudge in this run was enough to prove the model understood the broad correction.
- The next draft still repeated the same API-family mistake and should have been blocked decisively instead of invited into another rewrite cycle.
