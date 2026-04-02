import { beforeEach, describe, expect, it } from "vitest";
import type { ToolCallEvent } from "@mariozechner/pi-coding-agent";
import {
	inferHeuristicSuggestion,
	resetHeuristicTestState,
	type ReviewBucket,
	type ReviewEvent,
} from "../agent/extensions/tic80-heuristic-suggestor";

function makeReview(bucket: ReviewBucket): ReviewEvent {
  return {
    bucket,
    title: "test",
    summary: "test",
    details: [],
  };
}

function makeToolCallEvent(input: Record<string, unknown>): ToolCallEvent {
	return {
		toolName: "write",
		input,
	} as ToolCallEvent;
}

describe("inferHeuristicSuggestion", () => {
	beforeEach(() => {
		resetHeuristicTestState();
	});

	it("disapproves structurally wrong TIC-80 cart shapes", () => {
    const event = makeToolCallEvent({
      path: "game.lua",
      content: `
function update()
  player_x = player_x + 1
end

function draw()
  drawtext("hi", 0, 0)
end
`,
    });

    const suggestion = inferHeuristicSuggestion(event, makeReview("on_lua_change"));

    expect(suggestion).toEqual({
      decision: "disapprove",
      reason: "structurally wrong TIC-80 cart shape",
    });
  });

  it("nudges when the trailing palette block is missing", () => {
    const event = makeToolCallEvent({
      path: "game.lua",
      content: `
function TIC()
  cls(0)
  print("ok", 10, 10, 12)
end
`,
    });

	    const suggestion = inferHeuristicSuggestion(event, makeReview("on_lua_change"));

	    expect(suggestion.decision).toBe("nudge");
	    expect(suggestion.reason).toBe("structural nudge: cart is missing a trailing static palette block");
	    expect(suggestion.nudge).toContain("valid trailing TIC-80 palette header");
	  });

  it("disapproves runtime palette mutation", () => {
    const event = makeToolCallEvent({
      path: "game.lua",
      content: `
function TIC()
  poke(0x3FF8, 0)
end

-- <PALETTE>
-- 000:000000111111222222333333444444555555666666777777888888999999aaaaaabbbbbbccccccddddddffffff
-- </PALETTE>
`,
    });

    const suggestion = inferHeuristicSuggestion(event, makeReview("on_lua_change"));

    expect(suggestion).toEqual({
      decision: "disapprove",
      reason: "runtime palette mutation risk",
    });
  });

  it("approves bounded tic80ctl workflow commands", () => {
    const event = {
      toolName: "bash",
      input: { command: "tic80ctl load game.lua" },
    } as ToolCallEvent;

    const suggestion = inferHeuristicSuggestion(event, makeReview("on_tic_ctl_call"));

    expect(suggestion).toEqual({
      decision: "approve",
      reason: "bounded TIC-80 workflow step",
    });
  });

  it("nudges tic80ctl playtest calls that are missing --script-file", () => {
    const event = {
      toolName: "bash",
      input: { command: "tic80ctl playtest" },
    } as ToolCallEvent;

    const suggestion = inferHeuristicSuggestion(event, makeReview("on_tic_ctl_call"));

    expect(suggestion.decision).toBe("nudge");
    expect(suggestion.reason).toBe("tic80ctl playtest is missing --script-file");
    expect(suggestion.nudge).toContain("--script-file");
  });

  it("approves bounded inspection shell commands", () => {
    const event = {
      toolName: "bash",
      input: { command: "rg -n 'function TIC' game.lua" },
    } as ToolCallEvent;

    const suggestion = inferHeuristicSuggestion(event, makeReview("on_anything_else"));

    expect(suggestion).toEqual({
      decision: "approve",
      reason: "bounded inspection step",
    });
  });

  it("nudges on archaeology-style shell expansion", () => {
    const event = {
      toolName: "bash",
      input: { command: "which tic80ctl && tic80ctl --help" },
    } as ToolCallEvent;

    const suggestion = inferHeuristicSuggestion(event, makeReview("on_anything_else"));

    expect(suggestion.decision).toBe("nudge");
    expect(suggestion.reason).toBe("likely drift into environment archaeology");
    expect(suggestion.nudge).toContain("Do not broaden into environment debugging yet");
  });

  it("disapproves shell-based lua rewrites that bypass the edit workflow", () => {
    const event = {
      toolName: "bash",
      input: { command: "cat > game.lua <<'EOF'\nfunction TIC() end\nEOF" },
    } as ToolCallEvent;

    const suggestion = inferHeuristicSuggestion(event, makeReview("on_lua_change"));

    expect(suggestion).toEqual({
      decision: "disapprove",
      reason: "shell-based lua rewrite bypasses the edit workflow",
    });
  });

  it("nudges run-before-load after a lua write", () => {
    const writeEvent = makeToolCallEvent({
      path: "game.lua",
      content: `
function TIC()
  cls(0)
end
`,
    });

    inferHeuristicSuggestion(writeEvent, makeReview("on_lua_change"));

    const runEvent = {
      toolName: "bash",
      input: { command: "tic80ctl run" },
    } as ToolCallEvent;

    const suggestion = inferHeuristicSuggestion(runEvent, makeReview("on_tic_ctl_call"));

    expect(suggestion.decision).toBe("nudge");
    expect(suggestion.reason).toBe("tic80ctl run should follow a fresh load after the latest lua write");
    expect(suggestion.nudge).toContain("Reload the cart before running it");
  });

  it("nudges a repeated palette exactness loop back to verification", () => {
    const exactnessReview = makeReview("on_anything_else");

    inferHeuristicSuggestion(
      { toolName: "bash", input: { command: "cat game.lua" } } as ToolCallEvent,
      exactnessReview,
    );
    inferHeuristicSuggestion(
      { toolName: "bash", input: { command: "grep '^-- 000:' game.lua" } } as ToolCallEvent,
      exactnessReview,
    );

    const suggestion = inferHeuristicSuggestion(
      { toolName: "bash", input: { command: "wc -c game.lua" } } as ToolCallEvent,
      exactnessReview,
    );

    expect(suggestion.decision).toBe("nudge");
    expect(suggestion.reason).toBe("agent is stuck in a palette exactness loop");
    expect(suggestion.nudge).toContain("Move to the verification sequence now");
  });

  it("disapproves a repeated structural rewrite after a prior structural nudge", () => {
    const firstWrite = makeToolCallEvent({
      path: "game.lua",
      content: `
function TIC()
  if rand(10) > 4 then
    print("ok", 10, 10, 12)
  end
end

-- <PALETTE>
-- 000:000000111111222222333333444444555555666666777777888888999999aaaaaabbbbbbccccccddddddffffff
-- </PALETTE>
`,
    });

    inferHeuristicSuggestion(firstWrite, makeReview("on_lua_change"));

    const repeatedBadWrite = makeToolCallEvent({
      path: "game.lua",
      content: `
function TIC()
  if kdbp(19) then
    print(12, "bad", 8, 8)
  end
end

-- <PALETTE>
-- 000:000000111111222222333333444444555555666666777777888888999999aaaaaabbbbbbccccccddddddffffff
-- </PALETTE>
`,
    });

    const suggestion = inferHeuristicSuggestion(repeatedBadWrite, makeReview("on_lua_change"));

    expect(suggestion).toEqual({
      decision: "disapprove",
      reason: "repeated structurally wrong TIC-80 rewrite after prior correction",
    });
  });

  it("disapproves TIC carts that still use the wrong helper family after TIC() appears", () => {
    const event = makeToolCallEvent({
      path: "game.lua",
      content: `
function TIC()
  if rand(10) > 4 then
    TIC.font("oops")
  end
end

-- <PALETTE>
-- 000:000000111111222222333333444444555555666666777777888888999999aaaaaabbbbbbccccccddddddffffff
-- </PALETTE>
`,
    });

    const suggestion = inferHeuristicSuggestion(event, makeReview("on_lua_change"));

    expect(suggestion).toEqual({
      decision: "disapprove",
      reason: "TIC-80 cart uses wrong helper family or coordinates",
    });
  });

  it("approves run after a fresh load following a lua write", () => {
    const writeEvent = makeToolCallEvent({
      path: "game.lua",
      content: `
function TIC()
  cls(0)
end
`,
    });
    inferHeuristicSuggestion(writeEvent, makeReview("on_lua_change"));

    inferHeuristicSuggestion(
      { toolName: "bash", input: { command: "tic80ctl load game.lua" } } as ToolCallEvent,
      makeReview("on_tic_ctl_call"),
    );

    const suggestion = inferHeuristicSuggestion(
      { toolName: "bash", input: { command: "tic80ctl run" } } as ToolCallEvent,
      makeReview("on_tic_ctl_call"),
    );

    expect(suggestion).toEqual({
      decision: "approve",
      reason: "bounded TIC-80 workflow step",
    });
  });

  it("nudges post-playtest screenshot or restart archaeology", () => {
    inferHeuristicSuggestion(
      { toolName: "bash", input: { command: "tic80ctl playtest --script-file episode.lua" } } as ToolCallEvent,
      makeReview("on_tic_ctl_call"),
    );

    const suggestion = inferHeuristicSuggestion(
      { toolName: "bash", input: { command: "tic80ctl screenshot victory.png" } } as ToolCallEvent,
      makeReview("on_tic_ctl_call"),
    );

    expect(suggestion.decision).toBe("nudge");
    expect(suggestion.reason).toBe("likely post-verification archaeology after playtest");
    expect(suggestion.nudge).toContain("Do not restart or screenshot unless there is a new bug to inspect");
  });

  it("falls back to approve when no policy signal is present", () => {
    const suggestion = inferHeuristicSuggestion(
      { toolName: "bash", input: { command: "echo ready" } } as ToolCallEvent,
      makeReview("on_anything_else"),
    );

    expect(suggestion).toEqual({
      decision: "approve",
      reason: "no obvious risk signal",
    });
  });
});
