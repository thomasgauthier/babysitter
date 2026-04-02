## Session

- Model: `omnicoder-9b-iq3_xxs`
- Task: build a TIC-80 cars game
- Scope: bounded TIC-80 cart with runtime verification

## Outcome

- Partial success.
- The run showed repeated structural drift and transport-layer stalling, so the operator had to keep it bounded instead of pushing through to runtime.

## Notes

- The model repeated the same wrong cart shape after exact correction and needed disapproval rather than another nudge.
- One post-`steer` turn stayed silent with the run still marked `running`, so progress could not be inferred from the transport response alone.
- A stopped run later surfaced a bad `write` request only in the unread tail of `poll`.
- The session confirmed that `steer success=True` is not evidence of a resumed turn.

## Addendum: `onyx-willow` and `ivory-glacier`

- `onyx-willow`: exact `steer` landed, but the run stayed silent and only `babysitter stop` ended it.
- `ivory-glacier`: the same pattern repeated with a second wrong structural draft, and the latent bad `write` only surfaced after stop.
- The post-stop `disapprove` attempt failed with `no active session`, so typed responses must happen before the run is closed.

## Addendum: `golden-delta`

- `golden-delta` stayed visible through normal `status` / `requests` / `poll`; no raw inspection was needed.
- First reviewed `cars.lua` draft used `load()` / `update()` / `draw()` / `main()` wrappers, `input.is_key_pressed`, a tiny 16x16 world model, and a malformed palette string shorter than the required 96 hex characters. It was disapproved immediately.
- One exact nudge switched the file toward `function TIC()` and `btn`/`btnp`, but the wrappers and palette footer still remained, so the cart was not yet structurally safe.
- Two more drafts repeated the same wrapper-style structure and the same bad palette footer.
- The run was stopped after the third structurally wrong draft. No `tic80ctl` command was approved because the agent never produced an approvable cart.
