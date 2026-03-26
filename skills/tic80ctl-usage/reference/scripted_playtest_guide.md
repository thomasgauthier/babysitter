# Scripted Playtest Episodes

Use `tic80ctl playtest` for deterministic multi-frame validation. One episode should represent one route, one input timeline, and one artifact directory with enough evidence to decide the next change.

Preferred loop:

1. load and run the cart
2. write a short episode script
3. run one playtest
4. inspect artifacts
5. revise code or script
6. rerun the same episode

## `tic80ctl playtest`

Required:

- `--script-file <file>`

Optional:

- `--timeout <seconds>`
- `--input-overlay`
- `--no-input-overlay`

Examples:

```sh
tic80ctl playtest --script-file episode.lua
tic80ctl playtest --script-file episode.lua --timeout 5 --no-input-overlay
```

Typical output includes:

- `status=...`
- `message=...`
- `artifact_path=./playtest/episode_n`
- `frames=...`

If the episode errors or times out, keep the artifact and inspect what was produced before the failure.

## Episode Script API

Use only:

- `frameadvance()`
- `set_input(input_table)`
- `set_input(player_num, input_table)`
- `log(text)`
- `end_episode(status, message)`

### `frameadvance()`

Advances the game by exactly one frame, consumes the prepared input, captures the frame artifact, and increments the frame count.

### `set_input(input_table)`

Targets player 1 by default.

Example:

```lua
set_input({right=true, a=true})
frameadvance()
```

### `set_input(player_num, input_table)`

Targets another player explicitly.

Example:

```lua
set_input(2, {left=true, b=true})
frameadvance()
```

### Valid Button Names

- `up`
- `down`
- `left`
- `right`
- `a`
- `b`
- `x`
- `y`

### Input Semantics

Rules:

- unspecified buttons default to `false`
- input is one-frame-only
- `set_input(...)` prepares the next frame
- `frameadvance()` consumes that prepared input
- input clears automatically after the frame

### `log(text)`

Writes route annotations to `log.txt`.

### `end_episode(status, message)`

Terminates the episode deliberately.

Examples:

```lua
end_episode("done", "baseline")
end_episode("success", "reached exit")
end_episode("failure", "player died")
```

Use short explicit status strings; the message should state what happened.

## Good Episode Style

Write scripts that model a real route:

- start the test condition
- hold deliberate inputs for known spans
- log each segment with a short label
- end with an explicit success or failure message

Reusable helper:

```lua
function hold(input, frames, label)
  if label then log(label) end
  for i=1,frames do
    set_input(input)
    frameadvance()
  end
  set_input({})
end
```

Good log labels:

- `start game`
- `cross first lane`
- `collect key`
- `reach door`
- `jump final gap`
- `reach exit`

Use labels that make failures easy to localize in `log.txt` and the screenshots.

## Artifact Layout

Expect a directory like:

```text
playtest/
  episode_1/
    script.lua
    log.txt
    console.txt
    screenshots/
      000001.png
      000002.png
      ...
```

Interpretation:

- `script.lua`
  - exact episode script that ran
- `log.txt`
  - script-authored `log(...)` output
- `console.txt`
  - cart-side `trace(...)` output during the episode
- `screenshots/*.png`
  - one screenshot per advanced frame

The PNG filename is the frame number.

## What To Inspect

After a run, inspect:

- `status` and `message`
- `log.txt`
- `console.txt`
- a few key screenshots

Use this order:

1. confirm the route reached the expected segment in `log.txt`
2. check `console.txt` for cart-side facts from `trace(...)`
3. inspect the frames around the failure or success point

Do not inspect every screenshot if a few labeled segments can answer the question.

## Debugging Pattern

Use cart-side debug instrumentation during episodes.

For Lua carts, gate debug visuals behind `DEBUG_MODE` when practical:

```lua
if DEBUG_MODE then
  rectb(player.x-2, player.y-2, player.w+4, player.h+4, 2)
  trace("PX "..player.x.." PY "..player.y)
end
```

Useful episode-time debug output:

- hitboxes
- room ids
- patrol paths
- target positions
- state labels
- collision probes

Use `trace(...)` for facts you want in `console.txt`. Use `log(...)` in the episode script for route annotations.

## Determinism

Prefer episodes you can rerun exactly:

- same cart
- same script
- same expected route

If the cart uses randomness, seed or constrain it when possible so repeated runs stay comparable.

## Practical Rules

- Prefer one short, focused episode over one giant script.
- Use `playtest` for gameplay/progression validation.
- Use `screenshot` for one-off visual checks.
- Use `eval` for short runtime probes or toggles.
- Reuse a passing episode as a regression check after code changes.

The most useful outcome is not “the agent pressed buttons.” The most useful outcome is “the agent can rerun the same route and compare stable evidence between revisions.”
