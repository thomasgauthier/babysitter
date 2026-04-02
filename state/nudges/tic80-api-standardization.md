## Prompt

`Disapproved. You are using invalid TIC-80 APIs like fontb, rectb, circleb, os.key, input.pressed, tic.mode, tinit/tupdate/tdraw, or love.run/love.update/love.draw. Use the standard TIC-80 APIs: rect, circ, print, btn(), key(), and function TIC(). Re-read the source_api.md and source_api_cheatsheet.md if unsure.`

## Use When

- The model invents API names from other engines.
- It confuses gamepad and keyboard helpers.
- It needs a hard reset to the actual TIC-80 surface area.
- A first TIC-80 write contains a full fake API family instead of one or two isolated mistakes.
- The write has LÖVE2D-shaped structure and needs a full framework reset.

## Effect

- Re-centers the model on the source material instead of its own guessed API family.
- In `ember-valley`, one complete mapping list fixed the whole hallucinated surface in the next write.
