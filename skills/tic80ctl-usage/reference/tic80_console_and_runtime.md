# TIC-80 Console And Runtime

Use this file for the shell-facing parts of TIC-80 itself: console commands, runtime probing, and reload behavior. Prefer it over scattered wiki pages.

## Commands To Keep In Working Memory

### Cart Lifecycle

- `new lua`
- `load <cart>`
- `save <cart>`
- `run`
- `resume`
- `resume reload`
- `edit`

### Filesystem

- `dir` or `ls`
- `cd <path>`
- `mkdir <name>`
- `del <path>`
- `folder`

### Inspection And Export

- `eval <code>` or `=<code>`
- `help [topic]`
- `import <kind> <file> ...`
- `export <kind> <outfile> ...`

## What Matters For `tic80ctl`

`tic80ctl` wraps a live TIC-80 session, so the commands that matter most are:

- `load`:
  load a cart into the session.
- `run`:
  start the loaded cart.
- `eval`:
  run a short Lua probe in the current runtime.
- `resume reload`:
  reload code while preserving state when the cart is structured for it.
- `help commands`, `help api`, `help keys`, `help buttons`:
  quick built-in discovery when the local references are insufficient.

## Reliable Runtime Probe Pattern

`eval` needs a live VM. Use this order:

1. `tic80ctl start`
2. `tic80ctl load game.lua`
3. `tic80ctl run`
4. `tic80ctl eval "trace(type(TIC))"`

If `eval` returns nothing useful, the usual causes are:

- the cart has not been run yet
- the cart crashed during startup
- the expression did not emit anything with `trace(...)`

## `eval` Guidance

Good uses:

- inspect globals: `trace(player.x)`
- inspect state tables: `trace(state.mode)`
- flip a debug flag: `debug_hitboxes = true`
- run a tiny repair: `player.hp = 3`

Do not use `eval` for large patches or multi-step behavior. Edit the cart or write a playtest instead.

## Reload-Friendly Development

`resume reload` is the fastest way to test a fix in the middle of a hard-to-reach game state. To benefit from it, initialize state so reload does not wipe it.

Good pattern:

```lua
local state

if _G.state then
  state = _G.state
else
  state = {
    x = 64,
    y = 128,
    shots = {},
    enemies = {},
  }
  _G.state = state
end
```

Why this pattern works:

- reload reuses the existing state table
- `eval` can inspect and modify `_G.state`
- one root state table is easier to preserve than many globals

Watch for this edge case:

- objects that store methods or closures may still point at old code after reload and may need to be rebuilt.

## External Script Carts

For text-based iteration, save as a script cart:

```text
save mygame.lua
```

Important rules:

- write code near the top of the file
- leave TIC resource blocks at the bottom alone unless you intentionally edit them
- avoid unsaved changes in both TIC editors and the external editor at the same time
- TIC-80 can auto-reload the file when it changes on disk

This is the main workflow `tic80ctl` expects for Lua-based projects under version control.

## High-Signal Console Commands

### `load`

- loads a cart or section from disk
- the `.tic` suffix is optional

### `save`

- saves the current cart
- script extensions such as `.lua` are useful for external-editor workflows

### `run`

- starts the current cart
- if it fails immediately, suspect a startup/runtime error

### `resume`

- resumes the last run cart
- `resume reload` reloads code first

### `eval`

- evaluates code in the running VM
- use `trace(...)` if you want visible output

### `folder`

- reveals the active TIC filesystem root
- use this when path behavior is unclear

### `help`

Fastest built-in discovery entry points:

- `help commands`
- `help api`
- `help keys`
- `help buttons`
- `help spec`

### `import`

Most relevant kinds during development:

- `import code <file>`
- `import sprites <file>`
- `import tiles <file>`
- `import map <file>`

### `export`

Most relevant kinds during development:

- `export html <file>`
- `export binary <file>`
- `export sprites <file>`
- `export mapimg <file>`
- `export help <file>`

## Debugging Habits

- Prefer `trace(...)` over guessing.
- Clear the screen every frame with `cls()` unless persistence is intentional.
- If path resolution is confusing, confirm the TIC-visible root with `folder`, `dir`, and `cd`.
- Keep one long-lived session running; repeated start/stop cycles cost time and throw away state.
