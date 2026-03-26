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

function includesAny(command: string, patterns: RegExp[]): boolean {
	return patterns.some((pattern) => pattern.test(command));
}

function hasTrailingPaletteBlock(content: string): boolean {
	return /--\s*<PALETTE>[\s\S]*--\s*000:[0-9a-fA-F]{96}[\s\S]*--\s*<\/PALETTE>\s*$/.test(content);
}

function hasStructuralTic80Drift(content: string): boolean {
	return (
		/\bfunction\s+(update|draw|input)\s*\(/i.test(content) ||
		/\bTIC\.(width|height)\b/i.test(content) ||
		/\b(drawtext|is_key_pressed)\b/i.test(content)
	);
}

export function inferHeuristicSuggestion(event: ToolCallEvent, review: ReviewEvent): HeuristicSuggestion {
	const bashCommand = getBashCommand(event);
	const content = getWriteContent(event);
	const normalizedCommand = bashCommand?.trim() ?? "";

	if (review.bucket === "on_tic_ctl_call") {
		if (/\btic80ctl\s+(start|load|run|eval|playtest|screenshot|stop|status)\b/.test(normalizedCommand)) {
			return {
				decision: "approve",
				reason: "bounded TIC-80 workflow step",
			};
		}
		return {
			decision: "nudge",
			reason: "unusual tic80ctl action",
			nudge: "Stick to a bounded workflow: write or repair the cart, then load, run, and validate it with focused tic80ctl commands.",
		};
	}

	if (review.bucket === "on_lua_change") {
		if (typeof content === "string" && hasStructuralTic80Drift(content)) {
			if (!/\bfunction\s+TIC\s*\(/i.test(content)) {
				return {
					decision: "disapprove",
					reason: "structurally wrong TIC-80 cart shape",
				};
			}
			return {
				decision: "disapprove",
				reason: "TIC-80 cart uses wrong helper family or coordinates",
			};
		}
		if (typeof content === "string" && /\bpoke4?\s*\(/.test(content)) {
			return {
				decision: "disapprove",
				reason: "runtime palette mutation risk",
			};
		}
		if (typeof content === "string" && !hasTrailingPaletteBlock(content)) {
			return {
				decision: "nudge",
				reason: "cart is missing a trailing static palette block",
				nudge: "Keep this as a script cart and include a valid trailing TIC-80 palette header in comments instead of runtime palette mutation.",
			};
		}
		return {
			decision: "approve",
			reason: "lua change looks consistent with cart editing",
		};
	}

	if (bashCommand) {
		if (includesAny(normalizedCommand, [/\b(read|sed|cat|ls|find|rg)\b/])) {
			return {
				decision: "approve",
				reason: "bounded inspection step",
			};
		}
		if (includesAny(normalizedCommand, [/\b(ps|top|htop|which|whereis)\b/, /\b--help\b/])) {
			return {
				decision: "nudge",
				reason: "likely drift into environment archaeology",
				nudge: "Do not broaden into environment debugging yet. Stay on the current task and test one direct hypothesis instead.",
			};
		}
	}

	return {
		decision: "approve",
		reason: "no obvious risk signal",
	};
}
