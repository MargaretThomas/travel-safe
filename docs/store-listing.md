# Travel Safe · App Store & Google Play listing

Copy below describes **what the app and backend actually ship today** — Expo app
`makers.travel.safe`, version `0.0.5`, plus the FastAPI backend in `backend/code/deadman/`.

Do not add a feature to this listing before it exists in the build. The previous version of this
file described a neighbourhood-safety heatmap, live GPS and an SOS button. **None of those exist**,
in the app or in the backend. They are listed under *Planned, not shipped* so the vision stays on
record without leaking into store copy.

Every product claim below has a source path. Re-verify against that file before editing the copy.

---

## What the app does today

| Feature | What actually happens | Source of truth |
|---|---|---|
| **Check-in** | One tap sets the next deadline. The deadline is `server receive time + interval`, computed from the **server's** clock, so a wrong device clock cannot extend it. | `backend/code/deadman/checkins.py:88`, `switch.py:30-31` |
| **Interval** | 1 hour to 365 days in the API; 11 presets (1 h … 1 y) in the app; default 7 days. | `switch.py:13-15`, `app/src/lib/intervals.ts:31-43` |
| **Honest sync** | "Checked in" appears only after the server confirms. Offline check-ins are queued on the phone, labelled as unsent, and retried on launch, foreground, background, or via "Send now". | `app/src/lib/check-in-service.ts:44-50`, `store/app-store.ts:219-245` |
| **Reminders** | Local notifications only: a reminder, a final warning, and a deadline-passed notice. Rescheduled after every sync. | `app/src/lib/notifications.ts:62-88` |
| **The deadman switch** | There is **no SOS button and no countdown**. The only trigger is a **missed scheduled check-in**. A worker on the server polls every 60 s. | `backend/code/deadman/engine.py:34-44`, `worker.py:75` |
| **Location** | One fix captured **at check-in time** (cached fix ≤ 2 min old, else a fresh fix with a 4 s timeout). Not a live tracker. | `app/src/lib/location.ts:48-67` |
| **Journey sharing** | Optional background trail: balanced accuracy, 250 m distance filter, deferred, auto-pausing, opt-in, **off by default**, visible notification while on. Never counts as a check-in. | `app/src/lib/location.ts:75-90`, `strings.ts:360` |
| **Trusted contacts** | Server-side CRUD, **max 10** per user. Email and/or phone. A phone number must first receive a test WhatsApp message before the contact is saved. | `config.py:84`, `contacts.py:118-122`, `routes.py:181-192` |
| **Alert channels** | **Email (Resend) and WhatsApp only.** SMS was removed by migration 2. No push, no APNs, no FCM. | `db.py:171`, `notifications/providers.py` |
| **Alert content** | Contact's name, the user's last check-in, the time it was due, last known location (reverse-geocoded address where available), battery at last contact, and a private expiring link. States explicitly that it may not mean anything is wrong. | `notifications/messages.py:39-68` |
| **Delivery status** | `pending → sending → sent / failed / cancelled`. The schema allows `delivered` but **no code path ever writes it** — there are no delivery receipts. | `db.py:175`, `notifications/dispatcher.py:140-157` |
| **Retries** | Once per worker pass (~60 s), up to `notification_max_attempts` (code default 3). **No backoff.** Unconfigured channels and WhatsApp 401/503 are *not* retried. | `dispatcher.py:54-77`, `providers.py:35-41` |
| **Resolving** | Checking in again resolves the event, cancels unsent notifications, and sets the next deadline. No acknowledgement from recipients, and **no "all clear"** message is sent to contacts. | `checkins.py:106-137`, `backend/README.md:148-149` |
| **The emergency link** | One per notification, 256-bit capability token, no login required. Shows name, timeline, last known location and up to 500 journey points on a Mapbox map. | `links.py:1-6`, `web/emergency_page.py:22-49` |
| **Account** | Passwordless and device-bound. Deleting the account stops it immediately, revokes all links, erases location, and purges the rest later. | `accounts.py:1-5`, `profiles.py:87-130` |
| **Not in the app** | No map screen, no Explore, no analytics, no ads, no push, no SMS, no location visible to contacts in real time. | verified by search of `app/src` and `backend/code/deadman` |

### Planned, not shipped

None of the following may appear in a store listing until it exists in the submitted build.

