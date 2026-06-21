Use the `rpc-babysitting` skill from `/workspace/babysitter/skills/rpc-babysitting/SKILL.md`.

Then orient yourself with:
- `/workspace/babysitter/START_HERE.md`
- `/workspace/babysitter/what_why_how.md`
- `/workspace/babysitter/state/README.md`

Codex-specific instructions:
- treat this as an operator task, not a repo-refactor, prompt-design, or skill-authoring task
- read the named local skill file directly and follow it
- use `babysitter status` and `babysitter requests` to inspect current state by default
- use `babysitter poll` for unread tails
- use `babysitter poll --json` only when you need more precise structured event details
- use `babysitter poll --raw` only for transport or protocol debugging
- if `babysitter poll` already shows a request id and enough approval context, do not switch modes just to answer it
- do not poll on a timer or out of impatience; poll only when a concrete event trigger justifies checking state
- if two consecutive polls return `no new messages`, do not immediately escalate to `--raw`; wait for a concrete reason to inspect wire output
- use typed verbs first: `prompt`, `steer`, `follow-up`, `interrupt`, `abort`, `approve`, `disapprove`, `nudge`, `input`, `edit`, `confirm`, `reject-confirm`, `cancel`, and `select`
- for `Nudge`, prefer `nudge <id> --text ...` or `--file ...`; babysitter will handle the follow-up input request internally
- use raw `babysitter send '<json>'` only when the typed commands do not fit
- use `prompt` to start a run
- use `steer` only while a run is still active and needs mid-course correction
- if the run has already ended with `turn end (stop)` and later polls show no new activity, do not rely on `steer` to restart it; send a new `prompt`
- if a `steer` or `follow_up` command returns only a success acknowledgement like `response: command=steer success=True` or `response: command=follow_up success=True`, that acknowledgement alone does not prove anything about resumed work
- if `babysitter status` still says `turn: running`, treat the run as genuinely live even if `poll` is quiet; do not stop it just because unread tails are empty
- patience rule: a quiet `running` turn is not a stall signal; wait substantially longer and keep checking normal status/requests/poll views before you conclude anything
- do not kill a `running` session out of impatience and then discover in the next unread tail that the model had finished a request you could have answered
- only treat the run as stopped or restartable when you have explicit evidence such as `turn end (...)`, `session ... [stopped]`, or another direct stop signal
- when writing session findings, do not overstate success; record wasted turns and babysitter mistakes too

Your task:
run one real babysitting session using the current babysitter stack.

Requirements:
- use the appropriate small model
- you are the frontier babysitter
- launch the run with `babysitter new --model <model-name>`
- supervise the run through `babysitter status`, `babysitter requests`, `babysitter request <id>`, `babysitter poll`, the typed command verbs, and `babysitter stop`
- respond correctly to extension UI requests
- keep the run bounded
- do not speculate about failure modes in advance
- learn failure modes on the job from the actual run
- do not interpret a bare success acknowledgement for `steer` or `follow_up` as evidence that the agent has resumed work

After the run:
- write concrete findings into markdown files under `/workspace/babysitter/state/`
- record observed failure branches, useful nudges, model quirks, and weak policy behavior
- keep the notes factual and action-oriented
- do not leave important findings only in chat

Goal:
produce one empirical babysitting run and leave the repo with better filesystem memory than you found it.

Workflow:
- inspect what you need
- use the task-specific instructions provided to the agent
- verify results with appropriate commands
- if runtime errors occur, fix the specific error and retry
- once it works, use appropriate verification steps to confirm

Important:
- do not stop after file creation
- do not invent command syntax when references provide it
- continue autonomously until the task is implemented and verified

---
    - prefer typed commands instead of hand-writing JSON
    - examples:

      ```sh
      ./babysitter prompt --file task.md
      ./babysitter approve REQ123
      ./babysitter nudge REQ124 --file nudge.txt
      ```

    - `babysitter send` remains the raw escape hatch for uncommon payloads; if you use it for multiline content, build the JSON on one line:

  ```sh
  message=$(cat <<'EOF'
  Do the task.
  EOF
  )

  payload=$(jq -cRn --arg message "$message" '{type:"prompt", message:$message}')
  ./babysitter send "$payload"
  ```

    - if you forget `-c`, `jq` will pretty-print multi-line JSON and `babysitter send` will fail because the RPC side expects one JSON object per line
