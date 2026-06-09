#!/usr/bin/env bash
set -e

# ── Colors ────────────────────────────────────────────────────────────────────
RESET='\033[0m'
BOLD='\033[1m'
DIM='\033[2m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
VIOLET='\033[0;35m'
WHITE='\033[0;37m'

# ── Helpers ───────────────────────────────────────────────────────────────────
ROOT="$(cd "$(dirname "$0")" && pwd)"
LOGS="$ROOT/.logs"
mkdir -p "$LOGS"

header() { echo -e "\n${BOLD}${VIOLET}  $1${RESET}"; echo -e "  ${DIM}$(printf '─%.0s' {1..50})${RESET}"; }
step()   { echo -e "  ${CYAN}▸${RESET} $1"; }
ok()     { echo -e "  ${GREEN}✓${RESET} $1"; }
fail()   { echo -e "  ${RED}✗${RESET} $1"; exit 1; }

# ── Banner ────────────────────────────────────────────────────────────────────
clear
echo -e "${BOLD}${VIOLET}"
echo "  ╔══════════════════════════════════════╗"
echo "  ║         HopeMart Dev Stack           ║"
echo "  ╚══════════════════════════════════════╝${RESET}"
echo ""

# ── Kill existing processes ───────────────────────────────────────────────────
header "Stopping existing processes"
PORTS=(8080 8081 8082 8083 8084 8085 8086 5173 3000)
killed=0
for port in "${PORTS[@]}"; do
  pid=$(lsof -ti tcp:"$port" 2>/dev/null) || true
  if [ -n "$pid" ]; then
    kill "$pid" 2>/dev/null || true
    killed=$((killed + 1))
  fi
done
if [ "$killed" -gt 0 ]; then
  ok "Killed $killed process(es)"
else
  ok "No existing processes found"
fi

# ── Build backend ─────────────────────────────────────────────────────────────
header "Building backend services"
cd "$ROOT/backend"

SERVICES=(
  "gateway:8080"
  "product-service:8081"
  "coupon-service:8082"
  "checkout-service:8083"
  "preference-service:8084"
  "party-service:8085"
  "communication-service:8086"
)

for entry in "${SERVICES[@]}"; do
  name="${entry%%:*}"
  step "Building ${name}..."
  if go build -o "$LOGS/$name" "./cmd/$name" 2>>"$LOGS/build.log"; then
    ok "${name}"
  else
    fail "Build failed: ${name} — see .logs/build.log"
  fi
done

# ── Launch backend services ───────────────────────────────────────────────────
header "Starting backend services"

launch_svc() {
  local name="$1" port="$2"
  PORT="$port" "$LOGS/$name" >> "$LOGS/$name.log" 2>&1 &
  echo $! > "$LOGS/$name.pid"
  ok "${name} ${DIM}→ :${port}${RESET}"
}

for entry in "${SERVICES[@]}"; do
  name="${entry%%:*}"
  port="${entry##*:}"
  launch_svc "$name" "$port"
done

# ── Build frontend apps ───────────────────────────────────────────────────────
header "Building frontend apps"

step "Installing admin dependencies..."
cd "$ROOT/admin"
rm -rf node_modules/.vite
if npm install >> "$LOGS/admin-install.log" 2>&1; then
  ok "admin deps installed"
else
  fail "admin npm install failed — see .logs/admin-install.log"
fi

step "Installing frontend dependencies..."
cd "$ROOT/frontend"
rm -rf node_modules/.vite
if npm install >> "$LOGS/frontend-install.log" 2>&1; then
  ok "frontend deps installed"
else
  fail "frontend npm install failed — see .logs/frontend-install.log"
fi

# ── Launch frontend apps ──────────────────────────────────────────────────────
header "Starting frontend apps"

cd "$ROOT/admin"
npm run dev >> "$LOGS/admin.log" 2>&1 &
echo $! > "$LOGS/admin.pid"
ok "admin (vite) ${DIM}→ :5173${RESET}"

cd "$ROOT/frontend"
npm run dev >> "$LOGS/frontend.log" 2>&1 &
echo $! > "$LOGS/frontend.pid"
ok "frontend (vite) ${DIM}→ :3000${RESET}"

# ── Summary table ─────────────────────────────────────────────────────────────
header "Service registry"
echo ""
printf "  ${BOLD}${WHITE}%-24s %-8s %-36s${RESET}\n" "SERVICE" "PORT" "LOG"
printf "  ${DIM}%-24s %-8s %-36s${RESET}\n" "───────────────────────" "──────" "──────────────────────────────"

print_row() {
  printf "  ${GREEN}%-24s${RESET} ${CYAN}:%-7s${RESET} ${DIM}%s${RESET}\n" "$1" "$2" ".logs/$1.log"
}

print_row "gateway"               "8080"
print_row "product-service"       "8081"
print_row "coupon-service"        "8082"
print_row "checkout-service"      "8083"
print_row "preference-service"    "8084"
print_row "party-service"         "8085"
print_row "communication-service" "8086"
print_row "admin"                 "5173"
print_row "frontend"              "3000"

echo ""
echo -e "  ${BOLD}${GREEN}✓ All services running.${RESET} ${DIM}Logs in .logs/${RESET}"
echo ""
