# Travel Safe Backend

FastAPI backend for the Travel Safe mobile app. Maintained by Lathithaa and Zoe.

## Run locally

From the `backend/` directory:

```bash
./scripts/app.sh setup
./scripts/app.sh run
```

Or by hand:

```bash
python3.12 -m venv code/.venv
source code/.venv/bin/activate
pip install -r code/requirements.txt
cd code
uvicorn src.main:app --reload
```

The API is available at `http://127.0.0.1:8000`; check it at `GET /health`.

Set `MAPBOX_ACCESS_TOKEN` in `code/.env` to use Mapbox Directions for `POST /api/v1/trips`. Without it, trips return a deterministic mock polyline plus mock crime heatmap cells.

## Scripts

`./scripts/app.sh` from `backend/`:

| Command | Purpose |
|---|---|
| `setup` | Create `.venv` and install `code/requirements.txt` |
| `test` | `ruff check` then `pytest -v` |
| `build` | Install deps and `python -m compileall src` |
| `run` | Uvicorn with reload on `0.0.0.0:8000` |
| `pm2` | Start or restart via `code/ecosystem.config.cjs` (requires [pm2](https://pm2.keymetrics.io/)) |

## Test

```bash
./scripts/app.sh test
```

From `backend/code/` with the virtual environment active:

```bash
pytest
```

See [docs/architecture.md](docs/architecture.md) for the API contract.
