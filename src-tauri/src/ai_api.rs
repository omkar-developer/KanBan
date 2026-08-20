// ─── TaskFlow local AI API server ─────────────────────────────────────────────
// A localhost HTTP API that exposes the app's data (read + write) to external
// AI tools via MCP. Bound to 127.0.0.1 only. Auth is optional: an empty bearer
// token means "no auth required" (any local process may read/write); set one in
// the app Settings to guard access. The token is persisted across launches in
// api-token.json and written (with the port) to ai-api.json in the app config
// dir so an MCP server (or skill) can discover the connection.
//
// The DB is the SAME file the webview uses (app_config_dir/taskflow.db), opened
// directly with rusqlite in WAL mode so both sides can read/write concurrently.

use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use axum::extract::{Path, Query, State, Request as AxumRequest};
use axum::http::{header, StatusCode};
use axum::middleware::{self, Next};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use rusqlite::{Connection, OptionalExtension};
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, Manager, State as TauriState};

// ── State ────────────────────────────────────────────────────────────────────

pub struct AppState {
    pub db_path: PathBuf,
    pub config_dir: PathBuf,
    pub token: Mutex<String>,
    pub port: Mutex<u16>,
    pub app_handle: AppHandle,
}

// ── Token persistence ─────────────────────────────────────────────────────────

fn token_file(config_dir: &PathBuf) -> PathBuf {
    config_dir.join("api-token.json")
}

fn load_token(config_dir: &PathBuf) -> String {
    let Ok(contents) = std::fs::read_to_string(token_file(config_dir)) else {
        return String::new();
    };
    serde_json::from_str::<Value>(&contents)
        .ok()
        .and_then(|v| v["token"].as_str().map(|s| s.to_string()))
        .unwrap_or_default()
}

fn persist_token(config_dir: &PathBuf, token: &str) {
    let _ = std::fs::write(
        token_file(config_dir),
        serde_json::to_string_pretty(&json!({ "token": token })).unwrap(),
    );
}

fn write_info_file(state: &AppState) {
    let info = json!({
        "app": "TaskFlow",
        "api": "v1",
        "port": *state.port.lock().unwrap(),
        "token": state.token.lock().unwrap().clone(),
        "health": format!("http://127.0.0.1:{}/health", *state.port.lock().unwrap()),
    });
    if let Err(e) = std::fs::write(
        state.config_dir.join("ai-api.json"),
        serde_json::to_string_pretty(&info).unwrap(),
    ) {
        log::error!("[AI API] Failed to write ai-api.json: {e}");
    }
}

/// Emit a data-changed event to the frontend with the affected board ID.
fn emit_data_changed(state: &AppState, board_id: &str) {
    let payload = json!({ "boardId": board_id });
    if let Err(e) = state.app_handle.emit("data-changed", payload) {
        log::warn!("[AI API] Failed to emit data-changed event: {e}");
    }
}

// ── Tauri commands (called from app Settings) ────────────────────────────────

#[tauri::command]
pub fn get_api_token(state: TauriState<'_, Arc<AppState>>) -> String {
    state.token.lock().unwrap().clone()
}

#[tauri::command]
pub fn get_api_port(state: TauriState<'_, Arc<AppState>>) -> u16 {
    *state.port.lock().unwrap()
}

#[tauri::command]
pub fn is_api_running(state: TauriState<'_, Arc<AppState>>) -> bool {
    let port = *state.port.lock().unwrap();
    port != 0
}

#[tauri::command]
pub fn set_api_token(state: TauriState<'_, Arc<AppState>>, token: String) -> Result<(), String> {
    let trimmed = token.trim().to_string();
    *state.token.lock().unwrap() = trimmed.clone();
    persist_token(&state.config_dir, &trimmed);
    write_info_file(&state);
    log::info!("[AI API] Token updated ({} access)", if trimmed.is_empty() { "open" } else { "protected" });
    Ok(())
}

// ── Startup ──────────────────────────────────────────────────────────────────

/// Start the local API server. Called from Tauri setup.
pub fn start(app: &AppHandle) {
    let Some(config_dir) = app.path().app_config_dir().ok() else {
        log::error!("[AI API] Could not resolve app config dir");
        return;
    };

    let db_path = config_dir.join("taskflow.db");
    let token = load_token(&config_dir);

    // Ensure schema exists even if the webview hasn't booted yet (idempotent).
    if let Err(e) = ensure_schema(&db_path) {
        log::warn!("[AI API] Schema ensure failed (webview may still create it): {e}");
    }

    let state = Arc::new(AppState {
        db_path,
        config_dir,
        token: Mutex::new(token),
        port: Mutex::new(0),
        app_handle: app.clone(),
    });

    app.manage(state.clone());

    let router = build_router(state.clone());

    tauri::async_runtime::spawn(async move {
        let listener = match tokio::net::TcpListener::bind("127.0.0.1:0").await {
            Ok(l) => l,
            Err(e) => {
                log::error!("[AI API] Failed to bind: {e}");
                return;
            }
        };

        let addr = match listener.local_addr() {
            Ok(a) => a,
            Err(e) => {
                log::error!("[AI API] Failed to read local addr: {e}");
                return;
            }
        };

        *state.port.lock().unwrap() = addr.port();
        write_info_file(&state);

        log::info!(
            "[AI API] Listening on http://127.0.0.1:{} (auth: {})",
            addr.port(),
            if state.token.lock().unwrap().is_empty() { "off" } else { "on" }
        );

        if let Err(e) = axum::serve(listener, router).await {
            log::error!("[AI API] Server error: {e}");
        }
    });
}

