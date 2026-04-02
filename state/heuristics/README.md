# Heuristics

This directory is only for harness or operator-policy lessons.

Write one file per heuristic when you learned something that should change how the babysitter is run, reviewed, or instrumented.

## Put Notes Here When

- the lesson changes operator decision rules
- the lesson suggests a tooling or harness improvement
- the lesson applies beyond one specific model or one session

## Do Not Put Here

- pure model quirks
- repeated bad output families
- exact steer or nudge text
- session diaries

Those belong elsewhere in `state/`.

## File Naming

Use lowercase hyphenated topic names.

Examples:

- `large-write-visibility.md`
- `structural-escalation.md`
- `late-request-tail.md`

## Required Shape

Keep files short. Use this structure:

```md
## Observed Weakness

- What the current method missed.

## Heuristic

- The rule to apply next time.

## Why

- The evidence that justifies the rule.
```

## Hard Rules

- Write policy, not autobiography.
- If the lesson only applies to one model family, put it in `../models/` unless it changes the general operating method.
- If the note does not change a future decision, it does not belong here.
