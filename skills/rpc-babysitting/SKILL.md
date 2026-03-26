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
- `babysitter poll` to inspect the filtered/merged status and incoming events
- `babysitter poll --raw` to inspect raw output
- `babysitter poll --jsonl` to inspect filtered JSONL
- `babysitter send '<json>'` to send agent-control commands or extension UI responses
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

Then supervise the run by polling for filtered/merged events by default, or with `--raw` / `--jsonl`, and sending JSON commands through `babysitter send '<json>'`.

The filtered poll views surface approval request IDs directly, so ordinary approval handling should not require raw mode.

Compatibility alias:

- `./babysit`

For short `Approve` / `Disapprove` / `Nudge` responses, a one-line `babysitter send '<json>'` command is fine.

For longer freeform `input` or `editor` payloads, do not hand-quote a long JSON string if you can avoid it. Use a heredoc-backed shell variable instead.

```sh
payload=$(cat <<'EOF'
{"type":"extension_ui_response","id":"REQ2","value":"Do not background tic80ctl start. Start it in the run directory, then load penguin.lua, then run it."}
EOF
)
./babysitter send "$payload"
```

That avoids brittle shell quoting when the nudge text contains punctuation, quotes, or multiple sentences.

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
- `follow_up`: optional post-run continuation message when you intentionally want a normal next turn after a completed run
- `abort`: stop the current run

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

The example text below is only illustrative. The `value` should contain the actual edited text you want to submit.

```json
{"type":"extension_ui_response","id":"REQ3","value":"...edited text..."}
```

### `method: "confirm"`

Reply with `confirmed`.

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
