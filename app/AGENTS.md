# Deadman Check-in App Agent Guide

Scope: this file applies to the entire `app/` workspace, including Android, iOS, shared React Native code, tests, and e2e flows.

## Project Map
- `app/` contains Expo Router screens and route layouts.
- `components/` contains reusable UI, from `base` primitives up through `molecules` and `organisms`.
- `lib/` contains business logic, pure helpers, API adapters, sync, notifications, and other testable utilities.
- `db/` contains the SQLite schema, client, passphrase handling, repository layer, and the one-shot Keychain import.
- `drizzle/` contains generated migration SQL, its metadata, and the bundle the migrator reads.
- `store/` contains the shared client state and the legacy persisted-state types.
- `i18n/` contains translations and localization helpers.
- `e2e/` contains Maestro YAML scenarios for feature coverage.

## Hard Rules
- Every implemented function must have unit test coverage.
- Every user-facing feature must have e2e coverage.
- All user-visible copy must come from `i18n/`; do not hardcode new UI strings.
- Every new interactive control or critical screen state must expose a stable `testID` for e2e.
- Prefer pure, testable helpers over logic embedded directly in screens or components.
- Do not introduce new `any`, `ts-ignore`, or `eslint-disable` usage unless there is no safe alternative and the boundary is tightly isolated.
- Do not commit secrets, credentials, keystore data, private URLs, or release passwords into source-controlled files.
- Do not hand-edit generated or vendored output such as `node_modules/`, `.expo/`, `android/build/`, `ios/Pods/`, or `drizzle/` migrations.

## Architecture
- Use Expo Router conventions for navigation; route files and folder names define the screen structure.
- Use the `@/` import alias consistently instead of long relative paths.
- Keep screens thin: orchestration belongs in routes, reusable behavior belongs in `lib/`, and shared UI belongs in `components/`.
- Keep every database read and write in `db/repository.ts`. The Drizzle handle is not exposed, so nothing outside `db/` writes SQL; change `db/schema.ts` and regenerate with `yarn db:generate` when the shape changes.
- Screens and the store hold credentials only through `AuthSession`; auth tokens and the SQLCipher passphrase stay in the Keychain and must never move into SQLite.
- Preserve the existing component hierarchy when adding UI: `base` for primitives, `molecules` for small composites, and `organisms` for larger assemblies.

## Testing
- Put unit tests next to the logic they exercise, usually as `*.test.ts` files under `lib/`, `db/`, `store/`, or `i18n/`.
- The real repository needs the `expo-sqlite` native module, so store and migration logic is tested against the in-memory `db/fake-repository.ts`. SQL-level behaviour is covered by the Maestro flows instead.
- Add or update Maestro scenarios in `e2e/` for every new feature, major flow, or navigation path.
- Prefer stable selectors in e2e tests; avoid relying on fragile copy when a `testID` can be added.
- Update translation tests whenever locale keys or translation trees change.
- Update or extend unit tests when changing date math, check-in queueing, sync, notifications, API adapters, data mappers, or DB repository logic.

## Runtime
- Preserve the startup order in `app/_layout.tsx`: background task registration, notification configuration, then an awaited `startServices()` that opens the database, runs migrations, and imports any legacy Keychain state. Only after that does `hydrate()` run, and the splash screen is hidden once it has. Never render screens against a schema that is not current yet.
- Background tasks run headless, so `lib/services.ts` must stay able to bootstrap the database without `_layout` ever running.
- Keep notification, sync, and background-task behavior in `lib/` helpers so it stays testable.
- Keep Android permissions, iOS usage strings, app scheme, and Expo plugin config aligned with `app.json` and the native manifests. The database is encrypted with SQLCipher, so a development build is required; it does not run in Expo Go.
- Treat signing config and other release-only values as sensitive; do not duplicate or move them into new committed files.

## Feature Areas
- Current user-facing areas include onboarding, home status, check-in, emergency contacts, account, and settings.
- When changing one of those areas, update the related screen, helper, unit tests, and e2e flow together.
- When changing labels, IDs, or navigation, check any affected Maestro flow before finishing.

## Working Style
- Make the smallest change that fixes the root cause.
- Favor refactors that increase testability over one-off patches.
- Remove debug logging before finishing unless the logging is part of intentional error handling.
- If a change touches routing, storage, permissions, or startup behavior, audit the surrounding screens and tests before closing the task.
- at the end explain what changes were made and why.