- A Cape Town neighbourhood-safety map, heatmap, legend, or any scored-area data
- Live GPS on a map, or camera-follows-you
- An SOS button with a cancel countdown, or a manual panic trigger
- Real-time location streaming to contacts while an alert is active
- SMS as an alert channel
- Remote push notifications
- Safer-route guidance, official crime or incident feeds, emergency-service directories, city-wide
  alerts, crowdsourced spots

---

# iOS

## Subtitle

**30-character limit.** Appears under the app name on the product page.

```
Check in on your schedule
```

Character count: **25 / 30**

## Promotional text

Shown above the description. Editable without a new binary (iOS 11+). **170-character limit.**

```
Check in with one tap on a schedule you choose. Miss a deadline, and the people you picked are
emailed and messaged on WhatsApp with your last known location.
```

Character count: **158 / 170**

## Description

First three lines are what shoppers see before "more". **4,000-character limit.**

```
Travel Safe is a check-in app. Tap once on a schedule you choose. If you miss a deadline, the people
you picked are told, with the last location we received from your phone.

A CHECK-IN YOU CAN SEE
Home shows whether you are checked in, when your next deadline is, how often you check in, and who
will be contacted. If you tap while offline, the app says so plainly and keeps your check-in on the
phone until it reaches us. It never tells you that you are checked in when we have not confirmed
it.

WHEN A DEADLINE PASSES
A deadline is one simple rule: check in before this time, or we tell your people. You choose how
often, from one hour to one year. Your deadline is set on our server using our clock rather than
your phone's, so a wrong device time cannot quietly push it back.

If the deadline passes, we send a message to each contact you added. The message says it may not
mean anything is wrong. It includes when you last checked in, the time it was due, the last
location we received, and a private link with a little more detail. That link expires. Checking in
again resolves the alert, stops anything we have not sent yet, and sets your next deadline.

YOUR LOCATION
With your permission we save a location each time you check in, so your contacts know where to
start looking. If you decline, check-ins still work and your contacts are told you had no location
to share.

You can also turn on Journey sharing. While it is on, we keep a rough trail of where you have been,
in steps of about 250 m, so your last known location stays current between check-ins. It is off
until you switch it on, it shows a visible notification while it runs, and it never counts as a
check-in. Only you can check in.

TRUSTED CONTACTS
Add the people you would want to know. Each one needs an email address, a phone number, or both. If
you give a phone number, we send it a test message first and only save the contact once that
arrives, so a wrong number is caught while you are typing it rather than when it matters. You can
also send someone a note from your own phone to say what to expect. Remove anyone at any time and
they are no longer contacted.

IF SOMETHING GOES WRONG
Travel Safe is a safety net, not an emergency service. We do not contact police, ambulance or fire
services, and we cannot send anyone to you.

Alerts go out from our server rather than from your phone, so they can still be sent if your phone
is off, out of battery, or lost. We record whether each message was accepted by the email or
WhatsApp provider, and we try a few times if one fails. We cannot tell you it was received or read.

PRIVACY
No adverts, no analytics, and we do not sell your data. Your contacts and check-ins are stored on
our server, so they are still there if you change phone. You can delete your account in the app;
it stops working straight away and the rest is erased later.

IMPORTANT: Travel Safe notifies the people you choose. It does not contact emergency services, it
cannot guarantee anyone's safety, and it cannot guarantee that a message will be delivered or read.
In an emergency, contact your local emergency number.
```

Character count: **3,123 / 4,000**

## Keywords

Apple limit: **100 characters**, comma-separated. The app name is not repeated, and there are no
spaces after commas so none are wasted.

```
check in,safety,solo travel,lone worker,hiking,deadman switch,location,contacts,alert,wellbeing
```

Character count: **95 / 100**

Avoid competitor names, `Cape Town` (not shipped), `app`, `free`, `SOS`, and any crime-data claim.

---

# Android

## Short description

**80-character limit.** Shown in search and at the top of the Play listing.

```
Safety check-ins on your schedule. Miss one, and your people are told.
```

Character count: **70 / 80**

## Full description

**4,000-character limit.**

