## TIC-80 Helper Nudge Should Name The Concrete API Family

Observed in the `onyx-juniper` pizza-delivery run.

### What happened

The heuristic correctly blocked the cart write, but the surfaced reason was still the broad helper-family message:

- "This cart still uses invalid TIC-80 helpers..."

That was directionally true, but it hid the actual high-signal blockers in the draft:

- `key(...)` used as the main gameplay input surface
- `sprite(...)` used instead of `spr(...)`
- fake `SPRITE(...)` function definitions
- `circle(...)` instead of `circ(...)`
- screen/layout assumptions far outside the normal TIC-80 playfield
- malformed trailing palette block

### Why this matters

When the nudge is broad, the model tends to fix only one symptom and preserve the same bad family underneath.

For this run, the stronger corrective message needed to say:

- stop using `key(...)`
- stop inventing `SPRITE(...)`
- use `circ(...)` / `circb(...)`
- keep coordinates within the real screen
- repair the exact palette footer

That is a better local rewrite target than a generic "invalid helpers" warning.

### Improvement we want

When a `function TIC()` cart still contains a recognizable bad API cluster, prefer a more specific nudge over the broad helper-family text.

Examples of clusters worth naming directly:

- `key(...)`-driven gameplay input
- `sprite(...)` / fake `SPRITE(...)`
- `circle(...)`
- obvious oversized screen coordinates
- malformed palette footer

### Desired effect

Move the heuristic from:

- "this cart still uses invalid TIC-80 helpers"

to:

- "this cart is specifically still using the wrong input/drawing API family; replace those exact calls and keep the rewrite small"
