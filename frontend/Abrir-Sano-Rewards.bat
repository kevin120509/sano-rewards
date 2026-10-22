@echo off
title Sano Rewards - app del cliente (Supabase real)
cd /d "%~dp0"
if not exist node_modules call npm install
echo Abriendo en http://localhost:5174 ...
call npx vite --mode live --port 5174 --host --open
pause
