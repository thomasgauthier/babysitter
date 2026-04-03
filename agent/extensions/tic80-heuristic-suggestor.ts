import type { ToolCallEvent } from "@mariozechner/pi-coding-agent";

export type ReviewBucket = "on_lua_change" | "on_tic_ctl_call" | "on_anything_else";

export type ReviewEvent = {
	bucket: ReviewBucket;
	title: string;
	summary: string;
	details: string[];
};

export type AppliedDecision = "approve" | "nudge";

export type HeuristicSuggestion = {
	decision: AppliedDecision;
	reason: string;
};

type SessionState = {
	serial: number;
	recentLuaWriteSerial: number | null;
	lastLoadSerial: number | null;
	sawPlaytest: boolean;
	structuralNudgeActive: boolean;
	commandHistory: string[];
};

type RuleContext = {
	event: ToolCallEvent;
	review: ReviewEvent;
	state: SessionState;
	command?: string;
	content?: string;
	path?: string;
	normalizedCommand: string;
	commandHistory: string[];
	recentLuaWritePendingLoad: boolean;
	repeatedExactnessLoop: boolean;
	priorStructuralNudge: boolean;
	sawPlaytest: boolean;
};

type HeuristicRule = {
	id: string;
	applies(ctx: RuleContext): boolean;
	suggest(ctx: RuleContext): HeuristicSuggestion;
};

const COMMAND_HISTORY_LIMIT = 8;
const globalSessionState: SessionState = {
	serial: 0,
	recentLuaWriteSerial: null,
	lastLoadSerial: null,
	sawPlaytest: false,
	structuralNudgeActive: false,
	commandHistory: [],
};

export function resetHeuristicTestState(): void {
	globalSessionState.serial = 0;
	globalSessionState.recentLuaWriteSerial = null;
	globalSessionState.lastLoadSerial = null;
	globalSessionState.sawPlaytest = false;
	globalSessionState.structuralNudgeActive = false;
	globalSessionState.commandHistory = [];
}

