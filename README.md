# WAPilot — Multi-Tenant WhatsApp Automation SaaS (Evolution API + Supabase)

WAPilot is a multi-tenant SaaS platform built on top of [Evolution API](https://github.com/EvolutionAPI/evolution-api) (self-hosted WhatsApp REST API on Docker with PostgreSQL + Redis) and Supabase (PostgreSQL with Row Level Security + Auth).

---

## 🏗 High-Level Multi-Tenant Architecture

```
[ End User (Browser) ]
       │
       ▼
[ WAPilot SaaS (Next.js Dashboard + Auth + Billing) ]
       │
       │  — Server-side ONLY (admin apikey & instance tokens never exposed to client)
       │  — Strict tenant ownership verification (auth.uid() = user_id)
       │  — Tenant rate limiting (30 msg/min) & subscription quota enforcement
       ▼
[ Evolution API (Docker on VPS with PostgreSQL & Redis) ]
       │  — One isolated instance per connected number: instanceName = `tenant_<user_id>_<n>`
       │  — Webhook callback registered per instance to WAPilot: `/api/webhook/evolution`
       ▼
[ WhatsApp Network (Baileys Engine) ]
```

---

## 🚀 VPS Deployment: Evolution API on Docker

On your VPS where Evolution API is deployed, ensure your `docker-compose.yml` has the following environment variables enabled:

```yaml
version: '3.8'

services:
  evolution-api:
    image: atendai/evolution-api:latest
    container_name: evolution-api
    restart: always
    ports:
      - "8080:8080"
    environment:
      - SERVER_URL=https://wa.yourdomain.com
      - CORS_ORIGIN=*
      - CORS_METHODS=GET,POST,PUT,DELETE
      - CORS_CREDENTIALS=true
      # Global Admin API Key (Store this securely in your SaaS .env as EVOLUTION_API_ADMIN_KEY)
      - AUTHENTICATION_TYPE=apikey
      - AUTHENTICATION_API_KEY=your_super_secret_evolution_admin_key_here
      # Database
      - DATABASE_ENABLED=true
      - DATABASE_CONNECTION_URI=postgresql://user:password@postgres:5432/evolution?schema=public
      # Redis Cache
      - CACHE_REDIS_ENABLED=true
      - CACHE_REDIS_URI=redis://redis:6379/1
      # Webhooks
      - WEBHOOK_GLOBAL_ENABLED=false
      - WEBHOOK_GLOBAL_URL=
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15-alpine
    restart: always
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=evolution
    volumes:
      - evolution_pg_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    restart: always
    volumes:
      - evolution_redis_data:/data

volumes:
  evolution_pg_data:
  evolution_redis_data:
```

Reverse proxy via Nginx or Caddy with SSL:
`https://wa.yourdomain.com` -> `http://localhost:8080`.

---

## 🔑 Environment Variables Configuration

Copy `.env.example` to `.env.local` (or configure in Vercel project settings):

| Variable | Description | Example |
| :--- | :--- | :--- |
| `EVOLUTION_API_BASE_URL` | Public or internal URL of Evolution API on your VPS | `https://wa.yourdomain.com` or `http://192.168.1.50:8080` |
| `EVOLUTION_API_ADMIN_KEY` | The `AUTHENTICATION_API_KEY` set in your VPS Docker Compose | `c89a7465f12e8b...` |
| `EVOLUTION_WEBHOOK_SECRET` | Shared secret header validated on incoming webhooks | `whsec_993b...` |
| `APP_URL` | The public URL of your WAPilot application | `https://app.yourdomain.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| Supabase Public Anonymous Key | `eyJhbGci...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key (server-only for webhooks & system jobs) | `eyJhbGci...` |
| `INSTANCE_TOKEN_ENCRYPTION_SECRET` | 32-character AES-256 key for encrypting instance tokens at rest | `32-character-random-secret-key-!!` |
| `STRIPE_SECRET_KEY` | Stripe Secret API Key (for subscriptions) | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook Secret | `whsec_...` |

---

## 🗄 Supabase Database Setup & Migrations

The database migration is located in:
`/supabase/migrations/20260918000000_initial_schema.sql`

To apply it to your Supabase project:
1. Go to your **Supabase Dashboard** -> **SQL Editor**.
2. Paste the contents of `20260918000000_initial_schema.sql` and run it.
3. Or apply via the Supabase CLI:
   ```bash
   supabase db push
   ```

### Included Tables & RLS:
1. `profiles`: references `auth.users(id)`. Auto-provisioned on signup via PostgreSQL trigger `on_auth_user_created`.
2. `subscriptions`: plan limits (`instance_limit`, `message_limit`), status, and billing cycle.
3. `whatsapp_instances`: maps each connected number to a tenant-scoped Evolution instance (`tenant_<user_id>_<n>`), status, phone number, and AES-256 encrypted instance token.
4. `message_logs`: in/out log history with phone numbers, body, and status.
5. `automations`: rules for keyword matching, triggers, and auto-reply templates.

---

## 🔄 The "Connect WhatsApp" QR Code Flow

1. Tenant clicks **"Connect WhatsApp"** in the dashboard.
2. The server creates an instance in Evolution API via:
   `POST /instance/create`
   - `instanceName`: `tenant_<user_id>_<timestamp>`
   - `token`: dynamically generated unique instance token
   - `webhook`: `${APP_URL}/api/webhook/evolution`
   - `events`: `['CONNECTION_UPDATE', 'MESSAGES_UPSERT', 'QRCODE_UPDATED']`
3. Server requests the QR code:
   `GET /instance/connect/{instanceName}`
4. The dashboard displays the live QR code in a high-visibility modal with an auto-refresh timer.
5. When the user scans with their WhatsApp app, Evolution API emits:
   `CONNECTION_UPDATE` with state `open` and phone number.
6. The webhook `/api/webhook/evolution` marks the instance `connected` in Supabase, and the dashboard transitions automatically!

---

## ⚡ Keyword → Auto-Reply Webhook Loop

1. External customer sends a WhatsApp message to the connected number.
2. Evolution API forwards the webhook to `/api/webhook/evolution`:
   ```json
   {
     "event": "MESSAGES_UPSERT",
     "instance": "tenant_1234_1",
     "data": {
       "key": { "remoteJid": "14155550199@s.whatsapp.net", "fromMe": false },
       "message": { "conversation": "What are your tour prices?" }
     }
   }
   ```
3. The webhook receiver:
   - Validates the webhook secret.
   - Logs incoming message to `message_logs` (direction: `in`).
   - Checks active `automations` matching `trigger_type = 'keyword'`.
   - Matches keywords (`price` -> contains / exact / starts_with).
   - Automatically dispatches the reply via Evolution API:
     `POST /message/sendText/{instanceName}`
   - Logs auto-reply to `message_logs` (direction: `out`).

---

## 🛡 Security Best Practices Implemented

- **No Client-Side Credentials**: Evolution API global admin key and per-instance tokens are NEVER passed to the browser.
- **Tenant Scoping**: All API routes verify `auth.uid() = user_id` before querying instances or dispatching messages.
- **Token Encryption at Rest**: Evolution API instance tokens are encrypted in the database with AES-256-GCM.
- **Rate Limiting**: 30 messages per minute per tenant sliding window to prevent WhatsApp ban risks and VPS CPU exhaustion.
- **Subscription Enforcement**: Verifies monthly message quota and max instance count before executing actions.
