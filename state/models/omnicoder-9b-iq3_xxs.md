## Traits

- It overfits to generic game-loop patterns like `update` / `draw` / `input` instead of `function TIC()`.
- It treats palette requirements poorly and can keep fixating on a wrong palette block after it has already been corrected.
- After a disapproval, it may change the reasoning text but still resubmit the same or nearly the same file.
- It can appear to accept a structural `steer` while leaving the run silently `running` with no new visible work.
- A stopped run can still expose a latent bad `write` request only in the unread tail.
- In `golden-delta`, it could move from `load()` / `draw()` / `main()` toward `TIC()` and still remain structurally wrong because the wrapper shape and palette footer were unchanged.
- The same run never reached `tic80ctl` verification because the cart stayed structurally unsafe; this model can burn turns rewriting Lua without earning the first runtime step.

## Operator Implication

- Reject early on wrong TIC-80 structure and be explicit about exact replacements.
- Treat a repeat of the same structural mistake as a disapprove signal, not another nudge.
- If it repeats the same write after one focused correction, expect looping and keep the session bounded.
- Do not treat `response: command=steer success=True` as progress; wait for a new `turn start`, tool call, or surfaced request.
- If a first nudge only gets the model to add `TIC()` inside a wrapper stack, stop after the next repeat instead of waiting for runtime verification.
