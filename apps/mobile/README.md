# Motorwise Garage mobile app

This is the Expo client for the garage-management system. It works immediately with polished local seed data and can be opened in a browser or in Expo Go.

```powershell
cd apps/mobile
npm install
npm run web       # browser
npm start         # press w for browser, or scan the Expo Go QR code
```

## FastAPI connection

The app is deliberately usable without a server. To point a physical phone at the FastAPI service, start the API on your LAN and set its reachable address before running Expo:

```powershell
$env:EXPO_PUBLIC_API_URL = "http://192.168.x.x:8000"
npm start -- --lan
```

Do not use `localhost` for a physical phone: it refers to the phone itself. The local repository in `src/data/garageRepository.ts` is the single swap point for real FastAPI endpoints.
