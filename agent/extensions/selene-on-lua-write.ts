import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { copyFile, lstat, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

type NotifyLevel = "info" | "warning" | "error";
type LuaSnapshot = Map<string, string>;
type LuaChange = { path: string; absolutePath: string; kind: "created" | "modified" | "deleted" };

type LintSummary = {
  content: { type: "text"; text: string }[];
  details: Record<string, unknown>;
  isError?: boolean;
  notifyMessage: string;
  notifyLevel: NotifyLevel;
};

const MAX_OUTPUT_CHARS = 12000;
const MAX_NOTIFICATION_LINES = 6;
const MAX_BASH_LINT_FILES = 20;
const SNAPSHOT_IGNORED_DIRS = new Set([".git", "node_modules", ".pi", ".local", "playtest"]);
const bashSnapshots = new Map<string, LuaSnapshot>();
const EXTENSION_DIR = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_TEMPLATE_DIR = path.resolve(EXTENSION_DIR, "..", "workspace");
const STAGED_LINT_FILES = ["selene.toml", "tic80.yml"] as const;

function isLuaPath(filePath: unknown): filePath is string {
  return typeof filePath === "string" && filePath.endsWith(".lua");
}

function truncate(text: string, max = MAX_OUTPUT_CHARS): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n\n[selene output truncated to ${max} chars]`;
}

function summarizeForNotification(title: string, output: string): string {
  const lines = output
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0)
    .slice(0, MAX_NOTIFICATION_LINES);

  if (lines.length === 0) return title;
  return `${title}\n${lines.join("\n")}`;
}

function normalizeRelative(cwd: string, filePath: string): string {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath);
  return path.relative(cwd, absolutePath) || path.basename(absolutePath);
}

async function collectLuaSnapshot(root: string): Promise<LuaSnapshot> {
  const snapshot = new Map<string, string>();

  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name === "." || entry.name === "..") continue;
      if (entry.isDirectory() && SNAPSHOT_IGNORED_DIRS.has(entry.name)) continue;

      const absolutePath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }

      if (!entry.isFile() || !entry.name.endsWith(".lua")) continue;

      try {
        const stat = await lstat(absolutePath);
        snapshot.set(absolutePath, `${stat.size}:${stat.mtimeMs}`);
      } catch {
        // Ignore racing file changes.
      }
    }
  }

  await walk(root);
  return snapshot;
}

function diffLuaSnapshots(before: LuaSnapshot, after: LuaSnapshot, cwd: string): LuaChange[] {
  const changes: LuaChange[] = [];
  const allPaths = new Set([...before.keys(), ...after.keys()]);

  for (const absolutePath of allPaths) {
    const oldSig = before.get(absolutePath);
    const newSig = after.get(absolutePath);
    if (oldSig === newSig) continue;

    let kind: LuaChange["kind"];
    if (oldSig == null) kind = "created";
    else if (newSig == null) kind = "deleted";
    else kind = "modified";

    changes.push({
      path: normalizeRelative(cwd, absolutePath),
      absolutePath,
      kind,
    });
  }

  return changes.sort((a, b) => a.path.localeCompare(b.path));
}

async function buildSeleneSummary(
  pi: ExtensionAPI,
  cwd: string,
  filePaths: string[],
  reason: string,
): Promise<LintSummary> {
  const checkSelene = await pi.exec("bash", ["-lc", "command -v selene >/dev/null 2>&1"]);
  if (checkSelene.code !== 0) {
    const filesText = filePaths.join(", ");
    return {
      content: [
        {
          type: "text",
          text: `\n\n[selene] Skipped lint for ${filesText}: selene is not installed or not on PATH.`,
        },
      ],
      details: {
        selene: {
          skipped: true,
          reason: "selene not installed",
          files: filePaths,
          trigger: reason,
        },
      },
      notifyMessage: `[selene] skipped ${filesText} (selene not installed)`,
      notifyLevel: "warning",
    };
  }

  const quotedPaths = filePaths.map((filePath) => JSON.stringify(filePath)).join(" ");
  const staged = await stageLintConfigFiles(cwd);
  let lint;
  try {
    lint = await pi.exec("bash", ["-lc", `cd ${JSON.stringify(cwd)} && selene ${quotedPaths}`]);
  } finally {
    await cleanupStagedLintConfigFiles(staged);
  }

  const stdout = lint.stdout?.trim() ?? "";
  const stderr = lint.stderr?.trim() ?? "";
  const rawOutput = [stdout, stderr].filter(Boolean).join("\n");
  const output = truncate(rawOutput || "(selene exited non-zero with no output)");
  const filesText = filePaths.join(", ");

  if (lint.code === 0) {
    return {
      content: [
        {
          type: "text",
          text: `\n\n[selene] No lint issues in ${filesText}.`,
        },
      ],
      details: {
        selene: {
          files: filePaths,
          exitCode: 0,
          ok: true,
          trigger: reason,
        },
      },
      notifyMessage: `[selene] clean: ${filesText}`,
      notifyLevel: "info",
    };
  }

  return {
    content: [
      {
        type: "text",
        text: `\n\n[selene] Lint issues in ${filesText}:\n${output}`,
      },
    ],
    details: {
      selene: {
        files: filePaths,
        exitCode: lint.code,
        ok: false,
        stdout,
        stderr,
        trigger: reason,
      },
    },
    isError: true,
    notifyMessage: summarizeForNotification(`[selene] ${filesText}`, output),
    notifyLevel: "error",
  };
}

type StagedLintFile = {
  destination: string;
  created: boolean;
};

async function stageLintConfigFiles(cwd: string): Promise<StagedLintFile[]> {
  const staged: StagedLintFile[] = [];
  for (const fileName of STAGED_LINT_FILES) {
    const source = path.join(WORKSPACE_TEMPLATE_DIR, fileName);
    const destination = path.join(cwd, fileName);
    let created = false;
    try {
      await lstat(destination);
    } catch {
      await copyFile(source, destination);
      created = true;
    }
    staged.push({ destination, created });
  }
  return staged;
}

async function cleanupStagedLintConfigFiles(staged: StagedLintFile[]): Promise<void> {
  await Promise.all(
    staged
      .filter((entry) => entry.created)
      .map(async (entry) => {
        await rm(entry.destination, { force: true });
      }),
  );
}

function mergeDetails(event: any, extra: Record<string, unknown>) {
  return {
    ...(event.details ?? {}),
    ...extra,
  };
}

export default function (pi: ExtensionAPI) {
  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName !== "bash") return;
    bashSnapshots.set(event.toolCallId, await collectLuaSnapshot(ctx.cwd));
  });

  pi.on("tool_result", async (event, ctx) => {
    const notify = (message: string, level: NotifyLevel) => {
      if (ctx.hasUI) ctx.ui.notify(message, level);
    };

    if (event.toolName === "bash") {
      const before = bashSnapshots.get(event.toolCallId);
      bashSnapshots.delete(event.toolCallId);
      if (!before) return;

      const after = await collectLuaSnapshot(ctx.cwd);
      const changed = diffLuaSnapshots(before, after, ctx.cwd);
      const existingLuaFiles = changed
        .filter((change) => change.kind !== "deleted")
        .map((change) => change.path)
        .slice(0, MAX_BASH_LINT_FILES);

      if (existingLuaFiles.length === 0) return;

      const omitted = changed.filter((change) => change.kind !== "deleted").length - existingLuaFiles.length;
      const summary = await buildSeleneSummary(pi, ctx.cwd, existingLuaFiles, "bash filesystem diff");
      notify(summary.notifyMessage, summary.notifyLevel);

      const changedSummary = changed
        .map((change) => `${change.kind}: ${change.path}`)
        .join("\n");
      const omittedText = omitted > 0 ? `\n[selene] Omitted ${omitted} additional changed Lua files.` : "";

      return {
        content: [
          ...event.content,
          {
            type: "text",
            text: `\n\n[selene] Bash changed Lua files:\n${changedSummary}${omittedText}`,
          },
          ...summary.content,
        ],
        isError: summary.isError ?? event.isError,
        details: mergeDetails(event, {
          bashLuaChanges: changed,
          ...summary.details,
        }),
      };
    }

    if (event.isError) return;
    if (event.toolName !== "write" && event.toolName !== "edit") return;

    const filePath = event.input?.path;
    if (!isLuaPath(filePath)) return;

    const relativePath = normalizeRelative(ctx.cwd, filePath);
    const summary = await buildSeleneSummary(pi, ctx.cwd, [relativePath], event.toolName);
    notify(summary.notifyMessage, summary.notifyLevel);

    return {
      content: [...event.content, ...summary.content],
      isError: summary.isError ?? event.isError,
      details: mergeDetails(event, summary.details),
    };
  });
}
