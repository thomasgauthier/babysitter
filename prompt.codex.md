Use the `rpc-babysitting` skill from `/workspace/babysitter/skills/rpc-babysitting/SKILL.md`.

Then orient yourself with:
- `/workspace/babysitter/START_HERE.md`
- `/workspace/babysitter/what_why_how.md`
- `/workspace/babysitter/state/README.md`

Codex-specific instructions:
- treat this as an operator task, not a repo-refactor, prompt-design, or skill-authoring task
- read the named local skill file directly and follow it
- use `babysitter poll` by default
- use `babysitter poll --jsonl` only when you need more precise structured event details
- use `babysitter poll --raw` only for transport or protocol debugging
- if `babysitter poll` already shows a request id and enough approval context, do not switch modes just to answer it
- do not poll on a timer or out of impatience; poll only when a concrete event trigger justifies checking state
- if two consecutive polls return `no new messages`, do not immediately escalate to `--raw`; wait for a concrete reason to inspect wire output
- for short `Approve` / `Disapprove` / `Nudge` responses, a one-line `babysitter send '<json>'` command is fine
- for longer freeform `input` or `editor` payloads, do not hand-quote a long JSON string on one shell line
- use `prompt` to start a run
- use `steer` only while a run is still active and needs mid-course correction
- if the run has already ended with `turn end (stop)` and later polls show no new activity, do not rely on `steer` to restart it; send a new `prompt`
- if a `steer` or `follow_up` command returns only a success acknowledgement like `response: command=steer success=True` or `response: command=follow_up success=True`, and later polls still show no `turn start`, treat that as an idle or stopped run rather than a hidden in-progress turn
- in that situation, do not keep retrying `steer` or `follow_up`; send a fresh `prompt`
- do not approve a write that you already judge to be structurally wrong just to see the runtime error
- if the model is looping on an identical or near-identical write, do not keep approving it; nudge or disapprove and push it to the next bounded step
- when writing session findings, do not overstate success; record wasted turns and babysitter mistakes too

Your task:
run one real babysitting session against a small TIC-80 coding agent using the current babysitter stack.

Requirements:
- use `omnicoder-9b-iq3_xxs` as the small model
- you are the frontier babysitter
- launch the run with `babysitter new --model omnicoder-9b-iq3_xxs`
- supervise the run through `babysitter poll`, `babysitter send`, and `babysitter stop`
- respond correctly to extension UI requests
- keep the run bounded
- do not speculate about failure modes in advance
- learn failure modes on the job from the actual run
- do not interpret a bare success acknowledgement for `steer` or `follow_up` as evidence that the agent has resumed work

TIC-80-specific requirements:
- keep the model on a bounded `start -> load -> run -> eval/playtest` path
- after a Lua write, push toward runtime verification instead of accepting file creation as success
- if a Lua write still contains a known wrong TIC-80 structure, API family, or variable-scope mistake, correct it before runtime instead of approving it "to see what happens"
- if a corrected write is already good enough, do not let the model waste turns rewriting the same file again
- once `tic80ctl` is known to exist, do not spend extra turns rediscovering it
- prefer a direct sequence in the run directory: `tic80ctl start`, then `tic80ctl load ...`, then `tic80ctl run`
- do not casually approve backgrounded `tic80ctl start &` if a simpler foreground path is available
- if `tic80ctl` reports `no active session`, start one and retry the bounded sequence
- stop environment archaeology unless it is clearly necessary

After the run:
- write concrete findings into markdown files under `/workspace/babysitter/state/`
- record observed failure branches, useful nudges, model quirks, weak heuristic behavior, and any poor `tic80ctl` feedback
- keep the notes factual and action-oriented
- do not leave important findings only in chat

Goal:
produce one empirical babysitting run and leave the repo with better filesystem memory than you found it.

---

The very first `prompt` you send the agent MUST be

"""
Build a complete, playable TIC-80 game about: Cars.

First:
- read the `tic80ctl-usage` skill
- read only the parts of its referenced material that you actually need for the next step
- do not broaden into filesystem archaeology unless necessary

Requirements:
- create a single runnable `.lua` cart in the current working directory
- the game must be fully playable from start to finish
- use proper TIC-80 Lua structure
- include a palette block at the very end of the file
- choose your own palette for the game, but you must express it in the exact TIC-80 palette-block format shown below
- the palette block must be the final lines of the file, with no content after it
- the palette data must be a single 96-hex-character string representing 16 RGB colors in sequence
- do not omit the palette block, even if using TIC-80 defaults

Palette format requirements:
- use this exact wrapper structure:
  -- <PALETTE>
  -- 000:your96hexcharactershere
  -- </PALETTE>
- `000:` must appear exactly once
- the hex string must contain exactly 16 colors × 6 hex digits each = 96 hex characters total
- use only lowercase hexadecimal characters: `0-9` and `a-f`
- do not add spaces inside the hex string
- do not add extra comment lines inside the palette block
- example shape only:
  -- <PALETTE>
  -- 000:00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff
  -- </PALETTE>

Workflow:
- inspect what you need
- write the cart
- then verify it with a bounded TIC-80 workflow:
  1. `tic80ctl start`
  2. `tic80ctl load <cart>.lua`
  3. `tic80ctl run`
- if runtime errors occur, fix the specific error and retry
- once it runs, use `tic80ctl playtest` or another appropriate verification step to confirm the game is actually playable

Important:
- do not stop after file creation
- do not invent command syntax when the skill or references provide it
- do not switch to another engine or API family
- do not ask me for permission or intermediate validation
- continue autonomously until the game is implemented and verified
""" verbatim

- to send a multiline `prompt` or long `extension_ui_response`, build the text with a heredoc, then JSON-encode it with compact `jq`
- IMPORTANT: use `jq -c`, not plain `jq`, so the payload is a single-line JSON object
- example for a multiline `prompt`:

  ```sh
  message=$(cat <<'EOF'
  Do the task.

  Requirements:
  - requirement 1
  - requirement 2
  - requirement 3
  EOF
  )

  payload=$(jq -cRn --arg message "$message" '{type:"prompt", message:$message}')
  ./babysitter send "$payload"
  ```

- example for a long `input` / nudge response:

  ```sh
  message=$(cat <<'EOF'
  Do not repeat the previous step.

  Move to the next bounded step:
  1. next step
  2. next step
  3. next step
  EOF
  )

  payload=$(jq -cRn --arg id "REQ123" --arg value "$message" '{type:"extension_ui_response", id:$id, value:$value}')
  ./babysitter send "$payload"
  ```

- if you forget `-c`, `jq` will pretty-print multi-line JSON and `babysitter send` will fail because the RPC side expects one JSON object per line
