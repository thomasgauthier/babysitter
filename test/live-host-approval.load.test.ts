import { describe, expect, it } from "vitest";
import liveHostApproval from "../agent/extensions/live-host-approval";
import { createTestSession } from "./helpers";

describe("live-host-approval extension", () => {
  it("loads with the public pi SDK harness", async () => {
    const session = await createTestSession([liveHostApproval]);
    expect(session).toBeTruthy();
  });
});
