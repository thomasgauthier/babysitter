---
name: rpc-babysitting
description: Supervise a coding agent through `pi --mode rpc`, use the `babysitter` operator workflow, answer extension UI requests with the correct JSON shapes, and record session findings in filesystem memory.
---

# RPC Babysitting

Use this skill when you are asked to babysit a smaller coding agent over `pi --mode rpc`.

## Start

The operator-facing workflow is `babysitter`.

Use it to start, observe, interact with, and stop a supervised run:

- `babysitter new` to create a new run
- `babysitter status` to inspect the current session state
- `babysitter requests` to list pending extension UI requests
- `babysitter request <id>` to inspect one request
- `babysitter poll` to inspect unread events
- `babysitter poll --json` to inspect filtered structured events
- `babysitter poll --raw` to inspect raw output
- `babysitter poll --jsonl` only as a compatibility alias
- typed commands like `prompt`, `steer`, `follow-up`, `interrupt`, `abort`, `approve`, `disapprove`, `nudge`, `heuristic`, `input`, `edit`, `confirm`, `reject-confirm`, `cancel`, and `select`
- `babysitter send '<json>'` only as a raw JSON escape hatch
- `babysitter stop` to end the run

`babysitter new` guarantees the launch invariants for a run:

- `/workspace/babysitter/agent/workspace/`
- a fresh working directory for each run
- boilerplate copied into that directory
- `pi` launched from inside that directory
- login-shell launch semantics so the babysat agent inherits the operator environment
- persistent transport for stdin/stdout
- incremental stdout polling through filtered/merged `babysitter poll`

`babysitter` owns the launcher now. Use `babysitter new`, not a separate shell wrapper.

Then supervise the run with `status` / `requests` for current state, `poll` for unread events, `poll --json` for structured unread output, and typed commands for ordinary replies and steering.

The stored request views surface request IDs directly, so ordinary approval handling should not require raw mode or hand-written JSON.

Compatibility alias:

- `./babysit`

Use typed commands first:

```sh
./babysitter prompt --file task.md
./babysitter approve REQ1
./babysitter nudge REQ2 --file nudge.txt
```

For `Nudge`, prefer the high-level CLI form:

1. `babysitter nudge <id> --text ...`
2. or `babysitter nudge <id> --file ...`

The CLI still performs the real two-step RPC flow underneath, but the operator does not need to answer the follow-up input request manually.

Use `babysitter send` only when the typed commands do not fit.

## Role

Your job:

- keep the run bounded
- approve reasonable actions quickly
- disapprove obvious drift or harmful actions
- nudge when the model is close but needs local correction
- write down new findings in filesystem memory

## The Two Kinds Of JSON You Send

In the examples below:

- the JSON shape is literal
- required field names are literal
- example prose inside `message` or freeform `value` fields is only illustrative
- do not reuse the exact sample wording unless it fits the current situation
- do follow the exact command and response schema

### 1. Agent-control commands

Use these to start, steer, continue, or stop a run.

The `type` field is fixed.
The `message` field is freeform and should match the current task.

```json
{"type":"prompt","message":"Build a small TIC-80 penguin game."}
```

```json
{"type":"steer","message":"Do not debug the wrapper. Load the cart, then run it."}
```

```json
{"type":"follow_up","message":"Now simplify the game and make the player more visible."}
```

```json
{"type":"abort"}
```

Use them this way:

- `prompt`: start a new run
- `steer`: correct a run that is still actively underway
- `follow_up`: optional post-run continuation message when you intentionally want a normal next turn after a completed run; the CLI command is `babysitter follow-up`
- `interrupt`: same as pressing Esc in the UI; uses the RPC abort path without stopping the local babysitter process group
- `abort`: stop the current run via the RPC abort path

If the last visible state is `turn end (stop)` and later polls show no new activity, do not rely on `steer` to restart the model. Start a new run with `prompt`.

If you are unsure whether to use `prompt` or `steer`, prefer:

- `prompt` after a stopped or idle run
- `steer` only while the run is still clearly active and mid-course correction is needed

### 2. Extension UI responses

These answer `extension_ui_request` events.

The response envelope is fixed.
For the content:

- `select`: `value` must be exactly one of the option strings presented by the extension
- `input`: `value` is freeform
- `editor`: `value` is freeform
- `confirm`: use `confirmed: true` or `confirmed: false`

## How To Answer `extension_ui_request`

### `method: "select"`

Reply with top-level `value` equal to one of the option strings.

Preferred CLI:

```sh
./babysitter approve REQ1
./babysitter disapprove REQ1
./babysitter nudge REQ1 --text "Do not debug tic80ctl. Continue the bounded workflow: load the cart, then run it."
./babysitter heuristic REQ1
./babysitter select REQ1 --option "Approve"
```

```json
{"type":"extension_ui_response","id":"REQ1","value":"Approve"}
```

```json
{"type":"extension_ui_response","id":"REQ1","value":"Disapprove"}
```

```json
{"type":"extension_ui_response","id":"REQ1","value":"Nudge"}
```

```json
{"type":"extension_ui_response","id":"REQ1","value":"Heuristic Suggestion (approve)"}
```

```json
{"type":"extension_ui_response","id":"REQ1","cancelled":true}
```

