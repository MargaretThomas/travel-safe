# Backend Architecture

The backend runs on Python 3.12 with FastAPI and Uvicorn. It serves the Travel Safe mobile client and can connect to Supabase Postgres when persistent storage is needed.

```mermaid
flowchart LR
    Mobile[React Native / Expo mobile client] --> API[FastAPI backend]
    API -. optional .-> DB[(Supabase Postgres)]
```

## API contract

Update this table first whenever an endpoint changes so the frontend team has a reliable contract.

| Endpoint | Method | Request shape | Response shape |
|---|---|---|---|
| `/health` | `GET` | None | `{ "status": "ok" }` |
