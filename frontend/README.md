# Travel Safe Frontend

Expo and React Native mobile app for Travel Safe. Maintained by Sibongiseni and Margaret.

## Run locally

From the `frontend/code/` directory:

```bash
cp .env.example .env
npm install
npm start
```

Open Expo Go on a phone connected to the same network and scan the QR code shown by Expo.

For physical-device testing, set `EXPO_PUBLIC_API_BASE_URL` in `.env` to the backend's LAN address, such as `http://192.168.x.x:8000`. A phone cannot use `localhost` to reach the backend running on your laptop.

## Test

From `frontend/code/`:

```bash
npm run test
```

See [docs/architecture.md](docs/architecture.md) for the frontend structure and API integration guidance.
