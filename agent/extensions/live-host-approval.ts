import type { ExtensionAPI, ExtensionContext, ToolCallEvent } from "@mariozechner/pi-coding-agent";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import {
	inferHeuristicSuggestion,
	type AppliedDecision,
	type ReviewBucket,
	type ReviewEvent,
} from "./tic80-heuristic-suggestor";

type ReviewDecision = "approve" | "disapprove" | "nudge" | "heuristic_suggestion";

type DecisionRecord = {
	timestamp: string;
	sessionFile?: string;
	cwd: string;
	toolName: string;
	bucket: ReviewBucket;
	decision: ReviewDecision;
	appliedDecision: AppliedDecision;
	nudge?: string;
	summary: string;
	reason?: string;
};

type SessionCounters = {
	approve: number;
	disapprove: number;
	nudge: number;
	heuristic_suggestion: number;
};

const LOG_DIRNAME = ".local/host-approvals";
const STATUS_KEY = "live-host-approval";
const MAX_LINE_LENGTH = 140;
const MAX_CONTENT_PREVIEW = 180;
const sessionCounters = new Map<string, SessionCounters>();

function truncate(text: string, max = MAX_LINE_LENGTH): string {
	const normalized = text.replace(/\s+/g, " ").trim();
	if (normalized.length <= max) return normalized;
	return `${normalized.slice(0, max - 3)}...`;
}

function getSessionFile(ctx: ExtensionContext): string | undefined {
	return ctx.sessionManager.getSessionFile?.();
}

function getSessionKey(ctx: ExtensionContext): string {
	return getSessionFile(ctx) ?? ctx.cwd;
}

function getCounters(ctx: ExtensionContext): SessionCounters {
	const key = getSessionKey(ctx);
	const existing = sessionCounters.get(key);
	if (existing) return existing;
	const created: SessionCounters = {
		approve: 0,
		disapprove: 0,
		nudge: 0,
		heuristic_suggestion: 0,
	};
	sessionCounters.set(key, created);
	return created;
}

function getWritePath(event: ToolCallEvent): string | undefined {
	const value = event.input?.path;
	return typeof value === "string" ? value : undefined;
}

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

function isLuaPath(filePath: string | undefined): boolean {
	return typeof filePath === "string" && filePath.endsWith(".lua");
}

function bashTouchesLua(command: string): boolean {
	return (
		/\.lua\b/i.test(command) ||
		/\b(rm|mv|cp|touch|tee|cat|sed|perl|python|python3|node)\b[\s\S]*\.lua\b/i.test(command) ||
		/>[\s\S]*\.lua\b/i.test(command)
	);
}

function bashIncludesTicCtl(command: string): boolean {
	return /(^|[;&|]\s*|&&\s*)tic80ctl\b/.test(command);
}

function buildLuaChangeReview(event: ToolCallEvent): ReviewEvent {
	const filePath = getWritePath(event);
	const content = getWriteContent(event);
	const bashCommand = getBashCommand(event);

	const details: string[] = [`tool=${event.toolName}`];
	if (filePath) details.push(`path=${filePath}`);
	if (typeof bashCommand === "string") details.push(`command=${truncate(bashCommand, 220)}`);
	if (typeof content === "string") details.push(`preview=${truncate(content, MAX_CONTENT_PREVIEW)}`);

	return {
		bucket: "on_lua_change",
		title: "Approve Lua Change?",
		summary: filePath
			? `${event.toolName} ${filePath}`
			: `${event.toolName} bash-side Lua mutation`,
		details,
	};
}

function buildTicCtlReview(event: ToolCallEvent, command: string): ReviewEvent {
	return {
		bucket: "on_tic_ctl_call",
		title: "Approve tic80ctl Call?",
		summary: truncate(command, 220),
		details: [`tool=${event.toolName}`, `command=${truncate(command, 260)}`],
	};
}

