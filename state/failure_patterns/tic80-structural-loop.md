## Pattern

- `qwen3.5-9b-ud` tends to start TIC-80 carts with a separate `init` / `update` / `draw` structure instead of `function TIC()`.
- The same branch often carries state reset bugs because game state is initialized inside the frame loop.

## Signals

- `init()`, `update()`, `draw()` appear in the first draft.
- Input code uses `input.p1` instead of `btn(id)`.
- Lua loops use `for i = 0 to 15` or other non-Lua syntax.
- Variables are declared after use or re-created every frame inside `TIC()`.
- The write looks structurally plausible but still behaves like another engine, not TIC-80.

## Response

- Disapprove the initial write if this structure appears.
- Nudge toward `function TIC()` as the only entry point.
- Tell the model to move persistent state outside `TIC()` before approving another rewrite.
