## Pattern

- The first TIC-80 write invents a fake API surface borrowed from other engines instead of using actual TIC-80 calls.
- One complete correction pass usually fixes the whole family.

## Signals

- Made-up helpers such as `input.pressed`, `input.a`, `tic.mode`, `tic.frame`, `TIC_RUN`, `TIC_STOP`, `tinit`, `tupdate`, `tdraw`, or `end()`.
- Split callbacks that avoid `function TIC()`.
- Built-in constants or wrappers that TIC-80 does not provide.
- Gamepad and keyboard helpers drift into the wrong API family in the first write.

## Response

- Nudge with one complete wrong-to-right API mapping instead of piecemeal corrections.
- Treat this as a first-write correction pass, not a long rewrite cycle.
- Escalate only if the same wrong API family survives the full mapping.
- For `qwen3.5-9b-ud`, a single numbered mapping list is usually enough to fix the whole surface in one pass.

## LÖVE2D Hallucination

- On a later run, the model wrote an entire LÖVE2D cart instead of TIC-80: `love.run()`, `love.update(dt)`, `love.draw()`, `camera()`, and object-style `TIC.left` / `TIC.right` access.
- The model briefly recognized that TIC-80 has a simpler structure, but still emitted the wrong framework.

## Response Addendum

- If the write contains `love.` references, say explicitly that this is a LÖVE2D game, not TIC-80, and require a complete rewrite with TIC-80 APIs only.
- A full API mapping still works once the framework drift is corrected.
