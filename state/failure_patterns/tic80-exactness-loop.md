## Pattern

- The model gets stuck trying to satisfy a precise character-count or formatting constraint, usually the 96-character TIC-80 palette string.
- It keeps recounting or re-reading the same file instead of moving to verification.
- This can continue even after the requirement, formula, and a correct example have already been given.

## Signals

- Reasoning is dominated by manual counting.
- The same file is read, counted, or grepped repeatedly without an actual edit.
- The reported count keeps disagreeing with the real count.
- The run stalls before `tic80ctl load` or other runtime verification.

## Response

- Provide the exact literal string or complete block instead of another hint.
- Stop approving more counting loops once the agent is spinning.
- Force the turn back toward runtime verification.
- If the cart is otherwise ready for runtime checks, do not keep the whole turn blocked on palette exactness alone.
