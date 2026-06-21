import type { ExtensionAPI, ExtensionContext, ToolCallEvent } from "@mariozechner/pi-coding-agent";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

type ReviewDecision = "approve" | "disapprove" | "nudge";

type DecisionRecord = {
	timestamp: string;
	sessionFile?: string;
	cwd: string;
	toolName: string;
	decision: ReviewDecision;
	nudge?: string;
	summary: string;
};

type SessionCounters = {
	approve: number;
	disapprove: number;
	nudge: number;
};

const LOG_DIRNAME = ".local/host-approvals";
const STATUS_KEY = "live-host-approval";
const MAX_LINE_LENGTH = 140;
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
	};
	sessionCounters.set(key, created);
	return created;
}

function getBashCommand(event: ToolCallEvent): string | undefined {
	const command = event.input?.command;
	return typeof command === "string" ? command : undefined;
}

function getWritePath(event: ToolCallEvent): string | undefined {
	const value = event.input?.path;
	return typeof value === "string" ? value : undefined;
}

function buildReviewPrompt(event: ToolCallEvent): string {
	const command = getBashCommand(event);
	const filePath = getWritePath(event);
	const parts: string[] = [`tool=${event.toolName}`];
	if (filePath) parts.push(`path=${filePath}`);
	if (command) parts.push(`command=${truncate(command, 220)}`);
	return parts.join("\n");
}

function buildReviewSummary(event: ToolCallEvent): string {
	const command = getBashCommand(event);
	const filePath = getWritePath(event);
	if (command) return `${event.toolName} ${truncate(command, 120)}`;
	if (filePath) return `${event.toolName} ${filePath}`;
	return `${event.toolName}`;
}

async function appendDecisionLog(
	pi: ExtensionAPI,
	ctx: ExtensionContext,
	event: ToolCallEvent,
	decision: ReviewDecision,
	nudge?: string,
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
		decision,
		nudge,
		summary: buildReviewSummary(event),
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
		`a=${counts.approve} d=${counts.disapprove} n=${counts.nudge}`,
	);
}

function recordDecisionCount(ctx: ExtensionContext, decision: ReviewDecision): void {
	getCounters(ctx)[decision] += 1;
	setDecisionScoreStatus(ctx);
}

function sendNudge(pi: ExtensionAPI, nudge: string): void {
	pi.sendMessage(
		{
			customType: "host-approval-nudge",
			content: `Host nudge: ${nudge}`,
			display: `[host] nudge: ${nudge}`,
			details: { nudge },
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

		const prompt = buildReviewPrompt(event);
		const summary = buildReviewSummary(event);
		setStatus(ctx, "awaiting review");

		const decision = await ctx.ui.select(
			`Approve Action?\n\n${prompt}`,
			["Approve", "Disapprove", "Nudge"],
		);

		if (decision === "Approve") {
			recordDecisionCount(ctx, "approve");
			await appendDecisionLog(pi, ctx, event, "approve");
			setStatus(ctx, "approved");
			ctx.ui.notify(`[host] approved ${summary}`, "info");
			return;
		}

		if (decision === "Nudge") {
			const nudge = await ctx.ui.input("Host Nudge", "Tell the agent what to do instead");
			const trimmed = nudge?.trim();
			if (!trimmed) {
				recordDecisionCount(ctx, "disapprove");
				await appendDecisionLog(pi, ctx, event, "disapprove");
				setStatus(ctx, "disapproved");
				sendToolNotExecutedNote(pi, event, "rejected");
				return {
					block: true,
					reason: "Host disapproved without a nudge.",
				};
			}
			sendNudge(pi, trimmed);
			sendToolNotExecutedNote(pi, event, "nudged");
			recordDecisionCount(ctx, "nudge");
			await appendDecisionLog(pi, ctx, event, "nudge", trimmed);
			setStatus(ctx, "nudged");
			ctx.ui.notify(`[host] nudged ${summary}`, "warning");
			return {
				block: true,
				reason: `Host nudged: ${trimmed}`,
			};
		}

		recordDecisionCount(ctx, "disapprove");
		await appendDecisionLog(pi, ctx, event, "disapprove");
		setStatus(ctx, "disapproved");
		ctx.ui.notify(`[host] disapproved ${summary}`, "error");
		sendToolNotExecutedNote(pi, event, "rejected");
		return {
			block: true,
			reason: "Host disapproved.",
		};
	});
}
