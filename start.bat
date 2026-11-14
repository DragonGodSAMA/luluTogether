@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title Hainan Carpool
chcp 65001 >nul

set "APP_ID=hainan-carpool-4.7-ui-1.5"

set "NODE_EXE=%~dp0runtime\node.exe"
if not exist "%NODE_EXE%" (
  where node >nul 2>nul
  if errorlevel 1 goto :runtime_missing
  set "NODE_EXE=node"
)

if not exist "backend\server.js" (
  echo [ERROR] Project files are incomplete. Run start.bat from the folder that contains backend\server.js.
  pause
  exit /b 1
)

if not exist "frontend\dist\index.html" (
  echo [ERROR] The frontend build is missing: frontend\dist\index.html
  echo Please use the complete portable package.
  pause
  exit /b 1
)

if not exist "backend\node_modules\express" (
  echo [ERROR] Backend dependencies are missing.
  echo Please use the complete portable package.
  pause
  exit /b 1
)

"%NODE_EXE%" -e "const [major, minor] = process.versions.node.split('.').map(Number); process.exit(major > 22 || (major === 22 && minor >= 5) ? 0 : 1)"
if errorlevel 1 goto :runtime_old

set "PORT_RESULT="
for /f "usebackq delims=" %%P in (`powershell.exe -NoProfile -Command "$appId='%APP_ID%'; $used=@(); foreach($c in @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue)){ if($c.LocalPort -ge 3000 -and $c.LocalPort -le 3099){ $used += [int]$c.LocalPort } }; foreach($p in $used){ try { $health=Invoke-RestMethod -TimeoutSec 1 -Uri ('http://127.0.0.1:'+$p+'/api/health'); if($health.data.appId -eq $appId){ Write-Output ('EXISTING:'+ $p); exit 0 } } catch {} }; foreach($p in 3000..3099){ if($used -notcontains $p){ Write-Output ('NEW:'+ $p); exit 0 } }; exit 1"`) do set "PORT_RESULT=%%P"

if not defined PORT_RESULT (
  echo [ERROR] No available port was found between 3000 and 3099.
  pause
  exit /b 1
)

for /f "tokens=1,2 delims=:" %%A in ("!PORT_RESULT!") do (
  set "START_MODE=%%A"
  set "APP_PORT=%%B"
)

if /i "!START_MODE!"=="EXISTING" (
  echo Hainan Carpool 4.7 is already running on port !APP_PORT!.
  echo Close its application window before starting it again.
  if not defined CARPOOL_NO_BROWSER pause
  exit /b 0
)

if not defined APP_PORT (
  echo [ERROR] Could not select a startup port.
  pause
  exit /b 1
)

echo Starting Hainan Carpool 4.7 on http://127.0.0.1:!APP_PORT! ...
echo Closing the application window will stop the local service.
echo.
cd /d "%~dp0backend"
set "PORT=!APP_PORT!"
if not defined CARPOOL_NO_BROWSER set "CARPOOL_MANAGED_BROWSER=1"
"%NODE_EXE%" server.js
set "APP_EXIT_CODE=!ERRORLEVEL!"
echo.
if not "!APP_EXIT_CODE!"=="0" (
  echo The application stopped unexpectedly. Review the message above.
  pause
)
exit /b !APP_EXIT_CODE!

:runtime_missing
echo [ERROR] Portable Node.js runtime is missing: runtime\node.exe
echo Please extract the complete ZIP before running start.bat.
pause
exit /b 1

:runtime_old
echo [ERROR] The bundled Node.js runtime is too old.
pause
exit /b 1
