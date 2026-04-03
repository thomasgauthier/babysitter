## TIC-80 Specific Nudge Selection

Observed in session `mellow-falcon` on the first `pizza_delivery.lua` write.

### What happened

The current heuristic suggestor correctly classified the write as not approvable and surfaced `Heuristic Suggestion (nudge)`.

But that suggestion was still too generic compared with the actual failure shape of the cart.

The write had several specific, high-value problems:

- `local function TIC()` instead of global `function TIC()`
- repeated `cls()` calls inside helper draw functions and inner draw steps
- broken game state / inventory bookkeeping
- invalid removal logic (`table.remove(..., pizza.timer)`)
- palette footer longer than 96 hex characters

### What this means

The suggestor is currently better at coarse triage than at selecting the most useful corrective reason.

It can identify "do not approve this write", but it does not yet consistently choose the most actionable nudge text for malformed TIC-80 carts.

### Improvement we want

When a Lua cart write contains multiple concrete TIC-80 failures, prefer a more specific nudge reason instead of a generic structural/API reminder.

High-priority TIC-80 cases worth detecting explicitly:

- `local function TIC()` instead of global `function TIC()`
- `cls()` misuse inside helper draw functions or repeated inside per-object draw loops
- obviously broken inventory/state patterns for pickup-delivery games
- obviously invalid palette length

### Desired effect

Move the heuristic suggestor from:

- "this is wrong"

closer to:

- "this is wrong for these exact reasons, so here is the highest-value rewrite target"

That should reduce wasted rewrite turns for small models like `qwen3.5-9b-ud`.
