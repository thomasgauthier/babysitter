# Failure Patterns

This directory is only for repeated bad branches.

Write one file per pattern family when the same mistake or loop shows up across runs or across agents.

## Put Notes Here When

- the same failure shape happens more than once
- the pattern is specific enough to recognize quickly next time
- the note would help an operator intervene earlier

## Do Not Put Here

- model-wide personality notes
- one-off session timelines
- exact nudge wording
- proposed harness changes

Those belong in other `state/` subdirectories.

## File Naming

Use lowercase hyphenated topic names.

Examples:

- `tic80-structural-loop.md`
- `silent-running-turn.md`
- `tool-approval-thrash.md`

## Required Shape

Keep files short. Use this structure:

```md
## Pattern

- What keeps going wrong.

## Signals

- Concrete signs the operator can spot.

## Response

- What to do when this appears.
```

## Hard Rules

- Describe observed behavior, not speculation.
- Prefer reusable pattern language over session-specific storytelling.
- If it happened only once, do not write a file here yet.
