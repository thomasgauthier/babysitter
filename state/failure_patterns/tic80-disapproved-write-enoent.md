## Pattern

- After a host disapproval on a Lua `write`, the agent may try to inspect the rejected cart path as if the file exists.
- In `jade-upland`, that follow-up `read` failed with `ENOENT` because the rejected `crane.lua` write never landed.

## Signals

- A post-disapproval `read <cart>.lua` is requested right after the file was rejected.
- The cart path does not exist because the write never landed.

## Response

- Treat post-disapproval reads as bounded and safe, but expect them to fail if no prior write was approved.
- Use the missing file as a signal that the session is still blocked at the structural stage.
- Do not assume the run has reached runtime validation just because the agent asked to read the rejected path.
