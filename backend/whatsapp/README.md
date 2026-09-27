# whatsapp-bot

WhatsApp gateway that exposes an HTTP API for sending messages, images, and attachments to a phone number via WhatsApp Web (uses [whatsmeow](https://go.mau.fi/whatsmeow/), an unofficial WhatsApp Web client library).

> **Note:** This is an unofficial WhatsApp client. Using it may violate WhatsApp's Terms of Service and can result in your account being banned. Use at your own risk with a dedicated number.

## Features

- Pair once via QR code (WhatsApp > Linked Devices)
- `POST /send` API to send:
  - plain text messages
  - image messages (with optional caption)
  - any other file as a document attachment (with optional caption)
- Bearer-token authentication on `POST /send`
- No random/scheduled messaging — the app only sends when the API is called

## Requirements

- Go 1.26+
- A phone number with WhatsApp that can scan a QR code

## Setup

```bash
cp .env.example .env
# set WHATSAPP_BOT_TOKEN (openssl rand -hex 32) to the same value the API uses
go build -o main .
./main
```

On first run the app is not logged in, so it connects and writes a QR code to `qr.png` (and renders it in the terminal). Scan it with your phone (WhatsApp > Linked Devices) to pair. Session data is persisted in `store.db`; subsequent runs reconnect automatically.

The HTTP server starts **before** pairing, so while the QR is waiting to be scanned `/send` returns `503 not connected to WhatsApp` (rather than refusing the connection) and `GET /health` reports `"connected": false`.

> `store.db` is the paired session — the device keys that let this process send and
> receive as the account. It is git-ignored and must never be committed or shared.

To re-pair later (e.g. after logging out), stop the bot, delete `store.db` and `qr.png`, and run again.

## Configuration

| Variable             | Description                                                    | Default     |
| -------------------- | -------------------------------------------------------------- | ----------- |
| `HOST`               | Interface to bind. Keep on loopback.                            | `127.0.0.1` |
| `PORT`               | HTTP port to listen on                                          | `8080`      |
| `WHATSAPP_BOT_TOKEN` | Required bearer token for `POST /send`. Startup fails if unset.  | —           |

## API

### POST `/send`

Requires `Authorization: Bearer $WHATSAPP_BOT_TOKEN`. Without it the request is
rejected with `401`. Accepts `multipart/form-data`.

| Field        | Required | Description                                             |
| ------------ | -------- | ------------------------------------------------------- |
| `phone`      | yes      | Phone number in international format, `+`/spaces optional |
| `message`    | no       | Plain text message, or caption when `image`/`attachment` is sent |
| `image`      | no       | Image file (`image/*`). Sends a WhatsApp image.         |
| `attachment` | no       | Any other file. Sends a WhatsApp document.              |

At least one of `message`, `image`, or `attachment` must be provided.

**Examples**

Send a text message:

```bash
curl -H "Authorization: Bearer $WHATSAPP_BOT_TOKEN" \
  -F "phone=+6281234567890" -F "message=Hello!" http://localhost:8080/send
```

Send an image with a caption:

```bash
curl -H "Authorization: Bearer $WHATSAPP_BOT_TOKEN" \
  -F "phone=+6281234567890" -F "message=Check this out" -F "image=@photo.jpg" http://localhost:8080/send
```

Send a file as a document:

```bash
curl -H "Authorization: Bearer $WHATSAPP_BOT_TOKEN" \
  -F "phone=+6281234567890" -F "attachment=@report.pdf" http://localhost:8080/send
```

**Responses**

- `200 OK`

```json
{
  "ok": true,
  "id": "3EB0C1C2...",
  "jid": "6281234567890@s.whatsapp.net"
}
```

- `400 Bad Request` — invalid/missing phone, unsupported file, no content
- `401 Unauthorized` — missing or wrong bearer token
- `503 Service Unavailable` — not connected to WhatsApp
- `500 Internal Server Error` — upload/send failure

All errors return `{ "ok": false, "error": "..." }`.

### GET `/health`

Unauthenticated. Intended for readiness probes; reveals only connection state.

```json
{ "ok": true, "paired": true, "connected": true }
```

## Notes

- The payload (including any file) is limited to 50 MB.
- Sending to a number not in your contacts will still deliver the message, but it appears as a non-contact chat in WhatsApp.
- The gateway binds to `127.0.0.1` by default. It has no TLS, so do not set `HOST` to a public address — put a TLS-terminating reverse proxy in front of it instead.
