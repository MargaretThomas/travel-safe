# Frontend Scaffold Prompt

**Use for:** turning an empty (or placeholder-only) `frontend/` folder into the agreed structure, with a working, runnable Expo (React Native) + TypeScript skeleton. Run `002-backend-scaffold.md` first.

**Fill in before running, once the brief drops:**
- `PROJECT_NAME`: Travel Safe
- `APP_SUMMARY`: The Travel Safe mobile app UI
- `FRONTEND_OWNERS`: Sibongiseni and Margaret

---

## Prompt

You are scaffolding the **`frontend/`** folder of `travel-safe` monorepo. Stack: Expo (React Native) + TypeScript, Jest with `jest-expo` + React Native Testing Library for tests, ESLint + Prettier. Distribution: Expo Go for local testing during the build (scan a QR code from `expo start`); final distribution (staying on Expo Go vs. an EAS build) is still undecided, so don't add EAS config here — keep this scaffold runnable purely via Expo Go.

Build this structure inside `frontend/`, replacing the placeholder README if present:

```
frontend/
├── README.md
├── LICENSE.md
├── .gitignore
├── docs/
│   ├── project-backlog.md
│   └── architecture.md
├── prompts/
└── code/
    ├── package.json
    ├── app.json
    ├── babel.config.js
    ├── tsconfig.json
    ├── .eslintrc.js
    ├── .env.example
    ├── App.tsx
    └── src/
        ├── api/           # fetch wrappers matching backend's architecture.md contract
        ├── components/
        ├── screens/
        └── __tests__/
            └── App.test.tsx
```

Specifics:

1. **`code/App.tsx`** — a minimal root component rendering the project name and a status line that calls the backend's `GET /health` endpoint (URL from `EXPO_PUBLIC_API_BASE_URL` env var) and shows connected/not-connected — this doubles as your first real integration smoke test between the two sides.

2. **`code/src/__tests__/App.test.tsx`** — one passing test asserting the component renders, using Jest (`jest-expo` preset) + React Native Testing Library, with the fetch call mocked so tests don't depend on the backend being up.

3. **`code/package.json`** — scripts: `start` (`expo start`), `test` (`jest`), `lint` (`eslint .`). Dependencies: `expo`, `react`, `react-native`; devDependencies: `typescript`, `jest-expo`, `@testing-library/react-native`, `@testing-library/jest-native`, `eslint` + the Expo/React Native ESLint config (`eslint-config-expo` or `eslint-config-universe`).

4. **`code/.env.example`** — `EXPO_PUBLIC_API_BASE_URL` placeholder pointing at the backend's local dev URL. Note that on a physical device tested via Expo Go, `localhost` won't reach a laptop's backend — use the machine's LAN IP (e.g. `http://192.168.x.x:8000`) instead, and call this out in a comment.

5. **`docs/architecture.md`** — short stack summary, a Mermaid diagram (```mermaid fenced block) showing screen/component structure, and a note to keep the consumed API contract in sync with `backend/docs/architecture.md` rather than duplicating it.

6. **`docs/project-backlog.md`** — a simple table: task, owner (either `Sibongiseni or Margaret`), status, links to relevant PR once opened.

7. **`README.md`** — how to run locally (`npm install`, `npm start` from `code/`, then scan the QR code with Expo Go), how to test (`npm run test`), a note on setting `EXPO_PUBLIC_API_BASE_URL` to the LAN IP for device testing, and a one-line pointer to `docs/architecture.md`.

8. **`.gitignore`** — standard Expo/React Native: `node_modules/`, `.expo/`, `.expo-shared/`, `dist/`, `.env`, `*.jks`, `*.p12`, `*.key`, `*.mobileprovision`.

9. **`LICENSE.md`** — MIT, matching root.

Keep the skeleton runnable end-to-end (`npm run test` passes, `npm start` boots and the app loads in Expo Go, `App.tsx` renders) before considering this scaffold done — a broken skeleton is worse than no skeleton.