function buildFallbackReview(event: ToolCallEvent): ReviewEvent {
	const command = getBashCommand(event);
	const filePath = getWritePath(event);
	const details = [`tool=${event.toolName}`];
	if (filePath) details.push(`path=${filePath}`);
	if (command) details.push(`command=${truncate(command, 220)}`);

	return {
		bucket: "on_anything_else",
		title: "Approve Other Action?",
		summary: command ? `${event.toolName} ${truncate(command, 120)}` : `${event.toolName}`,
		details,
	};
}

function classifyReview(event: ToolCallEvent): ReviewEvent {
	const bashCommand = getBashCommand(event);
	if (typeof bashCommand === "string") {
		if (bashIncludesTicCtl(bashCommand)) {
			return buildTicCtlReview(event, bashCommand);
		}
		if (bashTouchesLua(bashCommand)) {
			return buildLuaChangeReview(event);
		}
	}

	if ((event.toolName === "write" || event.toolName === "edit" || event.toolName === "delete") && isLuaPath(getWritePath(event))) {
		return buildLuaChangeReview(event);
	}

	return buildFallbackReview(event);
}

function buildPrompt(review: ReviewEvent): string {
	return [review.summary, ...review.details].join("\n");
}

async function appendDecisionLog(
	pi: ExtensionAPI,
	ctx: ExtensionContext,
	event: ToolCallEvent,
	review: ReviewEvent,
	decision: ReviewDecision,
	appliedDecision: AppliedDecision,
	nudge?: string,
	reason?: string,
) {
	const logDir = path.join(ctx.cwd, LOG_DIRNAME);
	await mkdir(logDir, { recursive: true });
	const sessionFile = getSessionFile(ctx);
	const logPath = path.join(logDir, "decisions.jsonl");
	const record: DecisionRecord = {
		timestamp: new Date().toISOString(),
		sessionFile,
		cwd: ctx.cwd,
		toolName: event.toolName,
		bucket: review.bucket,
		decision,
		appliedDecision,
		nudge,
		summary: review.summary,
		reason,
	};
	await appendFile(logPath, `${JSON.stringify(record)}\n`, "utf8");
	pi.appendEntry("host-approval-decision", record);
}

function setStatus(ctx: ExtensionContext, text: string): void {
	ctx.ui.setStatus(STATUS_KEY, text);
}

function setDecisionScoreStatus(ctx: ExtensionContext): void {
	const counts = getCounters(ctx);
	ctx.ui.setStatus(
		`${STATUS_KEY}-score`,
		`h=${counts.heuristic_suggestion} a=${counts.approve} d=${counts.disapprove} n=${counts.nudge}`,
	);
}

function recordDecisionCount(ctx: ExtensionContext, decision: ReviewDecision): void {
	getCounters(ctx)[decision] += 1;
	setDecisionScoreStatus(ctx);
}

function sendNudge(pi: ExtensionAPI, review: ReviewEvent, nudge: string): void {
	pi.sendMessage(
		{
			customType: "host-approval-nudge",
			content: `Host nudge for ${review.bucket}: ${nudge}`,
			display: `[host] ${review.bucket}: ${nudge}`,
			details: { bucket: review.bucket, nudge },
		},
		{ deliverAs: "steer" },
	);
}

function sendToolNotExecutedNote(
	pi: ExtensionAPI,
	event: ToolCallEvent,
	outcome: "rejected" | "nudged",
): void {
	pi.sendMessage(
		{
			customType: "host-approval-tool-not-executed",
			content: `Tool call was ${outcome}; therefore the ${event.toolName} tool was not executed.`,
			display: `[host] tool not executed: ${event.toolName} (${outcome})`,
			details: { toolName: event.toolName, outcome },
		},
		{ deliverAs: "steer" },
	);
}