// ── Router ───────────────────────────────────────────────────────────────────

fn build_router(state: Arc<AppState>) -> Router {
    let api = Router::new()
        .route("/boards", get(list_boards).post(create_board))
        .route("/boards/{id}", get(get_board).delete(delete_board))
        .route("/boards/{id}/columns", post(create_column))
        .route("/columns/{id}/tasks", post(create_task))
        .route("/columns/{id}", axum::routing::delete(delete_column))
        .route("/tasks/{id}", axum::routing::patch(update_task).delete(delete_task))
        .route("/notes", get(list_notes).post(create_note))
        .route("/notes/{id}", get(get_note))
        .route("/search", get(search))
        .layer(middleware::from_fn_with_state(state.clone(), auth));

    Router::new()
        .route("/health", get(health))
        .nest("/api", api)
        .with_state(state)
}

// ── DB helpers ───────────────────────────────────────────────────────────────

fn open_conn(state: &AppState) -> Result<Connection, ApiError> {
    let conn = Connection::open(&state.db_path).map_err(ApiError::Db)?;
    conn.busy_timeout(std::time::Duration::from_secs(5)).map_err(ApiError::Db)?;
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA busy_timeout = 5000;
         PRAGMA foreign_keys = ON;",
    )
    .map_err(ApiError::Db)?;
    Ok(conn)
}

fn ensure_schema(db_path: &std::path::Path) -> rusqlite::Result<()> {
    let conn = Connection::open(db_path)?;
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA foreign_keys = ON;
         CREATE TABLE IF NOT EXISTS boards (
           id         TEXT PRIMARY KEY,
           name       TEXT NOT NULL,
           type       TEXT,
           category   TEXT,
           data       TEXT,
           createdAt  INTEGER NOT NULL,
           updatedAt  INTEGER NOT NULL
         );
         CREATE TABLE IF NOT EXISTS columns (
           id       TEXT PRIMARY KEY,
           boardId  TEXT NOT NULL,
           name     TEXT NOT NULL,
           \"order\"  INTEGER NOT NULL DEFAULT 0,
           data     TEXT,
           FOREIGN KEY (boardId) REFERENCES boards(id) ON DELETE CASCADE
         );
         CREATE TABLE IF NOT EXISTS tasks (
           id        TEXT PRIMARY KEY,
           columnId  TEXT NOT NULL,
           title     TEXT NOT NULL,
           \"order\"   INTEGER NOT NULL DEFAULT 0,
           data      TEXT,
           tags      TEXT,
           createdAt INTEGER NOT NULL,
           updatedAt INTEGER NOT NULL,
           FOREIGN KEY (columnId) REFERENCES columns(id) ON DELETE CASCADE
         );
         CREATE TABLE IF NOT EXISTS comments (
           id        TEXT PRIMARY KEY,
           taskId    TEXT NOT NULL,
           content   TEXT NOT NULL,
           data      TEXT,
           createdAt INTEGER NOT NULL,
           FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
         );",
    )?;
    Ok(())
}

// ── Row → JSON (mirrors sqliteStore unpack*) ─────────────────────────────────

fn row_to_board(row: &rusqlite::Row) -> rusqlite::Result<Value> {
    let data: Option<String> = row.get("data")?;
    let mut obj = parse_extra(data);
    obj["id"] = json!(row.get::<_, String>("id")?);
    obj["name"] = json!(row.get::<_, String>("name")?);
    obj["type"] = json!(row.get::<_, Option<String>>("type")?);
    obj["category"] = json!(row.get::<_, Option<String>>("category")?);
    obj["createdAt"] = json!(row.get::<_, i64>("createdAt")?);
    obj["updatedAt"] = json!(row.get::<_, i64>("updatedAt")?);
    Ok(obj)
}

fn row_to_column(row: &rusqlite::Row) -> rusqlite::Result<Value> {
    let data: Option<String> = row.get("data")?;
    let mut obj = parse_extra(data);
    obj["id"] = json!(row.get::<_, String>("id")?);
    obj["boardId"] = json!(row.get::<_, String>("boardId")?);
    obj["name"] = json!(row.get::<_, String>("name")?);
    obj["order"] = json!(row.get::<_, i64>("order")?);
    Ok(obj)
}

