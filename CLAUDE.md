# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HopeMart is a grocery/shopping platform with three sub-projects:

| Directory | Stack | Purpose |
|-----------|-------|---------|
| `backend/` | Go + Gin + Firebase | REST API server |
| `frontend/` | React Native + Expo | Mobile shopping app |
| `admin/` | React + Vite + Tailwind | Web admin dashboard |

All three share a single Firebase project (Firestore, Auth, Storage).

## Commands

### Backend (Go)

```bash
cd backend
go run ./cmd/server          # start dev server (port 8080)
go build ./cmd/server        # build binary
go test ./...                # run all tests
go test -race ./...          # run tests with race detector
go test -cover ./...         # run tests with coverage
gosec ./...                  # security scan
```

Backend env vars (`.env` in `backend/`):
```
PORT=8080
FIREBASE_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json
```

### Frontend (React Native / Expo)

Read versioned Expo docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

```bash
cd frontend
npx expo start               # start Expo dev server
npx expo run:android         # run on Android
npx expo run:ios             # run on iOS
npx tsc --noEmit             # type check
```

Frontend env: set `EXPO_PUBLIC_API_URL` to point at the backend (defaults to `http://localhost:8080`).

### Admin (React + Vite)

```bash
cd admin
npm run dev                  # start dev server
npm run build                # production build (tsc + vite)
npm run lint                 # eslint
```

Admin env (`admin/.env`):
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## Architecture

### Backend

Entry point: `backend/cmd/server/main.go`

Layered: `handlers → services → repository → Firestore`

- `internal/config/` — env-based config via `godotenv`
- `internal/firebase/` — Firebase Admin SDK client (Firestore + Auth)
- `internal/repository/firestore.go` — single Firestore repository struct used by all services
- `internal/services/` — business logic (items, bag, coupon, order)
- `internal/handlers/` — Gin HTTP handlers (items, bag, coupon, checkout, orders, auth)
- `internal/middleware/` — JWT auth (`middleware.Auth`) and CORS
- `internal/models/` — shared data structs (Item, Order, Coupon, Bag)

All routes require Firebase ID token via `Authorization: Bearer <token>`. The `/auth/verify` endpoint exchanges a verified token to confirm identity.

Checkout flow: validate coupon → Firestore transaction to deduct stock → create order → increment coupon usage.

### Frontend (Mobile)

Auth: phone number OTP via `@react-native-firebase/auth`. Token stored in `expo-secure-store` with a 30-minute session timeout enforced in `authStore`.

State: Zustand stores in `src/store/` (`authStore`, `bagStore`, `orderStore`).

Navigation: `RootNavigator` switches between `AuthNavigator` (phone/OTP) and `AppNavigator` (bottom tabs) based on `uid` in auth store.

API calls: `src/services/api.ts` — axios instance that auto-attaches `idToken` from auth store and redirects to logout on 401.

Design system: centralized theme in `src/theme/index.ts`; reusable components in `src/components/` (Button, Input, Badge, EmptyState, ItemCard, etc.).

### Admin (Web)

Auth: Firebase email/password (`onAuthStateChanged` guards all routes in `App.tsx`).

Writes directly to Firestore and Firebase Storage (no backend calls). Reads use `onSnapshot` for real-time updates.

Routes: `/products`, `/products/add`, `/coupons`, `/coupons/add`.

### Firestore Collections

| Collection | Description |
|------------|-------------|
| `items` | Product catalog |
| `coupons` | Discount codes with usage tracking |
| `bags/{uid}` | Per-user shopping bag |
| `orders/{uid}` | Per-user order history |

Firestore security rules (`firestore.rules`): authenticated users can read/write `items` and `coupons`; all other paths deny by default.

## Key Patterns

- Backend uses constructor-based dependency injection: `NewXxxService(repo)`, `NewXxxHandler(svc)`.
- Coupon usage and stock deduction use Firestore transactions for atomicity.
- Frontend service layer (`src/services/`) wraps axios calls; components do not call `api` directly.
- Admin writes Firestore `Timestamp` objects (not ISO strings) for date fields like `expiresAt`.
