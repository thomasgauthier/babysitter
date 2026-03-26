# What / Why / How

This document is the clean bootstrap for a new engineer joining this project cold.

It answers:

1. what this project is
2. why we think it matters
3. how the current prototype works
4. where the important files live
5. what is still weak

## What This Project Is

This project is about turning strong live babysitting into reusable runtime policy.

The core method is:

- run a weaker coding model inside `pi --mode rpc`
- supervise it from the outside
- intercept important actions with extensions
- choose `approve`, `disapprove`, `nudge`, or `heuristic suggestion`
- log those decisions
- improve the heuristic harness until it matches strong supervision more often
- then check whether that improves real downstream task success

The working thesis is:

- the model alone is not the product
- the product is `model + harness + validators + intervention policy`

## Why This Matters

Small and local models often fail in repetitive ways:

- they broaden into tool or environment archaeology after one bad result
- they miss exact local constraints even when they understand the overall task
- they produce almost-correct code and then fail on one deterministic detail
- they recover poorly from ambiguity

Those failures are often harnessable.

That is the opportunity:

- move reliability into the runtime
- keep a stronger babysitter in the loop while building the policy
- distill that supervision into reusable heuristics and guardrails

This is not just prompt engineering.
It is closer to policy extraction from expert supervision.

## Why TIC-80 Is the Current Testbed

We have been using TIC-80 game creation as the proving ground because it is:

- real enough to expose model failures
- small enough to iterate quickly
- strict enough to punish sloppiness
- easy to validate with `tic80ctl`

It forces exactness around things like:

- `function TIC()`
- valid Lua
- static palette footer formatting
- correct `tic80ctl` sequence

That makes it a good environment for harness work.

## The Current Runtime Substrate

There are three important layers.

### 1. `pi --mode rpc`

This gives us a headless JSONL control loop:

- commands go to agent `stdin`
- events and responses come back on `stdout`
- we can steer mid-run
- extensions can request UI decisions from the host

The important babysitter commands are:

- `prompt`
- `steer`
- `follow_up`
- `abort`

Operationally:

- `prompt` starts a new run
- `steer` is for a run that is still active
- after `turn end (stop)`, use a new `prompt` instead of expecting `steer` to restart the model

The important host-side event class is:

- `extension_ui_request`

### 2. `pi` extensions

Extensions are the control plane.

They let us:

- inspect tool calls before execution
- inspect results after execution
- block actions
- inject nudges
- update status
- log decisions and outcomes

### 3. `babysitter`

This is the operator surface over the raw RPC runtime.

It owns:

- fresh run directory creation
- boilerplate seeding
- `pi` launch under the right shell semantics
- persistent stdin/stdout transport
- incremental stdout polling through filtered/merged `babysitter poll`
- single-session lifecycle commands like `new`, `send`, `poll`, and `stop`

So the babysitter does not need to manually manage FIFOs, `nohup`, or log offsets during normal operation.

## Current Repo Layout

The canonical layout in this repo is:

- [README.md](/workspace/babysitter/README.md)
- [START_HERE.md](/workspace/babysitter/START_HERE.md)
- [SKILL.md](/workspace/babysitter/skills/rpc-babysitting/SKILL.md)
- [elevator_pitch.md](/workspace/babysitter/elevator_pitch.md)
- [what_why_how.md](/workspace/babysitter/what_why_how.md)
- [agent](/workspace/babysitter/agent)
- [babysitter](/workspace/babysitter/babysitter)
- [state](/workspace/babysitter/state)

Important note:

- `agent/` is the canonical home for the project system prompt, extension stack, and workspace template
- old `.pi/extensions/...` references from previous experiments are historical, not canonical here
- [SKILL.md](/workspace/babysitter/skills/rpc-babysitting/SKILL.md) owns execution procedure
- [babysitter](/workspace/babysitter/babysitter) is the operator surface and now owns launch/transport concerns
- the other `.md` files provide context, framing, and filesystem memory conventions

## The Current Extension Stack

### `live-host-approval.ts`

Source:

- [live-host-approval.ts](/workspace/babysitter/agent/extensions/live-host-approval.ts)

Purpose:

- normalize tool calls into a few high-level review buckets
- pause execution for host review
- present `approve`, `disapprove`, `nudge`, or `heuristic suggestion`
- track decision counts
- log decisions for later analysis

This is the supervision glue.

### `tic80-heuristic-suggestor.ts`

Source:

- [tic80-heuristic-suggestor.ts](/workspace/babysitter/agent/extensions/tic80-heuristic-suggestor.ts)

Purpose:

- compute the current heuristic suggestion for a reviewed action
- serve as the hill-climbed cheap stand-in for frontier babysitting
- be the file that gets iterated on as behavioral lore is promoted into code