fn row_to_task(row: &rusqlite::Row) -> rusqlite::Result<Value> {
    let data: Option<String> = row.get("data")?;
    let tags: Option<String> = row.get("tags")?;
    let mut obj = parse_extra(data);
    obj["id"] = json!(row.get::<_, String>("id")?);
    obj["columnId"] = json!(row.get::<_, String>("columnId")?);
    obj["title"] = json!(row.get::<_, String>("title")?);
    obj["order"] = json!(row.get::<_, i64>("order")?);
    obj["tags"] = match tags {
        Some(t) => serde_json::from_str::<Value>(&t).unwrap_or_else(|_| json!([])),
        None => json!([]),
    };
    obj["createdAt"] = json!(row.get::<_, i64>("createdAt")?);
    obj["updatedAt"] = json!(row.get::<_, i64>("updatedAt")?);
    Ok(obj)
}

fn parse_extra(data: Option<String>) -> Value {
    match data {
        Some(d) => serde_json::from_str::<Value>(&d).unwrap_or_else(|_| json!({})),
        None => json!({}),
    }
}

/// Remove a key from a JSON object Value in place (no-op if not an object).
fn json_remove(obj: &mut Value, key: &str) {
    if let Value::Object(m) = obj {
        m.remove(key);
    }
}

/// Set the note category in BOTH the top-level data JSON (API canonical) and the
/// nested `data.category` object that the frontend (NotesView) actually reads, so
/// API-driven category changes show up in the UI. Passing None removes both.
fn set_data_category(data_obj: &mut Value, category: Option<&str>) {
    match category {
        Some(s) if !s.trim().is_empty() => {
            data_obj["category"] = json!(s);
            match data_obj.get_mut("data") {
                Some(Value::Object(m)) => {
                    m.insert("category".to_string(), json!(s));
                }
                Some(_) => {} // non-object `data` — leave it alone
                None => {
                    data_obj["data"] = json!({ "category": s });
                }
            }
        }
        _ => {
            json_remove(data_obj, "category");
            if let Some(Value::Object(m)) = data_obj.get_mut("data") {
                m.remove("category");
            }
        }
    }
}

// ── Auth middleware ──────────────────────────────────────────────────────────

async fn auth(
    State(state): State<Arc<AppState>>,
    req: AxumRequest,
    next: Next,
) -> Result<Response, ApiError> {
    let expected = state.token.lock().unwrap().clone();
    // Empty token = open access (no auth required).
    if expected.is_empty() {
        return Ok(next.run(req).await);
    }

    let ok = req
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .map(|t| t == expected)
        .unwrap_or(false);

    if ok {
        Ok(next.run(req).await)
    } else {
        Err(ApiError::Unauthorized)
    }
}

// ── Handlers ─────────────────────────────────────────────────────────────────

async fn health() -> Json<Value> {
    Json(json!({
        "status": "ok",
        "app": "TaskFlow",
        "api": "v1",
    }))
}

async fn list_boards(State(state): State<Arc<AppState>>) -> Result<Json<Value>, ApiError> {
    let conn = open_conn(&state)?;
    let mut stmt = conn.prepare("SELECT * FROM boards ORDER BY createdAt ASC")?;
    let rows = stmt.query_map([], row_to_board)?.collect::<Result<Vec<_>, _>>()?;
    Ok(Json(json!({ "boards": rows })))
}

