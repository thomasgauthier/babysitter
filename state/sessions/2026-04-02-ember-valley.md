## Session

- Model: `qwen3.5-9b-ud`
- Task: build a TIC-80 wildfire game with a palette block
- Scope: bounded TIC-80 cart plus playtest verification

## Outcome

- Partial success.
- The cart ran and playtested without crashing, but the palette stayed wrong and the win condition was unreachable.

## Notes

- One comprehensive API-correction nudge fixed the fake TIC-80 surface quickly.
- The first three first-write attempts were correctly blocked; the cart was structurally wrong each time.
- Palette exactness stayed unreliable across multiple rewrites, even after repeated correction, and the final palette was still 79 characters instead of 96.
- A short workflow nudge fixed both `tic80ctl run` without reload and playtest-helper redefinition immediately.
- Approved v4 only after the nil-indexing runtime bug was the real blocker.
- The playtest reached 74 frames, produced 74 screenshots and 3 log entries, and still left the game logic broken.
- Runtime success did not imply game success; the final cart still had table-mutation, tile-state, and win-condition bugs.
- The later amber-aurora run repeated the same model family and added two more cheap workflow lessons: disallow shell writes and normalize playtest button IDs.
