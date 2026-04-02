import type { ToolCallEvent } from "@mariozechner/pi-coding-agent";

export type ReviewBucket = "on_lua_change" | "on_tic_ctl_call" | "on_anything_else";

export type ReviewEvent = {
	bucket: ReviewBucket;
	title: string;
	summary: string;
	details: string[];
};

export type AppliedDecision = "approve" | "disapprove" | "nudge";

export type HeuristicSuggestion = {
	decision: AppliedDecision;
	reason: string;
	nudge?: string;
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
	/\binput\.p1\b/i,
	/\binput\.(pressed|a|b|left|right|up|down)\b/i,
	/\btic\.(mode|frame)\b/i,
	/\bTIC\.(w|h|width|height|font)\b/i,
	/\b(TIC_RUN|TIC_STOP)\b/i,
	/\b(tinit|tupdate|tdraw)\b/i,
	/\b(kdbp|kdb|kbds)\b/i,
	/\b(btnp\s*\(\s*(1[6-9]|[2-9]\d)\s*\))\b/i,
	/\bbtn\s*\(\s*\)\s*==\s*3\b/i,
	/\bbtn\s*\([^)]*\)\s*==\s*3\b/i,
	/\bprint\s*\(\s*\d+\s*,/i,
	/\b(tile|tileb|keydown|drawtext|text)\s*\(/i,
	/\bfor\s+\w+\s*=\s*\d+\s+to\s+\d+/i,
	/\b\/\/\b/,
	/\brand\s*\(/i,
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

function hasWrongTic80Framework(content: string): boolean {
	return hasStructuralTic80Drift(content) && !/\bfunction\s+TIC\s*\(/i.test(content);
}

function isShellLuaRewrite(command: string): boolean {
	return (
		/(^|[;&|]\s*|&&\s*)(cat|tee)\b[\s\S]*>\s*[^ \n]+\.lua\b/i.test(command) ||
		/\b(cat|tee)\b[\s\S]*\.lua\b[\s\S]*<<[-'"]?\w+/i.test(command) ||
		/\bpython3?\b[\s\S]*\.lua\b/i.test(command) ||
		/\bnode\b[\s\S]*\.lua\b/i.test(command)
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
			decision: "disapprove",
			reason: "shell-based lua rewrite bypasses the edit workflow",
		}),
	},
	{
		id: "wrong-framework",
		applies: (ctx) => Boolean(ctx.content && hasWrongTic80Framework(ctx.content)),
		suggest: () => ({
			decision: "disapprove",
			reason: "structurally wrong TIC-80 cart shape",
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
			decision: "disapprove",
			reason: "repeated structurally wrong TIC-80 rewrite after prior correction",
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
			decision: "disapprove",
			reason: "TIC-80 cart uses wrong helper family or coordinates",
		}),
	},
	{
		id: "runtime-palette-mutation",
		applies: (ctx) => Boolean(ctx.content && hasRuntimePaletteMutation(ctx.content)),
		suggest: () => ({
			decision: "disapprove",
			reason: "runtime palette mutation risk",
		}),
	},
	{
		id: "missing-palette-block",
		applies: (ctx) => Boolean(ctx.content && !hasTrailingPaletteBlock(ctx.content)),
		suggest: () => ({
			decision: "nudge",
			reason: "structural nudge: cart is missing a trailing static palette block",
			nudge:
				"Keep this as a script cart and include a valid trailing TIC-80 palette header in comments instead of runtime palette mutation.",
		}),
	},
	{
		id: "exactness-loop",
		applies: (ctx) => Boolean(ctx.command && ctx.repeatedExactnessLoop),
		suggest: () => ({
			decision: "nudge",
			reason: "agent is stuck in a palette exactness loop",
			nudge:
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
			reason: "tic80ctl run should follow a fresh load after the latest lua write",
			nudge: "Reload the cart before running it: tic80ctl load <cart>.lua, then tic80ctl run.",
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
			reason: "tic80ctl playtest is missing --script-file",
			nudge: "Use tic80ctl playtest with --script-file <episode.lua> so the harness runs a concrete scripted check.",
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
			reason: "likely post-verification archaeology after playtest",
			nudge: "A playtest already ran. Do not restart or screenshot unless there is a new bug to inspect.",
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
			reason: "likely drift into environment archaeology",
			nudge:
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
