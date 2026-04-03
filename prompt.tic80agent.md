Build a complete, playable TIC-80 game about: Pizza delivery.

First:
- read the `tic80ctl-usage` skill
- read only the parts of its referenced material that you actually need for the next step
- do not broaden into filesystem archaeology unless necessary

Requirements:
- create a single runnable `.lua` cart in the current working directory
- the game must be fully playable from start to finish
- keep the design small and bounded: one player, one pickup/order source, one delivery target, one score/progress loop
- use proper TIC-80 Lua structure
- for an ordinary cart, use exactly one global `function TIC()` frame callback
- keep persistent gameplay state outside `TIC()`
- do not switch to another engine or API family
- do not keep `init()`, `update()`, `draw()`, `main()`, `love.*`, or wrapper-style game loops around `TIC()`
- use real TIC-80 APIs only; do not invent helper families or guessed globals
- use real TIC-80 gamepad input with `btn(...)` and `btnp(...)`
- directional ids are: `btn(0)` for up, `btn(1)` for down, `btn(2)` for left, `btn(3)` for right
- do not use strings, symbolic button constants, keyboard keycodes, or fake comparisons like `key(...) == "left"` for player movement
- include a palette block at the very end of the file
- choose your own palette for the game, but you must express it in the exact TIC-80 palette-block format shown below
- the palette block must be the final lines of the file, with no content after it
- the palette data must be a single 96-hex-character string representing 16 RGB colors in sequence
- do not omit the palette block, even if using TIC-80 defaults
- do not mutate the palette at runtime if the task expects the trailing palette block

Palette format requirements:
- use this exact wrapper structure:
  -- <PALETTE>
  -- 000:your96hexcharactershere
  -- </PALETTE>
- `000:` must appear exactly once
- the hex string must contain exactly 16 colors × 6 hex digits each = 96 hex characters total
- use only lowercase hexadecimal characters: `0-9` and `a-f`
- do not add spaces inside the hex string
- do not add extra comment lines inside the palette block
- example shape only:
  -- <PALETTE>
  -- 000:00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff
  -- </PALETTE>

Workflow:
- inspect only what you need for the next step
- write the cart
- then verify it with a bounded TIC-80 workflow:
  1. `tic80ctl start`
  2. `tic80ctl load <cart>.lua`
  3. `tic80ctl run`
- if the cart file was rewritten, reload it before running it again
- if runtime errors occur, fix the specific error and retry
- once it runs, create a concrete scripted playtest and verify actual gameplay with `tic80ctl playtest --script-file <episode.lua>`
- use playtest verification to prove the game really transitions out of menu/start state and can be played to a real success condition

Playtest requirements:
- write the episode script as a normal file in the working directory
- in the episode script, call the provided harness helpers; do not redefine functions like `frameadvance`, `set_input`, `log`, or `end_episode`
- use the documented harness input shape; do not guess alternate numeric-button conventions if named buttons are expected
- do not end the playtest with unconditional success unless the in-game win/delivery condition was actually reached

Important:
- do not stop after file creation
- do not invent command syntax when the skill or references provide it
- do not switch to another engine or API family
- do not rewrite code through shell redirection such as `cat > file`; use the proper write/edit tools
- do not get stuck recounting palette characters; if exactness is uncertain, make one bounded correction and continue verification
- do not treat `tic80ctl run` alone as proof that the game works
- do not claim success until the cart has been loaded, run, and playtested successfully
- after successful runtime verification, stop; do not restart TIC-80 or do extra archaeology unless a specific bug still needs inspection
- do not ask me for permission or intermediate validation
- continue autonomously until the game is implemented and verified
