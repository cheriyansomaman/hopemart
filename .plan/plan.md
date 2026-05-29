# Hopemart — React Native + Go + Firebase

## Context

Greenfield e-commerce app for iOS and Android. Users browse/search products, manage a shopping bag, apply coupons, checkout, and track orders. Auth is phone-number OTP with 30-minute session. Frontend in React Native (Expo), backend REST API in Go, all data in Firebase (Firestore + Auth + Storage).

---

## Architecture Overview

```
┌─────────────────────────────────────┐
│         React Native (Expo)         │
│  iOS + Android                      │
│  ├── Firebase Auth SDK (OTP flow)   │
│  └── REST calls → Go API            │
└──────────────┬──────────────────────┘
               │ HTTPS REST
┌──────────────▼──────────────────────┐
│           Go API Server             │
│  ├── Gin HTTP framework             │
│  ├── Firebase Admin SDK             │
│  ├── Verifies Firebase ID tokens    │
│  └── Business logic (coupons, etc.) │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│              Firebase               │
│  ├── Auth (phone OTP)               │
│  ├── Firestore (items, orders…)     │
│  └── Storage (product images)       │
└─────────────────────────────────────┘
```

**Session model:** Firebase issues an ID token (1hr) + refresh token. Go backend validates ID token per request. Frontend tracks login time; at 30 min it force-logs out regardless of token validity. Refresh token is NOT used after 30 min.

---

## Folder Structure

```
hopemart/
├── .plan/
│   └── plan.md            ← copy of this plan
├── frontend/              ← Expo React Native project
│   ├── app.json
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── screens/
│   │   │   ├── auth/
│   │   │   │   ├── PhoneInputScreen.tsx
│   │   │   │   └── OtpScreen.tsx
│   │   │   ├── home/
│   │   │   │   └── HomeScreen.tsx
│   │   │   ├── search/
│   │   │   │   └── SearchScreen.tsx
│   │   │   ├── item/
│   │   │   │   └── ItemDetailScreen.tsx
│   │   │   ├── bag/
│   │   │   │   └── BagScreen.tsx
│   │   │   ├── checkout/
│   │   │   │   ├── CheckoutScreen.tsx
│   │   │   │   └── CouponScreen.tsx
│   │   │   ├── orders/
│   │   │   │   ├── OrderListScreen.tsx
│   │   │   │   └── OrderTrackScreen.tsx
│   │   │   └── profile/
│   │   │       └── ProfileScreen.tsx
│   │   ├── components/
│   │   │   ├── ItemCard.tsx
│   │   │   ├── BagItem.tsx
│   │   │   ├── OrderCard.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   ├── navigation/
│   │   │   ├── RootNavigator.tsx    ← auth gate
│   │   │   ├── AppNavigator.tsx     ← bottom tabs
│   │   │   └── AuthNavigator.tsx
│   │   ├── store/                   ← Zustand stores
│   │   │   ├── authStore.ts
│   │   │   ├── bagStore.ts
│   │   │   └── orderStore.ts
│   │   ├── services/
│   │   │   ├── api.ts               ← Axios instance + interceptors
│   │   │   ├── authService.ts
│   │   │   ├── itemService.ts
│   │   │   ├── bagService.ts
│   │   │   ├── orderService.ts
│   │   │   └── couponService.ts
│   │   ├── hooks/
│   │   │   └── useSessionTimer.ts   ← 30-min logout logic
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── utils/
│   │       └── formatters.ts
│   └── assets/
│       └── images/
├── backend/               ← Go API project
│   ├── go.mod             (module github.com/hopemart/backend)
│   ├── go.sum
│   ├── main.go
│   ├── cmd/
│   │   └── server/
│   │       └── main.go
│   ├── internal/
│   │   ├── config/
│   │   │   └── config.go
│   │   ├── firebase/
│   │   │   └── client.go            ← Admin SDK init
│   │   ├── middleware/
│   │   │   ├── auth.go              ← verify Firebase ID token
│   │   │   └── cors.go
│   │   ├── handlers/
│   │   │   ├── items.go
│   │   │   ├── bag.go
│   │   │   ├── checkout.go
│   │   │   ├── coupon.go
│   │   │   └── orders.go
│   │   ├── services/
│   │   │   ├── item_service.go
│   │   │   ├── bag_service.go
│   │   │   ├── order_service.go
│   │   │   └── coupon_service.go
│   │   ├── models/
│   │   │   ├── item.go
│   │   │   ├── bag.go
│   │   │   ├── order.go
│   │   │   └── coupon.go
│   │   └── repository/
│   │       └── firestore.go         ← Firestore CRUD helpers
│   └── firebase-service-account.json  ← gitignored
└── README.md
```

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Mobile | Expo SDK 51 (managed) | OTA updates, easy phone auth, no native build config |
| Language | TypeScript | Type safety |
| State | Zustand | Minimal boilerplate, no Redux overhead for this scale |
| Navigation | React Navigation v6 | Industry standard |
| HTTP client | Axios | Interceptors for token injection |
| Backend | Go 1.22 | Performance, simple concurrency |
| HTTP router | Gin | Middleware ecosystem, fast |
| Firebase | Admin SDK (Go) + JS SDK (mobile) | Official SDKs |
| Auth | Firebase Phone Auth | Built-in OTP, no SMS cost management |
| DB | Firestore | Real-time capable, scales without ops |
| Images | Firebase Storage | CDN-backed, integrates with Firestore refs |

