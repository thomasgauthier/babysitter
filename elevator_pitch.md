# Elevator Pitch

We think there is a real opportunity to make small local coding models much more useful by operationalizing frontier-model babysitting into a runtime harness.

The core idea is simple:

- do not ask a 4B model to be a frontier model
- treat it as a proposal engine
- move reliability into the runtime
- use a stronger babysitter policy to shape it
- distill that babysitting into heuristics, nudges, and guardrails

In other words:

- the product is not just the model
- the product is `small model + harness + validators + intervention policy`

## The Bet

Small models often fail in repetitive ways:

- they drift after one bad tool result
- they ignore exact local constraints
- they produce almost-correct code and miss one fatal detail
- they broaden into environment archaeology instead of staying task-local

Those failures are often harnessable.

If we can intercept the right decisions, steer the model at the right breakpoints, and learn from strong babysitting, then a smaller model can become far more practically useful than its raw capability suggests.

## What We’re Building

A live supervision loop around `pi` that:

1. intercepts important actions
2. classifies them into a few review buckets
3. allows:
   - approve
   - disapprove
   - nudge
   - heuristic suggestion
4. logs what the expert babysitter actually chose
5. improves the heuristics until they increasingly match expert supervision

This is the beginning of an autoharness:

- frontier babysitter in the loop first
- reusable policy later

## Why This Is Interesting

This gives us a path to:

- extract tacit operator judgment from real runs
- make weaker local models more reliable without retraining
- reduce dependence on frontier inference for every step
- turn supervision into a compounding systems asset

This is not just prompt engineering.

It is a practical policy-distillation loop over live agent behavior.

## What We’ve Already Proven

We already have:

- a real `pi` RPC supervision loop
- extension-based interception
- a host approval / nudge interface
- task-specific babysitting policy for TIC-80
- decision logging
- a scoring loop for heuristic-vs-human choices

We have also seen the key signal we care about:

- the model can be materially redirected by the harness
- the failure surface narrows under supervision
- the remaining misses become smaller and more exact

That is exactly what you want if the goal is to turn expert babysitting into reusable runtime policy.

## The Current Prototype Shape

The current stack has three parts:

- `live-host-approval.ts`
  - the supervision loop
  - decision logging
  - host choice application
- `tic80-heuristic-suggestor.ts`
  - the hill-climbed heuristic suggestor
  - the current cheap stand-in for frontier babysitting
- `selene-on-lua-write.ts`
  - optional lint feedback on Lua writes

Canonical source location in this repo:

- [agent/extensions](/workspace/babysitter/agent/extensions)

This is already enough to run real experiments, not just speculate.

## The Key Metric

One useful intermediate metric is:

- how often the heuristic harness agrees with the frontier babysitter at meaningful decision points

This is not the final metric.
But it is a good proxy if we keep it honest:

- weight hard breakpoints, not easy reads
- distinguish decision agreement from nudge quality
- periodically ground it in real end-to-end success

So the loop is:

- hill-climb on babysitter agreement
- then cash out into real downstream task performance

## Why We Think It’s Worth Doing

Because if this works, it changes the economics of model usefulness.

Instead of asking:

- “is the 4B model smart enough?”

we ask:

- “can we build a control system that makes the 4B model useful?”

That is a much better question.

And unlike vague hopes about future training, this is something we can build, measure, and improve right now.

## One-Sentence Summary

We are building a frontier-babysitter-powered autoharness that turns strong live supervision into reusable runtime policy so smaller local coding models can become practically useful on bounded tasks.
