## Traits

- This model repeatedly drifts into non-TIC-80 engine structure on the first draft, especially `init()` / `update()` / `draw()`.
- It also mixes in incorrect input and Lua syntax, including `input.p1` and `for i = 0 to 15`.
- It can invent a whole fake TIC-80 surface on first write, including `input.pressed`, `tic.mode`, `TIC_RUN`, `TIC_STOP`, `tinit`, `tupdate`, `tdraw`, and `end()`.
- It can produce superficially correct carts that still fail at runtime, such as stationary gameplay after `tic80ctl` success.
- It struggles with exact character-count tasks like the 96-character palette string and often needs the literal string supplied.
- It can hallucinate TIC-80 APIs and Lua features from adjacent game-engine patterns, including `tile()`, `keydown()`, `text()`, and `//`.
- It may keep verifying the same exactness problem with `read`, `wc -c`, or `grep` instead of moving to runtime checks.
- It can look "fixed" structurally while still being behaviorally broken, especially when the render path returns early.
- One comprehensive API mapping nudge usually fixes the first-write API hallucination family in one pass.
- It can drift all the way into LÖVE2D (`love.run`, `love.update`, `love.draw`) when unsure, not just small API mistakes.
- It can keep inventing high-confidence helper names after one nudge, including `kdbp`, `rand`, and `btnp(19)`.
- Exact palette counting is the weak point; provide the literal string instead of asking it to generate one.
- It may miscount a correct palette after reading it back and then try to rewrite an already-correct string.
- It may fall back to shell-based file writes when the edit tool is blocked; that should be treated as a workflow error, not progress.
- It can ignore a disapproval reason and resend the same code via `cat >` before it learns the tool boundary.
- Procedural nudges about bounded workflow steps usually work quickly, such as "reload before run" or "call playtest helpers instead of redefining them".
- Playtest input shape can drift into numeric button IDs; fix that with one procedural nudge.
- Pre-seeding the prompt with explicit TIC-80 API reminders can improve the first write, but it does not prevent later verification loops.
- One API nudge can be only partially absorbed; inspect the rewrite for new invented APIs before approving.
- Some sessions need two API nudges because the first rewrite fixes one family but introduces a new one.
- After a structural nudge, a repeat of the same wrong API family should be disapproved instead of nudged again.
- Parse or lint errors can trigger a full rewrite into a brand-new invented API surface instead of targeted fixes.
- A comprehensive wrong-to-right mapping still fixes those rewrite bursts in one pass.
- It may try post-verification archaeology like screenshots after playtest already passed; stop that turn.
- It may also try to restart `tic80ctl` after a clean playtest unless the operator closes the loop explicitly.
- Game-logic bugs can persist after the cart loads cleanly, especially around table mutation and unreachable win conditions.

## Operator Implication

- Treat the first draft as structurally unreliable until `function TIC()` and the palette are both correct.
- Use precise technical nudges, not vague encouragement, and move quickly to disapproval if the same wrong family repeats.
- Verify actual gameplay, not just load success, because this model can look correct while remaining broken.
- When it is stuck on exactness, give the exact literal string or code block and stop approving more counting turns.
- Require a visual playtest before believing the cart is actually rendering.
- Use one full API correction list rather than several partial corrections when the first write is hallucinated.
- Use direct one-line nudges for workflow mistakes, but prefer code snippets or tighter blocking for logic bugs.
- If the write is LÖVE2D-shaped, do not nibble at it; require a full TIC-80 rewrite.
- After a rejected write, a read of the same cart path can fail with `ENOENT` because the file never landed.
- If lint catches parse errors, expect the model to overcorrect into a new wrong framework unless you provide a complete replacement list.
- If a playtest command is missing `--script-file`, nudge it before the run instead of assuming the model will infer the missing argument.
- If the model keeps using `cat >` after disapproval, repeat the tool correction before assuming it has switched.
- Per-frame counters declared inside `TIC()` can look correct but reset every frame; require persistent state for cumulative counts.
- Unconditional `end_episode("success")` means the playtest proves runtime stability, not game correctness.

## Confidence

- These behaviors appeared across the `2026-04-01` cars session and the linked patch notes for `qwen3.5-9b-ud`.
- The later `2026-04-01` dragons and `2026-04-02` flowers notes repeat the same failure families, so the pattern is stable enough to keep as model-specific guidance.
- The `ember-valley` session added the same API drift and exactness failure plus persistent logic bugs after runtime success.
