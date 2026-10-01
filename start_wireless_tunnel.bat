@echo off
title MAMS Wireless Tunnel (4G/5G Mobile Access)
echo ============================================================================
echo   MAMS Wireless Tunnel (Cloudflare Quick Tunnel -> http://127.0.0.1:8000)
echo ============================================================================
echo.
echo 1. Make sure Django is running on port 8000:
echo    .\venv\Scripts\python.exe manage.py runserver 0.0.0.0:8000
echo.
echo 2. Copy the "https://....trycloudflare.com" URL printed below and paste it
echo    into the MAMS Mobile App (Login Screen Server Icon or Profile Settings).
echo ============================================================================
echo.
"%~dp0cloudflared.exe" tunnel --url http://127.0.0.1:8000
pause
