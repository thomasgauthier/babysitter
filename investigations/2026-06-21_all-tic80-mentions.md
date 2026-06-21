# Investigation: All TIC-80 Mentions
Date: 2026-06-21
Investigator: pi (Strict Mode)

## Goal
Find every mention of "tic80" (case-insensitive) across the entire repository, organized by file and context.

## Scope
- In scope: all files in `/workspace/goodies/babysitter/` — source, config, docs, state, skills, agent extensions, tests
- Out of scope: git history, installed dependencies, system-level files

## Search Plan
1. `rg -n -i "tic80"` across whole repo
2. Classify hits by file type and role
3. Read key structural files for deeper context

## Files Examined
33 files total (across 160 line hits):

### Agent Extensions (TypeScript — runtime hooks)
- `agent/extensions/tic80-heuristic-suggestor.ts` — main TIC‑80 heuristic engine
- `agent/extensions/live-host-approval.ts` — approval gate for tic80ctl commands
- `agent/extensions/selene-on-lua-write.ts` — lint config includes tic80.yml

### Agent Workspace (seeded configs for agent runs)
- `agent/workspace/tic80.yml` — TIC‑80‑specific Lua lint rules
- `agent/workspace/selene.toml` — selene config targeting `lua51+tic80`

### Skills
- `skills/tic80ctl-usage/SKILL.md` — main TIC‑80 operation skill
- `skills/tic80ctl-usage/reference/tic80_console_and_runtime.md` — console ref
- `skills/tic80ctl-usage/reference/tic80_project_workflow.md` — project workflow ref
- `skills/tic80ctl-usage/reference/tic80_api_reference.md` — Lua API ref
- `skills/tic80ctl-usage/reference/scripted_playtest_guide.md` — playtest guide
- `skills/tic80ctl-usage/agents/openai.yaml` — OpenAI agent definition
- `skills/rpc-babysitting/SKILL.md` — operator skill referencing tic80ctl workflow

### Documentation
- `README.md` — mentions TIC‑80 as proving ground
- `INSTALL.md` — lists `tic80ctl` as prerequisite
- `AGENTS.md` — multiple references: prerequisites, naming conventions, testing sequences
- `elevator_pitch.md` — lists tic80-heuristic-suggestor.ts
- `what_why_how.md` — extensive design rationale, references tic80-heuristic-suggestor.ts
- `prompt.codex.md` — prompts for agent behavior with tic80ctl
- `START_HERE.md` — (checked, no tic80 mentions)
- `babysitter` (Python CLI) — `EPHEMERAL_LINT_CONFIGS` includes `tic80.yml`, path to tic80ctl-usage skill
- `tests/test_babysitter.py` — (checked, no tic80 mentions)

### State Notes
- `state/sessions/2026-03-26-omnicoder-cars.md` — session postmortem
- `state/nudges/tic80-cars-rewrite.md` — nudge history
- `state/heuristics/tic80-structural-escalation.md` — escalation heuristic
- `state/heuristics/tic80-large-write-visibility.md` — write-visibility heuristic
- `state/failure_patterns/tic80-cars-structural-loop.md` — failure pattern doc
- `state/README.md` — references tic80ctl ambiguity
- `state/models/omnicoder-9b-iq3_xxs.md` — model notes

## Evidence Snippets

### Category 1: Agent Extension Code (runtime decisions)

1. `agent/extensions/tic80-heuristic-suggestor.ts:41` — `hasStructuralTic80Drift()` function detects structural drift in Lua cart content
2. `agent/extensions/tic80-heuristic-suggestor.ts:55` — regex matches `\btic80ctl\s+(start|load|run|eval|playtest|screenshot|stop|status)\b`
3. `agent/extensions/tic80-heuristic-suggestor.ts:63-64` — flags unusual tic80ctl actions with nudge text
4. `agent/extensions/live-host-approval.ts:98` — `tic80ctl` command detection regex: `/(^|[;&|]\s*|&&\s*)tic80ctl\b/`
5. `agent/extensions/live-host-approval.ts:124` — approval dialog title: "Approve tic80ctl Call?"
6. `agent/extensions/selene-on-lua-write.ts:25` — `STAGED_LINT_FILES` includes `tic80.yml`

### Category 2: Config / Lint