```
Travel Safe is a check-in app for people who travel alone, live alone, hike, or work on their own.
Tap once on a schedule you choose. If you miss a deadline, the people you picked are told, with
the last location we received from your phone.

A CHECK-IN YOU CAN SEE
The home screen shows whether you are checked in, when your next deadline is, how often you check
in, and who will be contacted. Tap while offline and the app says so plainly, keeps your check-in
on the phone, and sends it as soon as you are back online. It never tells you that you are checked
in when we have not confirmed it. Reminders arrive before your deadline, so a busy afternoon does
not turn into a false alarm.

WHEN A DEADLINE PASSES
A deadline is one simple rule: check in before this time, or we tell your people. You choose how
often, from one hour to one year. Your deadline is set on our server using our clock rather than
your phone's, so a wrong device time cannot quietly push it back.

If the deadline passes, we send a message to each contact you added. The message says it may not
mean anything is wrong. It includes when you last checked in, the time it was due, the last
location we received, and a private link with a little more detail. That link expires. Checking in
again resolves the alert, stops anything we have not sent yet, and sets your next deadline.

YOUR LOCATION
With your permission we save a location each time you check in, so your contacts know where to
start looking. If you decline, check-ins still work and your contacts are told you had no location
to share.

You can also turn on Journey sharing. While it is on, we keep a rough trail of where you have been,
in steps of about 250 m, so your last known location stays current between check-ins. It is off
until you switch it on, it shows a visible notification while it runs, and it never counts as a
check-in. Only you can check in.

TRUSTED CONTACTS
Add the people you would want to know. Each one needs an email address, a phone number, or both. If
you give a phone number, we send it a test message first and only save the contact once that
arrives, so a wrong number is caught while you are typing it rather than when it matters. You can
also send someone a note from your own phone to say what to expect. Remove anyone at any time and
they are no longer contacted.

IF SOMETHING GOES WRONG
Travel Safe is a safety net, not an emergency service. We do not contact police, ambulance or fire
services, and we cannot send anyone to you.

Alerts go out from our server rather than from your phone, so they can still be sent if your phone
is off, out of battery, or lost. Some phones restrict background work, which can slow reminders
and location updates; you will see a warning in the app if that is happening. We record whether
each message was accepted by the email or WhatsApp provider, and we try a few times if one fails.
We cannot tell you it was received or read.

PRIVACY
No adverts, no analytics, and we do not sell your data. Your contacts and check-ins are stored on
our server, so they are still there if you change phone. You can delete your account in the app;
it stops working straight away and the rest is erased later.

IMPORTANT: Travel Safe notifies the people you choose. It does not contact emergency services, it
cannot guarantee anyone's safety, and it cannot guarantee that a message will be delivered or read.
In an emergency, contact your local emergency number.
```

Character count: **3,454 / 4,000**

---

## How alerts actually work

Shared between both stores, because this is the part most easily over-claimed. Keep the wording in
the descriptions consistent with this.

1. **Arming.** The first check-in arms the switch. There is no separate arming step.
2. **The deadline** is `server receive time + your interval`. Server clock, always.
3. **Detection** is a server worker polling every 60 seconds. It does not depend on the phone being
   on, connected, or in the user's hands.
4. **On trigger** a snapshot is taken: the last known location, its accuracy, when it was recorded,
   and the battery level at last contact. The location is reverse-geocoded to an address via Mapbox.
   If geocoding fails, the alert still goes out with raw coordinates.
5. **One message per contact per channel.** Email goes to the email address; a phone number is
   messaged over **WhatsApp regardless of the per-contact WhatsApp flag**.
6. **Retries** happen on the next worker pass, up to the configured attempt limit, with no backoff.
   Unconfigured channels and WhatsApp 401/503 fail immediately and are not retried.
7. **What the recipient sees** is a message saying a check-in was missed, that it may not mean
   anything is wrong, the last check-in time, the due time, the last known location, and a private
   link. The link needs no login and expires; the server stores only its hash.
8. **Status shown in the app** is `Sent` at most. There is no delivery receipt, so `Delivered` is
   never displayed even though the status exists in the database.
9. **To stop it**, check in. The event resolves, unsent notifications are cancelled, and the next
   deadline is set. Recipients are not sent an "all clear".
10. **The recipient is passive.** They receive a message and a link. They do not have the app, an
    account, or any view of your location other than that link.

## Privacy and permissions

Verified against `app/app.json` and `app/src/lib/permissions.ts`, not against UI text.

| Permission | When | Notes |
|---|---|---|
| Notifications | Onboarding | Reminders only. Local notifications, no push. |
| Location, when in use | Onboarding | One fix at check-in. |
| Location, always | Only when Journey sharing is switched on | Opt-in, off by default, visible indicator/notification. |
| Face ID / fingerprint | First time app lock is used | Protects settings, contacts, and optionally check-in. |
| Contacts | Normally never | The system picker shares only the person you choose. Some Android versions need access to read the chosen record; if it fails, the app asks you to type the details. |
| SMS | Not requested | The contact invite opens the Messages composer and you press Send. |
| Battery, SIM country | Not requested | Battery level is included in an alert; SIM country is used to format phone numbers. |

