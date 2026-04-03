## Session

- Date: 2026-04-02
- Session: `rapid-willow`
- Model: `qwen3.5-9b-ud`
- Task: build and verify a bounded TIC-80 `Cars` game with `babysitter`

## Outcome

- The run was stopped after three structurally wrong `cars.lua` writes.
- No cart was approved.
- The session never reached `tic80ctl start`.

## Observed Branches

- First draft mixed a broad wrong TIC-80 family: `TIC.w`, `TIC.h`, `TIC.mapsz`, `set(...)`, `iskey(...)`, `triangle(...)`, split `update()` / `draw()`, and a palette split across multiple lines.
- Heuristic suggestion on that first write was `disapprove`, but I chose one exact structural nudge instead.
- After the nudge, the next draft still used wrong `print(...)` argument order, string button names in `btnp("UP")`, a pathological giant palette string, and other structural mistakes. I interrupted that turn before it finished spending more output on the invalid palette.
- After a fresh prompt, the next write improved the button ids and one-line palette shape but still kept invalid reset assignment syntax (`state = 0, score = 0, ...`), wrong `print(...)` argument order, and an undefined `c.color`.
- After a disapproval, the model tried to recover by reading `/workspace/babysitter/reference/tic80_api_reference.md`, which did not exist. A bounded nudge redirected it to `skills/tic80ctl-usage/reference/`.
- Immediately after a successful `ls` of that reference directory, the reasoning incorrectly claimed the bash command "wasn't executed" and attempted the read anyway.

## Useful Operator Moves

- One exact nudge on the first draft was reasonable, but the heuristic `disapprove` was defensible and likely stricter than necessary only if the next draft had cleaned up fully.
- Interrupting the giant second write was worth it because the model was visibly spending output budget on a still-invalid cart plus a pathological palette string.
- Redirecting the bad recovery search to the exact reference directory was better than approving repo-wide markdown scanning.
- After the post-reference rewrite still contained structural mistakes, stopping the session was better than waiting for a fourth speculative rewrite.

## Policy Notes

- This run supports the existing structural-escalation rule: first bad structure may get one exact nudge; second bad structure should be disapproved; a third structurally wrong rewrite should end the session.
- It also adds a narrower lesson: a successful TIC-80 reference read does not reset escalation if the next draft is still structurally wrong.
- Heuristic mismatch to note: on the first draft, the heuristic suggested `disapprove` and I overrode it with `nudge`. On the second structurally wrong write, I matched the heuristic and disapproved.
