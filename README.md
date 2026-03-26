# Babysitter

Babysitter is a CLI and extension stack for supervising coding agents over `pi --mode rpc`.

It supports a host-in-the-loop workflow:

- start a supervised run with `babysitter new`
- inspect state with `babysitter status`
- list pending requests with `babysitter requests`
- inspect one request with `babysitter request <id>`
- watch progress with `babysitter poll`
- use `babysitter poll --json` for filtered structured output
- use `babysitter poll --raw` for raw output
- use `babysitter poll --jsonl` only for compatibility
- send agent-control commands with typed verbs like `prompt`, `steer`, `follow-up`, `interrupt`, and `abort`
- answer requests with typed verbs like `approve`, `disapprove`, `heuristic`, `input`, `edit`, `confirm`, `reject-confirm`, `cancel`, or `select`
- use `babysitter send '<json>'` only as a raw escape hatch
- stop the run with `babysitter stop`
- run a weaker coding model inside `pi --mode rpc`
- supervise it live from a stronger babysitter
- intercept meaningful actions with extensions
- choose `Approve`, `Disapprove`, `Nudge`, or `Heuristic Suggestion (...)`
- log those choices
- improve the heuristic harness until it agrees with the babysitter more often
- periodically cash that out into real downstream task success

The current proving ground is TIC-80 game creation with `tic80ctl`, but the runtime and supervision model are not TIC-80-specific.

The operator-facing path is `babysitter`.

`babysitter status`, `babysitter requests`, and `babysitter request <id>` are the primary inspection commands. `babysitter poll` is for unread output tails, and `babysitter send` is only for raw JSON payloads when the typed verbs do not fit.

Compatibility alias:

- `./babysit` is kept as a secondary entrypoint

It now owns:

- fresh run directory creation
- boilerplate seeding
- `pi --mode rpc` launch
- persistent stdin/stdout transport
- incremental stdout polling through filtered/merged `babysitter poll`

The current extension stack is:

- [live-host-approval.ts](/workspace/babysitter/agent/extensions/live-host-approval.ts)
- [selene-on-lua-write.ts](/workspace/babysitter/agent/extensions/selene-on-lua-write.ts)
- [tic80-heuristic-suggestor.ts](/workspace/babysitter/agent/extensions/tic80-heuristic-suggestor.ts)

## Start Here

- [START_HERE.md](/workspace/babysitter/START_HERE.md)
  First document to read in this repo.
- [SKILL.md](/workspace/babysitter/skills/rpc-babysitting/SKILL.md)
  Execution manual for supervising RPC runs, including the `babysitter`-first workflow, typed request handling, and the `prompt` vs `steer` rule.
- [state/README.md](/workspace/babysitter/state/README.md)
  Filesystem-backed memory and note-taking instructions for future babysitters.

## Repo Layout

- [START_HERE.md](/workspace/babysitter/START_HERE.md)
  Short routing doc for a new agent.
- [SKILL.md](/workspace/babysitter/skills/rpc-babysitting/SKILL.md)
  Procedural user manual for RPC babysitting.
- [what_why_how.md](/workspace/babysitter/what_why_how.md)
  Complete project context, mental model, and current system state.
- [elevator_pitch.md](/workspace/babysitter/elevator_pitch.md)
  Short internal pitch.
- [agent](/workspace/babysitter/agent)
  Git-friendly home for the project system prompt, extension stack, and workspace template.
- [babysitter](/workspace/babysitter/babysitter)
  Stdlib CLI for creating, inspecting, steering, replying to, and stopping supervised RPC sessions.
- [state](/workspace/babysitter/state)
  Persistent notes for operator findings, model quirks, and harness lessons.
