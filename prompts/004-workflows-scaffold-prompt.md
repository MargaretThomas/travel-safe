# Workflows Scaffold Prompt

**Use for:** setting up `.github/workflows/` and its related files. Run this **last** — after `001-root-scaffold.md`, `002-backend-scaffold.md`, and `003-frontend-scaffold.md` — since it assumes `backend/code` and `frontend/code` already exist and it updates the root `README.md`.

**Fill in before running:**
- `GITHUB_ORG_OR_USER`: MargaretThomas
- `REPO_NAME`: `travel-safe`
- `BACKEND_OWNERS`: Lathithaa (SXNGE4444) and Zoe (zowhere)
- `FRONTEND_OWNERS`: Sibongiseni (mindsgn) and Margaret (MargaretThomas)

---

## Prompt

You are scaffolding `.github/` for `travel-safe` monorepo. Backend lives in `backend/code` (Python/FastAPI, tested with pytest + ruff). Frontend lives in `frontend/code` (Expo/React Native + TypeScript, tested with Jest via `jest-expo` + ESLint). CI is **test-only**. The backend deploys automatically via Render watching `main` and `staging`; the frontend has no automatic web deploy — it's tested through Expo Go during the build, with final distribution (Expo Go vs. an EAS build) still undecided — so nothing here should attempt to deploy or publish either side.

Both test workflows must run on every pull request into `main` or `staging`. Do not add `paths` or `paths-ignore` filters: both checks are required by branch protection, and GitHub leaves a required check pending when its workflow is skipped by path filtering, which blocks the pull request from merging.

### Generate from scratch

1. **`.github/workflows/backend-test.yml`** — triggers on every `pull_request` targeting `main` and `staging`, with no path filters. Job runs with working directory `backend/code`: checkout, `actions/setup-python` (3.12, pip cache keyed to `backend/code/requirements.txt`), install `requirements.txt` plus `ruff` and `pytest`, run `ruff check .`, then `pytest -v`.

2. **`.github/workflows/frontend-test.yml`** — triggers on every `pull_request` targeting `main` and `staging`, with no path filters. Job runs with working directory `frontend/code`: checkout, `actions/setup-node` (Node 20, npm cache keyed to `frontend/code/package-lock.json`), `npm ci`, `npm run lint`, then `npm run test -- --ci --watchAll=false` (non-interactive run for `jest-expo`).

3. **`.github/CODEOWNERS`** — map `backend/**` to `Lathithaa (SXNGE4444) and Zoe (zowhere)` and `frontend/**` to `Sibongiseni (mindsgn) and Margaret (MargaretThomas)`, plus a catch-all `*` covering everyone, so path-based PRs auto-request the right reviewers without anyone having to remember to add them.

4. **`.github/pull_request_template.md`** — keep it to three short sections: what changed, how it was tested, anything the reviewer should specifically check. No boilerplate beyond that — this needs to be fillable in under a minute during a live build.

### Update existing file

5. **`README.md`** (root) — add a short **CI** section (if one doesn't already exist) directly under the quickstart, containing:
   - Two GitHub Actions status badges, one per workflow, using the standard badge URL pattern: `https://github.com/MargaretThomas/travel-safe/actions/workflows/backend-test.yml/badge.svg` and the frontend equivalent.
   - One line stating both workflows run on every PR into `main`/`staging` and must pass before merge.
   - One line noting the backend deploys automatically on merge via Render — no manual deploy step, no deploy job in Actions — and that the frontend has no CI deploy step; it's run locally via `expo start` and tested through Expo Go, with EAS distribution still to be decided.
   - A short **"One-time manual setup"** checklist, since branch protection can't be configured by a file and has to be done by hand in GitHub's UI:
     - [ ] Settings → Branches → add a protection rule for `main`: require the `Backend Tests` and `Frontend Tests` status checks to pass before merging, require a PR before merging.
     - [ ] Repeat the same rule for `staging`.
     - [ ] Confirm Render's two services (staging/prod) are pointed at the matching branches, per the hosting setup discussed earlier.

Keep everything minimal and functional. This is a hackathon deliverable, not a portfolio piece — no boilerplate beyond what's asked for above.