# TIC-80 Project Workflow

Use this file for repo-level workflow: filesystem root choices, multi-file organization, external modules, and shipping caveats. It is intentionally focused on what an agent needs while editing and testing carts.

## Recommended Working Model

For agent-driven iteration, prefer this loop:

1. edit the cart or module files
2. run one bounded check with `eval`, `screenshot`, or `playtest`
3. inspect the evidence
4. revise
5. repeat

This keeps debugging reproducible and avoids control churn.

## Start TIC-80 From The Project Root

Treat the repo or game directory as the TIC filesystem root so carts, modules, screenshots, and playtest artifacts all live under the project.

Canonical launch shape:

```sh
tic80 --fs . --cmd="load main.lua"
```

In practice, `tic80ctl start` should be run from the project root you want TIC-80 to see.

## External Editor Workflow

Preferred Lua workflow:

1. create or edit art/audio/map resources in TIC-80
2. `save mygame.lua`
3. edit Lua code in the saved file with a normal editor
4. switch back to TIC-80 to run or adjust resources

Important constraints:

- script carts contain code at the top and tagged resource data at the bottom
- edit the code section, not the serialized resource blocks
- TIC-80 can notice file changes and reload them
- do not keep conflicting unsaved edits in both places

## Multi-File Lua Projects

TIC-80 Lua can load external modules with `require`.

Basic shape:

```lua
require "libraries/math"
require "libraries/table"
```

Recommended habits:

- keep `require` calls near the top of the main cart
- keep most coordination in the main cart and push helpers into modules
- keep paths relative and simple

If TIC-80 cannot find the modules automatically, extend `package.path`:

```lua
package.path = package.path .. ";/path/to/project/?.lua"
```

Practical module notes:

- external files must remain available at runtime
- requiring many small modules is fine during development
- final distribution may need a single-file cart instead

## Shipping Caveat

If the game depends on external Lua files, exported players or packaged builds also need those files unless you bundle them back into one cart. Multi-file structure is a development convenience, not automatically a portable release format.

## Reload And State Design

If you plan to use `resume reload`, design state so it survives code reloads:

- keep game state in one root table when possible
- store that table in `_G`
- avoid scattering critical state across many unrelated globals

Example:

```lua
local state

if _G.state then
  state = _G.state
else
  state = {
    room = 1,
    player = {x = 32, y = 64},
    enemies = {},
  }
  _G.state = state
end
```

This also makes runtime inspection easier through `eval`.

## When To Use Which Validation Tool

- use `tic80ctl eval` for one fact or one quick toggle
- use `tic80ctl screenshot` for a single visual confirmation
- use `tic80ctl playtest` for anything that depends on multiple frames, route flow, or an artifact trail

Do not substitute a long chain of manual probes for a short deterministic playtest when the behavior spans time.

## Useful Editing Habit

Inside TIC-80, `CTRL+O` opens the code outline. It is still useful even when most editing happens outside TIC-80, especially for inspecting large carts quickly.
