@echo off
chcp 65001 > nul
title Discord Music Bot Launcher

echo ======================================
echo        Discord Music Bot Launcher
echo ======================================

echo [System] Checking Node.js...
node -v > nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found!
    echo [INFO] Please install Node.js from: https://nodejs.org/
    echo.
    echo Press any key to exit...
    pause > nul
    exit /b 1
)

echo [System] Starting Discord bot...
call npm start

echo.
echo Press any key to exit...
pause > nul