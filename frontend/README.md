# Travel Safe · Frontend

Expo React Native app for **Travel Safe**, a mobile safety companion. The current build is the **safety-compass home screen**: a native map of the Cape Town metro with a neighbourhood safety heatmap and a live GPS marker that the camera follows.

Built with Expo SDK 57, React Native 0.86 (New Architecture), React 19, and TypeScript.

## Features

- **Safety heatmap** — 12 mock safety zones around the Cape Town metro (`lib/safety-map.ts`), interpolated with inverse-distance weighting into a 9×9 grid and rendered as 81 translucent circles on the map (red = dangerous → green = safe). Expo Maps has no native heatmap layer in SDK 57, so circles are the current rendering strategy.
- **Live location** — on launch the app requests foreground location permission, resolves the device position via `expo-location` (`hooks/use-live-location.ts`), drops a pin on the map, and re-centres the camera when the position moves > 30 m. A fallback copy + retry path is available through the hook's `error`/`retry` values.
- **Native maps** — `AppleMaps.View` on iOS and `GoogleMaps.View` on Android behind a single `SafetyMap` component (`components/safety-map.tsx`). The map is native-only; web falls back to placeholder copy.

## Project structure

```
src/
  app/            Expo Router routes and layouts (Home screen in index.tsx)
  components/     UI: safety-map, safety-legend, themed-text/view, app-tabs, splash overlay
  constants/      theme tokens (assets: colors, spacing, fonts)
  hooks/          use-live-location, use-theme, use-color-scheme
  i18n/           strings.ts — single source of all user-visible copy
  lib/            pure, testable logic: safety-map (heatmap math), location (haversine)
e2e/              Maestro YAML scenarios (safety-map.yaml)
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
- **Location permissions** — usage strings and the motion/location permissions come from the `expo-maps` config plugin in `app.json`. Bundle id: `makers.travel.safe`; scheme: `travelsafe`.

## Testing

- **Unit** — `npm test`. Pure logic lives in `lib/` as `*.test.ts` files next to the code they cover (18 tests: heatmap grid/bounds/interpolation/colour stops, haversine distance). Runs under the `jest-expo` preset with the `@/` → `src/` module alias.
- **E2E** — [Maestro](https://maestro.mobile.dev) flows in `e2e/`. Run against a booted simulator:

  ```bash
  maestro test e2e/safety-map.yaml
  ```

  The flow expects a debug build installed on the simulator (app id `makers.travel.safe`), handles the iOS location-permission prompt, and asserts the map, header, and legend `testID`s.

> Note: keep assertions in `e2e/` in sync with what the Home screen actually renders — the header/safety-legend overlays are currently toggled off (commented out) in `components/safety-map.tsx` and `app/index.tsx`, while some flows still assert them.

## Limitations

- The safety zones are **mock data** in `lib/safety-map.ts` — no backend wiring yet.
- The heatmap is a **circle overlay**, not a native heatmap layer.
- `expo-maps` is **iOS/Android only**; the web target builds but the map screen does not render on web.