---

## Firestore Collections

```
items/
  {itemId}: { name, description, price, imageUrl, category, stock, createdAt }

bags/
  {userId}/items/{itemId}: { itemId, name, price, imageUrl, qty, addedAt }

orders/
  {orderId}: { userId, items[], total, discount, couponCode, status, createdAt, updatedAt, trackingSteps[] }

coupons/
  {code}: { discount, type(percent|fixed), minOrder, maxUses, usedCount, expiresAt }

users/
  {userId}: { phone, createdAt, lastLoginAt }
```

---

## REST API Endpoints

All protected routes require `Authorization: Bearer <firebase-id-token>`.

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/auth/verify` | Verify Firebase ID token, upsert user doc, return user profile |

### Items
| Method | Path | Description |
|---|---|---|
| GET | `/items` | List items (pagination: `?page=&limit=`) |
| GET | `/items/search` | Search by name/category (`?q=`) |
| GET | `/items/:id` | Item detail |

### Bag
| Method | Path | Description |
|---|---|---|
| GET | `/bag` | Get user's bag |
| POST | `/bag` | Add/update item in bag |
| DELETE | `/bag/:itemId` | Remove item from bag |
| DELETE | `/bag` | Clear bag |

### Checkout & Coupon
| Method | Path | Description |
|---|---|---|
| POST | `/coupon/validate` | Validate coupon code, return discount info |
| POST | `/checkout` | Place order, clear bag, return orderId |

### Orders
| Method | Path | Description |
|---|---|---|
| GET | `/orders` | User's order history |
| GET | `/orders/:id` | Order detail |
| GET | `/orders/:id/track` | Order tracking steps/status |

---

## Auth & Session Flow

```
1. User enters phone number → Firebase sendVerificationCode()
2. User enters OTP → Firebase confirmCode() → Firebase ID token
3. App calls POST /auth/verify with ID token
4. Go backend: verifyIDToken() → upsert users/{uid} doc → return profile
5. Frontend stores: { idToken, loginTimestamp } in SecureStore
6. useSessionTimer hook: on every app foreground, check (now - loginTimestamp) >= 30min
7. If 30min elapsed → clear SecureStore → sign out Firebase → redirect to PhoneInputScreen
8. Axios interceptor: inject current idToken header on each request
```

---

## Implementation Phases

### Phase 1 — Project Bootstrap
- Create `frontend/` with `npx create-expo-app frontend --template expo-template-blank-typescript`
- Create `backend/` with `go mod init github.com/hopemart/backend`
- Install frontend deps: `@react-navigation/native`, `zustand`, `axios`, `expo-secure-store`, `@react-native-firebase/app`, `@react-native-firebase/auth`
- Install backend deps: `gin`, `firebase.google.com/go/v4`, `google.golang.org/api`
- Create `.plan/plan.md` (copy of this doc)

### Phase 2 — Firebase Setup
- Create Firebase project in console
- Enable Phone Auth provider
- Create Firestore DB (production mode, add security rules)
- Add Firebase config to frontend (`google-services.json`, `GoogleService-Info.plist`)
- Add service account JSON to backend (gitignored)
- Seed Firestore with sample items and one test coupon

### Phase 3 — Backend Core
- `config.go`: load env vars (PORT, FIREBASE_PROJECT_ID, GOOGLE_APPLICATION_CREDENTIALS)
- `firebase/client.go`: init Admin SDK
- `middleware/auth.go`: extract Bearer token → VerifyIDToken → inject uid into Gin context
- `repository/firestore.go`: generic CRUD helpers
- Models: Item, BagItem, Order, Coupon structs

### Phase 4 — Backend Handlers
- Items handler: list (paginated), search, detail
- Bag handler: get, add, update qty, remove, clear
- Coupon handler: validate code (check expiry, min order, usage count)
- Checkout handler: validate bag, apply coupon, create order doc, decrement stock, clear bag
- Orders handler: list by userId, detail, tracking steps

### Phase 5 — Frontend Auth
- PhoneInputScreen → OtpScreen flow using Firebase JS SDK
- `authStore.ts`: idToken, uid, phone, loginTimestamp
- `useSessionTimer.ts`: AppState listener, auto-logout at 30min
- `RootNavigator.tsx`: gate on auth state

### Phase 6 — Frontend Screens
- HomeScreen: paginated item grid, pull-to-refresh
- SearchScreen: debounced search input → item results
- ItemDetailScreen: image, price, add-to-bag button
- BagScreen: item list, qty controls, subtotal, proceed-to-checkout button
- CheckoutScreen: order summary, coupon input field, place order CTA
- OrderListScreen: order history cards with status badge
- OrderTrackScreen: vertical timeline of tracking steps

### Phase 7 — Integration & Polish
- Wire all screens to services/API calls
- Error states and empty states for all screens
- Loading skeletons on item lists
- Toast notifications (order placed, coupon applied/rejected)
- Handle token expiry mid-session (401 → logout)

---

## Security Notes

- `firebase-service-account.json` in `.gitignore` from day 1
- Firestore security rules: users can only read/write their own bag and orders
- Go backend is the source of truth for coupon validation and order creation (no client-side trust)
- OTP rate limiting handled by Firebase (built-in)
- CORS configured to allow only the app's bundle ID (mobile = no CORS issue, but needed if admin web added)

---

## Verification Plan

1. **Auth**: Enter phone → receive OTP → login → wait 30min → confirm auto-logout
2. **Items**: HomeScreen loads items → search "shirt" → returns matching items
3. **Bag**: Add item → open BagScreen → increment qty → remove item
4. **Coupon**: Checkout → enter valid code → discount applied → enter invalid code → error shown
5. **Order**: Place order → appears in OrderListScreen → tap → OrderTrackScreen shows steps
6. **Backend**: `curl` each endpoint with valid/invalid tokens; confirm 401 on bad token

---

## Running Locally

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| Go | 1.22+ | https://go.dev/dl/ |
| Node.js | 18+ | https://nodejs.org |
| Expo CLI | latest | `npm install -g expo-cli` |
| Watchman | any | `brew install watchman` (macOS) |
| Android Studio | any | for Android emulator |
| Xcode | 15+ | macOS only, for iOS simulator |

---

### One-Time Firebase Setup

**Step 1 — Create Firebase project**
1. Go to https://console.firebase.google.com → New project → name it `hopemart`
2. Enable **Phone** under Authentication → Sign-in method
3. Create **Firestore Database** (Start in production mode, choose region)

**Step 2 — Add Firebase config to frontend**

For Android:
1. Console → Project settings → Add app → Android
2. Package name: `com.hopemart.app`
3. Download `google-services.json` → place at `frontend/google-services.json`

For iOS:
1. Console → Project settings → Add app → iOS
2. Bundle ID: `com.hopemart.app`
3. Download `GoogleService-Info.plist` → place at `frontend/GoogleService-Info.plist`

**Step 3 — Create service account for backend**
1. Console → Project settings → Service accounts → Generate new private key
2. Save as `backend/firebase-service-account.json`

**Step 4 — Seed Firestore with sample data** (optional but needed for testing)

In Firestore console, create collection `items`, add a document:
```json
{
  "name": "Sample T-Shirt",
  "description": "A comfortable cotton t-shirt",
  "price": 29.99,
  "imageUrl": "https://via.placeholder.com/400",
  "category": "Clothing",
  "stock": 50
}
```

Add collection `coupons`, add document with ID `SAVE10`:
```json
{
  "code": "SAVE10",
  "discount": 10,
  "type": "percent",
  "minOrder": 20,
  "maxUses": 100,
  "usedCount": 0,
  "expiresAt": "2027-01-01T00:00:00Z"
}
```

---

### Backend

```bash
cd /Users/cheriyanmaman/Projects/hopemart/backend

