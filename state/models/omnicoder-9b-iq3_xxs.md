## TIC-80 Notes

- On this task, the model understood the high-level goal but repeatedly missed exact TIC-80 Lua structure.
- It overfit to generic game-loop patterns (`update`/`draw`/`input`) instead of `function TIC()`.
- It treated palette requirements poorly: once it generated an oversized palette string, later retries still fixated on the palette block and kept placing it in the wrong location.
- After a disapproval, it sometimes changed its reasoning text but still resubmitted the same or nearly the same file.
- In two March 26 runs, it accepted a structural `steer` at the transport layer but did not visibly resume with a new `turn start`; `status` stayed `running` while `poll` stayed empty until the operator stopped the run.
- One stopped run later surfaced a bad `write` request only in the unread tail after `stop`, so the operator lost the chance to answer it while the session was active.

## Operator Implication

- For this model, reject early on wrong TIC-80 structure and be explicit about exact replacements.
- Treat a repeat of the same structural mistake as a disapprove signal, not another nudge.
- If it repeats the same write after one focused correction, expect looping and keep the session bounded.
- Do not treat `response: command=steer success=True` as progress; wait for a new `turn start`, tool call, or surfaced request.
