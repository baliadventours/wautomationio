#!/usr/bin/env bash
# ==============================================================================
# Wautomation.io - 1-Click Complete Automated Deployment Script
# OS Target: Ubuntu 20.04 / 22.04 LTS (Jammy) / 24.04 LTS
# ==============================================================================
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}====================================================================${NC}"
echo -e "${GREEN}       Wautomation.io - 1-Click Automated VPS Installer             ${NC}"
echo -e "${BLUE}====================================================================${NC}"

# 1. Verify root / sudo
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[-] Please run this script with sudo: sudo bash install.sh${NC}"
  exit 1
fi

# 2. Install base utilities
echo -e "${BLUE}[1/5] Checking and installing system packages...${NC}"
apt-get update -y -q
apt-get install -y -q curl git ufw jq openssl ca-certificates gnupg lsb-release

# 3. Install Docker and Docker Compose Plugin if missing
if ! command -v docker &> /dev/null; then
  echo -e "${BLUE}[2/5] Installing official Docker Engine...${NC}"
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

  apt-get update -y -q
  apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
  echo -e "${GREEN}[✓] Docker installed successfully.${NC}"
else
  echo -e "${GREEN}[✓] Docker already installed.${NC}"
fi

# 4. Generate .env credentials if not present
echo -e "${BLUE}[3/5] Configuring environment and database secrets...${NC}"
if [ ! -f .env ]; then
  POSTGRES_PASS=$(openssl rand -hex 16)
  REDIS_PASS=$(openssl rand -hex 16)
  EVOLUTION_KEY=$(openssl rand -hex 24)

  cat << ENV_EOF > .env
PORT=3000
NODE_ENV=production
POSTGRES_DB=wautomation_db
POSTGRES_USER=wautomation_user
POSTGRES_PASSWORD=${POSTGRES_PASS}
REDIS_PASSWORD=${REDIS_PASS}
EVOLUTION_API_KEY=${EVOLUTION_KEY}
EVOLUTION_SERVER_URL=http://localhost:8080
EVOLUTION_API_URL=http://evolution_api:8080
ENV_EOF
  echo -e "${GREEN}[✓] Generated secure .env file with fresh credentials.${NC}"
else
  echo -e "${GREEN}[✓] Existing .env file found.${NC}"
fi

# 5. Configure firewall rules
echo -e "${BLUE}[4/5] Updating firewall rules (ports 22, 80, 443, 3000)...${NC}"
ufw allow 22/tcp > /dev/null 2>&1 || true
ufw allow 80/tcp > /dev/null 2>&1 || true
ufw allow 443/tcp > /dev/null 2>&1 || true
ufw allow 3000/tcp > /dev/null 2>&1 || true

# 6. Build and launch Docker Compose stack
echo -e "${BLUE}[5/5] Building application and launching containers...${NC}"
docker compose down > /dev/null 2>&1 || true
docker compose up -d --build

SERVER_IP=$(curl -s https://api.ipify.org || hostname -I | awk '{print $1}')

echo ""
echo -e "${GREEN}====================================================================${NC}"
echo -e "${GREEN}  ✓ Wautomation.io Successfully Deployed!                           ${NC}"
echo -e "${GREEN}====================================================================${NC}"
echo -e "Access your application at:  ${YELLOW}http://${SERVER_IP}:3000${NC}"
echo -e "Master Admin login:          ${YELLOW}baliadventours@gmail.com${NC} (Password: admin)"
echo ""
echo -e "Check live container health: ${BLUE}docker compose ps${NC}"
echo -e "View live application logs:  ${BLUE}docker compose logs -f wautomation_app${NC}"
echo -e "${GREEN}====================================================================${NC}"
