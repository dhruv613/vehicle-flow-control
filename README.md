# AutoFlow Garage OS

AutoFlow is a cross-platform garage management system for independent workshops and multi-bay service centres. One Expo application runs on Android, iOS, and the web; a FastAPI service provides the local API and seeded demo data.

## What is included

- Responsive operations dashboard with live daily workload, revenue, and bay metrics
- Customer and vehicle records with search, filters, and quick actions
- Service work orders, status changes, technician assignments, and inspection notes
- Appointment calendar, inventory alerts, estimates/invoices, and business settings
- Desktop sidebar and mobile bottom navigation with native-feeling modals and transitions
- A restrained premium palette built from the supplied colours: white surfaces, black primary actions/text, and `#B00020` for error and urgent states
- A documented FastAPI REST API with validation, CORS, SQLite-backed demo persistence, and interactive OpenAPI docs

## Project layout

```text
apps/
  mobile/       Expo + React Native application (Android, iOS, web)
backend/
  app/          FastAPI application and local data store
  tests/        API smoke tests
docs/           Product and API notes (when applicable)
```

The previous Vite/Express prototype is not the supported application. The canonical commands below run the Expo and FastAPI implementation.

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

The API starts at `http://localhost:8000`; its interactive contract is at `http://localhost:8000/docs`.

### 2. Start the app in a browser

Open a second terminal:

```powershell
cd apps\mobile
npm install
npm run web
```

### 3. Open it with Expo Go

On your computer and phone, use the same Wi-Fi network. Find the computer's LAN address (for example, `192.168.1.20`) and set it before starting Expo:

```powershell
cd apps\mobile
$env:EXPO_PUBLIC_API_URL = "http://192.168.1.20:8000"
npm run start
```

Scan the QR code with Expo Go. `localhost` works for the browser on the development computer, but a physical phone must use the computer's LAN address. The app retains seeded demo data when the API is not reachable, so the interface remains usable while setting up a device.

## Local API checks

With the virtual environment active in `backend/`:

```powershell
pytest
```

## Product boundary

This local build is designed for demonstration and client validation. It uses seeded local data and does not claim production authentication, payment processing, or multi-tenant security. Those are intentionally clear next implementation steps before selling it as a hosted SaaS product.
