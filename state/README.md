# State Directory

This directory is the filesystem-backed memory for future babysitters.

Use it.

Do not keep important operator learnings only in chat transcripts.

## What Belongs Here

Write `.md` files for findings such as:

- model-specific quirks
- recurring failure branches
- useful nudges and steering patterns
- heuristic misses
- task-specific operational lessons
- open questions for the next babysitter

## Suggested File Shapes

You do not need to follow this rigidly, but these categories are useful:

- `models/<model-name>.md`
  Notes about a specific model.
- `failure_patterns/<topic>.md`
  Repeated bad branches observed across runs.
- `nudges/<topic>.md`
  Nudge phrasings that work or fail.
- `heuristics/<topic>.md`
  Proposed changes to the heuristic harness.
- `sessions/<date-or-session>.md`
  Condensed notes from a specific babysitting session.

## What Good Notes Look Like

Good notes are:

- concrete
- short
- action-oriented
- tied to observed behavior

Examples:

- "Model X overreacts to Selene false positives in TIC-80 carts; prefer runtime validation over lint cleanup."
- "After ambiguous `tic80ctl` failure, this model broadens into `--help` and `ps`; nudge back to one bounded recovery step."
- "Heuristic correctly chose `nudge` on Lua write, but wording was too weak to prevent another invalid `TIC()` shape."

## Starting State

This clean-room copy starts with empty memory subdirectories:

- `models/`
- `failure_patterns/`
- `nudges/`
- `heuristics/`
- `sessions/`

## Minimum Rule

If you learn something that would help the next babysitter:

- write it down here

That is part of the method.
