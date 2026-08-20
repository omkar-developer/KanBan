mod ai_api;

#[tauri::command]
fn read_md_file(path: String) -> Result<String, String> {
  std::fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
}

fn setup_window_events(app: &tauri::App) {
  use tauri::Emitter;
  // Collect all command-line arguments (file paths from associations)
  let args: Vec<String> = std::env::args().filter(|a| a.ends_with(".md") || a.ends_with(".mdx")).collect();
  if !args.is_empty() {
    let _ = app.handle().emit("file-open", args);
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_sql::Builder::new().build())
    .invoke_handler(tauri::generate_handler![
      ai_api::get_api_token,
      ai_api::set_api_token,
      ai_api::get_api_port,
      ai_api::is_api_running,
      read_md_file,
    ])
    .setup(|app| {
      ai_api::start(app.handle());
      setup_window_events(app);
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}