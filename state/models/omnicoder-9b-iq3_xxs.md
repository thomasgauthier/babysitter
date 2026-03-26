## TIC-80 Notes

- On this task, the model understood the high-level goal but repeatedly missed exact TIC-80 Lua structure.
- It overfit to generic game-loop patterns (`update`/`draw`/`input`) instead of `function TIC()`.
- It treated palette requirements poorly: once it generated an oversized palette string, later retries still fixated on the palette block and kept placing it in the wrong location.
- After a disapproval, it sometimes changed its reasoning text but still resubmitted the same or nearly the same file.

## Operator Implication

- For this model, reject early on wrong TIC-80 structure and be explicit about exact replacements.
- If it repeats the same write after one focused nudge, expect looping and keep the session bounded.
