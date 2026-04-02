## Session

- Model: `qwen3.5-9b-ud`
- Task: build a TIC-80 "Fishing" game
- Outcome: playtest passed, 18 frames, status `success`

## Notes

- The first write invented another non-TIC-80 API family and needed two nudges to stabilize.
- The model partially absorbed the first API nudge and introduced new wrong APIs on the rewrite.
- A `circ()` arity mistake was caught by Selene and self-corrected.
- The playtest command initially missed `--script-file` and needed one workflow nudge.
- After the playtest passed, the model tried to restart or screenshot again; explicit stop guidance was needed.
