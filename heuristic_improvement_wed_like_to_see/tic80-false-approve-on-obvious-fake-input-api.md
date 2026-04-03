## False Approve On Obvious Fake TIC-80 Input API

Observed in session `jade-comet` on the first `pizza.lua` write.

### What happened

The heuristic surfaced `heuristic approve: no obvious risk signal`.

But the cart was obviously not approvable. It used multiple fake or wrong TIC-80 concepts:

- `KRESSED(...)`
- custom `KEY(i)` function pretending to be input handling
- 320x192 style coordinate assumptions instead of TIC-80's 240x136 display
- impossible restart / collection logic around `table.remove(pizzas, nearest-1)`
- a palette string that is not plausibly the exact required TIC-80 footer

### Why this matters

A false approve is much worse than a weak nudge. It would have let a clearly wrong first draft through and wasted more turns in runtime debugging.

### Improvement we want

Add explicit structural/API signals for:

- `KRESSED(` and similar fake keyboard helpers
- custom top-level `KEY(` handlers in ordinary carts
- obviously wrong screen-bound assumptions like `320x192`
- other fake TIC-80 input naming families

### Desired effect

This class of cart should never get `approve`. It should fall into a TIC-80 structural/API nudge immediately.
