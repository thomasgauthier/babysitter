## Problem

- Playtests with unconditional `end_episode("success")` can pass even when the game's actual win condition is unreachable.

## Heuristic

- Read the playtest script before approving it.
- Check whether `end_episode("success")` is conditional on actual game state or unconditional.
- If it is unconditional, treat the playtest as runtime-stability evidence, not proof of game correctness.
- Use a stricter playtest only when the current task needs logic verification.

## Why

- `ivory-willow` passed playtest while the real win condition was still broken.
- `ember-valley` showed the same pattern with other logic bugs masked by unconditional success.
