## Heuristic

- If a TIC-80 Lua write repeats the same wrong structural family, disapprove it rather than nudging again.
- Reserve nudges for local fixes on an otherwise valid cart.
- If the model adds `TIC()` but keeps `load()` / `draw()` / `main()` wrappers or the same malformed palette footer, do not reset the escalation ladder.
- After three structurally wrong Lua drafts in one bounded run, stop the session rather than waiting for a fourth rewrite.
- If a `steer` only yields `success=True` and the run stays silent, treat that as a likely wedged turn and stop it after one bounded recheck.
- If a bad `write` request is already visible in `poll`, answer it before stopping; once stopped, typed responses may fail with `no active session`.

## Why

- The `omnicoder-9b-iq3_xxs` runs wasted turns repeating the same cart shape after corrections.
- A soft nudge was not enough to force a clean rewrite from `function TIC()`.
- The operator lost one response opportunity because the request surfaced only after stop.

## Practical Rule

- First wrong structure: one exact nudge is acceptable if the rest of the cart is salvageable.
- Same wrong structure again: disapprove and push the session toward a bounded stop or a full rewrite.
- Do not infer progress from a successful `steer` response alone.
