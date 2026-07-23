@echo off
title Motorwise API (port 8000)
cd /d "%~dp0backend"
if not exist .venv\Scripts\python.exe (
  echo First-time setup: creating Python environment...
  py -3.13 -m venv .venv
  .venv\Scripts\python.exe -m pip install -r requirements.txt
)
echo Starting the garage API on http://localhost:8000 ...
.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
pause
