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
./babysitter poll
./babysitter send '{"type":"prompt","message":"..."}'
./babysitter stop
```

## Prompt Entry Point

For a fresh Codex babysitter, use:

- [prompt.codex.md](/workspace/babysitter/prompt.codex.md)

That prompt expects the repo to live at:

- `/workspace/babysitter`

If you clone it somewhere else, update the absolute paths in the prompt and docs or keep a matching symlink.