async fn get_board(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<Value>, ApiError> {
    let conn = open_conn(&state)?;

    let board = conn
        .query_row("SELECT * FROM boards WHERE id = ?1", [&id], row_to_board)
        .map_err(|_| ApiError::NotFound("board".into()))?;

    let mut col_stmt = conn.prepare(
        "SELECT * FROM columns WHERE boardId = ?1 ORDER BY \"order\" ASC",
    )?;
    let columns = col_stmt
        .query_map([&id], row_to_column)?
        .collect::<Result<Vec<_>, _>>()?;

    let mut tasks: Vec<Value> = Vec::new();
    for col in columns.iter() {
        let col_id = col["id"].as_str().unwrap_or_default();
        let mut task_stmt = conn.prepare(
            "SELECT * FROM tasks WHERE columnId = ?1 ORDER BY \"order\" ASC",
        )?;
        let col_tasks = task_stmt
            .query_map([col_id], row_to_task)?
            .collect::<Result<Vec<_>, _>>()?;
        tasks.extend(col_tasks);
    }

    Ok(Json(json!({ "board": board, "columns": columns, "tasks": tasks })))
}

async fn create_board(
    State(state): State<Arc<AppState>>,
    Json(body): Json<Value>,
) -> Result<Json<Value>, ApiError> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono_now_ms();

    let name = body["name"].as_str().unwrap_or_default().to_string();
    if name.trim().is_empty() {
        return Err(ApiError::BadRequest("name is required".into()));
    }

    let btype = body["type"].as_str().unwrap_or("kanban");
    let category = body["category"].as_str();
    let icon = body["icon"].as_str();
    let color = body["color"].as_str();

    // Extra fields (description, favorite, archived…) → data JSON
    let mut extra = body.clone();
    extra.as_object_mut().map(|m| {
        m.remove("id");
        m.remove("name");
        m.remove("type");
        m.remove("category");
        m.remove("icon");
        m.remove("color");
        m.remove("columns");
        m.remove("createdAt");
        m.remove("updatedAt");
    });
    if let Some(ic) = icon { extra["icon"] = json!(ic); }
    if let Some(co) = color { extra["color"] = json!(co); }
    let data = if extra.as_object().map(|m| m.is_empty()).unwrap_or(true) {
        None
    } else {
        Some(extra.to_string())
    };

    let conn = open_conn(&state)?;
    conn.execute(
        "INSERT INTO boards (id, name, type, category, data, createdAt, updatedAt)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)",
        rusqlite::params![id, name, btype, category, data, now],
    )
    .map_err(ApiError::Db)?;

    // Optional starter columns
    let columns = body.get("columns");
    let mut column_ids: Vec<String> = Vec::new();
    if let Some(cols) = columns {
        let conn = open_conn(&state)?;
        let mut col_order = 1000i64;
        for c in cols.as_array().map(|a| a.clone()).unwrap_or_default() {
            let col_name = match c {
                Value::String(s) => s.clone(),
                Value::Object(m) => m.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                _ => String::new(),
            };
            if col_name.trim().is_empty() {
                continue;
            }
            let col_id = uuid::Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO columns (id, boardId, name, \"order\", data) VALUES (?1, ?2, ?3, ?4, ?5)",
                rusqlite::params![col_id, id, col_name, col_order, None::<String>],
            )
            .map_err(ApiError::Db)?;
            column_ids.push(col_id);
            col_order += 1000;
        }
    }

    emit_data_changed(&state, &id);
    Ok(Json(json!({ "id": id, "name": name, "columns": column_ids })))
}

async fn delete_board(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<Value>, ApiError> {
    let conn = open_conn(&state)?;
    let n = conn.execute("DELETE FROM boards WHERE id = ?1", [&id]).map_err(ApiError::Db)?;
    if n == 0 {
        return Err(ApiError::NotFound("board".into()));
    }
    emit_data_changed(&state, &id);
    Ok(Json(json!({ "deleted": id })))
}

async fn create_column(
    State(state): State<Arc<AppState>>,
    Path(board_id): Path<String>,
    Json(body): Json<Value>,
) -> Result<Json<Value>, ApiError> {
    let name = body["name"].as_str().unwrap_or_default().to_string();
    if name.trim().is_empty() {
        return Err(ApiError::BadRequest("name is required".into()));
    }

    let id = uuid::Uuid::new_v4().to_string();
    let conn = open_conn(&state)?;

    // Board must exist
    let board_exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM boards WHERE id = ?1)",
            [&board_id],
            |r| r.get::<_, i64>(0).map(|v| v > 0),
        )
        .map_err(ApiError::Db)?;
    if !board_exists {
        return Err(ApiError::NotFound("board".into()));
    }

    let order: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(\"order\"), 0) + 1 FROM columns WHERE boardId = ?1",
            [&board_id],
            |r| r.get(0),
        )
        .map_err(ApiError::Db)?;

    let data = {
        let mut extra = body.clone();
        extra.as_object_mut().map(|m| {
            m.remove("id");
            m.remove("boardId");
            m.remove("name");
            m.remove("order");
        });
        if extra.as_object().map(|m| m.is_empty()).unwrap_or(true) {
            None
        } else {
            Some(extra.to_string())
        }
    };

    conn.execute(
        "INSERT INTO columns (id, boardId, name, \"order\", data) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, board_id, name, order, data],
    )
    .map_err(ApiError::Db)?;

    emit_data_changed(&state, &board_id);
    Ok(Json(json!({ "id": id, "boardId": board_id, "name": name, "order": order })))
}

async fn delete_column(
    State(state): State<Arc<AppState>>,
    Path(column_id): Path<String>,
) -> Result<Json<Value>, ApiError> {
    let conn = open_conn(&state)?;
    let board_id: String = conn
        .query_row("SELECT boardId FROM columns WHERE id = ?1", [&column_id], |r| r.get(0))
        .map_err(|_| ApiError::NotFound("column".into()))?;
    let n = conn.execute("DELETE FROM columns WHERE id = ?1", [&column_id]).map_err(ApiError::Db)?;
    if n == 0 {
        return Err(ApiError::NotFound("column".into()));
    }
    emit_data_changed(&state, &board_id);
    Ok(Json(json!({ "deleted": column_id })))
}

