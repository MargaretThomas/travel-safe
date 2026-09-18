# Travel Safe Backend

FastAPI backend for the Travel Safe mobile app. Maintained by Lathithaa and Zoe.

## Run locally

From the `backend/` directory:

```bash
python3.12 -m venv code/.venv
source code/.venv/bin/activate
pip install -r code/requirements.txt
cd code
uvicorn src.main:app --reload
```

The API is available at `http://127.0.0.1:8000`; check it at `GET /health`.

## Test

From `backend/code/` with the virtual environment active:

```bash
pytest
```

See [docs/architecture.md](docs/architecture.md) for the API contract.
