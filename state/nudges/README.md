# Nudges

This directory is only for reusable intervention wording.

Write one file per nudge family when a phrasing is worth reusing, tightening, or avoiding.

## Put Notes Here When

- a wording pattern helped
- a wording pattern failed in a useful way
- an operator would benefit from a ready-made phrase next time

## Do Not Put Here

- model biographies
- failure taxonomies without wording
- harness policy changes
- full session summaries

Those belong in the other `state/` subdirectories.

## File Naming

Use lowercase hyphenated topic names.

Examples:

- `tic80-structural-rewrite.md`
- `bounded-recovery-step.md`
- `late-tool-call-reply.md`

## Required Shape

Keep files short. Use this structure:

```md
## Prompt

`Exact or near-exact wording to reuse`

## Use When

- The conditions that make this nudge appropriate.

## Effect

- What happened when it was tried.
```

## Hard Rules

- Keep the wording concrete and operational.
- Record whether the nudge helped, failed, or only partially helped.
- If the file mostly describes a pattern rather than wording, it belongs elsewhere.