export default function (pi: ExtensionAPI) {
	pi.on("session_start", async (_event, ctx) => {
		setStatus(ctx, "approval gate armed");
		setDecisionScoreStatus(ctx);
	});

	pi.on("turn_start", async (_event, ctx) => {
		setStatus(ctx, "approval gate armed");
		setDecisionScoreStatus(ctx);
	});

	pi.on("tool_call", async (event, ctx) => {
		if (!ctx.hasUI) {
			return {
				block: true,
				reason: "Live host approval requires an interactive or RPC UI context.",
			};
		}

		const review = classifyReview(event);
		const heuristic = inferHeuristicSuggestion(event, review);
		const prompt = buildPrompt(review);
		setStatus(ctx, `awaiting ${review.bucket}`);

		const decision = await ctx.ui.select(`${review.title}\n\n${prompt}`, [
			"Approve",
			"Disapprove",
			"Nudge",
			`Heuristic Suggestion (${heuristic.decision})`,
		]);

		if (decision === "Approve") {
			recordDecisionCount(ctx, "approve");
			await appendDecisionLog(pi, ctx, event, review, "approve", "approve");
			setStatus(ctx, `approved ${review.bucket}`);
			ctx.ui.notify(`[host] approved ${review.summary}`, "info");
			return;
		}

		if (decision === "Nudge") {
			const nudge = await ctx.ui.input("Host Nudge", "Tell the agent what to do instead");
			const trimmed = nudge?.trim();
			if (!trimmed) {
				recordDecisionCount(ctx, "disapprove");
				await appendDecisionLog(pi, ctx, event, review, "disapprove", "disapprove");
				setStatus(ctx, `disapproved ${review.bucket}`);
				sendToolNotExecutedNote(pi, event, "rejected");
				return {
					block: true,
					reason: `Host disapproved ${review.bucket} without a nudge.`,
				};
			}
			sendNudge(pi, review, trimmed);
			sendToolNotExecutedNote(pi, event, "nudged");
			recordDecisionCount(ctx, "nudge");
			await appendDecisionLog(pi, ctx, event, review, "nudge", "nudge", trimmed);
			setStatus(ctx, `nudged ${review.bucket}`);
			ctx.ui.notify(`[host] nudged ${review.summary}`, "warning");
			return {
				block: true,
				reason: `Host nudged ${review.bucket}: ${trimmed}`,
			};
		}

		if (decision.startsWith("Heuristic Suggestion")) {
			recordDecisionCount(ctx, "heuristic_suggestion");
			await appendDecisionLog(
				pi,
				ctx,
				event,
				review,
				"heuristic_suggestion",
				heuristic.decision,
				heuristic.nudge,
				heuristic.reason,
			);
			setStatus(ctx, `heuristic ${heuristic.decision} ${review.bucket}`);
			ctx.ui.notify(
				`[host] heuristic ${heuristic.decision} (${heuristic.reason}) for ${review.summary}`,
				heuristic.decision === "approve" ? "info" : "warning",
			);
			if (heuristic.decision === "approve") {
				return;
			}
			if (heuristic.decision === "nudge" && heuristic.nudge) {
				sendNudge(pi, review, heuristic.nudge);
				sendToolNotExecutedNote(pi, event, "nudged");
				return {
					block: true,
					reason: `Heuristic nudge for ${review.bucket}: ${heuristic.nudge}`,
				};
			}
			sendToolNotExecutedNote(pi, event, "rejected");
			return {
				block: true,
				reason: `Heuristic disapproved ${review.bucket}: ${heuristic.reason}`,
			};
		}

		recordDecisionCount(ctx, "disapprove");
		await appendDecisionLog(pi, ctx, event, review, "disapprove", "disapprove");
		setStatus(ctx, `disapproved ${review.bucket}`);
		ctx.ui.notify(`[host] disapproved ${review.summary}`, "error");
		sendToolNotExecutedNote(pi, event, "rejected");
		return {
			block: true,
			reason: `Host disapproved ${review.bucket}.`,
		};
	});
}
