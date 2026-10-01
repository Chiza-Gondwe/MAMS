@echo off
title MAMS Django Wireless Server (0.0.0.0:8000)
echo ============================================================================
echo   MAMS Django Wireless Server (Wi-Fi / Mobile Hotspot Mode)
echo ============================================================================
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    echo   Detected Laptop IP: http://%%a:8000/api
)
echo.
echo   Enter the IP above in the MAMS mobile app (Server Icon on Login Screen
echo   or inside Profile ^& Settings) to use the app wirelessly without USB!
echo ============================================================================
echo.
"%~dp0venv\Scripts\python.exe" "%~dp0manage.py" runserver 0.0.0.0:8000
pause
