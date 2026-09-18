#!/bin/bash
set -e

echo "=========================================="
echo "  Wautomation.io Automated Deployment    "
echo "=========================================="

APP_DIR="/opt/wautomation/app"

if [ ! -d "$APP_DIR" ]; then
  echo "Cloning repository..."
  mkdir -p /opt/wautomation
  git clone https://github.com/baliadventours/wautomationio.git "$APP_DIR"
fi

cd "$APP_DIR"

echo "1. Pulling latest code from origin/main..."
git fetch origin main
git reset --hard origin/main

echo "2. Installing node dependencies..."
npm install --no-audit --no-fund

echo "3. Building Vite frontend & backend bundle..."
npm run build

echo "4. Reloading PM2 process..."
if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
fi

if pm2 list | grep -q "wautomation"; then
  pm2 reload wautomation --update-env
else
  pm2 start dist/server.cjs --name wautomation
fi

pm2 save

echo "=========================================="
echo "✅ Deployment Successful!"
echo "App running on http://localhost:3000"
echo "=========================================="
