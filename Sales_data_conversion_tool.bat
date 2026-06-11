@echo off
cd /d "%~dp0"
start /b cmd /c "timeout /t 5 /nobreak >nul && start http://localhost:3000"
npm run dev
