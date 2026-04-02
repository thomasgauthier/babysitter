## Observed Weakness

- The current method can miss cheap post-rewrite errors:
- `tic80ctl run` without `tic80ctl load`
- playtest episode scripts that redefine helper functions instead of calling them
- TIC-80 Lua writes that contain a known fake API family or an obviously wrong palette length
- Shell-based file rewrites can bypass the edit tool if the model gets disapproved
- Playtest scripts can drift into numeric button IDs when the harness expects named inputs
- `tic80ctl playtest` calls that omit `--script-file`
- Post-verification screenshot/restart archaeology after a clean playtest

## Heuristic

- If a cart file was just rewritten, flag `tic80ctl run` when no intervening `tic80ctl load` appears.
- If an episode script defines `frameadvance`, `set_input`, `log`, or similar playtest helpers, flag it before approval.
- If a first Lua write contains fake TIC-80 APIs, route it to a complete nudge that names every wrong API family at once.
- If the palette block is still not 96 hex characters long, do not let that block the entire workflow once the cart is otherwise runnable.
- If the model tries `cat > file` or similar shell redirection to write code, disapprove and send it back to the edit tool.
- If a playtest script uses numeric button IDs, nudge it toward the named-button convention expected by the harness.
- If `tic80ctl playtest` is missing `--script-file`, stop and request the script file first.
- If the model tries to restart or screenshot after a successful playtest, stop that archaeology turn unless there is a new bug to inspect.

## Why

- Both mistakes were fixed immediately with one short nudge in `ember-valley`.
- These are bounded, high-signal checks that prevent wasted runtime turns.
- `ember-valley` also showed that bulk API correction works better than piecemeal API cleanup, while exact palette counting does not.
- `amber-aurora` added two more cheap workflow checks: disallow shell writes and normalize playtest input shape before approval.
- `lunar-rocket` showed that missing `--script-file` and post-verification screenshot/restart behavior are repeatable enough to gate directly.
