# Travel Safe

Travel Safe is a mobile safety companion built by The Makers for the Builders Table 2026 24-hour hackathon.

## Quickstart

1. Clone the repository and open the project root.
2. Set up and run the FastAPI backend using [backend/README.md](backend/README.md).
3. Set up and run the Expo mobile app using [frontend/README.md](frontend/README.md).

## CI

[![Backend Tests](https://github.com/MargaretThomas/travel-safe/actions/workflows/backend-test.yml/badge.svg)](https://github.com/MargaretThomas/travel-safe/actions/workflows/backend-test.yml)
[![Frontend Tests](https://github.com/MargaretThomas/travel-safe/actions/workflows/frontend-test.yml/badge.svg)](https://github.com/MargaretThomas/travel-safe/actions/workflows/frontend-test.yml)

Both workflows run on every pull request into `main` or `staging` and must pass before merge.

The backend deploys automatically through Render after merge; there is no manual deploy step or GitHub Actions deploy job. The frontend has no CI deploy step: run it locally with `expo start` and test through Expo Go. EAS distribution is still to be decided.

### One-time manual setup

- [ ] In GitHub, go to Settings → Branches and add a protection rule for `main`: require a pull request before merging and require the `Backend Tests` and `Frontend Tests` status checks to pass.
- [ ] Repeat the same rule for `staging`.
- [ ] Confirm Render's staging and production services point to their matching branches, as defined in the hosting setup.

## Team

| Team member | Role |
|---|---|
| Lathithaa | Backend lead |
| Margaret | Frontend developer, team lead |
| Sibongiseni | Frontend lead |
| Zoe | Backend developer, pitch lead |

See the [project roadmap](docs/project-roadmap.md) for milestones and ownership.
