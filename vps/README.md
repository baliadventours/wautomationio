# Wautomation.io - VPS Setup Guide (Phase 1)

This directory contains the production-grade, hardened Docker Compose stack for **Evolution API** (supporting your fork `github.com/baliadventours/evolution-api` and upstream `evoapicloud/evolution-api:latest`).

---

## 📁 Files in `/vps`

1. **`docker-compose.yml`**:
   - `postgres:16-alpine`: Isolated database for WhatsApp session tokens and message logs.
   - `redis:7-alpine`: High-throughput session caching and lock provider.
   - `evolution_api`: WhatsApp multi-instance engine configured strictly for PostgreSQL + Redis.
   - `caddy:2-alpine`: Automated HTTPS reverse proxy with TLS certificate issuance and security headers.
2. **`Caddyfile`**:
   - Production reverse proxy configuration routing `wa.yourdomain.com` to `evolution_api:8080`.
   - Strips server signatures and enables WebSocket upgrade headers for Baileys live event channels.
3. **`.env.template`**:
   - Complete configuration template containing every verified environment variable required by Evolution API v2.x (database connection URIs, global authentication API key, Redis cache configurations, and global webhook routing).

---

## 🚀 Quick Start on your VPS (Ubuntu / Debian / Webdock)

### Step 1: Copy VPS stack to `/opt/evolution-api`
```bash
sudo mkdir -p /opt/evolution-api
sudo cp -r vps/* /opt/evolution-api/
cd /opt/evolution-api
```

### Step 2: Configure `.env`
```bash
cp .env.template .env
nano .env
```
Ensure you set:
- `SERVER_URL=https://wa.yourdomain.com`
- `DOMAIN_NAME=wa.yourdomain.com`
- `LETSENCRYPT_EMAIL=your-email@example.com`
- `AUTHENTICATION_API_KEY`: Generate a 32+ character random hex key:
  ```bash
  openssl rand -hex 24
  ```
- `POSTGRES_PASSWORD` and `REDIS_PASSWORD`: Secure random passwords.

### Step 3: Launch Stack
```bash
docker compose up -d
```

### Step 4: Verify Containers are Healthy
```bash
docker compose ps
```
All services (`evolution_postgres`, `evolution_redis`, `evolution_api`, `evolution_caddy`) should report `healthy` or `running`.

---

## 🔄 Running Updates on Webdock / VPS

The automated update script `update.sh`:
- Creates a timestamped PostgreSQL backup (`backups/evolution_backup_*.sql.gz`) with automatic 7-day retention
- Pulls the latest Evolution API, PostgreSQL, Redis, and Caddy container images
- Recreates containers with zero data loss
- Verifies that the Evolution API healthcheck returns HTTP 200
- Prunes dangling Docker images to keep your Webdock SSD clean

### Quick One-Liner (Run inside Webdock SSH or Web Terminal):
```bash
cd /opt/evolution-api && sudo bash update.sh
```

### Full OS & Docker Update (Optional):
To update both the Ubuntu/Debian system packages and the Evolution API stack:
```bash
sudo apt update && sudo apt upgrade -y && cd /opt/evolution-api && sudo bash update.sh
```

---

## 🧪 Run Smoke Test

Run the automated smoke test script to verify:
1. Health check endpoint (`GET /`)
2. Multi-tenant instance creation (`POST /instance/create` with `t_<tenantId>_<n>`)
3. QR code / Pairing code generation (`GET /instance/connect/t_<tenantId>_<n>`)
4. Instance state check
5. Optional message dispatch test
6. Clean teardown (`DELETE /instance/delete/t_<tenantId>_<n>`)

### Shell Script (Direct cURL):
```bash
./scripts/smoke-test.sh <tenant_id> <instance_index> [optional_recipient_number]

# Example:
./scripts/smoke-test.sh tenant1 1 628123456789
```

### TypeScript / Node Runner:
```bash
npm run smoke-test -- tenant1 1
```
