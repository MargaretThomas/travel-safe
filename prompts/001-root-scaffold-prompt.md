# Root Scaffold Prompt

**Use for:** setting up (or resetting) the top level of `travel-safe` — README, LICENSE, `docs/`, and the `backend/` / `frontend/` placeholders. Run this first, then `002-backend-scaffold.md` and `003-frontend-scaffold.md`.

**Fill in before running, once the brief drops:**
- `PROJECT_NAME`: Travel Safe
- `TEAM_MEMBERS`: Lathithaa - backend lead; Margaret - frontend dev, team lead; Sibongiseni - frontend lead; Zoe - backend dev, pitch lead

---

## Prompt

You are scaffolding the **root** of a monorepo called `travel-safe`, built for a 24-hour hackathon (Builders Table 2026, MakeReign). Stack: Python/FastAPI backend, React Native (Expo) mobile frontend, with Supabase as an optional Postgres DB. Backend deploys to Render; the mobile app is tested during the build via Expo Go, with final distribution (Expo Go link vs. an EAS build) still to be decided. Do not touch anything already inside `backend/` or `frontend/` — those are scaffolded separately.

Create, at repo root:

1. **`README.md`** — project name `Travel Safe`, a 3-step quickstart that links out to `backend/README.md` and `frontend/README.md` rather than duplicating setup instructions, a team members table (`Lathithaa - backend lead; Margaret - frontend dev, team lead; Sibongiseni - frontend lead; Zoe - backend dev, pitch lead`), and a link to `docs/project-roadmap.md`.

2. **`LICENSE.md`** — full MIT License text, copyright holder "The Makers", year 2026.

3. **`docs/project-roadmap.md`** — a milestones table (Brief Released → MVP → Polish → Submission, with target times based on the Day 1/Day 2 event timeline), and a short "who's doing what" section listing the 2 backend + 2 frontend owners by name and area. See `the-makers-team-kit.md` for more information.

4. **`docs/branding.md`** — define placeholders for brand colours and fonts.

5. **`backend/`** and **`frontend/`** — if either doesn't exist yet, create it with a single placeholder `README.md` reading: "Scaffolded by `prompts/backend-scaffold.md` (or `prompts/frontend-scaffold.md`) — run that prompt next." Never overwrite either folder if it already has real content.

6. **`.gitignore`** (root) — generate covering: OS clutter (`.DS_Store`, `Thumbs.db`, `Desktop.ini`); editor files (`.vscode/*` with an exception for a shared `extensions.json`, `.idea/`, swap files); stray secrets at root (`.env`, `.env.local`, `.env.*.local`, `*.pem`, `*.key`); logs (`*.log` and friends); accidental root-level installs in case someone runs a command from the wrong directory (`node_modules/`, `dist/`, `build/`, `__pycache__/`, `*.pyc`, `.venv/`, `venv/`); hosting/tooling local state (`.expo/`, `.expo-shared/`, `.supabase/`, `.render-buildpacks/`); and general temp/cache files (`*.tmp`, `.cache/`). This is separate from — and doesn't replace — the stack-specific `.gitignore` files inside `backend/code` and `frontend/code`, which cover Python-specific and Expo/React Native-specific patterns instead.

Keep everything minimal and functional. This is a hackathon deliverable, not a portfolio piece — no boilerplate beyond what's asked for above.