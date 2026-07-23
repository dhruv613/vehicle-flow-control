@echo off
title Motorwise App (port 8082)
cd /d "%~dp0apps\mobile"

rem Detect this computer's Wi-Fi IP so the phone can reach the API
set IP=
for /f "tokens=*" %%i in ('powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Wi-Fi' -ErrorAction SilentlyContinue).IPAddress" 2^>nul') do set IP=%%i
if "%IP%"=="" set IP=localhost

set EXPO_PUBLIC_API_URL=http://%IP%:8000
echo API address for the app: %EXPO_PUBLIC_API_URL%
echo.
echo A QR code will appear below - scan it with the Expo Go app on your phone.
echo For the browser, open http://localhost:8082
echo.
npx expo start --port 8082
pause