**On device:** chunked JSON in `expo-secure-store` (Keychain / Keystore) — account token, profile,
a cached copy of the contact list, and the offline check-in queue. Nothing in AsyncStorage, no local
database.

**Sent to the backend:** your name, timezone, check-in interval, check-in timestamps, the location
and battery captured with each check-in, journey points while Journey sharing is on, and the name,
email and phone number of each contact you add.

**Processors to name in the privacy policy:** Resend (email); a self-hosted WhatsApp gateway built
on an unofficial WhatsApp client (WhatsApp messages); Mapbox (reverse geocoding, and the map on the
emergency page); the hosting provider.

**Honest limitations to state rather than hide:** the location in an alert is only as fresh as the
last point your phone sent; deleting a contact stops future alerts but does **not** invalidate a
link they were already sent, which stays valid until it expires; the last known location, check-in
history and alert records are retained while your account is active.

## Limitations

These belong in the description, the "what to expect" notes, and any reviewer correspondence.

- Not an emergency service. No dispatch, no monitoring, no response.
- The trigger is a missed check-in, not a panic button. There is no way to alert someone by tapping
  once in the moment you need help.
- Delivery is attempted, not guaranteed, and is never confirmed as received or read.
- The location in an alert may be hours old, or absent entirely.
- Contacts are passive. There is no two-way view and no way for them to reply in the app.
- Background refresh is restricted by some manufacturers, which can delay reminders and journey
  points. Alerts still work, because the server decides.
- The product is not localised to any city. It is not a neighbourhood-safety or crime-data product.

## Screenshot / preview notes

Match the copy above. Real screens only.

1. Home with the check-in button and the deadline card.
2. Interval picker with the presets and the resulting deadline.
3. Trusted contacts list, and the add form with the WhatsApp option.
4. Latest-alert card showing per-contact channel and status (`Sent`).
5. The message a contact receives, and the emergency page behind its link.

Keep preview copy free of safety guarantees: no "keeps you safe", "rescue", "24/7 monitoring", or
"always". Do not show a map or an SOS button; neither exists.

## Reviewer honesty

- Location: captured at check-in, and in the background only if the user enables Journey sharing.
- Contacts: used only to deliver an alert after a missed check-in.
- App lock: Face ID or device passcode on sensitive actions.
- Do not claim real-time crime statistics, guaranteed safer streets, routing around high-risk areas,
  guaranteed delivery, or emergency response.

---

## TODOs — resolve before submission

1. **Retention figures (blocking).** Code defaults are location 24 h, emergency link 30 days,
   account purge 90 days. The local `backend/code/.env` sets 80 h / 180 d / 180 d. The listing
   currently avoids specific numbers, but the App Store privacy label, the Play Data safety form,
   and the in-app text at `app/src/i18n/strings.ts:327` all need one agreed answer. Confirm what
   production actually runs.
2. **Email channel (blocking).** `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are empty in the local
   `.env`, which disables the email channel entirely. Confirm it is configured in production, or
   drop email from the descriptions.
3. **WhatsApp gateway (blocking).** It is an unofficial `whatsmeow` client and
   `backend/whatsapp/README.md:5` warns that using it may breach WhatsApp's terms. Confirm it is
   paired and decide whether the listing should name WhatsApp at all.
4. **API base URL.** `app/.env` is absent, so the endpoint the build points at is unconfirmed.
5. **Store metadata not in this repository:** app name is `Travel Safe` and the bundle / package is
   `makers.travel.safe` in both stores. Category, support URL, marketing URL, screenshots, and
   content rating are not defined anywhere in the repo and must be created.
6. **Stale documents that will fail review on their own.** `docs/privacy-policy.md` and
   `docs/terms-and-conditions.md` still describe a device-only app with no account, no backend and
   no server sync, which is no longer true. They contradict the implementation and each other.
7. **Pre-existing product bug, not fixed here.** `app/src/lib/contacts.ts:88` and
   `app/src/i18n/strings.ts:206` label a plain phone number as "SMS", but the backend sends every
   phone number over WhatsApp (`engine.py:25-31`, `db.py:171`). The in-app "Will be contacted by"
   row is therefore wrong. The listing does not repeat this claim; the app should be corrected
   separately.
