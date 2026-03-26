# Repository Guidelines

## Project Structure & Module Organization

This repo is a small operator harness, not a packaged app. The main CLI is [`babysitter`](/workspace/babysitter/babysitter), a Python script that creates and manages supervised `pi --mode rpc` runs. Runtime prompt and extension logic live under [`agent/`](/workspace/babysitter/agent): [`SYSTEM.md`](/workspace/babysitter/agent/SYSTEM.md) defines agent behavior, [`agent/extensions/`](/workspace/babysitter/agent/extensions) contains TypeScript control hooks, and [`agent/workspace/`](/workspace/babysitter/agent/workspace) seeds fresh run directories. Skills and TIC-80 references live under [`skills/`](/workspace/babysitter/skills). Persistent operator notes belong in [`state/`](/workspace/babysitter/state).

## Build, Test, and Development Commands

There is no formal build step. Use these commands from the repo root:

- `python3 ./babysitter --help`: inspect CLI usage.
- `./babysitter new --model omnicoder-9b-iq3_xxs`: start a supervised run.
- `./babysitter poll`: read filtered run state and approval requests.
- `./babysitter send '{"type":"prompt","message":"..."}'`: send a control command or UI response.
- `./babysitter stop`: stop the active run.
- `python3 --version && jq --version && pi --help && tic80ctl --help`: verify local prerequisites from [`INSTALL.md`](/workspace/babysitter/INSTALL.md).

## Coding Style & Naming Conventions

Keep edits small and local. Match the surrounding file style instead of reformatting unrelated code. Python is straightforward stdlib scripting; TypeScript extensions use descriptive function names and narrow helpers. Markdown docs should stay short, operational, and specific. Use lowercase hyphenated names for new state notes, such as `state/failure_patterns/tic80-drift.md`.

## Testing Guidelines

This repo currently relies on runtime verification rather than an automated test suite. Validate changes by exercising the relevant `babysitter` flow end to end. For TIC-80-related changes, confirm the bounded sequence still works: `tic80ctl start`, `tic80ctl load <cart>.lua`, `tic80ctl run`, then playtest. If `selene` is installed, the Lua lint extension will surface issues during writes.

## Commit & Pull Request Guidelines

Git history currently contains only `first commit`, so there is no mature convention to copy. Use short, imperative commit subjects, optionally scoped, for example `docs: add contributor guide` or `cli: tighten stale session handling`. PRs should describe the operator scenario changed, list verification commands run, and include screenshots or poll excerpts when extension UI behavior changes. Do not commit generated artifacts such as `.local/`, `runs/`, `stdout`, `stderr`, or `playtest/`.

<!-- BEGIN BEADS INTEGRATION -->
## Issue Tracking with bd (beads)

**IMPORTANT**: This project uses **bd (beads)** for ALL issue tracking. Do NOT use markdown TODOs, task lists, or other tracking methods.

### Why bd?

- Dependency-aware: Track blockers and relationships between issues
- Git-friendly: Dolt-powered version control with native sync
- Agent-optimized: JSON output, ready work detection, discovered-from links
- Prevents duplicate tracking systems and confusion

### Quick Start

**Check for ready work:**

```bash
bd ready --json
```

**Create new issues:**

```bash
bd create "Issue title" --description="Detailed context" -t bug|feature|task -p 0-4 --json
bd create "Issue title" --description="What this issue is about" -p 1 --deps discovered-from:bd-123 --json
```

**Claim and update:**

```bash
bd update <id> --claim --json
bd update bd-42 --priority 1 --json
```

**Complete work:**

```bash
bd close bd-42 --reason "Completed" --json
```

### Issue Types

- `bug` - Something broken
- `feature` - New functionality
- `task` - Work item (tests, docs, refactoring)
- `epic` - Large feature with subtasks
- `chore` - Maintenance (dependencies, tooling)

### Priorities

- `0` - Critical (security, data loss, broken builds)
- `1` - High (major features, important bugs)
- `2` - Medium (default, nice-to-have)
- `3` - Low (polish, optimization)
- `4` - Backlog (future ideas)

### Workflow for AI Agents

1. **Check ready work**: `bd ready` shows unblocked issues
2. **Claim your task atomically**: `bd update <id> --claim`
3. **Work on it**: Implement, test, document
4. **Discover new work?** Create linked issue:
   - `bd create "Found bug" --description="Details about what was found" -p 1 --deps discovered-from:<parent-id>`
5. **Complete**: `bd close <id> --reason "Done"`

### Auto-Sync

bd automatically syncs via Dolt:

- Each write auto-commits to Dolt history
- Use `bd dolt push`/`bd dolt pull` for remote sync
- No manual export/import needed!

### Important Rules

- ✅ Use bd for ALL task tracking
- ✅ Always use `--json` flag for programmatic use
- ✅ Link discovered work with `discovered-from` dependencies
- ✅ Check `bd ready` before asking "what should I work on?"
- ❌ Do NOT create markdown TODO lists
- ❌ Do NOT use external issue trackers
- ❌ Do NOT duplicate tracking systems

For more details, see README.md and docs/QUICKSTART.md.

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

<!-- END BEADS INTEGRATION -->
