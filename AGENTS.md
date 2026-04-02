# Repository Guidelines

## Project Structure & Module Organization

This repo is a small operator harness, not a packaged app. The main CLI is [`babysitter`](/workspace/babysitter/babysitter), a Python script that creates and manages supervised `pi --mode rpc` runs. Runtime prompt and extension logic live under [`agent/`](/workspace/babysitter/agent): [`SYSTEM.md`](/workspace/babysitter/agent/SYSTEM.md) defines agent behavior, [`agent/extensions/`](/workspace/babysitter/agent/extensions) contains TypeScript control hooks, and [`agent/workspace/`](/workspace/babysitter/agent/workspace) seeds fresh run directories. Skills and TIC-80 references live under [`skills/`](/workspace/babysitter/skills). Persistent operator notes belong in [`state/`](/workspace/babysitter/state).

## Build, Test, and Development Commands

There is no formal build step. Use these commands from the repo root:

- `python3 ./babysitter --help`: inspect CLI usage.
- `./babysitter new --model omnicoder-9b-iq3_xxs`: start a supervised run.
- `./babysitter status`: inspect current session and turn state.
- `./babysitter requests`: list pending extension UI requests.
- `./babysitter prompt --file task.md`: send a prompt without hand-writing JSON.
- `./babysitter poll --json --timeout 300`: read filtered structured events; while a turn is running this waits for new semantic output until activity stops or the timeout expires.
- `./babysitter stop`: stop the active run.
- `python3 --version && jq --version && pi --help && tic80ctl --help`: verify local prerequisites from [`INSTALL.md`](/workspace/babysitter/INSTALL.md).

## Coding Style & Naming Conventions

Keep edits small and local. Match the surrounding file style instead of reformatting unrelated code. Python is straightforward stdlib scripting; TypeScript extensions use descriptive function names and narrow helpers. Markdown docs should stay short, operational, and specific. Use lowercase hyphenated names for new state notes, such as `state/failure_patterns/tic80-drift.md`.

## Testing Guidelines

This repo currently relies on runtime verification rather than an automated test suite. Validate changes by exercising the relevant `babysitter` flow end to end. For TIC-80-related changes, confirm the bounded sequence still works: `tic80ctl start`, `tic80ctl load <cart>.lua`, `tic80ctl run`, then playtest. If `selene` is installed, the Lua lint extension will surface issues during writes.

## Commit & Pull Request Guidelines

Every time you are asked to commit, look at recent commits on your branch to get a feel of what commits should be like.
