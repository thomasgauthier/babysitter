## Heuristic

- If a TIC-80 Lua write still uses the wrong structural family, disapprove it rather than nudging again.
- Reserve nudges for local fixes on an otherwise valid cart.
- Repeated `update`/`draw`/`input` loops, `TIC.width`/`TIC.height`, or helper drift are stronger signals than a missing footer.

## Why

- The `omnicoder-9b-iq3_xxs` run wasted turns repeating the same cart shape after corrections.
- A soft nudge was not enough to force a clean rewrite from `function TIC()`.

## Practical Rule

- First wrong structure: one exact nudge is acceptable if the rest of the cart is salvageable.
- Same wrong structure again: disapprove and push the session toward a bounded stop or a full rewrite.
- If a `steer` only yields a success acknowledgement and standard polls stay empty while `status` remains `running`, treat that as a likely wedged turn and stop it after one bounded recheck.
- When a bad `write` request is already visible in filtered `poll`, answer it before stopping; once the session is stopped, typed request responses can fail with `no active session`.
