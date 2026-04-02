## Prompt

`Use actual TIC-80 Lua structure: define function TIC() as the frame loop, use btn/btnp for input, and remove load/update/draw/main/input.is_key_pressed. Keep one runnable cars.lua with the palette block at the very end using exactly 96 lowercase hex chars after 000:. Then proceed with the bounded sequence tic80ctl start -> tic80ctl load cars.lua -> tic80ctl run -> playtest.`

## Use When

- The model is still wrapping TIC-80 code in generic game-loop functions after a correction.
- The palette footer is still malformed or still in the wrong location.
- You want one concrete replacement phrase that pushes the run directly toward runtime verification.

## Effect

- It moved the model off `input.is_key_pressed` and forced it to mention `TIC()`.
- It did not by itself eliminate wrapper-style rewrites, so a repeat of the same shape still needed disapproval.
