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

  it("nudges structurally wrong TIC-80 cart shapes", () => {
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
      decision: "nudge",
      reason:
        "This cart is structurally wrong for TIC-80. Do not use init(), update(), draw(), or other framework callbacks here. Use exactly one function TIC() frame callback, and replace the wrong framework/API family with actual TIC-80 APIs like cls, print, rect, circ, btn, btnp, and key before trying again.",
    });
  });

  it("nudges malformed TIC callback syntax before generic wrong-framework messaging", () => {
    const event = makeToolCallEvent({
      path: "game.lua",
      content: `
TIC() {
  cls(0)
  text("pizza", 10, 10, 12)
}
`,
    });

    const suggestion = inferHeuristicSuggestion(event, makeReview("on_lua_change"));

    expect(suggestion).toEqual({
      decision: "nudge",
      reason:
        "This cart is not valid TIC-80 Lua yet. Define the frame callback as exactly function TIC() ... end, not TIC() { ... }. Keep the cart in normal Lua syntax and use real TIC-80 APIs like cls, print, rect, circ, btn, and btnp.",
    });
  });

  it("nudges bare TIC callback syntax and fake helper calls before palette cleanup", () => {
    const event = makeToolCallEvent({
      path: "pizza.lua",
      content: `
TIC()
  printb("hello")
  if kpressed("a") then
    score = score + 1
  end
END

-- <PALETTE>
-- 000:0000001d2b53
-- </PALETTE>
`,
    });

    const suggestion = inferHeuristicSuggestion(event, makeReview("on_lua_change"));

    expect(suggestion).toEqual({
      decision: "nudge",
      reason:
        "This cart is not valid TIC-80 Lua yet. Define the frame callback as exactly function TIC() ... end, not TIC() { ... }. Keep the cart in normal Lua syntax and use real TIC-80 APIs like cls, print, rect, circ, btn, and btnp.",
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

    expect(suggestion).toEqual({
      decision: "nudge",
      reason: "Keep this as a script cart and include a valid trailing TIC-80 palette header in comments instead of runtime palette mutation.",
    });
  });

  it("prefers menu-progress nudges over palette cleanup when the cart never leaves the start screen", () => {
    const event = makeToolCallEvent({
      path: "game.lua",
      content: `
local state = { menu = true, score = 0 }

function TIC()
  if state.menu then
    cls(0)
    print("press start", 8, 8, 12)
    return
  end

  cls(0)
  print("playing", 8, 8, 12)
end
`,
    });

    const suggestion = inferHeuristicSuggestion(event, makeReview("on_lua_change"));

    expect(suggestion).toEqual({
      decision: "nudge",
      reason:
        "This cart has a start/menu state but no real transition into gameplay. Keep the menu simple, but add one actual btn/btnp-driven path that leaves the start screen and enters the playable loop before worrying about footer polish.",
    });
  });

  it("nudges runtime palette mutation back to a static palette block", () => {
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
      decision: "nudge",
      reason: "Do not mutate the palette at runtime for this cart. Keep a static trailing palette block in comments at the end of the file instead.",
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

    expect(suggestion).toEqual({
      decision: "nudge",
      reason: "Use tic80ctl playtest with --script-file <episode.lua> so the harness runs a concrete scripted check.",
    });
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

  it("nudges reference directory scans back to a specific file read", () => {
    const event = {
      toolName: "bash",
      input: { command: "ls -la /workspace/babysitter/reference/ 2>/dev/null || echo missing" },
    } as ToolCallEvent;

    const suggestion = inferHeuristicSuggestion(event, makeReview("on_anything_else"));

    expect(suggestion).toEqual({
      decision: "nudge",
      reason:
        "Do not scan the whole reference directory. Read the specific reference file named in the skill that matches the next step instead.",
    });
  });

  it("nudges broad repo markdown scans back to the skill-local reference path", () => {
    const event = {
      toolName: "bash",
      input: { command: "find /workspace/babysitter -name \"*.md\" -type f | head -20" },
    } as ToolCallEvent;

    const suggestion = inferHeuristicSuggestion(event, makeReview("on_anything_else"));

    expect(suggestion).toEqual({
      decision: "nudge",
      reason:
        "Do not scan repo markdown files broadly. The TIC-80 references for this skill are under skills/tic80ctl-usage/reference/. Read the specific file you need there instead.",
    });
  });

  it("nudges wrong tic80 reference file paths back to the skill-local reference directory", () => {
    const event = {
      toolName: "read",
      input: { path: "/workspace/babysitter/reference/tic80_api_reference.md" },
    } as ToolCallEvent;

    const suggestion = inferHeuristicSuggestion(event, makeReview("on_anything_else"));

    expect(suggestion).toEqual({
      decision: "nudge",
      reason:
        "That TIC-80 reference path is wrong for this repo. Read the needed file from skills/tic80ctl-usage/reference/ instead.",
    });
  });

  it("nudges on archaeology-style shell expansion", () => {
    const event = {
      toolName: "bash",
      input: { command: "which tic80ctl && tic80ctl --help" },
    } as ToolCallEvent;

    const suggestion = inferHeuristicSuggestion(event, makeReview("on_anything_else"));

    expect(suggestion).toEqual({
      decision: "nudge",
      reason: "Do not broaden into environment debugging yet. Stay on the current task and test one direct hypothesis instead.",
    });
  });

  it("nudges shell-based lua rewrites back to the write/edit tools", () => {
    const event = {
      toolName: "bash",
      input: { command: "cat > game.lua <<'EOF'\nfunction TIC() end\nEOF" },
    } as ToolCallEvent;

    const suggestion = inferHeuristicSuggestion(event, makeReview("on_lua_change"));

    expect(suggestion).toEqual({
      decision: "nudge",
      reason: "Do not rewrite Lua files via shell redirection. Use the write or edit tool for code changes instead.",
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

    expect(suggestion).toEqual({
      decision: "nudge",
      reason: "Reload the cart before running it: tic80ctl load <cart>.lua, then tic80ctl run.",
    });
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

    expect(suggestion).toEqual({
      decision: "nudge",
      reason: "The palette IS correct or close enough to stop counting. I will not approve more counting or grep commands. Move to the verification sequence now: tic80ctl load the cart and then tic80ctl run.",
    });
  });

  it("nudges a repeated structural rewrite after a prior structural nudge", () => {
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
      decision: "nudge",
      reason:
        "The rewrite is still using invalid TIC-80 APIs after the prior correction. Stop repeating this API family. Use one function TIC() loop with standard TIC-80 APIs like cls, print, rect, circ, btn, btnp, and key before continuing.",
    });
  });

  it("nudges TIC carts that still use the wrong helper family after TIC() appears", () => {
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
      decision: "nudge",
      reason:
        "This cart still uses invalid TIC-80 helpers. Keep function TIC(), but do not use TIC.width/TIC.height/TIC.cameraX/TIC.cameraY/TIC.sfx members. Use numeric btn/btnp inputs with the real direction ids: btn(0)=up, btn(1)=down, btn(2)=left, btn(3)=right. Do not use strings, symbolic constants, or keyboard keycodes. Use print(...) for text instead of text()/set(), and keep a valid 96-hex trailing palette block.",
    });
  });

  it("nudges TIC carts that use invented COLOR and helper families", () => {
    const event = makeToolCallEvent({
      path: "game.lua",
      content: `
function TIC()
  cls(COLOR[0])
  if keypressed(KEY_SPACE) then
    fill(0, 0, 10, 10, COLOR[1])
  end
end

-- <PALETTE>
-- 000:000000111111222222333333444444555555666666777777888888999999aaaaaabbbbbbccccccddddddffffff
-- </PALETTE>
`,
    });

    const suggestion = inferHeuristicSuggestion(event, makeReview("on_lua_change"));

    expect(suggestion).toEqual({
      decision: "nudge",
      reason:
        "This cart still uses invalid TIC-80 helpers. Keep function TIC(), but do not use TIC.width/TIC.height/TIC.cameraX/TIC.cameraY/TIC.sfx members. Use numeric btn/btnp inputs with the real direction ids: btn(0)=up, btn(1)=down, btn(2)=left, btn(3)=right. Do not use strings, symbolic constants, or keyboard keycodes. Use print(...) for text instead of text()/set(), and keep a valid 96-hex trailing palette block.",
    });
  });

  it("nudges TIC carts with string button names and text/set helpers", () => {
    const event = makeToolCallEvent({
      path: "game.lua",
      content: `
function TIC()
  cls(0)
  if btn('left') then
    px = px - 1
  end
  set(3, 0, 0, 1)
  text("hi", 0, 0)
end

-- <PALETTE>
-- 000:0000004444440a0a0afafafffaffff1111117777770afffafbfbfafbfa
-- </PALETTE>
`,
    });

    const suggestion = inferHeuristicSuggestion(event, makeReview("on_lua_change"));

    expect(suggestion).toEqual({
      decision: "nudge",
      reason:
        "This cart still uses invalid TIC-80 helpers. Keep function TIC(), but do not use TIC.width/TIC.height/TIC.cameraX/TIC.cameraY/TIC.sfx members. Use numeric btn/btnp inputs with the real direction ids: btn(0)=up, btn(1)=down, btn(2)=left, btn(3)=right. Do not use strings, symbolic constants, or keyboard keycodes. Use print(...) for text instead of text()/set(), and keep a valid 96-hex trailing palette block.",
    });
  });

  it("nudges TIC carts that use TIC members and random/keyp drift", () => {
    const event = makeToolCallEvent({
      path: "game.lua",
      content: `
function TIC()
  local w = TIC.width
  local h = TIC.height
  TIC.cameraX = 2
  if keyp(0) then
    TIC.sfx:play(0, -1)
  end
  local x = random(1, 4)
  print(12, 1, "bad", 2)
end

-- <PALETTE>
-- 000:000000111111222222333333444444555555666666777777888888999999aaaaaabbbbbbccccccddddddffffff
-- </PALETTE>
`,
    });

    const suggestion = inferHeuristicSuggestion(event, makeReview("on_lua_change"));

    expect(suggestion).toEqual({
      decision: "nudge",
      reason:
        "This cart still uses invalid TIC-80 helpers. Keep function TIC(), but do not use TIC.width/TIC.height/TIC.cameraX/TIC.cameraY/TIC.sfx members. Use numeric btn/btnp inputs with the real direction ids: btn(0)=up, btn(1)=down, btn(2)=left, btn(3)=right. Do not use strings, symbolic constants, or keyboard keycodes. Use print(...) for text instead of text()/set(), and keep a valid 96-hex trailing palette block.",
    });
  });

  it("prefers the helper-family nudge over palette cleanup for symbolic input drift", () => {
    const event = makeToolCallEvent({
      path: "pizza-delivery.lua",
      content: `
local player = {x=32, y=16, w=8, h=8}
local pizzas = {}
local drops = {}

function TIC()
  local up = key(UP)
  local down = key(DOWN)
  local left = key(LEFT)
  local right = key(RIGHT)
  local a = btn(0)
  local b = btnp(1)

  cls(0)
  rectb(player.x, player.y, player.w, player.h, 16)
  print("Score", 0, 0)
end

-- <PALETTE>
-- 000:000000111111222222333333444444555555666666777777888888999999aaaaaa
-- </PALETTE>
`,
    });

    const suggestion = inferHeuristicSuggestion(event, makeReview("on_lua_change"));

    expect(suggestion).toEqual({
      decision: "nudge",
      reason:
        "This cart still uses invalid TIC-80 helpers. Keep function TIC(), but do not use TIC.width/TIC.height/TIC.cameraX/TIC.cameraY/TIC.sfx members. Use numeric btn/btnp inputs with the real direction ids: btn(0)=up, btn(1)=down, btn(2)=left, btn(3)=right. Do not use strings, symbolic constants, or keyboard keycodes. Use print(...) for text instead of text()/set(), and keep a valid 96-hex trailing palette block.",
    });
  });

  it("prefers the helper-family nudge over palette cleanup for key-string comparisons", () => {
    const event = makeToolCallEvent({
      path: "pizza-delivery.lua",
      content: `
function TIC()
  local left = key(1) == "left"
  local right = key(1) == "right"

  cls(0)
  print("pizza", 8, 8, 12)
end

-- <PALETTE>
-- 000:0000001d2b53
-- </PALETTE>
`,
    });

    const suggestion = inferHeuristicSuggestion(event, makeReview("on_lua_change"));

    expect(suggestion).toEqual({
      decision: "nudge",
      reason:
        "This cart still uses invalid TIC-80 helpers. Keep function TIC(), but do not use TIC.width/TIC.height/TIC.cameraX/TIC.cameraY/TIC.sfx members. Use numeric btn/btnp inputs with the real direction ids: btn(0)=up, btn(1)=down, btn(2)=left, btn(3)=right. Do not use strings, symbolic constants, or keyboard keycodes. Use print(...) for text instead of text()/set(), and keep a valid 96-hex trailing palette block.",
    });
  });

  it("prefers the helper-family nudge over palette cleanup for invalid btn signatures", () => {
    const event = makeToolCallEvent({
      path: "pizza-delivery.lua",
      content: `
function TIC()
  if btn(0, 1) then
    player_x = player_x - 2
  end
  if btn(0, 6) then
    player_y = player_y - 2
  end

  cls(0)
  print("pizza", 8, 8, 12)
end

-- <PALETTE>
-- 000:0000001d2b53
-- </PALETTE>
`,
    });

    const suggestion = inferHeuristicSuggestion(event, makeReview("on_lua_change"));

    expect(suggestion).toEqual({
      decision: "nudge",
      reason:
        "This cart still uses invalid TIC-80 helpers. Keep function TIC(), but do not use TIC.width/TIC.height/TIC.cameraX/TIC.cameraY/TIC.sfx members. Use numeric btn/btnp inputs with the real direction ids: btn(0)=up, btn(1)=down, btn(2)=left, btn(3)=right. Do not use strings, symbolic constants, or keyboard keycodes. Use print(...) for text instead of text()/set(), and keep a valid 96-hex trailing palette block.",
    });
  });

  it("uses the stronger wrong-framework nudge for mixed callback families", () => {
    const event = makeToolCallEvent({
      path: "game.lua",
      content: `
function init()
end

function update()
  if TIC.input and TIC.input.left then
    player_x = player_x - 1
  end
end

function draw()
  cls(0)
end

function tic()
end

-- <PALETTE>
-- 000:000000111111222222333333444444555555666666777777888888999999aaaaaabbbbbbccccccddddddffffff
-- </PALETTE>
`,
    });

    const suggestion = inferHeuristicSuggestion(event, makeReview("on_lua_change"));

    expect(suggestion).toEqual({
      decision: "nudge",
      reason:
        "This cart is structurally wrong for TIC-80. Do not use init(), update(), draw(), or other framework callbacks here. Use exactly one function TIC() frame callback, and replace the wrong framework/API family with actual TIC-80 APIs like cls, print, rect, circ, btn, btnp, and key before trying again.",
    });
  });

  it("uses the stronger wrong-framework nudge for TIC-dot callback families", () => {
    const event = makeToolCallEvent({
      path: "game.lua",
      content: `
function TIC.start()
end

function TIC.update()
  if key(0, "left") then
    player_x = player_x - 1
  end
end

function TIC.draw()
  cls(0)
end

-- <PALETTE>
-- 000:1a1a2e3a3a5effffffffaaaaaa222222888888bbbbbb000000eeeeeecccccc111111
-- </PALETTE>
`,
    });

    const suggestion = inferHeuristicSuggestion(event, makeReview("on_lua_change"));

    expect(suggestion).toEqual({
      decision: "nudge",
      reason:
        "This cart is structurally wrong for TIC-80. Do not use init(), update(), draw(), or other framework callbacks here. Use exactly one function TIC() frame callback, and replace the wrong framework/API family with actual TIC-80 APIs like cls, print, rect, circ, btn, btnp, and key before trying again.",
    });
  });

  it("does not misclassify TIC carts with helper draw functions as wrong-framework", () => {
    const event = makeToolCallEvent({
      path: "pizza.lua",
      content: `
function TIC()
  local keys = get_keys()
  move_player(keys)
  draw()
end

function get_keys()
  local k = {}
  if btn(8) then k["down"] = true end
  return k
end

function draw()
  cls(0)
  pt(10, 10, 15)
  spe(1, 12000, 4, 1, 8)
end

-- <PALETTE>
-- 000:0000001d2b537e2553008751ab52365f574fff77a813244533e04c5f35d07c317cc6b5adf065e17329adff
-- </PALETTE>
`,
    });

    const suggestion = inferHeuristicSuggestion(event, makeReview("on_lua_change"));

    expect(suggestion).toEqual({
      decision: "nudge",
      reason:
        "This cart still uses invalid TIC-80 helpers. Keep function TIC(), but do not use TIC.width/TIC.height/TIC.cameraX/TIC.cameraY/TIC.sfx members. Use numeric btn/btnp inputs with the real direction ids: btn(0)=up, btn(1)=down, btn(2)=left, btn(3)=right. Do not use strings, symbolic constants, or keyboard keycodes. Use print(...) for text instead of text()/set(), and keep a valid 96-hex trailing palette block.",
    });
  });

  it("does not misclassify TIC carts with helper update and draw functions as wrong-framework", () => {
    const event = makeToolCallEvent({
      path: "pizza.lua",
      content: `
function TIC()
  update()
  draw()
end

function update()
  if btn("left") then
    player_x = player_x - 1
  end
end

function draw()
  cls(0)
  sprite(1, player_x, player_y)
  trace("score")
end

-- <PALETTE>
-- 000:0000001d2b537e2553008751ab52365f574fff77a813244533e04c5f35d07c317cc6b5adf065e17329adff
-- </PALETTE>
`,
    });

    const suggestion = inferHeuristicSuggestion(event, makeReview("on_lua_change"));

    expect(suggestion).toEqual({
      decision: "nudge",
      reason:
        "This cart still uses invalid TIC-80 helpers. Keep function TIC(), but do not use TIC.width/TIC.height/TIC.cameraX/TIC.cameraY/TIC.sfx members. Use numeric btn/btnp inputs with the real direction ids: btn(0)=up, btn(1)=down, btn(2)=left, btn(3)=right. Do not use strings, symbolic constants, or keyboard keycodes. Use print(...) for text instead of text()/set(), and keep a valid 96-hex trailing palette block.",
    });
  });

  it("does not approve fake TIC-80 input helpers and wrong screen assumptions", () => {
    const event = makeToolCallEvent({
      path: "pizza.lua",
      content: `
local player = {x = 80, y = 120}

function TIC()
  if KRESSED(1) then
    player.x = player.x + 1
  end
  rectb(0, 170, 320, 20, 1)
  circle(10, 10, 3, 12)
end

function KEY(i)
end

-- <PALETTE>
-- 000:11003344552266778899aabbccddee00113322445566778800112233445566778899aabbcc0011334422556677880099aabbcc
-- </PALETTE>
`,
    });

    const suggestion = inferHeuristicSuggestion(event, makeReview("on_lua_change"));

    expect(suggestion).toEqual({
      decision: "nudge",
      reason:
        "This cart still uses invalid TIC-80 helpers. Keep function TIC(), but do not use TIC.width/TIC.height/TIC.cameraX/TIC.cameraY/TIC.sfx members. Use numeric btn/btnp inputs with the real direction ids: btn(0)=up, btn(1)=down, btn(2)=left, btn(3)=right. Do not use strings, symbolic constants, or keyboard keycodes. Use print(...) for text instead of text()/set(), and keep a valid 96-hex trailing palette block.",
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

    expect(suggestion).toEqual({
      decision: "nudge",
      reason: "A playtest already ran. Do not restart or screenshot unless there is a new bug to inspect.",
    });
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
