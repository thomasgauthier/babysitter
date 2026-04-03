## Wrong-Framework Heuristic Overfires On `TIC()` Carts

Observed in session `vivid-falcon` on the first `pizza.lua` write.

### What happened

The heuristic surfaced:

- `heuristic nudge: This cart is structurally wrong for TIC-80. Do not use init(), update(), draw(), or other framework callbacks here...`

But the draft already used a global `function TIC()`.

The actual problems were different:

- palette block at the top instead of at the end
- guessed TIC-80 APIs like `putpixel` and `spe`
- invalid or confused `btn(...)` usage
- bad Lua logic such as `if not game_state == "complete"`
- generally unclear gameplay/input mapping

### Why this is a problem

The block/no-block decision was still right, but the stated reason was misleading.

That matters because the model already had the main callback shape correct. A wrong-framework message risks pushing it to re-litigate `function TIC()` instead of fixing the real issues in the current draft.

### Improvement we want

When a cart already has a real global `function TIC()`, prefer a more specific helper/API or Lua-logic nudge over the broad wrong-framework message unless there is an actual competing framework callback family present.

### Desired effect

Keep the heuristic aligned with the highest-value correction target:

- if the framework is wrong, say framework
- if the framework is right but the helpers / Lua / palette are wrong, say that instead
