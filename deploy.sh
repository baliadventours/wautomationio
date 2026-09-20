#!/usr/bin/env bash
set -e

echo "=========================================="
echo "  Wautomation.io Automated Deployment    "
echo "=========================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR=""

if [ -f "${SCRIPT_DIR}/package.json" ]; then
  APP_DIR="${SCRIPT_DIR}"
elif [ -d "/opt/wautomation/app" ]; then
  APP_DIR="/opt/wautomation/app"
elif [ -d "/opt/wautomation" ]; then
  APP_DIR="/opt/wautomation"
else
  APP_DIR="/opt/wautomation/app"
  echo "Cloning repository to ${APP_DIR}..."
  mkdir -p /opt/wautomation
  git clone https://github.com/baliadventours/wautomationio.git "$APP_DIR"
fi

cd "$APP_DIR"

echo "1. Pulling latest code..."
if [ -d ".git" ]; then
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
  git fetch origin "$CURRENT_BRANCH" || true
  git reset --hard "origin/$CURRENT_BRANCH" || true
fi

echo "2. Installing node dependencies..."
npm install --legacy-peer-deps --no-audit --no-fund

echo "3. Building Vite frontend & backend bundle..."
npm run build

echo "4. Reloading PM2 process..."
if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
fi

if pm2 list 2>/dev/null | grep -q "wautomation"; then
  pm2 reload wautomation --update-env || pm2 restart wautomation --update-env
else
  pm2 start dist/server.cjs --name wautomation
fi

pm2 save

echo "=========================================="
echo "✅ Deployment / Update Successful!"
echo "App running on http://localhost:3000"
echo "=========================================="
