# Travel Safe — Frontend Issues

A working list of frontend build tasks for the hackathon, prioritised from 14:00 on Friday. Each item below should become its own GitHub issue in `travel-safe`. Screens and components should use the API contract in `backend/docs/architecture.md`; agree a small response shape with the backend pair before building against an endpoint that is not there yet.

---

### 1. Apply Branding (Day 1 — do first)

**Assigned to:** Sibongiseni (frontend lead)

Create a shared theme/constants file for the agreed colours, spacing, and text styles, then apply it to the app shell and every Day 1 screen. Use the supplied logo where it is readable and use system fonts if Bahnschrift or Calibri would require font-loading work. This is complete when the map, emergency flow, and Golden Local Spots screen share a consistent visual baseline; leave animation and pixel-level polish for Day 2.

### 2. Map User Interface (Day 1 MVP)

**Assigned to:** Sibongiseni (frontend lead)

Build one usable map screen with the user's current position when permission is granted, emergency-service pins from the backend, and a basic safety overlay using coloured circles or polygons from the heatmap endpoint. A pin tap should show its name, service type, and available contact detail. Request location once when the screen opens and provide a sensible default Cape Town region when permission is denied; continuous tracking, route guidance, and polished heatmap effects are Day 2 work.

### 3. Emergency Service Contact (Day 1 MVP)

**Assigned to:** Margaret (frontend developer)

Add a prominent emergency button to the map screen that opens a simple picker for Healthcare, Police, Fire, or Mountain Rescue. Load the available numbers from the backend once, show the selected service and number for confirmation, then open the phone dialler using React Native's `Linking` API. The app must never place a call automatically; handle a missing number or unsupported dialler with a clear message, and keep automatic nearest-area detection out of the Day 1 scope.

### 4. Golden Local Spots Screen (Day 1 MVP)

**Assigned to:** Margaret (frontend developer)

Build a small Golden Local Spots screen that lists the spots returned by the backend and lets a user submit a name, short description, and location. After a successful submission, refresh the list or add the returned spot locally so the demo result is immediate. Include loading, empty, validation, and request-error states, but do not add ratings, upvotes, photos, moderation, or map-based discovery for the MVP; those can be separate follow-up issues after the core flow works.

### 5. Family Location Sharing / Trusted Contacts (Day 2 stretch)

**Assigned to:** Margaret (frontend developer)

If the four Day 1 flows are stable, build a deliberately small trusted-contacts demo: let a user create or join one group with a display name, publish their latest coordinates only while sharing is enabled, and poll for the group's latest locations on a dedicated screen or as map pins. Use a temporary client identifier because authentication is deferred. Skip invitations, background tracking, presence, and true real-time updates, and show clearly when a member's last location is stale.

### 6. Global Notifications (Day 2 stretch)

**Assigned to:** Margaret (frontend developer)

Build in-app notifications against a polled `GET /api/v1/notifications` endpoint rather than adding push infrastructure. Fetch on app launch and when the app returns to the foreground, show the newest active alert as a dismissible banner, and optionally provide a short list of current alerts. Cover loading, empty, and error states. Do not request notification permissions or promise delivery while the app is closed; native push, device tokens, and background handling belong in a later version.

### 7. Search Feature on Map View (Day 2 stretch)

**Assigned to:** Sibongiseni (frontend lead)

Add a compact search field to the map screen only after the core map is stable. Use the selected map provider's geocoding service directly to return a short list of place or address matches; selecting one result should move the map to that location and drop a temporary marker. Add basic loading, no-result, and error feedback, plus simple request debouncing. Searching Golden Local Spots or emergency-service records is outside this issue unless a backend search endpoint is already complete.

### 8. Side Navigation Panel (Day 2, low risk)

**Assigned to:** Sibongiseni (frontend lead)

Add the smallest navigation pattern supported by the chosen React Native navigation library: a drawer if it is already configured, otherwise a simple menu or tab layout. Link only to screens that actually exist—Map, Golden Local Spots, and any completed stretch screens—and make the current destination clear. Keep the menu reachable and dismissible, but skip custom gestures, complex transitions, nested navigation, and placeholder destinations. Do this during a frontend lull rather than blocking the core demo flow.

### 9. Settings Screen (Day 2, optional)

**Assigned to:** Margaret (frontend developer)

Create a settings screen only if there are working preferences to control. For the hackathon, include toggles for in-app alert visibility and trusted-contact location sharing only when those features have been built, store simple preferences locally, and add short privacy explanations where useful. Do not add inactive controls for units, language, accounts, or other future ideas. If neither dependent feature is complete, close or defer this issue instead of building a screen of switches that do nothing.

### 10. User Authentication (Firebase) — deferred to v2

**Assigned to:** Unassigned until after the hackathon

Do not implement authentication for the hackathon submission. Keep the v1 app open and use clearly temporary local identifiers only where a stretch feature needs to distinguish demo users. Screens and API wrappers must not assume a Firebase session or block the main experience behind login. After the event, this issue can be replaced with separately scoped sign-up, sign-in, session restoration, and account-state work once the backend token-verification contract has been agreed.