This is the evolving heuristic policy layer.

### `selene-on-lua-write.ts`

Source:

- [selene-on-lua-write.ts](/workspace/babysitter/agent/extensions/selene-on-lua-write.ts)

Purpose:

- run Selene-style lint feedback on Lua writes
- surface quick static problems early

Important caveat:

- this layer can be noisy unless Selene is configured for the target environment
- in TIC-80 work, false positives on built-ins are a real concern

## How `live-host-approval.ts` Works

It classifies tool calls into three buckets:

- `on_lua_change`
- `on_tic_ctl_call`
- `on_anything_else`

It then asks the babysitter for one of:

- `Approve`
- `Disapprove`
- `Nudge`
- `Heuristic Suggestion (...)`

It also tracks a score:

- `h` = heuristic suggestion chosen
- `a` = direct approve
- `d` = direct disapprove
- `n` = direct nudge

And it writes decision logs under:

- `.local/host-approvals/decisions.jsonl` in the active workspace

It does not own the heuristic policy anymore.

The heuristic suggestion is computed in:

- [tic80-heuristic-suggestor.ts](/workspace/babysitter/agent/extensions/tic80-heuristic-suggestor.ts)

## How `tic80-heuristic-suggestor.ts` Works

This file computes the current `Heuristic Suggestion (...)` choice shown by the host approval UI.

It is intentionally the thing that gets hill-climbed.

Right now it is still simple and hand-written.

It looks at:

- TIC-80 command shapes
- Lua write content
- broad inspection-vs-archaeology patterns

And returns:

- `approve`
- `disapprove`
- `nudge`
- optional nudge text
- a reason string for logging

This file is where model-specific or domain-specific babysitting lore should be promoted once it is ready to become code.

## The Current Harness Generation Process

The current process is:

1. run a weaker model live
2. babysit it with stronger judgment
3. capture decisions at meaningful breakpoints
4. improve heuristics until they agree more often with the babysitter
5. separate decision agreement from nudge quality
6. periodically ground the whole loop in real task success

This is the beginning of an autoharness.

## What We Have Already Seen

Important lessons so far:

### 1. Startup and recovery drift are real

Models often broaden into help text, process inspection, or wrapper debugging after one failed command.

That is exactly the kind of branch the harness should suppress.

### 2. Tiny exactness failures are persistent

Models can understand the task globally and still repeatedly fail on:

- exact callback naming
- palette formatting
- function arity
- tiny local syntax details

### 3. Nudge quality matters as much as decision quality

A heuristic can correctly choose `nudge` and still fail because the nudge text is weak.

So we need to improve both:

- action classification
- intervention content

### 4. Near-success matters

Repeated almost-successes are not fake progress.
They often mean the remaining gap is exactness and control policy, not total inability.

## What Is Good Right Now

- The extension stack is real and runnable.
- The babysitting loop exists.
- We can log decisions.
- We have task-specific guardrails.
- We have a concrete benchmark domain.

## What Is Still Weak

- The heuristic layer still over-approves easy cases.
- Nudge wording is inconsistent.
- Selene feedback can be noisy in TIC-80 contexts.
- The system still depends heavily on a strong babysitter.
- We do not yet have a scaled replay/eval story inside this clean repo.

## Practical Mental Model For The Next Engineer

Think of the project like this:

- `pi --mode rpc` is the supervised runtime
- the babysitter is an external controller over JSONL
- extensions are the control plane
- `live-host-approval.ts` is the supervision and data loop
- `tic80-heuristic-suggestor.ts` is the hill-climbed cheap babysitter
- `selene-on-lua-write.ts` is an optional static-analysis helper
- the long-term goal is to turn strong live babysitting into reusable runtime policy

## Read This First

If you want the shortest path into the project, read in this order:

1. [README.md](/workspace/babysitter/README.md)
2. [elevator_pitch.md](/workspace/babysitter/elevator_pitch.md)
3. [SKILL.md](/workspace/babysitter/skills/rpc-babysitting/SKILL.md)
4. [live-host-approval.ts](/workspace/babysitter/agent/extensions/live-host-approval.ts)
5. [tic80-heuristic-suggestor.ts](/workspace/babysitter/agent/extensions/tic80-heuristic-suggestor.ts)
6. [selene-on-lua-write.ts](/workspace/babysitter/agent/extensions/selene-on-lua-write.ts)

## Bottom Line

This project is trying to operationalize a simple belief:

- strong babysitting can be turned into runtime policy
- runtime policy can make weaker models more useful
- if that policy compounds, we get a real autoharness

That is the whole point of the repo.