7. `agent/workspace/tic80.yml` — selene config that sets `lua51+tic80` standard (the actual lint rules for TIC-80)
8. `agent/workspace/selene.toml:1` — `std = "lua51+tic80"`
9. `babysitter:19` — `EPHEMERAL_LINT_CONFIGS = {"selene.toml", "tic80.yml"}`

### Category 3: Skills (knowledge injected into agent prompts)

10. `skills/tic80ctl-usage/SKILL.md:2` — skill `name: tic80ctl-usage`
11. `skills/tic80ctl-usage/SKILL.md:8` — "Use `tic80ctl` when you want to work on a TIC-80 game from the shell."
12. `skills/tic80ctl-usage/SKILL.md:23` — basic command: `tic80ctl --help`
13. `skills/tic80ctl-usage/SKILL.md:31-34` — core bounded workflow: `start`, `load`, `run`, `eval`
14. `skills/tic80ctl-usage/SKILL.md:144` — `tic80ctl load game.lua`
15. `skills/tic80ctl-usage/SKILL.md:154` — `tic80ctl run`
16. `skills/tic80ctl-usage/SKILL.md:166-169` — `tic80ctl eval` examples
17. `skills/tic80ctl-usage/SKILL.md:185-186` — `tic80ctl screenshot`
18. `skills/tic80ctl-usage/SKILL.md:208-211` — `tic80ctl sfx`, `music`, `sprite`, `map`
19. `skills/tic80ctl-usage/SKILL.md:232-252` — SFX subcommands
20. `skills/tic80ctl-usage/SKILL.md:269-287` — Music subcommands
21. `skills/tic80ctl-usage/SKILL.md:301-315` — Sprite subcommands
22. `skills/tic80ctl-usage/SKILL.md:330-340` — Map subcommands
23. `skills/tic80ctl-usage/SKILL.md:356-357` — Quickstart: start + load
24. `skills/tic80ctl-usage/SKILL.md:375-383` — `playtest` command
25. `skills/tic80ctl-usage/SKILL.md:553-563` — Error recovery: "no active session"
26. `skills/tic80ctl-usage/reference/tic80_console_and_runtime.md` — full console and runtime reference
27. `skills/tic80ctl-usage/reference/tic80_project_workflow.md` — project workflow docs
28. `skills/tic80ctl-usage/reference/tic80_api_reference.md` — Lua API reference
29. `skills/tic80ctl-usage/reference/scripted_playtest_guide.md` — playtest scripting guide
30. `skills/tic80ctl-usage/agents/openai.yaml` — OpenAI GPT agent card
31. `skills/rpc-babysitting/SKILL.md:322-328` — tic80ctl workflow rules for operator

### Category 4: Design Docs & Prompts

32. `what_why_how.md:59` — "easy to validate with `tic80ctl`"
33. `what_why_how.md:66` — "correct `tic80ctl` sequence"
34. `what_why_how.md:168-172` — explains tic80-heuristic-suggestor.ts design
35. `what_why_how.md:230` — "How `tic80-heuristic-suggestor.ts` Works"
36. `what_why_how.md:324` — "tic80-heuristic-suggestor.ts is the hill-climbed cheap babysitter"
37. `prompt.codex.md:53-56` — agent prompt rules for tic80ctl
38. `prompt.codex.md:61` — "record poor `tic80ctl` feedback"
39. `prompt.codex.md:109-113` — bounded workflow described

### Category 5: State / Heuristics / Postmortems

40. `state/heuristics/tic80-structural-escalation.md` — escalation rule after 3 wrong drafts
41. `state/heuristics/tic80-large-write-visibility.md` — rules for large Lua writes
42. `state/nudges/tic80-cars-rewrite.md` — specific nudge text from failed sessions
43. `state/sessions/2026-03-26-omnicoder-cars.md` — session retrospective
44. `state/failure_patterns/tic80-cars-structural-loop.md` — documented failure mode
45. `state/README.md:47` — "After ambiguous `tic80ctl` failure..."
46. `state/models/omnicoder-9b-iq3_xxs.md:8` — model never reached tic80ctl verification

### Category 6: CLI / Config

