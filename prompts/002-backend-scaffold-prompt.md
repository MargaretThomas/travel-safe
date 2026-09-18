# Backend Scaffold Prompt

**Use for:** turning an empty (or placeholder-only) `backend/` folder into the agreed structure, with a working, runnable FastAPI skeleton. Run `001-root-scaffold.md` first.

**Fill in before running, once the brief drops:**
- `PROJECT_NAME`: Travel Safe
- `API_SUMMARY`: Travel Safe FastAPI backend that powers the Travel Safe mobile app
- `BACKEND_OWNERS`: Lathithaa and Zoe

---

## Prompt

You are scaffolding the **`backend/`** folder of `travel-safe` monorepo. Stack: Python 3.12, FastAPI, pytest, ruff. Deployment target: Render (Web Service, root directory `backend/code`, branch-per-environment already configured — don't add deploy config here, Render reads `backend/code` directly).

Build this structure inside `backend/`, replacing the placeholder README if present:

```
backend/
├── README.md
├── LICENSE.md
├── .gitignore
├── docs/
│   ├── project-backlog.md
│   └── architecture.md
├── prompts/
└── code/
    ├── requirements.txt
    ├── pytest.ini (or pyproject.toml [tool.pytest.ini_options])
    ├── .env.example
    ├── src/
    │   ├── main.py
    │   ├── api/
    │   │   └── routes/
    │   ├── core/          # config, settings
    │   └── models/        # pydantic schemas
    └── tests/
        └── test_health.py
```

Specifics:

1. **`code/src/main.py`** — a minimal FastAPI app with CORS middleware open to the mobile app's dev/deploy origins (read from an env var, not hardcoded — this covers the Expo dev server origin and any Expo web preview; native iOS/Android requests aren't subject to CORS, but keep the middleware for web preview and local testing), and a `GET /health` endpoint returning `{"status": "ok"}`.

2. **`code/tests/test_health.py`** — one passing test hitting `/health` via `TestClient`, so `pytest` is never run against zero tests.

3. **`code/requirements.txt`** — `fastapi`, `uvicorn[standard]`, `pytest`, `httpx` (needed for `TestClient`), `python-dotenv`. Pin major versions loosely (`fastapi>=0.115,<1.0` style) — don't hard-pin exact versions in a hackathon repo, it just causes friction.

4. **`code/.env.example`** — placeholders for `DATABASE_URL` (Supabase, if/when used) and `ALLOWED_ORIGINS`.

5. **`docs/architecture.md`** — a short stack summary and a Mermaid diagram (```mermaid fenced block) showing mobile client → FastAPI → (optional) Supabase, plus a running **API contract table** (endpoint, method, request shape, response shape) that the frontend team builds against — this is the file that gets updated first whenever an endpoint changes.

6. **`docs/project-backlog.md`** — a simple table: task, owner (either `Lathithaa or Zoe`), status, links to relevant PR once opened.

7. **`README.md`** — how to run locally (`pip install -r code/requirements.txt`, `uvicorn src.main:app --reload`, working directory `code/`), how to test (`pytest`), and a one-line pointer to `docs/architecture.md` for the API contract.

8. **`.gitignore`** — standard Python: `__pycache__/`, `*.pyc`, `.venv/`, `.env`, `.pytest_cache/`.

9. **`LICENSE.md`** — MIT, matching root.

10. **Track otherwise-empty directories** — Git does not track directories by themselves. Add an empty `prompts/.gitkeep`, and add empty `__init__.py` files at `code/src/api/__init__.py`, `code/src/api/routes/__init__.py`, `code/src/core/__init__.py`, and `code/src/models/__init__.py`. Use the Python package markers in `src/` rather than `.gitkeep` files there.

Keep the skeleton runnable end-to-end (`pytest` passes, `uvicorn` boots and `/health` responds) before considering this scaffold done — a broken skeleton is worse than no skeleton.