### `method: "input"`

Reply with top-level `value`.

Preferred CLI:

```sh
./babysitter input REQ2 --text "Do not debug tic80ctl. Continue the bounded workflow: load the cart, then run it."
```

The example text below is only illustrative. The `value` should contain whatever nudge or input actually fits the live situation.

```json
{"type":"extension_ui_response","id":"REQ2","value":"Do not debug tic80ctl. Continue the bounded workflow: load the cart, then run it."}
```

Or cancel:

```json
{"type":"extension_ui_response","id":"REQ2","cancelled":true}
```

### `method: "editor"`

Reply with top-level `value`.

Preferred CLI:

```sh
./babysitter edit REQ3 --file edited.txt
```

The example text below is only illustrative. The `value` should contain the actual edited text you want to submit.

```json
{"type":"extension_ui_response","id":"REQ3","value":"...edited text..."}
```

### `method: "confirm"`

Reply with `confirmed`.

Preferred CLI:

```sh
./babysitter confirm REQ4
./babysitter reject-confirm REQ4
./babysitter cancel REQ4
```

```json
{"type":"extension_ui_response","id":"REQ4","confirmed":true}
```

```json
{"type":"extension_ui_response","id":"REQ4","confirmed":false}
```

Or cancel:

```json
{"type":"extension_ui_response","id":"REQ4","cancelled":true}
```

### One-way UI methods

Do not answer these:

- `notify`
- `setStatus`
- `setWidget`
- `setTitle`
- `set_editor_text`

## Critical Footgun

For `select`, `input`, and `editor`, the correct field is top-level `value`.

Correct:

```json
{"type":"extension_ui_response","id":"REQ1","value":"Approve"}
```

Incorrect:

```json
{"type":"extension_ui_response","id":"REQ1","response":{"selection":"Approve"}}
```

Do not use nested response shapes.

## RPC Decision Tree

```mermaid
flowchart TD
    A["Read one JSON event from RPC stdout"] --> B{"event.type ?"}

    B -->|extension_ui_request| C{"method ?"}
    B -->|need to direct the run| D["Send agent-control command"]
    B -->|everything else| E["Observe only<br/>No response required"]

    D --> D1["prompt<br/>{\"type\":\"prompt\",\"message\":\"...\"}"]
    D --> D2["steer<br/>{\"type\":\"steer\",\"message\":\"...\"}"]
    D --> D3["follow_up<br/>{\"type\":\"follow_up\",\"message\":\"...\"}"]
    D --> D4["abort<br/>{\"type\":\"abort\"}"]

    C -->|select| F["Respond with top-level value<br/>{\"type\":\"extension_ui_response\",\"id\":\"REQ\",\"value\":\"Approve\"}"]
    C -->|input| G["Respond with top-level value<br/>{\"type\":\"extension_ui_response\",\"id\":\"REQ\",\"value\":\"...\"}"]
    C -->|editor| H["Respond with top-level value<br/>{\"type\":\"extension_ui_response\",\"id\":\"REQ\",\"value\":\"...\"}"]
    C -->|confirm| I["Respond with confirmed<br/>{\"type\":\"extension_ui_response\",\"id\":\"REQ\",\"confirmed\":true}"]
    C -->|notify / setStatus / setWidget / setTitle / set_editor_text| J["No response required"]
```

## How To Babysit

Use this default policy:

- approve bounded actions that directly move the task forward
- disapprove clear drift, destructive moves, or actions that violate hard constraints
- nudge when the model is near the correct path but needs sharper local guidance
- when the extension offers `Heuristic Suggestion (...)`, choose it only if it matches your actual judgment
- otherwise choose the option that matches your actual judgment

## Filesystem Memory

Use filesystem as memory.

When you learn something during a babysitting session, write it down under:

- `/workspace/babysitter/state/`

Create or update `.md` files for:

- model-specific quirks
- recurring failure branches
- nudges that work
- extension or workflow issues
- session-specific findings

Do not leave important observations only in chat history.

## TIC-80 Default Operating Pattern

For TIC-80 coding runs, default to:

- keep the model on a bounded `start -> load -> run -> eval/playtest` path
- after a Lua write, push toward runtime verification instead of accepting file creation as success
- if a Lua write still contains a known wrong TIC-80 structure, API family, or variable-scope mistake, disapprove it or give one exact nudge instead of approving it "to see what happens"
- reserve nudges for local fixes; if the cart is structurally wrong again after one correction, stop approving and prefer bounded disapprove/stop behavior
- once `tic80ctl` is known to exist, do not spend extra turns rediscovering it
- prefer a direct session sequence in the run directory: `tic80ctl start`, then `tic80ctl load ...`, then `tic80ctl run`
- do not casually background `tic80ctl start` with `&` unless there is a clear reason and no simpler foreground path
- if `tic80ctl` reports `no active session`, start one and retry the bounded sequence
- stop environment archaeology unless it is clearly necessary
- move toward real runtime validation early
- record poor `tic80ctl` feedback in filesystem memory instead of compensating for it with extra extension logic

## Read Only If Needed

If you need more repo-local context while babysitting, read:

- `/workspace/babysitter/START_HERE.md`
- `/workspace/babysitter/what_why_how.md`
