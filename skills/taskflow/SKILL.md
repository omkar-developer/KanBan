# TaskFlow API

TaskFlow (this app) exposes a localhost HTTP API so AI agents and chat apps can
read and write your kanban boards, tasks and notes. The MCP server is the easy
path for tools that support MCP; this skill documents the raw HTTP API for
anything else.

## When to use
Use this skill whenever a user asks you to work with their boards, notes, or
tasks — summarize, analyze, create, edit, search. Ask the user to make sure the
TaskFlow desktop app is running first.

## Discovery
The app writes `ai-api.json` to its config dir on every launch. It contains:

```json
{
  "app": "TaskFlow",
  "api": "v1",
  "port": <port>,
  "token": "<token>",
  "health": "http://127.0.0.1:<port>/health"
}
```

Config dirs by platform (identifier `com.taskflow.dev`):
- Windows: `%APPDATA%\com.taskflow.dev\ai-api.json`
- macOS: `~/Library/Application Support/com.taskflow.dev/ai-api.json`
- Linux: `~/.config/com.taskflow.dev/ai-api.json`

Or run the bundled MCP server — it does discovery for you.

## Auth
The token is **optional**. If the token in `ai-api.json` is empty (the default),
all `/api/*` routes are open — send no auth header. If a token is set (via the
app's Settings → AI API), all `/api/*` routes require `Authorization: Bearer <token>`.

```
GET http://127.0.0.1:<port>/health
```

Non-2xx returns `{ "error": "<message>" }` with a matching HTTP status
(401 = bad token, 404 = not found, 400 = bad request).

## Endpoints

### Read

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/boards` | All boards (id, name, type, category, icon, color) |
| GET | `/api/boards/{id}` | Board + its columns + all tasks |
| GET | `/api/notes` | All notes, enriched with boardName + columnName |
| GET | `/api/notes/{id}` | Single note with full markdown content |
| GET | `/api/search?q=...` | Search boards, tasks, notes by text |

### Write

| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/api/boards` | `{name, type?, category?, icon?, color?, columns?: [string]}` | Create board (optionally with starter columns) |
| DELETE | `/api/boards/{id}` | — | Delete board (cascades columns + tasks) |
| POST | `/api/boards/{id}/columns` | `{name}` | Create column |
| DELETE | `/api/columns/{id}` | — | Delete column (cascades its tasks) |
| POST | `/api/columns/{id}/tasks` | `{title, description?, priority?, tags?, dueDate?}` | Create task |
| PATCH | `/api/tasks/{id}` | `{title?, description?, priority?, category?, tags?, columnId?}` | Update task/note |
| DELETE | `/api/tasks/{id}` | — | Delete task/note |
| POST | `/api/notes` | `{title, content?, category?, boardId?}` | Create a markdown note |

## Notes data model
Notes are tasks with `type = "note"` and a `category` field (the column name).
`description` holds the markdown body. All extra fields live in the `data`
JSON column — tasks returned by the API are already "unpacked" (extra fields
spread onto the object).

## Typical flow for "summarize my notes"
1. `GET /api/notes` → list all notes (titles, categories, previews)
2. `GET /api/notes/{id}` for the ones the user cares about
3. Summarize

## Typical flow for "create a task"
1. `GET /api/boards/{id}` → pick a columnId from `columns[]`
2. `POST /api/columns/{columnId}/tasks` with `{title, ...}`

## llama.cpp / open-webui
These speak **Streamable HTTP MCP**, not stdio. Start the bundled MCP server with
`npm run start` in `mcp-server/` (listens on `http://127.0.0.1:3900/mcp`), start
llama-server with `--webui-mcp-proxy`, and register that URL as an MCP server.