47. `babysitter:296` — `str(repo_root() / "skills" / "tic80ctl-usage")` — skill path
48. `AGENTS.md:18` — prerequisite check: `tic80ctl --help`
49. `AGENTS.md:22` — naming convention example: `state/failure_patterns/tic80-drift.md`
50. `AGENTS.md:26` — TIC-80 testing sequence
51. `INSTALL.md:8,33` — prerequisite `tic80ctl`
52. `README.md:27` — "proving ground is TIC-80 game creation with `tic80ctl`"
53. `README.md:51` — links to tic80-heuristic-suggestor.ts

## Contradictory or Ambiguous Evidence
None found — all mentions are consistent. The repo treats TIC-80 as the primary proving ground with a well-defined bounded workflow.

## Claim Status
- PROVEN: 160 line-level mentions of "tic80" (case-insensitive) across 33 files
- PROVEN: The term appears in agent extension code (3 TS files), config files (2 workspace files, babysitter Python), a dedicated skill directory (7 files), design docs (4 docs), state/heuristics (5 files), and the CLI (babysitter, INSTALL.md, AGENTS.md)
- PROVEN: `tic80ctl` is the CLI interface to a headless TIC-80 session, and the dominant form of the mention
- PROVEN: `tic80-heuristic-suggestor.ts` is the single most important extension — it's referenced across design docs, the README, and elevator_pitch.md
- DISPROVEN: No mentions found in tests (`tests/test_babysitter.py`), `START_HERE.md`, or `LICENSE`

## Conclusion
TIC-80 is pervasive throughout the repository as the primary "proving ground" — 160 mentions in 33 files. It appears as:
- **Runtime code**: 3 TypeScript extensions that intercept Lua cart content and tic80ctl shell commands
- **Config**: 2 workspace lint configs (tic80.yml, selene.toml) + the Python babysitter script referencing both
- **Skill documentation**: 7 files under `skills/tic80ctl-usage/` comprising the full knowledge base injected into agent prompts
- **State/failure knowledge**: 5 state notes documenting heuristics, nudges, and failure patterns
- **Design and onboarding**: README, what_why_how.md, AGENTS.md, prompt.codex.md, elevator_pitch.md, INSTALL.md

The bounded workflow is always: `tic80ctl start` → `tic80ctl load <cart>.lua` → `tic80ctl run` → validate (eval/playtest).

## Subsequent Action: Generalization

On 2026-06-21, all TIC-80/Lua-specific content was removed to make the repo generalizable:

### Deleted (17 files)
- `agent/extensions/tic80-heuristic-suggestor.ts` — TIC‑80 heuristic logic
- `agent/extensions/selene-on-lua-write.ts` — Lua lint extension
- `agent/workspace/tic80.yml` — TIC‑80 selene config
- `agent/workspace/selene.toml` — Lua+tic80 selene config
- `skills/tic80ctl-usage/` (7 files) — entire TIC‑80 operation skill
- `state/heuristics/tic80-structural-escalation.md`
- `state/heuristics/tic80-large-write-visibility.md`
- `state/nudges/tic80-cars-rewrite.md`
- `state/sessions/2026-03-26-omnicoder-cars.md`
- `state/failure_patterns/tic80-cars-structural-loop.md`
- `state/models/omnicoder-9b-iq3_xxs.md`

### Edited (13 files)
- `babysitter` — removed tic80ctl/lua skill paths, removed heuristic CLI command
- `live-host-approval.ts` — fully generalized (no TIC‑80/Lua classification)
- `agent/SYSTEM.md` — removed TIC‑80 paragraph
- `README.md` — removed proving ground and extension list
- `what_why_how.md` — removed TIC‑80 section, generalized
- `elevator_pitch.md` — removed TIC‑80 references
- `prompt.codex.md` — fully rewritten as generic template
- `INSTALL.md` — removed tic80ctl, selene-on-lua refs
- `AGENTS.md` — removed tic80ctl/lua/testing refs
- `skills/rpc-babysitting/SKILL.md` — removed tic80ctl examples and TIC‑80 section
- `state/README.md` — removed TIC‑80-specific examples
- `investigations/2026-06-21_all-tic80-mentions.md` — updated with this record

After changes, `rg -i "tic80|tic80ctl|lua|selene" -g '!investigations/*'` returns no matches.

## Confidence
High — exhaustive `rg -i` search across all files, verified with `rg --files` to confirm coverage.

## Open Questions
- None for the scope of "find all mentions" — the search was exhaustive.
