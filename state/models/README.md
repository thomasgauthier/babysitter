# Models

This directory is only for model-specific notes.

Write one file per model when a behavior pattern appears tied to that model and would affect how an operator supervises it next time.

## Put Notes Here When

- the behavior appears specific to one model
- the note would change how you steer, approve, or bound that model
- the lesson is stable enough to reuse across sessions

## Do Not Put Here

- general harness lessons
- reusable failure families across many models
- exact nudge libraries
- one session's chronology

Those belong in other `state/` folders.

## File Naming

Use the model identifier as the filename.

Examples:

- `omnicoder-9b-iq3_xxs.md`
- `gpt-5.4.md`

## Required Shape

Keep files short. Use this structure:

```md
## Traits

- Repeated tendencies tied to this model.

## Operator Implication

- How to supervise it differently.

## Confidence

- Why you believe this is model-specific.
```

## Hard Rules

- Only include behavior you actually observed.
- Separate stable tendencies from one-off mistakes.
- If the note is really about a task family rather than a model, move it out of here.
