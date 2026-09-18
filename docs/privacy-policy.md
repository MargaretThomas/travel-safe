# Travel Safe · Privacy Policy

**Last updated:** 18 September 2026

This privacy policy describes how **Travel Safe** (`makers.travel.safe`) handles information when you use the iOS or Android app. It is written for App Store and Play Store review and should be hosted at a public URL before submission.

**Operator:** The Makers (Travel Safe)  
**Contact:** Replace this line with a working privacy email before you publish (for example `privacy@example.com`).

Travel Safe is a Cape Town neighbourhood safety map with optional live location, trusted contacts, and SOS alerts. We designed the current version so that **personal data stays on your device** unless you send an SOS.

This is a template for store listing, not legal advice. Have it reviewed if you incorporate a company or collect more data later.

---

## 1. Summary

| Data | Collected? | Where it lives | Shared? |
|---|---|---|---|
| Account / email / password | No | — | — |
| Precise location (while using the app) | Yes, if you allow it | On device; included in SOS SMS you send | Only with people you chose as trusted contacts, via SMS you send |
| Address book | Yes, if you allow it and pick people | Only the contacts **you select** are saved on device | Phone numbers are used as SOS SMS recipients |
| Trusted-contact names, numbers, relationship | Yes, if you add them | On this device (local database) | Numbers are used when you trigger SOS |
| Neighbourhood safety overlay | In-app scores for Cape Town, not your personal data | Shipped with the app | Not linked to you |
| Analytics, advertising IDs, crash reports | Not in this version | — | — |

We do **not** operate a user account, cloud backup, or server sync for contacts or location in this version.

---

## 2. Information we process

### Location

If you grant **location while using the app**, Travel Safe uses GPS to:

- show a “you are here” marker on the map
- keep the camera with you as you move
- include coordinates (and a maps link) in SOS messages
- send further location updates while an emergency session is active

Location is requested in the **foreground**. We do not ask for always-on / background tracking in this version.

You can refuse or later revoke location in system Settings. The map still opens; you will see a status explaining that location is unavailable.

### Contacts

If you grant **contacts** permission, you can pick people from your address book as trusted contacts (up to five). We do **not** upload your full address book.

You can also type a name and number by hand. Only the records you add are stored locally.

### SOS messages

When you press SOS and the countdown finishes, the app opens or sends **SMS** to your trusted contacts. Those messages include your current location (if available). Your mobile carrier delivers the SMS; message rates may apply.

We do not operate the SMS network. Recipients see whatever is in the message. Ending the emergency session stops further location updates from the app.

### Device storage

Trusted contacts and related app state are stored **on this device** (including a local database). Uninstalling the app removes that data from the device.

### Map tiles

The map is rendered by the device map SDK (Apple Maps on iOS; Google Maps on Android when a Maps API key is configured). Those providers may process map requests according to **Apple’s** or **Google’s** own privacy policies. Travel Safe does not send them your trusted-contact list.

---

## 3. How we use information

We use the information above only to:

- operate the safety map and location marker
- let you manage trusted contacts
- send SOS alerts and live location updates that **you** initiate
- show in-app status when permission, GPS, or accuracy fails

We do **not** sell personal data, use it for advertising, or build a marketing profile.

---

## 4. Sharing

We share personal data only in these cases:

- **You trigger SOS** — your chosen contacts receive SMS with location.
- **You use the OS** — Apple, Google, and your carrier process location, maps, SMS, and permissions as part of the phone.
- **Legal duty** — if the law requires it (we do not currently host a backend that would hold your SOS history).

Neighbourhood colours on the map are **not** official crime statistics and are not tied to your identity.

---

## 5. Children

Travel Safe is not directed at children under 13 (or the equivalent minimum age in your country). We do not knowingly collect personal data from children. If you believe a child has used the app in a way that stored contacts on a device, delete the app or clear the trusted-contact list.

---

## 6. Your choices

- **Location:** Settings → Travel Safe → Location.
- **Contacts:** Settings → Travel Safe → Contacts.
- **Trusted contacts:** remove people in the app at any time.
- **SOS:** cancel during the countdown; end an active session to stop sharing.
- **Delete data:** uninstall the app, or remove contacts in-app.

There is no cloud account to download or erase on our servers in this version.

---

## 7. International users

The app is built around the **Cape Town** metro overlay. Using it elsewhere still processes location and contacts on-device as described above. Map providers may process tile requests in other countries.

---

## 8. Retention

On-device data is kept until you delete it or uninstall the app. SMS copies may remain in your (and your contacts’) message history according to the phone and carrier.

---

## 9. Security

Trusted contacts are stored locally. We take reasonable steps to keep the app’s local storage ordinary and limited, but no mobile device is perfectly secure. Do not add contacts you do not trust to receive your location.

---

## 10. Changes

If we add accounts, analytics, a backend, live crime feeds, or other collection, we will update this policy and the App Store / Play Store data disclosures before those features ship. Continued use after an update means you accept the revised policy.

---

## 11. Contact

Questions about this policy: **[privacy contact email — add before store submission]**.

For App Store Connect / Play Console: host this document at a stable HTTPS URL and paste that URL into the privacy-policy field. Keep the App Privacy / Data safety form aligned with this document (location, contacts; not sold; not used for tracking in this version).
