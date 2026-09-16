@echo off
REM CodeTracker web widget launcher: local server + chromeless window.
REM Run `npm run build` from the repo root first so dist/ exists.
cd /d "%~dp0..\dist"
if not exist "index.html" (
    echo dist\index.html not found. Run "npm run build" from the repo root first.
    pause
    exit /b 1
)
start "CodeTrackerServer" /min python -m http.server 8901
timeout /t 1 /nobreak >nul
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app=http://127.0.0.1:8901/ --window-size=800,1020 --user-data-dir="%~dp0.chrome-profile"
