# Repository Guidelines

## Project Structure & Module Organization

This repository contains three apps plus Firebase config. `frontend/` is the customer React/Vite app, with source in `frontend/src`, public files in `frontend/public`, and icons in `frontend/assets`. `admin/` is the admin React/Vite app, with source in `admin/src`, static assets in `admin/public`, and Playwright helpers like `admin/pw_verify.mjs`. `backend/` is a Go API service: entrypoint code lives in `backend/cmd/server`, while domain code is under `backend/internal/{config,firebase,handlers,middleware,models,repository,services}`. Root `firebase.json` and `firestore.rules` configure Firebase.

## Build, Test, and Development Commands

- `./start.sh`: builds all apps, then starts backend on `:8080`, admin on `:5173`, and frontend on `:3000`.
- `cd frontend && npm run dev`: starts the customer app on port `3000`.
- `cd frontend && npm run build`: type-checks and builds frontend assets.
- `cd frontend && npm run lint`: runs ESLint for TypeScript/React/a11y rules.
- `cd admin && npm run dev`: starts the admin app with Vite.
- `cd admin && npm run build && npm run lint`: validates admin TypeScript and linting.
- `cd backend && go build ./cmd/server`: builds the Go API.
- `cd backend && go test ./...`: runs backend tests.

## Coding Style & Naming Conventions

Use TypeScript for React code and Go for backend code. React components and pages use `PascalCase` filenames (`ItemCard.tsx`, `HomePage.tsx`); hooks use `useX.ts`; stores and services use camelCase (`bagStore.ts`, `itemService.ts`). Keep frontend code grouped by role: `components`, `pages`, `services`, `store`, `hooks`, `lib`, and `types`. Follow ESLint before handoff. Format Go with `gofmt`; keep packages aligned with the `handlers` -> `services` -> `repository` flow.

## Testing Guidelines

There is no committed frontend test runner script yet. For UI changes, run lint and build for the touched app, and use Playwright helpers in `admin/` for admin flows. For backend changes, add Go tests beside the target package using `*_test.go` files and run `go test ./...`.

## Commit & Pull Request Guidelines

Recent commits use short imperative messages such as `Add lyrics file and media assets for lyric video generation`. Keep commits focused. Pull requests should include a concise summary, commands run, linked issues when applicable, and screenshots for UI changes. Note Firebase rule, env, or credential changes explicitly.

## Security & Configuration Tips

Use `.env.example` as the template and avoid committing real secrets. Treat `backend/firebase-service-account.json`, app `.env` files, and credential files as sensitive. When changing auth, Firestore access, or checkout/order logic, review `firestore.rules` and backend middleware together.
