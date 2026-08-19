# TaskFlow MCP — add to your AI app

TaskFlow exposes its boards, notes and tasks over MCP so AI apps can read and
write them. The MCP server supports **two transports**:

- **stdio** — for Claude Desktop, Cursor, Cline, opencode, etc.
- **Streamable HTTP** — for browser-based clients like llama.cpp's web UI and open-webui.

Both talk to the same local TaskFlow API (`127.0.0.1`), whose port + token are
discovered from `ai-api.json` (written by the app into its config dir on launch).
If the API has no token set (the default), requests go out without one.

## llama.cpp web UI (full MCP support since March 2026)

1. Start the TaskFlow desktop app (hosts the API + writes `ai-api.json`).
2. Start the MCP HTTP server:
   ```
   cd mcp-server && npm install && npm run start
   ```
   It listens on `http://127.0.0.1:3900/mcp` (override with `TASKFLOW_MCP_PORT`).
3. Start llama-server **with the MCP CORS proxy** so its browser UI can reach the server:
   ```
   llama-server -m <model.gguf> --webui-mcp-proxy
   ```
4. In llama.cpp's web UI, register an MCP server pointing at
   `http://127.0.0.1:3900/mcp`. The model can then call TaskFlow tools.

## Claude Desktop

Add to `claude_desktop_config.json` (`%APPDATA%\Claude\claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "taskflow": {
      "command": "npx",
      "args": ["tsx", "<path-to-kanban>/mcp-server/src/index.ts"]
    }
  }
}
```

(Use the full path to the repo; or `npm install` in `mcp-server/` first and run
`node mcp-server/dist/index.js` after `npm run build`.)

## Cursor / Cline / other MCP clients

Add a new MCP server with:
- **command:** `npx`
- **args:** `tsx <path-to-kanban>/mcp-server/src/index.ts`

## Tools

`list_boards`, `get_board`, `list_notes`, `get_note`, `search`, `create_board`,
`create_column`, `delete_column`, `delete_board`, `create_task`, `update_task`,
`delete_task`, `create_note`, `delete_note`.

## Environment

- `TASKFLOW_API_FILE` — optional, points directly at an `ai-api.json` if it's not in the default config dir.
- `TASKFLOW_IDENTIFIER` — optional, overrides the app bundle id used to find the config dir.
- `TASKFLOW_MCP_PORT` — optional, HTTP transport port (default `3900`).
- `TASKFLOW_MCP_HTTP` — set to `0` to disable the HTTP transport (stdio only).

## Requirements

- The TaskFlow desktop app **must be running** (it hosts the API and writes `ai-api.json`).
- Node.js 20+ with `tsx` available (installed automatically via `npm install` in `mcp-server/`).