@echo off
title Running Django AI Learning Platform
echo ========================================================
echo   KHOI DONG DU AN WEB DJANGO AI LEARNING PLATFORM
echo ========================================================
echo.
echo [1/3] Dang chuyen vao thu muc du an...
cd /d "%~dp0"

echo [2/3] Dang mo trang Web tren trinh duyet...
start http://localhost:8000/

echo [3/3] Dang khoi dong may chu local (localhost:8000)...
echo.
.\venv\Scripts\python.exe manage.py runserver

echo.
echo ========================================================
echo   May chu da dung lai hoac gap loi.
echo ========================================================
pause
