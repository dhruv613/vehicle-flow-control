# Motorwise Garage mobile app

This is the Expo client for the garage-management system. It works immediately with polished local seed data and can be opened in a browser or in Expo Go.

```powershell
cd apps/mobile
npm install
npm run web       # browser
npm start         # press w for browser, or scan the Expo Go QR code
```

## Opening on a phone with Expo Go

This project uses Expo SDK 54 because the current store release of Expo Go on a
physical device supports that SDK. Update Expo Go from the Play Store or App
Store before scanning a QR code.

If scanning a normal QR code shows **"Failed to download remote update"**, stop
the development server and start it with a tunnel and a clean Metro cache:

```powershell
npm start -- --tunnel --clear
```

Then scan the newly printed QR code. The tunnel avoids LAN/firewall and
different-Wi-Fi issues. If the tunnel reports that it timed out, the network is
blocking ngrok; use LAN mode instead. The phone and computer must be on the
same Wi-Fi network, with VPNs disabled, and Windows Firewall must allow Node.js
on private networks:

```powershell
npm start -- --lan --clear
```

## FastAPI connection

The app is deliberately usable without a server. To point a physical phone at the FastAPI service, start the API on your LAN and set its reachable address before running Expo:

```powershell
$env:EXPO_PUBLIC_API_URL = "http://192.168.x.x:8000"
npm start -- --lan
```

Do not use `localhost` for a physical phone: it refers to the phone itself. The local repository in `src/data/garageRepository.ts` is the single swap point for real FastAPI endpoints.
