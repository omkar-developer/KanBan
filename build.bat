@echo off
rem TaskFlow - build installers (frontend + Rust + MSI/NSIS bundles)
cd /d "%~dp0"
echo Building TaskFlow... this can take several minutes.
call npx tauri build
if errorlevel 1 (
  echo.
  echo BUILD FAILED - see errors above.
  pause
  exit /b 1
)
echo.
echo Build OK. Installers are in src-tauri\target\release\bundle\
pause