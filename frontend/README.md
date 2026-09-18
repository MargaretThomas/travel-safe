# Travel Safe · Frontend

Expo React Native app for **Travel Safe**, a mobile safety companion. The current build is the **safety-compass home screen**: a native map of the Cape Town metro with a neighbourhood safety heatmap and a live GPS marker that the camera follows.

Built with Expo SDK 57, React Native 0.86 (New Architecture), React 19, and TypeScript.

## Features

- **Safety heatmap** — 12 mock safety zones around the Cape Town metro (`lib/safety-map.ts`), interpolated with inverse-distance weighting into a 9×9 grid and rendered as 81 translucent circles on the map (red = dangerous → green = safe). `react-native-maps` has no cross-platform heatmap layer, so circles are the current rendering strategy.
- **Live location** — on launch the app requests foreground location permission, resolves the device position via `expo-location` (`hooks/use-map-location.ts`), drops a pin on the map, and re-centres the camera when the position moves > 30 m. Permission denied, services off, missing GPS, low accuracy, timeout, and stale-position states each surface a recoverable status card with a Retry action.
- **Native maps** — a single `react-native-maps` provider behind `components/map/safety-map.tsx`: Apple Maps on iOS (no API key) and Google Maps on Android. The map is native-only; web falls back to placeholder copy.

## Project structure

```
src/
  app/            Expo Router routes and layouts (Home screen in (home)/index.tsx)
  components/     UI: map/ (safety-map, status card, markers), safety-legend, themed-text/view
  constants/      theme tokens (assets: colors, spacing, fonts)
  hooks/          use-map-location, use-emergency-location, use-theme, use-color-scheme
  i18n/           strings.ts — single source of all user-visible copy
  lib/            pure, testable logic: safety-map (heatmap math), location (haversine), map/ (geometry, markers, controller)
e2e/              Maestro YAML scenarios (sos, trusted-contacts, safety-map, map/*)
ios/ android/     generated native projects (gitignored — see "Native builds")
```

Keep screens thin and put reusable logic in `lib/`, shared UI in `components/`, all copy in `i18n/strings.ts`, and a stable `testID` on every interactive control. See [AGENTS.md](./AGENTS.md) for the full convention guide.

## Getting started

```bash
npm install
npx expo start
```

Open the app on a development build, iOS simulator, or Android emulator from the CLI output. The only implemented route is the Home screen (`/`).

### Scripts

| Command | Purpose |
|---|---|
| `npm start` | Start the Expo dev server (Metro) |
| `npm run ios` | Build & run the iOS dev build (`expo run:ios`) |
| `npm run android` | Build & run the Android dev build (`expo run:android`) |
| `npm run web` | Run the web target (`expo start --web`) — the map screen is native-only |
| `npm test` | Unit tests (Jest / jest-expo) |
| `npm run lint` | ESLint (`expo lint`) |

## Native builds

`ios/` and `android/` are generated and gitignored. Regenerate them with `npx expo prebuild` (note: `prebuild --clean` wipes any manual native edits).

Two native config points matter:

- **iOS scene support** — `expo-build-properties` sets `ios.enableSceneSupport: true`, which produces the `UIApplicationSceneManifest` (`EXExpoAppSceneDelegate`) required by React Native 0.86 on the iOS 26+/27 SDK. The generated `AppDelegate` is the standard `ExpoAppDelegate` subclass; do not replace it with a window-owning custom app delegate.
- **Location permissions** — the `expo-location` config plugin provides the iOS usage string (`locationWhenInUsePermission`). Bundle id: `makers.travel.safe`; scheme: `travelsafe`.
- **Maps** — the `react-native-maps` config plugin injects the Android Google Maps key from `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` (app.config.ts). iOS uses Apple Maps and needs no key. Without the env var the Android build still succeeds but renders no tiles.

Expo config lives in `app.config.ts` (converted from `app.json` so the Maps API key can be read from the environment). Never commit the key — set `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` in your shell or `.env.local`.

## Testing

- **Unit** — `npm test`. Pure logic lives in `lib/` as `*.test.ts` files next to the code they cover (207 tests: heatmap grid/bounds/interpolation/colour stops, haversine distance, map coordinate/region/marker geometry, map controller, location reducer, `useMapLocation` hook, SOS/map separation, plus the store and transport suites). Runs under the `jest-expo` preset with the `@/` → `src/` module alias.
- **E2E** — [Maestro](https://maestro.mobile.dev) flows in `e2e/`. Run against a booted simulator:

  ```bash
  maestro test e2e/safety-map.yaml
  maestro test e2e/map/
  ```

  Flows expect a debug build installed on the simulator (app id `makers.travel.safe`), handle the iOS/Android location-permission prompt, and assert the map, controls, status cards, and legend `testID`s. `e2e/map/map_location_permission.yaml` requires the simulator location permission to be reset first (`xcrun simctl privacy booted reset location makers.travel.safe`).

## Limitations

- The safety zones are **mock data** in `lib/safety-map.ts` — no backend wiring yet.
- The heatmap is a **circle overlay**, not a native heatmap layer.
- **Android map tiles require a Google Maps API key** (`EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`); iOS uses Apple Maps and needs none.
- `react-native-maps` is **iOS/Android only**; the web target builds but the map screen does not render on web.