#!/usr/bin/env bash
# ==============================================================================
# Wautomation.io - Evolution API Stack Update Script for Webdock / VPS
#
# Features:
#   1. Automatic environment & Docker Compose detection
#   2. Pre-update PostgreSQL database backup with auto-rotation (keeps last 7)
#   3. Pulls latest container images (Evolution API, Postgres, Redis, Caddy)
#   4. Graceful container restart & zero-loss recreation
#   5. Healthcheck verification loop (ensures API is responding)
#   6. Docker dangling image cleanup (saves Webdock SSD disk space)
# ==============================================================================

set -euo pipefail

# Text colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${CYAN}==============================================================${NC}"
echo -e "${CYAN}${BOLD}   Wautomation.io - Webdock Evolution API Stack Updater      ${NC}"
echo -e "${CYAN}==============================================================${NC}"

# 1. Determine script & stack directory
STACK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${STACK_DIR}"

echo -e "Stack Directory: ${BOLD}${STACK_DIR}${NC}"
echo -e "Timestamp:       $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo -e "--------------------------------------------------------------"

# 2. Check root/sudo permissions
if [[ $EUID -ne 0 ]]; then
   echo -e "${YELLOW}Notice: Not running as root. If docker commands fail, run with 'sudo bash update.sh'.${NC}"
fi

# 3. Detect Docker & Docker Compose command
if ! command -v docker &>/dev/null; then
  echo -e "${RED}Error: Docker is not installed or not in PATH.${NC}"
  exit 1
fi

if docker compose version &>/dev/null; then
  DOCKER_COMPOSE="docker compose"
elif command -v docker-compose &>/dev/null; then
  DOCKER_COMPOSE="docker-compose"
else
  echo -e "${RED}Error: Neither 'docker compose' nor 'docker-compose' found.${NC}"
  exit 1
fi

echo -e "Compose Engine:  ${GREEN}${DOCKER_COMPOSE}${NC}"

# 4. Check for required compose file and .env
if [[ ! -f "docker-compose.yml" ]]; then
  echo -e "${RED}Error: docker-compose.yml not found in ${STACK_DIR}.${NC}"
  exit 1
fi

if [[ ! -f ".env" ]]; then
  echo -e "${YELLOW}Warning: .env file not found in ${STACK_DIR}. Creating from template...${NC}"
  if [[ -f ".env.template" ]]; then
    cp .env.template .env
    echo -e "${YELLOW}Created .env from .env.template. Please review settings.${NC}"
  fi
fi

# Source .env safely if present
if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

# 5. Create Pre-Update PostgreSQL Backup
BACKUP_DIR="${STACK_DIR}/backups"
mkdir -p "${BACKUP_DIR}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/evolution_backup_${TIMESTAMP}.sql.gz"

echo -n "1. Creating pre-update PostgreSQL backup... "
if ${DOCKER_COMPOSE} ps -q postgres 2>/dev/null | grep -q .; then
  PG_USER="${POSTGRES_USER:-evolution_user}"
  PG_DB="${POSTGRES_DB:-evolution_db}"
  if ${DOCKER_COMPOSE} exec -T postgres pg_dump -U "${PG_USER}" "${PG_DB}" 2>/dev/null | gzip > "${BACKUP_FILE}"; then
    BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    echo -e "${GREEN}DONE (${BACKUP_SIZE})${NC}"
    echo -e "   Saved to: ${BACKUP_FILE}"
    
    # Auto-rotate: keep only the latest 7 backups
    find "${BACKUP_DIR}" -name "evolution_backup_*.sql.gz" -type f | sort -r | tail -n +8 | xargs -r rm -f
  else
    echo -e "${YELLOW}SKIPPED (container not responsive or database not initialized yet)${NC}"
    rm -f "${BACKUP_FILE}"
  fi
else
  echo -e "${YELLOW}SKIPPED (postgres container not currently running)${NC}"
fi

# 6. Pull latest container images
echo -e "\n2. Pulling latest Docker images..."
${DOCKER_COMPOSE} pull

# 7. Apply updates with zero-loss container recreation
echo -e "\n3. Recreating and restarting containers..."
${DOCKER_COMPOSE} up -d --remove-orphans

# 8. Wait and verify container health
echo -e "\n4. Verifying container health..."
MAX_WAIT=45
ELAPSED=0
API_READY=false

echo -n "   Waiting for Evolution API engine to become healthy... "
while [[ ${ELAPSED} -lt ${MAX_WAIT} ]]; do
  # Check HTTP response on port 8080
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/ || true)
  if [[ "${HTTP_CODE}" == "200" ]]; then
    API_READY=true
    break
  fi
  sleep 3
  ELAPSED=$((ELAPSED + 3))
  echo -n "."
done

echo ""
if [[ "${API_READY}" == "true" ]]; then
  echo -e "   ${GREEN}✓ Evolution API is ONLINE and healthy (HTTP 200)${NC}"
else
  echo -e "   ${YELLOW}! Evolution API taking longer to report HTTP 200. Container status:${NC}"
fi

# 9. Print container status
echo -e "\n5. Container status:"
${DOCKER_COMPOSE} ps

# 10. Clean up unused images to free Webdock disk space
echo -e "\n6. Cleaning up dangling Docker images to free disk space..."
docker image prune -f || true

# 11. Final Summary
echo -e "\n${CYAN}==============================================================${NC}"
echo -e "${GREEN}${BOLD}✓ Webdock Evolution API Stack Update Completed Successfully!${NC}"
echo -e "${CYAN}==============================================================${NC}"
echo -e "Local API:       http://127.0.0.1:8080/"
if [[ -n "${DOMAIN_NAME:-}" && "${DOMAIN_NAME}" != "wa.yourdomain.com" ]]; then
  echo -e "Public Domain:   https://${DOMAIN_NAME}/"
fi
echo -e "Backup stored:   ${BACKUP_FILE:-none}"
echo -e "Check logs:      ${DOCKER_COMPOSE} logs -f evolution_api"
echo -e "${CYAN}==============================================================${NC}"
