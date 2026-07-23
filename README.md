# Motorwise Garage OS

Motorwise is a cross-platform garage management system for independent workshops and multi-bay service centres. One Expo application runs on **Android, iOS, and the web**; a FastAPI service provides the authenticated local API and seeded demo data.

## What is included

- Sign-in with server-backed sessions (PBKDF2-hashed passwords, bearer tokens) and a polished login page in the same design language as the app
- Responsive operations dashboard with live daily workload, revenue, and bay metrics
- Customer and vehicle records with search, filters, and quick actions
- Service work orders, status changes, technician assignments, and inspection checklists
- Appointment calendar, inventory alerts with stock adjustments, and business settings
- **Billing**: invoices with line items, discount and tax calculation, payment recording, and settlement tracking
- Notifications panel with real alerts (urgent jobs, low stock, ready vehicles, today's schedule)
- Write-through sync: every change is applied instantly on-device and pushed to the FastAPI service when it is reachable; data also persists locally across refreshes
- Desktop sidebar and mobile bottom navigation with native-feeling modals and transitions
- A restrained premium palette built from the supplied colours: white surfaces, black primary actions/text, and `#B00020` reserved for error and urgent states
- A documented FastAPI REST API with validation, CORS, JSON-backed demo persistence, and interactive OpenAPI docs

## Demo sign-in

| Username | Password    | Role            |
| -------- | ----------- | --------------- |
| `admin`  | `garage123` | Garage owner    |
| `mira`   | `garage123` | Service advisor |

The login page also shows these accounts as one-tap chips. When the API is unreachable, the same accounts work offline against the local demo workspace.

## Project layout

```text
apps/
  mobile/       Expo + React Native application (Android, iOS, web)
backend/
  app/          FastAPI application, auth, and local data store
  tests/        API tests (auth, CRUD, invoices, stock)
```

The previous Vite/Express prototype at the repository root is not the supported application. The canonical commands below run the Expo and FastAPI implementation.

## Run locally

### 1. Start the API

From a PowerShell terminal at the repository root:

```powershell
cd backend
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API starts at `http://localhost:8000`; its interactive contract is at `http://localhost:8000/docs`. Sign in via `POST /api/auth/login` and send the returned token as an `Authorization: Bearer` header — every other `/api` route requires it.

### 2. Start the app in a browser

Open a second terminal:

```powershell
cd apps\mobile
npm install
$env:EXPO_PUBLIC_API_URL = "http://localhost:8000"
npm run web
```

### 3. Open it with Expo Go on a phone

Use the same Wi-Fi network on your computer and phone. Find the computer's LAN address (for example, `192.168.1.20`) and set it before starting Expo:

```powershell
cd apps\mobile
$env:EXPO_PUBLIC_API_URL = "http://192.168.1.20:8000"
npm run start
```

Scan the QR code with Expo Go. `localhost` works for the browser on the development computer, but a physical phone must use the computer's LAN address. If the API is not reachable the app stays fully usable with locally persisted demo data, so the interface remains demonstrable while setting up a device.

## Deploy as a single server

Build the web app once and the FastAPI process serves both the API and the interface from one port:

```powershell
cd apps\mobile
npx expo export --platform web     # writes apps/mobile/dist

cd ..\..\backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Open `http://<server-address>:8000` — the production web build automatically talks to the API on its own origin, so no environment variable is needed.

## Local API checks

With the virtual environment active in `backend/`:

```powershell
pytest
```

## Product boundary

This local build is designed for demonstration and client validation. Sessions and password hashing are real, but it uses seeded local data and does not claim production-grade multi-tenant security, payment processing, or backups. Those are the intentional next steps before selling it as a hosted SaaS product.
