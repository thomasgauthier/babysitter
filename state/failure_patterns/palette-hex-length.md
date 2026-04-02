## Pattern

- `qwen3.5-9b-ud` can fail to produce a 96-character TIC-80 palette string even after the requirement is stated clearly, the formula is explained, and a correct example is provided.
- The model may keep "counting" in reasoning while still emitting the wrong-length string.

## Signals

- Palette attempts land at lengths like 104, 108, 79, or 72 instead of 96.
- The same string gets re-read or re-counted without a useful edit.
- The run stalls on exactness instead of moving toward `tic80ctl load` and playtest.

## Response

- Stop spending turns on another counting pass once the loop is visible.
- Provide the exact literal palette string or inject it after the write.
- If the cart is otherwise ready, move the session back to runtime verification.

## Session: amber-aurora (2026-04-02)

- Same model, same failure family, but the model was given a correct 96-character string in a steer and still miscounted it as 78 on readback.
- The model then tried to rewrite an already-correct palette, which confirms it does not trust its own character counting after a successful edit.
- Hard steer worked better than another count-based nudge: stop the loop, keep the correct string, and move on.
