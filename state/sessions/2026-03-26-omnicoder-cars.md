## Session

- Model: `omnicoder-9b-iq3_xxs`
- Operator goal: supervise a bounded TIC-80 Cars game run with `babysitter`
- Sessions run: `jade-delta`, then `rapid-lantern`

## Outcome

- No runnable cart was approved.
- The first run stalled inside an oversized `write` draft with a massively expanded palette string and never surfaced a normal actionable request through filtered views.
- The second run produced three reviewed `cars.lua` drafts, all rejected or nudged for deterministic TIC-80 structure mistakes.
- No `tic80ctl start -> load -> run -> playtest` sequence was reached because no Lua write became safe to approve.

## Observed Failures

- First draft family used non-TIC-80 structure: `update()`, `draw()`, `input()`, `drawtext`, `is_key_pressed`, `TIC.width`, `TIC.height`.
- The model repeatedly placed the palette block at the top of the file even after explicit correction that it had to be the final lines.
- After nudges, the model repeated near-identical or identical writes instead of materially revising the cart.
- One later draft introduced a fresh deterministic bug: `obstacleY` referenced but never defined.

## Babysitter Notes

- Launching `new` and `prompt` in parallel caused an operator-side race where `prompt` saw `no session metadata found`. Serial launch avoided it.
- `babysitter poll --raw` exposed a large in-flight write request that filtered `poll`/`requests` did not make obvious during the first run.
- Ending the run was better than approving structurally wrong Lua just to see runtime errors.

## Addendum: `onyx-willow` And `ivory-glacier`

- `onyx-willow`: approved the required skill read, observed the model drift into `love.load()` / `TIC.draw()` / `TIC.update()` reasoning, sent one exact `steer`, then saw only `response: command=steer success=True` followed by a silent `running` turn until `babysitter stop`.
- `ivory-glacier`: approved the required skill read, observed a second wrong structural draft using `input.is_key_pressed`, `update()`, `draw()`, and `tick()`, sent one exact `steer`, then again saw a silent `running` turn with no new request until stop.
- After stopping `ivory-glacier`, the unread tail surfaced a latent `write` request for `cars.lua`. The draft was not approvable: wrong TIC-80 API family, tiny 24x16 screen model, `tick()` instead of `function TIC()`, and a malformed palette block that used comma-separated colors instead of one 96-hex-character string.
- Attempting `babysitter disapprove <id>` after the stop failed with `no active session`, so the timing edge matters operationally.
