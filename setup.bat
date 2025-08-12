@echo off
echo ========================================
echo Discord File Monitor Bot Setup
echo ========================================
echo.

REM Check if Node.js is installed
echo Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    echo After installation, restart this script.
    pause
    exit /b 1
)

echo ✅ Node.js is installed
node --version
echo.

REM Install dependencies
echo Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo ✅ Dependencies installed successfully
echo.

REM Create .env file if it doesn't exist
if not exist ".env" (
    echo Creating .env file from template...
    copy .env.example .env >nul
    echo ✅ .env file created
    echo.
    echo ⚠️  IMPORTANT: You need to configure your .env file!
    echo.
    echo Please edit .env and add:
    echo 1. Your Discord bot token
    echo 2. Your Discord channel ID
    echo 3. The path you want to monitor (optional)
    echo.
    echo Opening .env file for editing...
    timeout /t 3 >nul
    notepad .env
) else (
    echo ✅ .env file already exists
)

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Make sure your .env file is configured
echo 2. Run 'start-bot.bat' to start the bot
echo 3. Check the README.md for detailed instructions
echo.
echo Files created:
echo - bot.js (main bot file)
echo - package.json (dependencies)
echo - .env.example (configuration template)
echo - .env (your configuration)
echo - README.md (documentation)
echo - start-bot.bat (easy startup)
echo - watched_files/ (sample directory to monitor)
echo.
pause