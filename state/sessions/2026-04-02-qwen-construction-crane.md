## Session

- Date: 2026-04-02
- Session: `jade-upland`
- Model: `qwen3.5-9b-ud`
- Task: build a bounded TIC-80 `construction crane` game and verify it with `tic80ctl`

## Outcome

- The run never reached `tic80ctl start`.
- No `.lua` cart was approved.
- The session was stopped after repeated structurally wrong TIC-80 writes.

## Observed Branches

- First draft switched fully into LÖVE2D-style structure: `love.load`, `love.draw`, `love.keypressed`, `TIC.w`, `TIC.font`.
- The same draft also violated the palette footer format by using comma-separated colors instead of one 96-character hex string.
- After one exact structural nudge, later drafts still invented or misused TIC-80 APIs: `kdbp`, `rand`, `btn(7)`, `btnp(19)`, and wrong `print(...)` argument order.
- A later `steer` that explicitly banned `kdb*` and `rand` did not prevent the next write from reusing both.
- After disapproved writes, the agent tried to recover by reading the current cart path, but the file did not exist because the rejected write never landed.

## Useful Operator Moves

- One exact nudge was useful on the first draft because it forced the model off `love.*` and onto `function TIC()`.
- Direct disapproval was better than repeated nudges once the model started resending structurally wrong TIC-80 drafts.
- A bounded `steer` was worth trying while the run was still active, but the `success=True` acknowledgement was not evidence of resumed correctness.
- Stopping the run after the repeated structural miss was better than waiting for a fourth speculative rewrite.

## Weak Spots Seen In The Stack

- Heuristic suggestion on the second bad TIC-80 rewrite was still `nudge`; this run needed `disapprove`.
- The filtered operator surface did not make it obvious that a disapproved write left no file behind until a later `read` failed with `ENOENT`.
- `bd` issue filing was blocked locally because the Dolt-backed `babysitter` database was unavailable on `127.0.0.1:13337`.
