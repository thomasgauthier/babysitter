## Useful Nudge

`Rewrite the cart before asking again. Use fixed numeric screen size constants like 240x136, not TIC.width/TIC.height. Put the palette block at the very end of the file and keep it exactly 96 hex characters. Use TIC-80 color indices 0-15, not 0xff0000-style values. Use one proper function TIC() update/draw loop with btn/btnp mapping that makes sense. Fix the bounds checks. Make the game actually playable start-to-finish, then continue to the bounded tic80ctl start -> load -> run -> playtest verification path.`

## Effect

- Good: it caused the model to explicitly reason about the missing footer and exact TIC-80 API family.
- Bad: it was not strong enough to stop a repeated near-identical write.
- In `golden-delta`, a tighter variant that explicitly banned `load/update/draw/main` and told the agent to continue directly to `tic80ctl start -> load -> run -> playtest` still only produced wrapper-style rewrites, not an approvable cart.

## Tight Variant Used In `golden-delta`

`Use actual TIC-80 Lua structure: define function TIC() as the frame loop, use btn/btnp for input, and remove load/update/draw/main/input.is_key_pressed. Keep one runnable cars.lua with the palette block at the very end using exactly 96 lowercase hex chars after 000:. Then proceed with the bounded sequence tic80ctl start -> tic80ctl load cars.lua -> tic80ctl run -> playtest.`

## Effect

- Good: it moved the model off `input.is_key_pressed` and made it mention `TIC()`.
- Bad: it still preserved `load()` / `draw()` / `main()` wrappers and repeated the same short palette string, so one exact nudge was not enough to salvage the run.

## Stronger Follow-Up

`Do not resend the same draft. Your last write was materially identical to the previous rejected one, so rewrite from a clean TIC() loop instead of patching the old structure. Use fixed numeric screen size constants like 240x136, end the file with the 3-line palette block, keep colors in the 0-15 range, and add actual gameplay with start state, movement, bounds checks, and restart. If you still have update/draw/input, TIC.width/TIC.height, or a palette block at the top, disapprove and stop approving until the cart is structurally corrected. After the corrected write is approved, continue to tic80ctl start -> load -> run -> playtest.`

## Effect

- It changed the model's stated plan to include game states and restart logic.
- It still did not produce an approvable cart before the run was stopped.
