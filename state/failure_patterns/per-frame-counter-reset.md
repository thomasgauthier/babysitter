## Pattern

- The model declares a counter inside `TIC()`, then uses it as if it persists across frames.
- Because `TIC()` runs every frame, the counter resets and only counts events from the current frame.

## Signals

- A variable like `keys_collected = 0` lives inside the frame loop.
- Exit checks rely on a counter that can only ever see one frame at a time.
- The game logic looks plausible but never reaches the intended win state.

## Response

- Move cumulative counters outside `TIC()` or into persistent state.
- If the model needs a count, count inactive objects or update a persistent table instead of a local frame variable.
- Treat a playtest pass cautiously if the playtest script does not check the real game state.
