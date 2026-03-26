## Observed Weakness

- During session `jade-delta`, filtered `babysitter poll` showed `no new messages` while the run was actually deep inside a very large streaming `write` proposal.
- `babysitter poll --raw` exposed the in-flight write content and made the stuck state legible.
- `babysitter requests` also showed `no pending requests` during this period.

## Heuristic / Tooling Implication

- Large streaming write proposals can become effectively invisible in the filtered operator surface.
- When status remains `running`, filtered polls return `no new messages`, and no requests appear, one raw inspection is justified.

## Follow-Up Idea

- Surface a filtered hint when a tool call is still streaming but not yet compact enough for the normal poll view, so the operator can distinguish silence from an in-flight oversized draft.
