@echo off
rem TaskFlow - run dev app (frontend + Rust, hot reload)
cd /d "%~dp0"
echo Starting TaskFlow dev app... press Ctrl+C to stop.
call npx tauri dev
pause