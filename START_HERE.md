# Start Here

This is the first file a new agent should read.

If you are operating a babysitting session, use `babysitter` as the primary workflow:

- `babysitter new` to start a fresh supervised run
- `babysitter status` to inspect the current session state
- `babysitter requests` to list pending extension UI requests
- `babysitter request <id>` to inspect one request
- `babysitter poll` to inspect unread run output
- `babysitter poll --json` for structured unread output
- `babysitter poll --raw` to inspect raw output
- `babysitter poll --jsonl` only for compatibility
- `babysitter prompt`, `babysitter steer`, `babysitter follow-up`, `babysitter interrupt`, and `babysitter abort` for typed agent-control commands
- `babysitter approve`, `babysitter disapprove`, `babysitter heuristic`, `babysitter input`, `babysitter edit`, `babysitter confirm`, `babysitter reject-confirm`, `babysitter cancel`, and `babysitter select` for typed request responses
- `babysitter send '<json>'` only as the raw JSON escape hatch
- `babysitter stop` to end the run

`babysitter` is the operator path.

Compatibility alias:

- `./babysit`

The filtered poll views expose approval request IDs directly, so you should not need raw mode for ordinary approval responses.

For `Nudge`, the trace shows a two-step flow: answer the `select` request with `Nudge`, then answer the separate `input` request with the actual nudge text.

## Read In This Order

1. [SKILL.md](/workspace/babysitter/skills/rpc-babysitting/SKILL.md)
   Use this for the execution procedure, including the `babysitter` operator flow, typed request handling, and the `prompt` vs `steer` rule.
2. [what_why_how.md](/workspace/babysitter/what_why_how.md)
   Use this for project context, current mental model, and system state.
3. [elevator_pitch.md](/workspace/babysitter/elevator_pitch.md)
   Use this for the short persuasive framing.
4. [state/README.md](/workspace/babysitter/state/README.md)
   Use this for filesystem memory expectations.

## Repo Structure

- [skills/rpc-babysitting](/workspace/babysitter/skills/rpc-babysitting)
  Procedural babysitting skill.
- [agent](/workspace/babysitter/agent)
  Git-friendly home for the project system prompt, extension stack, and workspace template.
- [babysitter](/workspace/babysitter/babysitter)
  Stdlib CLI that owns session creation, launch, transport, polling, and stop.
- [state](/workspace/babysitter/state)
  Filesystem-backed memory for findings from real sessions.

## Rule Of Separation

In this repo:

- [SKILL.md](/workspace/babysitter/skills/rpc-babysitting/SKILL.md) owns execution procedure and the operator workflow
- the rest of the `.md` files own context, framing, and evolving memory

When you learn from actual runs, write those findings under [state](/workspace/babysitter/state).