const STRUCTURAL_API_PATTERNS = [
	/\blove\./i,
	/\bfunction\s+(init|update|draw|input)\s*\(/i,
	/\bfunction\s+TIC\.(start|init|update|draw|frame)\s*\(/i,
	/\bfunction\s+KEY\s*\(/i,
	/\bCOLOR\s*\[/i,
	/\bKEY_[A-Z0-9_]+\b/,
	/\bKRESSED\s*\(/i,
	/\binput\.p1\b/i,
	/\binput\.(pressed|a|b|left|right|up|down)\b/i,
	/\btic\.(mode|frame)\b/i,
	/\bTIC\.(w|h|width|height|font)\b/i,
	/\bTIC\.(cameraX|cameraY|camera|sfx)\b/i,
	/\b(TIC_RUN|TIC_STOP)\b/i,
	/\b(tinit|tupdate|tdraw)\b/i,
	/\b(kdbp|kdb|kbds)\b/i,
	/\bkpressed\s*\(/i,
	/\btables\.clear\s*\(/i,
	/\bkeyp\s*\(/i,
	/\bkey\s*\(\s*[A-Z_][A-Z0-9_]*\s*\)/,
	/\bkey\s*\([^)]*\)\s*==\s*['"](left|right|up|down|a|b|x|y)['"]/i,
	/\bbtnp?\s*\(\s*['"][a-z_]+['"]\s*\)/i,
	/\bbtnp?\s*\(\s*[A-Z_][A-Z0-9_]*\s*\)/,
	/\bbtn\s*\(\s*\d+\s*,/i,
	/\bbtn\s*\(\s*[8-9]\s*\)/i,
	/\b(btnp\s*\(\s*(1[6-9]|[2-9]\d)\s*\))\b/i,
	/\bbtn\s*\(\s*\)\s*==\s*3\b/i,
	/\bbtn\s*\([^)]*\)\s*==\s*3\b/i,
	/\b(312|320)\b|\b(192)\b/,
	/\bprint\s*\(\s*\d+\s*,/i,
	/\b(circle|pt|spe|tile|tileb|keydown|keypressed|drawtext|text|set|setfont|fontsize|setpos|fill|clear|printb)\s*\(/i,
	/\bfor\s+\w+\s*=\s*\d+\s+to\s+\d+/i,
	/\b\/\/\b/,
	/\bEND\b/,
	/\brand\s*\(/i,
	/\brandom\s*\(/i,
];

const BOUNDED_INSPECTION_COMMANDS = [/\b(read|sed|cat|ls|find|rg)\b/];
const ARCHAEOLOGY_COMMANDS = [/\b(ps|top|htop|which|whereis)\b/, /\b--help\b/];
const TIC80_BOUNDED_COMMAND =
	/\btic80ctl\s+(start|load|run|eval|playtest|screenshot|stop|status)\b/;

function getWriteContent(event: ToolCallEvent): string | undefined {
	const content = event.input?.content;
	if (typeof content === "string") return content;
	const newText = event.input?.newText;
	if (typeof newText === "string") return newText;
	return undefined;
}

function getBashCommand(event: ToolCallEvent): string | undefined {
	const command = event.input?.command;
	return typeof command === "string" ? command : undefined;
}

function getPath(event: ToolCallEvent): string | undefined {
	const value = event.input?.path;
	return typeof value === "string" ? value : undefined;
}

function includesAny(command: string, patterns: RegExp[]): boolean {
	return patterns.some((pattern) => pattern.test(command));
}

function hasTrailingPaletteBlock(content: string): boolean {
	return /--\s*<PALETTE>[\s\S]*--\s*000:[0-9a-fA-F]{96}[\s\S]*--\s*<\/PALETTE>\s*$/.test(content);
}

function hasRuntimePaletteMutation(content: string): boolean {
	return /\bpoke4?\s*\(/.test(content);
}

function hasStructuralTic80Drift(content: string): boolean {
	return STRUCTURAL_API_PATTERNS.some((pattern) => pattern.test(content));
}

function hasCompetingFrameworkCallbacks(content: string): boolean {
	const hasTopLevelInit = /\bfunction\s+init\s*\(/i.test(content);
	const hasTopLevelUpdate = /\bfunction\s+update\s*\(/i.test(content);
	const hasTopLevelInput = /\bfunction\s+input\s*\(/i.test(content);
	const hasTopLevelDraw = /\bfunction\s+draw\s*\(/i.test(content);
	const hasGlobalTic = /\bfunction\s+TIC\s*\(/i.test(content);

	return (
		hasTopLevelInit ||
		hasTopLevelInput ||
		(!hasGlobalTic && (hasTopLevelUpdate || hasTopLevelDraw)) ||
		((hasTopLevelInit || hasTopLevelInput) && hasTopLevelDraw) ||
		/\bfunction\s+TIC\.(start|init|update|draw|frame)\s*\(/i.test(content)
	);
}

function hasWrongTic80Framework(content: string): boolean {
	return (
		hasStructuralTic80Drift(content) &&
		(hasCompetingFrameworkCallbacks(content) || !/\bfunction\s+TIC\s*\(/i.test(content))
	);
}

function hasMalformedTicCallbackSyntax(content: string): boolean {
	return (
		/\bTIC\s*\(\s*\)\s*\{/i.test(content) ||
		/\bfunction\s+TIC\s*\([^)]*\)\s*\{/i.test(content) ||
		/(^|\n)\s*TIC\s*\(\s*\)\s*\n/i.test(content)
	);
}

function hasMenuStateWithoutPlayTransition(content: string): boolean {
	const referencesMenuState =
		/\bstate\.menu\b/.test(content) || /\bgameState\s*==\s*["']START["']/.test(content);
	if (!referencesMenuState) return false;

	const hasMenuExit =
		/\bstate\.menu\s*=\s*false\b/.test(content) ||
		/\bgameState\s*=\s*["']PLAY["']/.test(content) ||
		/\bgameState\s*=\s*["']RUN["']/.test(content);

	return !hasMenuExit;
}

function isShellLuaRewrite(command: string): boolean {
	return (
		/(^|[;&|]\s*|&&\s*)(cat|tee)\b[\s\S]*>\s*[^ \n]+\.lua\b/i.test(command) ||
		/\b(cat|tee)\b[\s\S]*\.lua\b[\s\S]*<<[-'"]?\w+/i.test(command) ||
		/\bpython3?\b[\s\S]*\.lua\b/i.test(command) ||
		/\bnode\b[\s\S]*\.lua\b/i.test(command)
	);
}

function isReferenceDirectoryScan(command: string): boolean {
	return /\b(ls|find)\b[\s\S]*\breference\/?\b/i.test(command);
}

function isBroadMarkdownRepoScan(command: string): boolean {
	return /\bfind\b[\s\S]*\/workspace\/babysitter\b[\s\S]*-name\s+["']?\*\.md["']?/i.test(command);
}

function isWrongTic80ReferencePath(path?: string): boolean {
	if (!path) return false;
	return (
		/\/workspace\/babysitter\/reference\/.*tic80/i.test(path) &&
		!/\/workspace\/babysitter\/skills\/tic80ctl-usage\/reference\//.test(path)
	);
}

function extractLuaTarget(command: string): string | undefined {
	const match = command.match(/([A-Za-z0-9_./-]+\.lua)\b/);
	return match?.[1];
}

function isExactnessCommand(command: string): boolean {
	return /\b(wc\s+-c|grep|rg|sed|cat)\b/i.test(command);
}

function isPaletteExactnessLoop(commandHistory: string[], command: string, path?: string): boolean {
	if (!isExactnessCommand(command)) return false;
	const currentTarget = path ?? extractLuaTarget(command);
	const exactnessCommands = [...commandHistory, command].filter((entry) => isExactnessCommand(entry));
	if (exactnessCommands.length < 3) return false;

	if (currentTarget) {
		const sameTargetCount = exactnessCommands.filter((entry) => entry.includes(currentTarget)).length;
		if (sameTargetCount >= 2) return true;
	}

	return exactnessCommands.length >= 4;
}

function isTic80Load(command: string): boolean {
	return /\btic80ctl\s+load\b/.test(command);
}

function isTic80Run(command: string): boolean {
	return /\btic80ctl\s+run\b/.test(command);
}

function isTic80Playtest(command: string): boolean {
	return /\btic80ctl\s+playtest\b/.test(command);
}

function isTic80ScreenshotOrRestart(command: string): boolean {
	return /\btic80ctl\s+(screenshot|start|run)\b/.test(command);
}

function buildRuleContext(event: ToolCallEvent, review: ReviewEvent): RuleContext {
	const command = getBashCommand(event);
	const content = getWriteContent(event);
	const path = getPath(event);
	const normalizedCommand = command?.trim() ?? "";

	return {
		event,
		review,
		state: globalSessionState,
		command,
		content,
		path,
		normalizedCommand,
		commandHistory: [...globalSessionState.commandHistory],
		recentLuaWritePendingLoad:
			globalSessionState.recentLuaWriteSerial !== null &&
			(globalSessionState.lastLoadSerial === null ||
				globalSessionState.lastLoadSerial < globalSessionState.recentLuaWriteSerial),
		repeatedExactnessLoop: isPaletteExactnessLoop(
			globalSessionState.commandHistory,
			normalizedCommand,
			path,
		),
		priorStructuralNudge: globalSessionState.structuralNudgeActive,
		sawPlaytest: globalSessionState.sawPlaytest,
	};
}

function commitSessionState(ctx: RuleContext, suggestion: HeuristicSuggestion): void {
	const state = ctx.state;
	state.serial += 1;

	if (ctx.review.bucket === "on_lua_change") {
		state.recentLuaWriteSerial = state.serial;
		state.structuralNudgeActive = Boolean(ctx.content && hasStructuralTic80Drift(ctx.content));
	}

	if (ctx.command) {
		state.commandHistory.push(ctx.normalizedCommand);
		if (state.commandHistory.length > COMMAND_HISTORY_LIMIT) {
			state.commandHistory.splice(0, state.commandHistory.length - COMMAND_HISTORY_LIMIT);
		}
		if (isTic80Load(ctx.normalizedCommand)) {
			state.lastLoadSerial = state.serial;
		}
		if (isTic80Playtest(ctx.normalizedCommand)) {
			state.sawPlaytest = true;
		}
	}
}

const rules: HeuristicRule[] = [
	{
		id: "shell-lua-rewrite",
		applies: (ctx) => Boolean(ctx.command && isShellLuaRewrite(ctx.normalizedCommand)),
		suggest: () => ({
			decision: "nudge",
			reason: "Do not rewrite Lua files via shell redirection. Use the write or edit tool for code changes instead.",
		}),
	},
	{
		id: "reference-directory-scan",
		applies: (ctx) => Boolean(ctx.command && isReferenceDirectoryScan(ctx.normalizedCommand)),
		suggest: () => ({
			decision: "nudge",
			reason:
				"Do not scan the whole reference directory. Read the specific reference file named in the skill that matches the next step instead.",
		}),
	},
	{
		id: "broad-markdown-repo-scan",
		applies: (ctx) => Boolean(ctx.command && isBroadMarkdownRepoScan(ctx.normalizedCommand)),
		suggest: () => ({
			decision: "nudge",
			reason:
				"Do not scan repo markdown files broadly. The TIC-80 references for this skill are under skills/tic80ctl-usage/reference/. Read the specific file you need there instead.",
		}),
	},
	{
		id: "wrong-tic80-reference-path",
		applies: (ctx) => Boolean(isWrongTic80ReferencePath(ctx.path)),
		suggest: () => ({
			decision: "nudge",
			reason:
				"That TIC-80 reference path is wrong for this repo. Read the needed file from skills/tic80ctl-usage/reference/ instead.",
		}),
	},
	{
		id: "malformed-tic-callback",
		applies: (ctx) => Boolean(ctx.content && hasMalformedTicCallbackSyntax(ctx.content)),
		suggest: () => ({
			decision: "nudge",
			reason:
				"This cart is not valid TIC-80 Lua yet. Define the frame callback as exactly function TIC() ... end, not TIC() { ... }. Keep the cart in normal Lua syntax and use real TIC-80 APIs like cls, print, rect, circ, btn, and btnp.",
		}),
	},
	{
		id: "wrong-framework",
		applies: (ctx) => Boolean(ctx.content && hasWrongTic80Framework(ctx.content)),
		suggest: () => ({
			decision: "nudge",
			reason:
				"This cart is structurally wrong for TIC-80. Do not use init(), update(), draw(), or other framework callbacks here. Use exactly one function TIC() frame callback, and replace the wrong framework/API family with actual TIC-80 APIs like cls, print, rect, circ, btn, btnp, and key before trying again.",
		}),
	},
	{
		id: "repeat-structural-drift",
		applies: (ctx) =>
			Boolean(
				ctx.content &&
					ctx.priorStructuralNudge &&
					hasStructuralTic80Drift(ctx.content),
			),
		suggest: () => ({
			decision: "nudge",
			reason:
				"The rewrite is still using invalid TIC-80 APIs after the prior correction. Stop repeating this API family. Use one function TIC() loop with standard TIC-80 APIs like cls, print, rect, circ, btn, btnp, and key before continuing.",
		}),
	},
	{
		id: "structural-drift-with-tic",
		applies: (ctx) =>
			Boolean(
				ctx.content &&
					/\bfunction\s+TIC\s*\(/i.test(ctx.content) &&
					hasStructuralTic80Drift(ctx.content),
			),
		suggest: () => ({
			decision: "nudge",
			reason:
				"This cart still uses invalid TIC-80 helpers. Keep function TIC(), but do not use TIC.width/TIC.height/TIC.cameraX/TIC.cameraY/TIC.sfx members. Use numeric btn/btnp inputs with the real direction ids: btn(0)=up, btn(1)=down, btn(2)=left, btn(3)=right. Do not use strings, symbolic constants, or keyboard keycodes. Use print(...) for text instead of text()/set(), and keep a valid 96-hex trailing palette block.",
		}),
	},
	{
		id: "menu-state-without-play-transition",
		applies: (ctx) => Boolean(ctx.content && hasMenuStateWithoutPlayTransition(ctx.content)),
		suggest: () => ({
			decision: "nudge",
			reason:
				"This cart has a start/menu state but no real transition into gameplay. Keep the menu simple, but add one actual btn/btnp-driven path that leaves the start screen and enters the playable loop before worrying about footer polish.",
		}),
	},
	{
		id: "runtime-palette-mutation",
		applies: (ctx) => Boolean(ctx.content && hasRuntimePaletteMutation(ctx.content)),
		suggest: () => ({
			decision: "nudge",
			reason: "Do not mutate the palette at runtime for this cart. Keep a static trailing palette block in comments at the end of the file instead.",
		}),
	},
	{
		id: "missing-palette-block",
		applies: (ctx) =>
			Boolean(
				ctx.content &&
					!hasStructuralTic80Drift(ctx.content) &&
					!hasTrailingPaletteBlock(ctx.content),
			),
		suggest: () => ({
			decision: "nudge",
			reason:
				"Keep this as a script cart and include a valid trailing TIC-80 palette header in comments instead of runtime palette mutation.",
		}),
	},
	{
		id: "exactness-loop",
		applies: (ctx) => Boolean(ctx.command && ctx.repeatedExactnessLoop),
		suggest: () => ({
			decision: "nudge",
			reason:
				"The palette IS correct or close enough to stop counting. I will not approve more counting or grep commands. Move to the verification sequence now: tic80ctl load the cart and then tic80ctl run.",
		}),
	},
	{
		id: "run-before-load",
		applies: (ctx) =>
			Boolean(
				ctx.review.bucket === "on_tic_ctl_call" &&
					ctx.command &&
					isTic80Run(ctx.normalizedCommand) &&
					ctx.recentLuaWritePendingLoad,
			),
		suggest: () => ({
			decision: "nudge",
			reason: "Reload the cart before running it: tic80ctl load <cart>.lua, then tic80ctl run.",
		}),
	},
	{
		id: "playtest-missing-script",
		applies: (ctx) =>
			Boolean(
				ctx.review.bucket === "on_tic_ctl_call" &&
					ctx.command &&
					isTic80Playtest(ctx.normalizedCommand) &&
					!/\s--script-file\b/.test(ctx.normalizedCommand),
			),
		suggest: () => ({
			decision: "nudge",
			reason: "Use tic80ctl playtest with --script-file <episode.lua> so the harness runs a concrete scripted check.",
		}),
	},
	{
		id: "post-playtest-archaeology",
		applies: (ctx) =>
			Boolean(
				ctx.review.bucket === "on_tic_ctl_call" &&
					ctx.command &&
					ctx.sawPlaytest &&
					isTic80ScreenshotOrRestart(ctx.normalizedCommand),
			),
		suggest: () => ({
			decision: "nudge",
			reason: "A playtest already ran. Do not restart or screenshot unless there is a new bug to inspect.",
		}),
	},
	{
		id: "bounded-tic80",
		applies: (ctx) =>
			Boolean(
				ctx.review.bucket === "on_tic_ctl_call" &&
					ctx.command &&
					TIC80_BOUNDED_COMMAND.test(ctx.normalizedCommand),
			),
		suggest: () => ({
			decision: "approve",
			reason: "bounded TIC-80 workflow step",
		}),
	},
	{
		id: "bounded-inspection",
		applies: (ctx) =>
			Boolean(
				ctx.command && includesAny(ctx.normalizedCommand, BOUNDED_INSPECTION_COMMANDS),
			),
		suggest: () => ({
			decision: "approve",
			reason: "bounded inspection step",
		}),
	},
	{
		id: "archaeology",
		applies: (ctx) =>
			Boolean(ctx.command && includesAny(ctx.normalizedCommand, ARCHAEOLOGY_COMMANDS)),
		suggest: () => ({
			decision: "nudge",
			reason:
				"Do not broaden into environment debugging yet. Stay on the current task and test one direct hypothesis instead.",
		}),
	},
];

export function inferHeuristicSuggestion(event: ToolCallEvent, review: ReviewEvent): HeuristicSuggestion {
	const ctx = buildRuleContext(event, review);

	for (const rule of rules) {
		if (!rule.applies(ctx)) continue;
		const suggestion = rule.suggest(ctx);
		commitSessionState(ctx, suggestion);
		return suggestion;
	}

	const fallback = {
		decision: "approve" as const,
		reason: "no obvious risk signal",
	};
	commitSessionState(ctx, fallback);
	return fallback;
}
