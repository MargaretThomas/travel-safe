# Travel Safe · App Store & Play Store listing

Copy below is based on **what the mobile app actually ships today** (Expo app `makers.travel.safe`, version `0.0.2`), not the full product vision.

Use the vision (safer routing, live crime feeds, emergency-service directories, city-wide alerts, crowdsourced local spots) in the pitch. Do **not** put those claims in store listings until the features exist. Apple and Google reject or penalise listings that over-promise safety or crime data.

## What the app does today

| Feature | What the user sees |
|---|---|
| **Safety Map (Home)** | Native map of the Cape Town metro with a colour heatmap (green → amber → red), a “you are here” marker, zoom / recenter, and a neighbourhood safety legend. |
| **Live location** | Foreground GPS after permission. Camera follows when you move. Recoverable states: permission off, location services off, no GPS, low accuracy, timeout. |
| **Trusted contacts** | Up to 5 people, picked from the address book or typed in. Stored **only on device**. Onboarding explains why contacts matter and that data is not synced. |
| **Emergency SOS** | SOS button with a short cancel countdown, then SMS alerts to trusted contacts that include current coordinates. While the emergency is active, live location updates are sent; the user can end the session. |

Home also has shortcuts into SOS and Trusted Contacts. Explore / recommendations is not enabled.

### Not in this listing (planned, not shipped)

Safer route guidance, live crime / official incident data, local emergency numbers (fire, police), global alerts (protests, floods), and a crowdsourced / community-vetted spots platform.

The heatmap is currently driven by **in-app neighbourhood scores for Cape Town**, not a live crime API. Store copy describes it as a neighbourhood safety overlay, not as official crime statistics.

---

# iOS

## Subtitle

**30-character limit.** Appears under the app name on the product page.

```
Cape Town safety map & SOS
```

Character count: **26 / 30**

Alternatives if that one is taken or feels too local:

| Subtitle | Chars |
|---|---|
| `Safety map, SOS & contacts` | 26 |
| `Travel safer in Cape Town` | 25 |

## Promotional Text

Shown above the description. You can change this without a new binary (iOS 11+). **170-character limit.**

```
See neighbourhood safety around you in Cape Town, drop a live pin on the map, and send SOS alerts with your location to trusted contacts — with a cancel countdown.
```

Character count: **163 / 170**

Shorter option if you want more room for a campaign line later:

```
Cape Town safety heatmap, live GPS, and SOS alerts to people you trust. Cancel during the countdown if it was a false alarm.
```

Character count: **124 / 170**

## Description

Paste as a single field. First three lines are what shoppers see before “more”.

```
Travel Safe helps you stay oriented in Cape Town: a neighbourhood safety map, your live location, and a one-tap SOS that alerts the people you trust.

SAFETY MAP
Open the map to see a colour overlay of neighbourhood safety across the Cape Town metro — from greener areas to higher-caution zones. A legend on screen makes the scale easy to read. Zoom, pan, and recenter when you want to look around.

YOU ARE HERE
Allow location while you use the app and Travel Safe places you on the map. The camera follows as you move. If GPS is weak, permission is off, or location services are disabled, the app explains what to fix and lets you retry.

TRUSTED CONTACTS
Choose up to five people who should hear from you in an emergency — family, a partner, a friend, or a caregiver. Pick them from your address book or type a name and number. Contacts stay on this device; they are not uploaded or shared unless you send an alert.

EMERGENCY SOS
When you feel unsafe, press SOS. A short countdown gives you time to cancel. If the countdown finishes, Travel Safe notifies your trusted contacts by SMS with your current location. While the emergency is active, it keeps sending location updates so they can follow along. End the session when you are safe.

Travel Safe is built for visitors and locals who want a clearer picture of the area around them — and a simple way to call for help from people who already know them.

Travel Safe does not replace emergency services. In a life-threatening situation, contact local police, medical, or fire services directly.
```

Character count: **1,550 / 4,000** (room to add new features later).

## Keywords

Apple limit: **100 characters**, comma-separated. Do not repeat the app name (`Travel Safe`). Spaces after commas waste quota; the field below uses none.

```
Cape Town,safety,map,SOS,tourist,travel,heatmap,GPS,emergency,contacts,alert,location
```

Character count: **85 / 100**

Optional extras if you drop a weaker term (keep total ≤ 100): `visitor`, `neighbourhood`, `SMS`.

Avoid: competitor names, `Cape Town` twice, `app`, `free`, and claims like `crime data` until a live feed ships.

---

# Android

## Short description

**80-character limit.** Shown in search and at the top of the Play listing.

```
Cape Town safety heatmap, live GPS, and SOS alerts to trusted contacts
```

Character count: **70 / 80**

Backup (60 chars) if you need a less Cape Town–specific line:

```
Safety heatmap, live GPS, and SOS alerts to people you trust
```

## Full description

**4,000-character limit.**

```
Travel Safe is a mobile safety companion for Cape Town. See a neighbourhood safety heatmap, follow your live location on the map, and alert trusted contacts with SOS when you need help.

SAFETY MAP
The home screen is a native map of the Cape Town metro with a colour overlay: greener neighbourhoods, amber caution, and red for higher-risk areas. A legend sits on the map so you can read the scale at a glance. Zoom in, zoom out, or recenter on yourself.

YOUR LOCATION
With location permission, Travel Safe shows where you are and keeps the map with you as you move. If permission is denied, location services are off, GPS is missing, or accuracy is low, you get a clear status and a retry action — not a silent failure.

TRUSTED CONTACTS
Set up to five people who should be notified in an emergency. Add them from your phone’s contacts or type their details. Choose a relationship (family, partner, friend, caregiver, or other). Your list is stored only on this device and is not synced to a server.

EMERGENCY SOS
Press SOS when you feel unsafe. A short countdown lets you cancel if it was accidental. When the alert goes out, your trusted contacts receive an SMS with your current coordinates. During an active emergency, Travel Safe sends live location updates. End the emergency to stop sharing.

Travel Safe is for tourists and anyone moving through unfamiliar parts of the city who want context on the neighbourhood around them and a simple way to reach their own people.

This app does not replace police, ambulance, or fire services. If you are in immediate danger, call local emergency numbers.
```

Character count: **1,604 / 4,000**.

---

## Screenshot / preview notes (for the store, not the text fields)

When you attach previews, match this copy:

1. Safety Map with heatmap + “You are here”
2. Legend (Safe → Dangerous)
3. SOS idle + countdown
4. Emergency active (alert sent / live updates)
5. Trusted contacts list / add flow

Do not show Explore, route lines, or “local gems” until those screens exist.

## Reviewer honesty

- Location: used to place you on the map and to include coordinates in SOS messages.
- Contacts: used only when the user picks trusted contacts; SOS then opens SMS to those numbers.
- Do not claim real-time crime statistics, guaranteed safer streets, or routing around high-risk areas in this version.
