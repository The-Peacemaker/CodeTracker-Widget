@echo off
REM Token Widget launcher: local server + chromeless widget window
cd /d "%~dp0what-i-want\CodeTracker-Widget\dist"
start "TokenWidgetServer" /min python3 -m http.server 8901
timeout /t 1 /nobreak >nul
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app=http://127.0.0.1:8901/ --window-size=800,1020 --user-data-dir="%~dp0.chrome-profile"
