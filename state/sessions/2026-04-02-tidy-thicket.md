## Session

- Model: `qwen3.5-9b-ud`
- Task: build a TIC-80 "Mermaids" game
- Outcome: playtest passed, 64 frames, status `success`

## Notes

- The model used `cat >` for the first two write attempts and had to be pushed back to the edit tool.
- Selene caught a parse error in the first rewritten cart, and the model responded by inventing a completely new API surface instead of making a local fix.
- One comprehensive wrong-to-right nudge fixed the entire rewrite in the next pass.
- The playtest passed cleanly after the cart was stabilized.
- After success, the model tried post-verification archaeology with screenshots and had to be stopped.
