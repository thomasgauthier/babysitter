## Pattern

- `omnicoder-9b-iq3_xxs` tends to repeat the same wrong TIC-80 cart shape even after exact correction.
- The run can also wedge at the transport layer after a `steer`, leaving `status` as `running` with no new visible work.

## Signals

- `update()` / `draw()` / `input` loops keep replacing `function TIC()`.
- `TIC.width` / `TIC.height` or other wrong helpers keep reappearing.
- `load()` / `draw()` / `main()` wrappers can appear around a later `TIC()` and still count as the same wrong structure.
- The palette footer can stay malformed even after `TIC()` is introduced.
- A post-`steer` turn stays silent while the session is still marked `running`.
- A stopped run may reveal a latent bad `write` request only in the unread tail of `poll`.

## Response

- Use one exact nudge when the cart is still salvageable.
- If the same structural mistake repeats, disapprove instead of nudging again.
- If the nudge only moves the model from `load()` / `draw()` / `main()` to `TIC()` while leaving the wrapper stack or palette footer in place, count it as the same structural failure.
- After three structurally wrong Lua drafts in one bounded run, stop rather than waiting for a fourth.
- If `steer` appears to succeed but nothing new surfaces, stop after one bounded wait.
- Answer any visible bad `write` request before stopping, because it may disappear from the typed-request surface afterward.
