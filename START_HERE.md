# Start Here

This is the first file a new agent should read.

If you are operating a babysitting session, use `babysitter` as the primary workflow:

- `babysitter new` to start a fresh supervised run
- `babysitter poll` to inspect the filtered/merged run state and events
- `babysitter poll --raw` to inspect raw output
- `babysitter poll --jsonl` to inspect filtered JSONL
- `babysitter send '<json>'` to send agent-control commands or extension UI responses
- `babysitter stop` to end the run

`babysitter` is the operator path.

Compatibility alias:

- `./babysit`

The filtered poll views expose approval request IDs directly, so you should not need raw mode for ordinary approval responses.

## Read In This Order

1. [SKILL.md](/workspace/babysitter/skills/rpc-babysitting/SKILL.md)
   Use this for the execution procedure, including the `babysitter` operator flow, safe long-form `babysitter send` patterns, and the `prompt` vs `steer` rule.
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
