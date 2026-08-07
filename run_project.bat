@echo off
title Running Django AI Learning Platform
echo ========================================================
echo   KHOI DONG DU AN WEB DJANGO AI LEARNING PLATFORM
echo ========================================================
echo.
echo [1/2] Dang chuyen vao thu muc du an...
cd /d "%~dp0"

echo [2/2] Dang khoi dong may chu local (localhost:8000)...
echo.
.\venv\Scripts\python.exe manage.py runserver

echo.
echo ========================================================
echo   May chu da dung lai hoac gap loi.
echo ========================================================
pause