# Create .env from example
cp .env.example .env
# Edit .env — set FIREBASE_PROJECT_ID to your project ID
# GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json (already set in example)

# Run server
go run cmd/server/main.go
# Server starts on http://localhost:8080
```

**Verify backend works:**
```bash
# Health check (will 404 — that's OK, means server running)
curl http://localhost:8080/

# Test with a real token (get from frontend after login)
curl -H "Authorization: Bearer <your-id-token>" http://localhost:8080/items
```

---

### Frontend

```bash
cd /Users/cheriyanmaman/Projects/hopemart/frontend

# Create .env from example
cp .env.example .env
# Edit .env — set EXPO_PUBLIC_API_URL=http://localhost:8080
# (use http://10.0.2.2:8080 for Android emulator instead of localhost)

# Generate native configs (required for @react-native-firebase)
npx expo prebuild

# Run on iOS simulator (macOS only)
npx expo run:ios

# Run on Android emulator
npx expo run:android

# Run in Expo Go (limited — phone auth may not work without native build)
npx expo start
```

**Notes:**
- `npx expo prebuild` generates `ios/` and `android/` folders — run once after adding `google-services.json` and `GoogleService-Info.plist`
- Android emulator uses `10.0.2.2` to reach host machine `localhost` — update `EXPO_PUBLIC_API_URL` accordingly
- iOS simulator uses `localhost` directly
- Phone OTP requires a real device or Firebase Test Phone Numbers configured in console

**Firebase Test Phone Numbers (for local dev without real SMS):**
1. Console → Authentication → Sign-in method → Phone → Phone numbers for testing
2. Add: `+1 650-555-3434` with code `123456`
3. Use these in app to skip real OTP during dev

---

## Confirmed Decisions

| Decision | Choice |
|---|---|
| Payment | Mock only — no payment SDK, "Place Order" creates order doc directly |
| Order tracking | Manual status updates (Confirmed → Packed → Shipped → Delivered) |
| Backend deployment | Local dev only — no Cloud Run / Docker config needed now |
| Search | Firestore prefix match on `name` field — no external search service |

---

## Open Questions

> Answered questions removed. Remaining items need clarification before or during implementation.

1. **Product image upload**: Who uploads product images? Admin panel in scope, or images pre-uploaded directly to Firebase Storage?

2. **Coupon types**: Percentage discount, fixed-amount, free shipping, or all three?

3. **Push notifications**: Order status change notifications via FCM — in scope?

4. **Multiple addresses**: Saved delivery addresses, or entered fresh each checkout?

5. **Item categories/filters**: HomeScreen category tabs or filter chips needed?

6. **Android/iOS developer accounts**: Apple Developer and Google Play accounts set up for distribution?