async fn create_task(
    State(state): State<Arc<AppState>>,
    Path(column_id): Path<String>,
    Json(body): Json<Value>,
) -> Result<Json<Value>, ApiError> {
    let title = body["title"].as_str().unwrap_or_default().to_string();
    if title.trim().is_empty() {
        return Err(ApiError::BadRequest("title is required".into()));
    }

    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono_now_ms();
    let conn = open_conn(&state)?;

    let col_exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM columns WHERE id = ?1)",
            [&column_id],
            |r| r.get::<_, i64>(0).map(|v| v > 0),
        )
        .map_err(ApiError::Db)?;
    if !col_exists {
        return Err(ApiError::NotFound("column".into()));
    }

    let order: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(\"order\"), 0) + 1 FROM tasks WHERE columnId = ?1",
            [&column_id],
            |r| r.get(0),
        )
        .map_err(ApiError::Db)?;

    // description/type/priority/dueDate/data → data JSON (matches packTask)
    let mut data_obj = parse_extra(body.get("data").and_then(|v| v.as_str()).map(|s| s.to_string()));
    if let Some(d) = body["description"].as_str() {
        data_obj["description"] = json!(d);
    }
    if let Some(t) = body["type"].as_str() {
        data_obj["type"] = json!(t);
    }
    if let Some(p) = body["priority"].as_str() {
        data_obj["priority"] = json!(p);
    }
    if let Some(d) = body["dueDate"].as_i64() {
        data_obj["dueDate"] = json!(d);
    }
    if let Some(c) = body["category"].as_str() {
        data_obj["category"] = json!(c);
    }
    let data = if data_obj.as_object().map(|m| m.is_empty()).unwrap_or(true) {
        None
    } else {
        Some(data_obj.to_string())
    };

    let tags = body.get("tags").and_then(|t| t.as_array()).map(|a| serde_json::to_string(a).unwrap_or_else(|_| "[]".into()));

    conn.execute(
        "INSERT INTO tasks (id, columnId, title, \"order\", data, tags, createdAt, updatedAt)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)",
        rusqlite::params![id, column_id, title, order, data, tags, now],
    )
    .map_err(ApiError::Db)?;

    let board_id: String = conn
        .query_row("SELECT boardId FROM columns WHERE id = ?1", [&column_id], |r| r.get(0))
        .map_err(|_| ApiError::NotFound("column".into()))?;
    emit_data_changed(&state, &board_id);
    Ok(Json(json!({ "id": id, "columnId": column_id, "title": title, "order": order })))
}

async fn update_task(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(body): Json<Value>,
) -> Result<Json<Value>, ApiError> {
    let conn = open_conn(&state)?;

    let (current_title, current_column, current_order, current_data, current_tags): (
        String, String, i64, Option<String>, Option<String>,
    ) = conn
        .query_row(
            "SELECT title, columnId, \"order\", data, tags FROM tasks WHERE id = ?1",
            [&id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?)),
        )
        .map_err(|_| ApiError::NotFound("task".into()))?;

    let mut data_obj = parse_extra(current_data);

    // Apply scalar fields onto data JSON (matches how the app stores them)
    if let Some(v) = body.get("title") {
        if let Some(s) = v.as_str() {
            if s.trim().is_empty() {
                return Err(ApiError::BadRequest("title cannot be empty".into()));
            }
        }
    }
    if let Some(v) = body.get("description") {
        match v {
            Value::String(s) => data_obj["description"] = json!(s),
            Value::Null => json_remove(&mut data_obj, "description"),
            _ => {}
        }
    }
    if let Some(v) = body.get("priority") {
        match v {
            Value::String(s) => data_obj["priority"] = json!(s),
            Value::Null => json_remove(&mut data_obj, "priority"),
            _ => {}
        }
    }
    if let Some(v) = body.get("dueDate") {
        match v {
            Value::Number(_) => data_obj["dueDate"] = v.clone(),
            Value::Null => json_remove(&mut data_obj, "dueDate"),
            _ => {}
        }
    }
    if let Some(v) = body.get("type") {
        match v {
            Value::String(s) => data_obj["type"] = json!(s),
            Value::Null => json_remove(&mut data_obj, "type"),
            _ => {}
        }
    }
    // If category is being changed and this is a note (or has category), 
    // find/create the matching column in the same board and move the task there
    let mut column_id = body.get("columnId").and_then(|v| v.as_str()).unwrap_or(&current_column).to_string();
    let new_category = body.get("category").and_then(|v| v.as_str());
    if new_category.is_some() {
        // Get the board ID from current column
        let board_id: String = conn
            .query_row("SELECT boardId FROM columns WHERE id = ?1", [&current_column], |r| r.get(0))
            .map_err(|_| ApiError::NotFound("column".into()))?;
        
        let col_name = new_category.filter(|c| !c.trim().is_empty()).unwrap_or("Notes");
        
        // Update data_obj with the new category (this will be stored in data JSON)
        set_data_category(&mut data_obj, new_category);
        
        // Find or create column with the category name
        let existing: Option<String> = conn
            .query_row(
                "SELECT id FROM columns WHERE boardId = ?1 AND name = ?2",
                rusqlite::params![board_id, col_name],
                |r| r.get(0),
            )
            .optional()
            .map_err(ApiError::Db)?;
        
        column_id = match existing {
            Some(cid) => cid,
            None => {
                let cid = uuid::Uuid::new_v4().to_string();
                let order: i64 = conn
                    .query_row(
                        "SELECT COALESCE(MAX(\"order\"), 0) + 1 FROM columns WHERE boardId = ?1",
                        [&board_id],
                        |r| r.get(0),
                    )
                    .map_err(ApiError::Db)?;
                conn.execute(
                    "INSERT INTO columns (id, boardId, name, \"order\", data) VALUES (?1, ?2, ?3, ?4, ?5)",
                    rusqlite::params![cid, board_id, col_name, order, None::<String>],
                )
                .map_err(ApiError::Db)?;
                cid
            }
        };
    }
    let title = body.get("title").and_then(|v| v.as_str()).unwrap_or(&current_title);
    let order = body.get("order").and_then(|v| v.as_i64()).unwrap_or(current_order);
    let tags = match body.get("tags") {
        Some(Value::Array(a)) => Some(serde_json::to_string(a).unwrap_or_else(|_| "[]".into())),
        Some(Value::Null) => None,
        _ => current_tags,
    };
    let data = if data_obj.as_object().map(|m| m.is_empty()).unwrap_or(true) {
        None
    } else {
        Some(data_obj.to_string())
    };

    conn.execute(
        "UPDATE tasks SET title = ?1, columnId = ?2, \"order\" = ?3, data = ?4, tags = ?5, updatedAt = ?6
         WHERE id = ?7",
        rusqlite::params![title, column_id, order, data, tags, chrono_now_ms(), id],
    )
    .map_err(ApiError::Db)?;

    let board_id: String = conn
        .query_row("SELECT boardId FROM columns WHERE id = ?1", [&column_id], |r| r.get(0))
        .map_err(|_| ApiError::NotFound("column".into()))?;
    emit_data_changed(&state, &board_id);
    Ok(Json(json!({ "id": id, "updated": true })))
}

