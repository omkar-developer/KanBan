/**
 * TaskFlow MCP Server
 *
 * Exposes TaskFlow (KanBan) boards, notes and tasks to any AI app that speaks
 * MCP — stdio clients (Claude Desktop, Cursor, Cline, opencode, …) and
 * Streamable HTTP clients (llama.cpp's web UI, open-webui, …).
 *
 * It talks to the app's LOCAL HTTP API (started by the TaskFlow desktop app on
 * 127.0.0.1). Connection details are discovered in ai-api.json, written by the
 * app into its config dir on every launch.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import express from "express";
import cors from "cors";

// ── Discovery ─────────────────────────────────────────────────────────────────

function appConfigDirs(): string[] {
  const dirs: string[] = [];
  const env = process.env.TASKFLOW_API_FILE;
  if (env) dirs.push(path.dirname(env));

  const identifier = process.env.TASKFLOW_IDENTIFIER ?? "com.taskflow.dev";

  if (process.platform === "win32") {
    const appdata = process.env.APPDATA;
    if (appdata) dirs.push(path.join(appdata, identifier));
  } else if (process.platform === "darwin") {
    dirs.push(path.join(os.homedir(), "Library", "Application Support", identifier));
  } else {
    const xdg = process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config");
    dirs.push(path.join(xdg, identifier));
  }
  return dirs;
}

function loadApiInfo(): { port: number; token: string } {
  const candidates = appConfigDirs().map((d) => path.join(d, "ai-api.json"));
  if (process.env.TASKFLOW_API_FILE) candidates.unshift(process.env.TASKFLOW_API_FILE);

  for (const file of candidates) {
    try {
      if (!fs.existsSync(file)) continue;
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      if (typeof data.port === "number" && typeof data.token === "string") {
        return { port: data.port, token: data.token };
      }
    } catch {
      // try next candidate
    }
  }
  throw new Error(
    "TaskFlow is not running or ai-api.json was not found. Open the TaskFlow desktop app, then retry."
  );
}

let api = { port: 0, token: "" };
let lastLoaded = 0;

function getApi() {
  // Re-discover every few seconds so a freshly launched app is picked up.
  const now = Date.now();
  if (!api.port || now - lastLoaded > 5000) {
    api = loadApiInfo();
    lastLoaded = now;
  }
  return api;
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function call(pathname: string, init?: RequestInit): Promise<unknown> {
  const { port, token } = getApi();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  // Only send the bearer token when the API actually has one set.
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`http://127.0.0.1:${port}${pathname}`, {
    ...init,
    headers,
  });

  if (res.status === 401) {
    throw new Error("Unauthorized: the API token changed. Restart TaskFlow.");
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = await res.text();
  }

  if (!res.ok) {
    const msg =
      typeof body === "object" && body && "error" in (body as Record<string, unknown>)
        ? String((body as Record<string, unknown>).error)
        : res.statusText;
    throw new Error(`API error ${res.status}: ${msg}`);
  }

  return body;
}

function text(content: unknown): { content: { type: "text"; text: string }[] } {
  return { content: [{ type: "text", text: JSON.stringify(content, null, 2) }] };
}

// ── Server factory ────────────────────────────────────────────────────────────

function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "taskflow",
    version: "0.1.0",
  });

  // ── Read tools ────────────────────────────────────────────────────────────────

  server.tool(
    "list_boards",
    "List all TaskFlow boards with their type (kanban/notes), category, icon and color.",
    {},
    async () => text(await call("/api/boards"))
  );

  server.tool(
    "get_board",
    "Get a single board with all its columns and tasks (including notes).",
    { boardId: z.string().describe("The board id") },
    async ({ boardId }) => text(await call(`/api/boards/${encodeURIComponent(boardId)}`))
  );

  server.tool(
    "list_notes",
    "List all notes across all boards, each with its board name, category/column, tags and content preview.",
    {},
    async () => text(await call("/api/notes"))
  );

  server.tool(
    "get_note",
    "Get a single note with its full markdown content.",
    { noteId: z.string().describe("The note id") },
    async ({ noteId }) => text(await call(`/api/notes/${encodeURIComponent(noteId)}`))
  );

  server.tool(
    "search",
    "Search boards, tasks and notes by text across the whole app.",
    { query: z.string().describe("Search text") },
    async ({ query }) => text(await call(`/api/search?q=${encodeURIComponent(query)}`))
  );

  // ── Write tools ───────────────────────────────────────────────────────────────

  server.tool(
    "create_board",
    "Create a new board, optionally with starter columns.",
    {
      name: z.string().describe("Board name"),
      type: z.enum(["kanban", "notes"]).optional().describe("Board type (default kanban)"),
      category: z.string().optional(),
      icon: z.string().optional(),
      color: z.string().optional(),
      columns: z.array(z.string()).optional().describe("Optional starter column names"),
    },
    async ({ name, type, category, icon, color, columns }) =>
      text(
        await call("/api/boards", {
          method: "POST",
          body: JSON.stringify({ name, type, category, icon, color, columns }),
        })
      )
  );

  server.tool(
    "create_column",
    "Create a new column inside a board.",
    {
      boardId: z.string(),
      name: z.string().describe("Column name"),
    },
    async ({ boardId, name }) =>
      text(await call(`/api/boards/${encodeURIComponent(boardId)}/columns`, {
        method: "POST",
        body: JSON.stringify({ name }),
      }))
  );

  server.tool(
    "delete_column",
    "Delete a column and all its tasks/notes.",
    { columnId: z.string() },
    async ({ columnId }) =>
      text(await call(`/api/columns/${encodeURIComponent(columnId)}`, { method: "DELETE" }))
  );

  server.tool(
    "delete_board",
    "Delete a board and everything in it (columns, tasks, notes).",
    { boardId: z.string() },
    async ({ boardId }) =>
      text(await call(`/api/boards/${encodeURIComponent(boardId)}`, { method: "DELETE" }))
  );

  server.tool(
    "create_task",
    "Create a task inside a column.",
    {
      columnId: z.string(),
      title: z.string(),
      description: z.string().optional(),
      priority: z.enum(["low", "medium", "high", "critical"]).optional(),
      tags: z.array(z.string()).optional(),
      dueDate: z.number().optional().describe("Unix ms timestamp"),
    },
    async ({ columnId, title, description, priority, tags, dueDate }) =>
      text(await call(`/api/columns/${encodeURIComponent(columnId)}/tasks`, {
        method: "POST",
        body: JSON.stringify({ title, description, priority, tags, dueDate }),
      }))
  );

  server.tool(
    "update_task",
    "Update a task or note (title, description/content, priority, category, tags, move column).",
    {
      taskId: z.string(),
      title: z.string().optional(),
      description: z.string().nullable().optional(),
      priority: z.enum(["low", "medium", "high", "critical"]).nullable().optional(),
      category: z.string().nullable().optional(),
      tags: z.array(z.string()).nullable().optional(),
      columnId: z.string().optional().describe("Move the task to this column"),
    },
    async ({ taskId, title, description, priority, category, tags, columnId }) =>
      text(await call(`/api/tasks/${encodeURIComponent(taskId)}`, {
        method: "PATCH",
        body: JSON.stringify({ title, description, priority, category, tags, columnId }),
      }))
  );

  server.tool(
    "delete_task",
    "Delete a task or note.",
    { taskId: z.string() },
    async ({ taskId }) =>
      text(await call(`/api/tasks/${encodeURIComponent(taskId)}`, { method: "DELETE" }))
  );

  server.tool(
    "create_note",
    "Create a markdown note in a board. If no boardId is given, uses the most recently used board.",
    {
      title: z.string(),
      content: z.string().optional().describe("Markdown body"),
      category: z.string().optional().describe("Category/column, e.g. 'Work' or 'General'"),
      boardId: z.string().optional(),
    },
    async ({ title, content, category, boardId }) =>
      text(await call("/api/notes", {
        method: "POST",
        body: JSON.stringify({ title, content, category, boardId }),
      }))
  );

  server.tool(
    "delete_note",
    "Delete a note by id.",
    { noteId: z.string() },
    async ({ noteId }) =>
      text(await call(`/api/tasks/${encodeURIComponent(noteId)}`, { method: "DELETE" }))
  );

  return server;
}

// ── HTTP (Streamable) server ──────────────────────────────────────────────────

function startHttpServer() {
  const port = Number(process.env.TASKFLOW_MCP_PORT) || 3900;
  const app = express();
  app.use(cors());
  app.use(express.json());

  // One McpServer + transport per active session (MCP allows one transport per
  // connected protocol instance).
  const sessions = new Map<string, { server: McpServer; transport: StreamableHTTPServerTransport }>();

  const endpoint = async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const sessionId =
      typeof req.headers["mcp-session-id"] === "string" ? req.headers["mcp-session-id"] : undefined;
    const session = sessionId ? sessions.get(sessionId) : undefined;

    if (req.method === "DELETE") {
      if (session) {
        sessions.delete(sessionId!);
        await session.transport.close();
        await session.server.close();
      }
      res.status(200).end();
      return;
    }

    let transport = session?.transport;
    let server = session?.server;

    // No session yet → create one (initialize POST will carry the session id back).
    const isNew = !transport;
    if (!transport) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
      });
      server = createMcpServer();
      await server.connect(transport);
    }

    await transport.handleRequest(req, res, req.body).catch(next);

    // Register after the request so the transport's session id is populated.
    if (isNew && transport.sessionId && server) {
      const sid = transport.sessionId;
      transport.onclose = () => sessions.delete(sid);
      sessions.set(sid, { server, transport });
    }
  };

  app.get("/mcp", endpoint);
  app.post("/mcp", endpoint);
  app.delete("/mcp", endpoint);

  app.listen(port, "127.0.0.1", () => {
    console.log(`[taskflow-mcp] Streamable HTTP on http://127.0.0.1:${port}/mcp`);
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  try {
    getApi(); // eager check so startup fails loudly if app isn't running
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Still start the server so tools respond with a clear message.
    console.error(`[taskflow-mcp] ${msg}`);
  }

  // Streamable HTTP server (for llama.cpp web UI, open-webui, etc.).
  if (process.env.TASKFLOW_MCP_HTTP !== "0") {
    startHttpServer();
  }

  // stdio transport (for Claude Desktop, Cursor, Cline, opencode, …).
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("[taskflow-mcp] Fatal:", err);
  process.exit(1);
});