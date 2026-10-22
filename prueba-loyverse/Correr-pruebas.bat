@echo off
title Pruebas Loyverse -> Supabase
cd /d "%~dp0"
set /p CODIGO=Codigo del cliente de prueba (ej. C-8571): 
set /p FASE=Fase (A = visitas / B = Premium y premio): 
node e2e.mjs %CODIGO% %FASE%
echo.
echo Ojo: la regla de 1 visita por dia hace que repetir la misma fase el mismo mes de "ya visito hoy".
pause
