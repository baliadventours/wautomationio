#!/usr/bin/env bash
# ==============================================================================
# Wautomation.io - Webdock Application Update Script
# Updates the existing frontend & backend application on Webdock / VPS.
#
# Automatically detects:
#   - Docker Compose Deployment (rebuilds wautomation_app container)
#   - PM2 Process Deployment (pulls, builds bundle, reloads PM2 zero-downtime)
#   - Systemd Service Deployment (pulls, builds bundle, restarts service)
# ==============================================================================

set -euo pipefail

# Text styling
BOLD='\033[1m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}====================================================================${NC}"
echo -e "${CYAN}${BOLD}       Wautomation.io - Existing App Updater (Webdock / VPS)        ${NC}"
echo -e "${CYAN}====================================================================${NC}"

# 1. Resolve Application Directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR=""

if [[ -f "${SCRIPT_DIR}/package.json" && -f "${SCRIPT_DIR}/server.ts" ]]; then
  APP_DIR="${SCRIPT_DIR}"
elif [[ -d "/opt/wautomation/app" && -f "/opt/wautomation/app/package.json" ]]; then
  APP_DIR="/opt/wautomation/app"
elif [[ -d "/opt/wautomation" && -f "/opt/wautomation/package.json" ]]; then
  APP_DIR="/opt/wautomation"
elif [[ -d "/var/www/wautomation" && -f "/var/www/wautomation/package.json" ]]; then
  APP_DIR="/var/www/wautomation"
else
  APP_DIR="${PWD}"
fi

cd "${APP_DIR}"
echo -e "Application Dir: ${BOLD}${APP_DIR}${NC}"
echo -e "Timestamp:       $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo -e "--------------------------------------------------------------------"

# 2. Pull Latest Code via Git (if under git control)
if [[ -d ".git" ]]; then
  echo -e "\n${BOLD}[1/4] Pulling latest code changes from Git...${NC}"
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
  
  # Stash any local untracked edits to avoid merge conflicts, then pull
  git fetch origin "${CURRENT_BRANCH}" || true
  if git status --porcelain | grep -q .; then
    echo -e "   ${YELLOW}Stashing local working tree changes before pulling...${NC}"
    git stash push -m "Auto-stashed before update $(date +%s)" || true
  fi
  
  git pull origin "${CURRENT_BRANCH}" || {
    echo -e "   ${YELLOW}Standard pull had conflicts, resetting hard to origin/${CURRENT_BRANCH}...${NC}"
    git reset --hard "origin/${CURRENT_BRANCH}"
  }
  echo -e "   ${GREEN}✓ Codebase is at commit: $(git log -1 --oneline)${NC}"
else
  echo -e "\n${BOLD}[1/4] Git directory not detected, skipping git pull.${NC}"
fi

# 3. Detect Deployment Mode (Docker Compose vs PM2 vs Systemd)
echo -e "\n${BOLD}[2/4] Detecting deployment runtime...${NC}"

IS_DOCKER=false
if command -v docker &>/dev/null && [[ -f "docker-compose.yml" ]]; then
  # Check if docker containers are currently running for this project
  if docker compose ps -q 2>/dev/null | grep -q . || docker-compose ps -q 2>/dev/null | grep -q .; then
    IS_DOCKER=true
  fi
fi

if [[ "${IS_DOCKER}" == "true" ]]; then
  echo -e "   Mode: ${GREEN}Docker Compose Stack${NC}"
  
  DOCKER_CMD="docker compose"
  if ! docker compose version &>/dev/null && command -v docker-compose &>/dev/null; then
    DOCKER_CMD="docker-compose"
  fi

  echo -e "\n${BOLD}[3/4] Rebuilding and updating app container...${NC}"
  ${DOCKER_CMD} build --pull wautomation_app
  ${DOCKER_CMD} up -d --no-deps --remove-orphans wautomation_app

else
  # Native Node.js / PM2 / Systemd
  echo -e "   Mode: ${GREEN}Native Node.js (PM2 / Systemd)${NC}"

  # 3a. Install / update dependencies
  echo -e "\n${BOLD}[3/4] Installing dependencies & building production bundle...${NC}"
  if command -v npm &>/dev/null; then
    npm install --legacy-peer-deps --no-audit --no-fund
    npm run build
  elif command -v bun &>/dev/null; then
    bun install
    bun run build
  else
    echo -e "${RED}Error: Neither npm nor bun found.${NC}"
    exit 1
  fi
  echo -e "   ${GREEN}✓ Frontend (Vite) and Backend (esbuild dist/server.cjs) built successfully.${NC}"

  # 3b. Reload process
  if command -v pm2 &>/dev/null && pm2 list 2>/dev/null | grep -q -E "(wautomation|saas|app)"; then
    PM2_NAME=$(pm2 list | grep -o -E "wautomation[a-zA-Z0-9_-]*" | head -n 1 || echo "wautomation")
    echo -e "   Reloading PM2 service: ${BOLD}${PM2_NAME}${NC}..."
    pm2 reload "${PM2_NAME}" --update-env || pm2 restart "${PM2_NAME}" --update-env
    pm2 save
    echo -e "   ${GREEN}✓ PM2 process reloaded with zero downtime.${NC}"
  elif systemctl is-active --quiet wautomation 2>/dev/null; then
    echo -e "   Restarting Systemd service: ${BOLD}wautomation.service${NC}..."
    sudo systemctl restart wautomation
    echo -e "   ${GREEN}✓ Systemd service restarted.${NC}"
  else
    echo -e "   ${YELLOW}Notice: Neither PM2 nor Systemd service found. Starting/restarting with PM2...${NC}"
    if ! command -v pm2 &>/dev/null; then
      npm install -g pm2
    fi
    pm2 start dist/server.cjs --name "wautomation" || pm2 restart "wautomation"
    pm2 save
    echo -e "   ${GREEN}✓ Started with PM2 as 'wautomation'.${NC}"
  fi
fi

# 4. Verify Application Health
echo -e "\n${BOLD}[4/4] Verifying application health...${NC}"
sleep 2

HEALTH_URL="http://127.0.0.1:3000/api/health"
RETRIES=10
APP_ONLINE=false

while [[ ${RETRIES} -gt 0 ]]; do
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${HEALTH_URL}" || true)
  if [[ "${HTTP_STATUS}" == "200" ]]; then
    APP_ONLINE=true
    break
  fi
  sleep 1
  RETRIES=$((RETRIES - 1))
done

if [[ "${APP_ONLINE}" == "true" ]]; then
  HEALTH_JSON=$(curl -s "${HEALTH_URL}" || true)
  echo -e "   ${GREEN}✓ Wautomation application is ONLINE and responding (HTTP 200)!${NC}"
  echo -e "   Status payload: ${HEALTH_JSON}"
else
  echo -e "   ${YELLOW}App is still starting up. Check status with: curl -s ${HEALTH_URL}${NC}"
fi

echo -e "\n${CYAN}====================================================================${NC}"
echo -e "${GREEN}${BOLD}✓ Application Update Complete!${NC}"
echo -e "${CYAN}====================================================================${NC}"
echo -e "Dashboard URL:   ${BOLD}http://localhost:3000${NC}"
if [[ "${IS_DOCKER}" == "true" ]]; then
  echo -e "View live logs:  ${BOLD}docker compose logs -f wautomation_app${NC}"
else
  echo -e "View live logs:  ${BOLD}pm2 logs wautomation${NC}"
fi
echo -e "${CYAN}====================================================================${NC}"
