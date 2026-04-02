# Sessions

This directory is only for condensed run notes.

Write one file per meaningful babysitting session when the next operator would benefit from a short account of what happened.

## Put Notes Here When

- a run produced lessons not captured elsewhere yet
- the session has enough context to be worth preserving
- a later operator may need the timeline or outcome

## Do Not Put Here

- reusable model-level summaries
- generic failure families
- standalone nudge libraries
- durable operator policy

Move those into the matching `state/` subdirectory after extracting them from the session.

## File Naming

Use a date or a session identifier.

Examples:

- `2026-04-02-rapid-lantern.md`
- `ivory-glacier.md`

## Required Shape

Keep files short. Use this structure:

```md
## Session

- Model, goal, and bounded scope.

## Outcome

- What was achieved or not achieved.

## Notes

- Only the most useful details for a future operator.
```

## Hard Rules

- Prefer condensed summaries, not full transcripts.
- If a point is reusable beyond this session, also extract it into the appropriate sibling directory.
- Do not let `sessions/` become the place where everything is dumped.
