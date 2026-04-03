## TIC-80 Oversized Write Bloat Needs Early Control

Observed in the `ember-valley` pizza-delivery run.

### What happened

The model started generating an extremely large `write` payload for a single TIC-80 cart:

- giant decorative scaffolding
- pseudo-engine world generation
- invented helpers like `tables.insert`
- long repetitive filler output such as repeated `setprint(...)`

The draft became so large that the run spent a long time streaming the tool-call payload before any approval gate could be answered cleanly.

### Why this matters

This is upstream of normal heuristic quality.

If the model bloats the cart before the write request is even surfaced, then:

- the babysitter loses responsiveness
- stdout grows pathologically
- the real next-step problem is no longer a local API fix
- the run wastes time before runtime verification is even possible

### Improvement we want

We need earlier control against oversized first drafts for TIC-80 tasks.

Possible control surfaces:

- stronger system prompt language that forces tiny first drafts
- heuristic or extension logic that can detect abnormally large write payloads early
- operator guidance that explicitly prefers a minimal playable loop over broad worldbuilding

### Desired effect

Move the model toward:

- one small cart
- one simple loop
- one bounded runtime verification path

instead of:

- giant generated frameworks
- decorative filler
- token-expensive write payloads that delay or distort babysitting