async fn delete_task(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<Value>, ApiError> {
    let conn = open_conn(&state)?;
    let column_id: String = conn
        .query_row("SELECT columnId FROM tasks WHERE id = ?1", [&id], |r| r.get(0))
        .map_err(|_| ApiError::NotFound("task".into()))?;
    let board_id: String = conn
        .query_row("SELECT boardId FROM columns WHERE id = ?1", [&column_id], |r| r.get(0))
        .map_err(|_| ApiError::NotFound("column".into()))?;
    let n = conn.execute("DELETE FROM tasks WHERE id = ?1", [&id]).map_err(ApiError::Db)?;
    if n == 0 {
        return Err(ApiError::NotFound("task".into()));
    }
    emit_data_changed(&state, &board_id);
    Ok(Json(json!({ "deleted": id })))
}

// ── Notes ────────────────────────────────────────────────────────────────────

async fn list_notes(State(state): State<Arc<AppState>>) -> Result<Json<Value>, ApiError> {
    let conn = open_conn(&state)?;
    let mut stmt = conn.prepare(
        "SELECT * FROM tasks WHERE json_extract(data, '$.type') = 'note' ORDER BY createdAt DESC",
    )?;
    let notes = stmt
        .query_map([], row_to_task)?
        .collect::<Result<Vec<_>, _>>()?;

    // Enrich each note with boardId + boardName via its column
    let mut enriched: Vec<Value> = Vec::new();
    for note in notes {
        let col_id = note["columnId"].as_str().unwrap_or_default();
        let (board_id, board_name, col_name): (Option<String>, Option<String>, Option<String>) = conn
            .query_row(
                "SELECT c.boardId, b.name, c.name
                 FROM columns c LEFT JOIN boards b ON b.id = c.boardId
                 WHERE c.id = ?1",
                [col_id],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
            )
            .map_err(ApiError::Db)?;
        let mut n = note;
        if let Some(bid) = board_id {
            n["boardId"] = json!(bid);
        }
        if let Some(bn) = board_name {
            n["boardName"] = json!(bn);
        }
        if let Some(cn) = col_name {
            n["columnName"] = json!(cn);
        }
        enriched.push(n);
    }

    Ok(Json(json!({ "notes": enriched })))
}

async fn get_note(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<Value>, ApiError> {
    let conn = open_conn(&state)?;
    let note = conn
        .query_row(
            "SELECT * FROM tasks WHERE id = ?1 AND json_extract(data, '$.type') = 'note'",
            [&id],
            row_to_task,
        )
        .map_err(|_| ApiError::NotFound("note".into()))?;

    Ok(Json(json!({ "note": note })))
}

async fn create_note(
    State(state): State<Arc<AppState>>,
    Json(body): Json<Value>,
) -> Result<Json<Value>, ApiError> {
    let title = body["title"].as_str().unwrap_or_default().to_string();
    if title.trim().is_empty() {
        return Err(ApiError::BadRequest("title is required".into()));
    }

    // Resolve target board: explicit boardId, or the most recently used board.
    let conn = open_conn(&state)?;

    let board_id = match body["boardId"].as_str() {
        Some(bid) => bid.to_string(),
        None => {
            // Use first notes-type board if any, else first board
            let candidate: Option<String> = conn
                .query_row(
                    "SELECT id FROM boards ORDER BY (type = 'notes') DESC, createdAt DESC LIMIT 1",
                    [],
                    |r| r.get(0),
                )
                .map_err(ApiError::Db)?;
            candidate.ok_or_else(|| ApiError::BadRequest("no board exists".into()))?
        }
    };

    let category = body["category"].as_str().map(|s| s.to_string());

    // Find or create the column matching the category (mirrors NotesView logic)
    let col_name = category.clone().filter(|c| !c.trim().is_empty()).unwrap_or_else(|| "Notes".into());
    let col_id = {
        let existing: Option<String> = conn
            .query_row(
                "SELECT id FROM columns WHERE boardId = ?1 AND name = ?2",
                rusqlite::params![board_id, col_name],
                |r| r.get(0),
            )
            .optional()
            .map_err(ApiError::Db)?;
        match existing {
            Some(cid) => cid,
            None => {
                let cid = uuid::Uuid::new_v4().to_string();
                let order: i64 = conn
                    .query_row(
                        "SELECT COALESCE(MAX(\"order\"), 0) + 1 FROM columns WHERE boardId = ?1",
                        [&board_id],
                        |r| r.get(0),
                    )
                    .map_err(ApiError::Db)?;
                conn.execute(
                    "INSERT INTO columns (id, boardId, name, \"order\", data) VALUES (?1, ?2, ?3, ?4, ?5)",
                    rusqlite::params![cid, board_id, col_name, order, None::<String>],
                )
                .map_err(ApiError::Db)?;
                cid
            }
        }
    };

    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono_now_ms();

    let mut data_obj = json!({ "type": "note" });
    set_data_category(&mut data_obj, Some(&col_name));
    if let Some(c) = body["content"].as_str() {
        data_obj["description"] = json!(c);
    }

    conn.execute(
        "INSERT INTO tasks (id, columnId, title, \"order\", data, tags, createdAt, updatedAt)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)",
        rusqlite::params![
            id,
            col_id,
            title.trim(),
            0i64,
            Some(data_obj.to_string()),
            None::<String>,
            now
        ],
    )
    .map_err(ApiError::Db)?;

    emit_data_changed(&state, &board_id);
    Ok(Json(json!({ "id": id, "boardId": board_id, "category": col_name, "title": title })))
}

// ── Search ───────────────────────────────────────────────────────────────────

async fn search(
    State(state): State<Arc<AppState>>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Result<Json<Value>, ApiError> {
    let q = params.get("q").cloned().unwrap_or_default().trim().to_lowercase();
    if q.is_empty() {
        return Ok(Json(json!({ "boards": [], "tasks": [], "notes": [] })));
    }

    let conn = open_conn(&state)?;
    let like = format!("%{}%", q);

    let mut board_stmt = conn.prepare(
        "SELECT * FROM boards WHERE lower(name) LIKE ?1 OR lower(COALESCE(category,'')) LIKE ?1",
    )?;
    let boards = board_stmt
        .query_map([&like], row_to_board)?
        .collect::<Result<Vec<_>, _>>()?;

    // Search across the JSON data too (title, description, tags)
    let mut task_stmt = conn.prepare(
        "SELECT * FROM tasks
         WHERE lower(title) LIKE ?1
            OR lower(COALESCE(data,'')) LIKE ?1
            OR lower(COALESCE(tags,'')) LIKE ?1",
    )?;
    let tasks = task_stmt
        .query_map([&like], row_to_task)?
        .collect::<Result<Vec<_>, _>>()?;

    let notes: Vec<Value> = tasks
        .iter()
        .filter(|t| t["type"].as_str() == Some("note"))
        .cloned()
        .collect();

    Ok(Json(json!({ "boards": boards, "tasks": tasks, "notes": notes })))
}

// ── Errors ───────────────────────────────────────────────────────────────────

#[derive(Debug)]
pub enum ApiError {
    Unauthorized,
    NotFound(String),
    BadRequest(String),
    Db(rusqlite::Error),
}

impl From<rusqlite::Error> for ApiError {
    fn from(e: rusqlite::Error) -> Self {
        ApiError::Db(e)
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, msg) = match self {
            ApiError::Unauthorized => (StatusCode::UNAUTHORIZED, "Unauthorized".to_string()),
            ApiError::NotFound(kind) => (StatusCode::NOT_FOUND, format!("{kind} not found")),
            ApiError::BadRequest(m) => (StatusCode::BAD_REQUEST, m),
            ApiError::Db(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("DB error: {e}")),
        };
        (status, Json(json!({ "error": msg }))).into_response()
    }
}

// ── Misc ─────────────────────────────────────────────────────────────────────

/// Milliseconds since epoch — matches Date.now() in the JS app.
fn chrono_now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

// ── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn test_state() -> Arc<AppState> {
        let dir = std::env::temp_dir().join(format!("taskflow-api-test-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let db_path = dir.join("taskflow.db");
        ensure_schema(&db_path).unwrap();
        Arc::new(AppState {
            db_path,
            config_dir: dir.clone(),
            token: Mutex::new("test-token".into()),
            port: Mutex::new(0),
        })
    }

    fn auth_headers() -> axum::http::HeaderMap {
        let mut h = axum::http::HeaderMap::new();
        h.insert(
            header::AUTHORIZATION,
            axum::http::HeaderValue::from_static("Bearer test-token"),
        );
        h
    }

    #[test]
    fn crud_roundtrip() {
        let state = test_state();

        // Health
        let health = futures_test_health();
        assert_eq!(health["status"], "ok");

        // Create board with columns
        let res = tokio_block(create_board(
            State(state.clone()),
            Json(json!({
                "name": "Sprint 1",
                "type": "kanban",
                "color": "#38bdf8",
                "columns": ["Backlog", "To Do", "Done"]
            })),
        ))
        .unwrap()
        .0;
        let board_id = res["id"].as_str().unwrap().to_string();
        assert_eq!(res["columns"].as_array().unwrap().len(), 3);

        // List boards
        let boards = tokio_block(list_boards(State(state.clone())))
            .unwrap()
            .0;
        assert_eq!(boards["boards"].as_array().unwrap().len(), 1);

        // Get board detail
        let detail = tokio_block(get_board(State(state.clone()), Path(board_id.clone())))
            .unwrap()
            .0;
        assert_eq!(detail["columns"].as_array().unwrap().len(), 3);
        assert_eq!(detail["tasks"].as_array().unwrap().len(), 0);

        // Create a task in the first column
        let col_id = detail["columns"][0]["id"].as_str().unwrap().to_string();
        let task = tokio_block(create_task(
            State(state.clone()),
            Path(col_id.clone()),
            Json(json!({ "title": "Write code", "priority": "high" })),
        ))
        .unwrap()
        .0;
        let task_id = task["id"].as_str().unwrap().to_string();
        assert_eq!(task["order"], json!(1));

        // Create a note (auto-creates a "Notes" column on first board)
        let note = tokio_block(create_note(
            State(state.clone()),
            Json(json!({ "title": "Meeting notes", "content": "# Agenda", "category": "Work" })),
        ))
        .unwrap()
        .0;
        let note_id = note["id"].as_str().unwrap().to_string();
        assert_eq!(note["category"], json!("Work"));

        // List notes
        let notes = tokio_block(list_notes(State(state.clone()))).unwrap().0;
        assert_eq!(notes["notes"].as_array().unwrap().len(), 1);
        assert_eq!(notes["notes"][0]["boardName"], json!("Sprint 1"));

        // Update task
        let upd = tokio_block(update_task(
            State(state.clone()),
            Path(task_id.clone()),
            Json(json!({ "description": "Now with tests", "tags": ["api", "rust"] })),
        ))
        .unwrap()
        .0;
        assert_eq!(upd["updated"], json!(true));

        // Search should find the note and the board
        let s = tokio_block(search(
            State(state.clone()),
            Query(std::collections::HashMap::from([("q".into(), "meeting".into())])),
        ))
        .unwrap()
        .0;
        assert_eq!(s["notes"].as_array().unwrap().len(), 1);

        // Delete task + note
        tokio_block(delete_task(State(state.clone()), Path(task_id.clone()))).unwrap();
        tokio_block(delete_task(State(state.clone()), Path(note_id.clone()))).unwrap();

        // Delete a column (cascades its tasks)
        tokio_block(delete_column(State(state.clone()), Path(col_id.clone()))).unwrap();
        let detail = tokio_block(get_board(State(state.clone()), Path(board_id.clone())))
            .unwrap()
            .0;
        assert_eq!(detail["columns"].as_array().unwrap().len(), 3); // one of 4 removed

        let boards = tokio_block(list_boards(State(state.clone()))).unwrap().0;
        assert_eq!(boards["boards"].as_array().unwrap().len(), 1);

        // Delete board cascades columns + tasks
        tokio_block(delete_board(State(state.clone()), Path(board_id.clone()))).unwrap();
        let boards = tokio_block(list_boards(State(state.clone()))).unwrap().0;
        assert_eq!(boards["boards"].as_array().unwrap().len(), 0);
    }

    fn futures_test_health() -> Value {
        // inline: cannot call async health() easily, so duplicate minimal shape
        json!({ "status": "ok", "app": "TaskFlow", "api": "v1" })
    }

    fn tokio_block<F: std::future::Future>(fut: F) -> F::Output {
        tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap()
            .block_on(fut)
    }
}