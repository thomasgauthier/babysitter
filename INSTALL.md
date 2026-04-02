# Install

## Requirements

- `python3`
- `jq`
- `pi`
- `tic80ctl`

`babysitter` is a stdlib Python script. There is no Python package to install for it.

The primary command is:

- `./babysitter`

A compatibility alias is also included:

- `./babysit`

## Clone

```sh
git clone <repo-url> babysitter
cd babysitter
```

## Verify Tools

```sh
python3 --version
jq --version
pi --help
tic80ctl --help
```

All four commands must work from your shell.

## First Run

Use the operator workflow:

```sh
./babysitter new --model omnicoder-9b-iq3_xxs
./babysitter status
./babysitter poll
./babysitter prompt --file task.md
./babysitter requests
./babysitter approve REQ123
./babysitter stop
```

`babysitter poll --json` is the structured view; `--jsonl` remains only as a compatibility alias.
`babysitter poll` waits up to 5 minutes by default while the current turn is running, and `--timeout` overrides that inactivity window.

Use `babysitter send '{"type":"..."}'` only when you need the raw JSON escape hatch.

## Poll Output

`babysitter poll` and `babysitter poll --json` read the same filtered semantic event stream. The default view is pretty-formatted text; `--json` emits the same events as a JSON array.

Polling behavior:

- If `status` reports `turn_state=running`, `poll` blocks until it can emit at least one new semantic event or the timeout expires.
- The default timeout is 300 seconds and can be changed with `--timeout`.
- The timeout is an inactivity timer, not a wall-clock cap from invocation.
- New unread RPC bytes reset the timeout even if they only extend an incomplete internal JSON line.
- Filtered `poll` does not emit partial-line placeholder events; it waits for complete semantic events.
- If the turn is not running, `poll` behaves like a one-shot unread drain and returns immediately when nothing new is available.

Filtered `poll` surfaces these event types from agent stdout:

- `reasoning`
  Merged model thinking deltas.
- `assistant_text`
  Merged assistant text deltas.
- `extension_ui_request`
  UI requests except `setStatus`, `setWidget`, and `setTitle`.
- `host_policy_result`
  A special rewrite for `notify` messages that start with `[host] `.
- `tool_execution_start`
  Tool start with the tool name and input args.
- `tool_execution_update`
  Partial text output from a running tool.
- `tool_execution_end`
  Final tool text output plus error status.
- `agent_start`
  Agent startup marker.
- `turn_start`
  Turn start marker.
- `turn_end`
  Turn end marker, including `stopReason` when present.
- `response`
  RPC response envelopes for commands sent to the agent.
Important `extension_ui_request` details:

- Actionable request methods are `select`, `input`, `editor`, and `confirm`.
- Those actionable methods are tracked by `babysitter requests` and are annotated in filtered `poll` output with `pending` or `resolved` state.
- One-way methods such as `notify` and `set_editor_text` still appear in filtered `poll` output, but they are not stored as pending requests and do not expect a response.
- `setStatus`, `setWidget`, and `setTitle` are intentionally hidden from filtered `poll` output.

Important tool-output details:

- Extension-added text is included in `tool_execution_update` or `tool_execution_end` when the extension appends text content to the tool result.
- Filtered tool events only surface text content from the tool payload. Non-text tool content requires `babysitter poll --raw`.
- Selene lint results from `agent/extensions/selene-on-lua-write.ts` therefore show up in filtered `poll` as tool output, and lint failures are marked as tool errors.
- The same Selene extension also emits a separate `notify`, so filtered `poll` can show both the tool output and a one-way UI notification for the same lint run.
- If a `tool_execution_update` text payload is identical to the later final `tool_execution_end` text for the same tool call, the duplicate update is dropped from filtered output.

Use `babysitter poll --raw` when you need the exact unread stdout bytes instead of the filtered semantic view. Raw mode is the only mode that preserves the full underlying wire events and fields that the filtered views flatten away, including `message_start`, `message_end`, extension-specific structured details, any non-text tool payloads, and partial unread line fragments.

## Prompt Entry Point

For a fresh Codex babysitter, use:

- [prompt.codex.md](/workspace/babysitter/prompt.codex.md)

That prompt expects the repo to live at:

- `/workspace/babysitter`

If you clone it somewhere else, update the absolute paths in the prompt and docs or keep a matching symlink.
