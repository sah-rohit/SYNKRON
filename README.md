# SYNKRON — Self-Healing AI Documentation Engine

> **⚠ DEVELOPMENT NOTICE:** SYNKRON is currently in **active development**. Core features work but some capabilities require additional configuration (database, AI keys, GitHub OAuth). Features marked `[requires config]` need environment variables set before they function. Do not use as the sole documentation system for mission-critical production systems without independent backups.

---

## What is SYNKRON?

SYNKRON treats documentation as a **living artifact** that automatically stays in sync with your source code. When a developer pushes a commit, SYNKRON detects structural code changes via GitHub Webhooks, uses AI to understand the *intent* of the change, and regenerates the affected documentation — automatically, without any manual intervention.

Built for high-velocity engineering teams where documentation rot is a constant problem.

---

## Current Status

| Feature | Status | Requires |
|---|---|---|
| Email/password auth | ✅ Working | — (in-memory fallback) |
| GitHub OAuth | ✅ Working | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` |
| Repository connection | ✅ Working | — |
| GitHub webhook validation | ✅ Working | `GITHUB_WEBHOOK_SECRET` |
| AI self-healing (manual) | ✅ Working | `GROQ_API_KEY` |
| AI self-healing (webhook) | ✅ Working | `GROQ_API_KEY` + DB |
| Scheduled healing (cron) | ✅ Working | `DATABASE_URL` + `CRON_SECRET` |
| Doc health scoring | ✅ Working | `DATABASE_URL` |
| Stale doc alerts | ✅ Working | `DATABASE_URL` |
| Changelog generation | ✅ Working | `DATABASE_URL` |
| Semantic search | ✅ Working | `DATABASE_URL` + `OPENAI_API_KEY` |
| UI/UX rating (text) | ✅ Working | `GROQ_API_KEY` |
| UI/UX rating (screenshots) | ✅ Working | `OPENAI_API_KEY` |
| Security scanner | ✅ Working | Python in PATH |
| Security auto-fix | ✅ Working | `GROQ_API_KEY` |
| File editor + GitHub commit | ✅ Working | GitHub PAT |
| PR description generation | ✅ Working | `GROQ_API_KEY` |
| Email notifications | ✅ Working | `SMTP_HOST` + credentials |
| Team workspaces | ✅ Working | `DATABASE_URL` |
| Session management | ✅ Working | — |
| Data export (GDPR) | ✅ Working | — |
| VM execution engine | ✅ Working | Python in PATH |
| Assembly conversion | ✅ Working | Python in PATH |
| Rust JIT CLI | ⚠ Partial | Rust toolchain |
| Doc export (HTML/ZIP/JSON) | ✅ Working | — |
| Convex real-time sync | ✅ Working | `NEXT_PUBLIC_CONVEX_URL` |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database | Neon Serverless Postgres + Drizzle ORM |
| AI Primary | Groq `llama-3.3-70b-versatile` |
| AI Fallback | OpenAI `gpt-4o-mini` |
| Vision AI | OpenAI `gpt-4o` (UI Rater screenshots) |
| Embeddings | OpenAI `text-embedding-3-small` |
| Real-time | Convex (auth, activity logs, webhook queue) |
| Auth | PBKDF2-SHA256 + httpOnly session cookies |
| Sidecars | Python (VM, ASM, analyzer), C# (shadow branching), Rust (JIT CLI) |

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.local` and fill in your values:

```bash
# Required for database persistence (get free DB at neon.tech)
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Required for AI healing (free tier at console.groq.com)
GROQ_API_KEY=gsk_...

# Required for webhook validation (generate: openssl rand -hex 32)
GITHUB_WEBHOOK_SECRET=<random-hex>

# Required for Convex real-time features
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Optional — enables semantic search and UI screenshot rating
OPENAI_API_KEY=sk-...

# Optional — enables GitHub OAuth login
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Optional — enables email notifications
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...

# Optional — protects the scheduled healing endpoint
CRON_SECRET=<random-hex>
```

### 3. Initialize Convex

```bash
npx convex dev
```

This sets up the Convex auth tables, activity log schema, and webhook queue.

### 4. Push the database schema

```bash
npm run db:push
```

Syncs the Drizzle schema to your Neon Postgres database. Required for all database-backed features.

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Configure GitHub Webhook

In your GitHub repository → **Settings → Webhooks → Add webhook**:

| Field | Value |
|---|---|
| Payload URL | `https://your-domain.com/api/webhook` |
| Content type | `application/json` |
| Secret | Same value as `GITHUB_WEBHOOK_SECRET` |
| Events | Just the `push` event |

> **Tip:** Use the built-in webhook test tool in the Repositories view to verify your webhook is working before pushing real commits.

---

## The Healing Pipeline

```
1. Developer pushes to tracked branch
2. GitHub sends POST to /api/webhook
3. HMAC-SHA256 signature verified against GITHUB_WEBHOOK_SECRET
4. Modified .ts/.tsx/.js/.jsx files identified
5. AST snapshot built (functions, classes, exports, imports, hash)
6. New snapshot diffed against stored snapshot
7. If structural changes detected → AI reconciliation triggered
8. Groq llama-3.3-70b generates updated Markdown
9. OpenAI embedding generated for semantic search (if configured)
10. Doc file updated in database, HealEvent logged
```

---

## API Reference

### Core

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/v1/health` | System health check (DB, Groq, OpenAI, webhook) |
| `POST` | `/api/webhook` | GitHub push webhook receiver (HMAC-SHA256 validated) |
| `POST` | `/api/webhook/test` | Simulate a webhook push for testing |
| `POST` | `/api/heal` | Manual AI self-healing: AST diff + AI reconciliation |
| `POST` | `/api/v1/search` | Semantic search across healed documentation |
| `GET` | `/api/v1/docs` | List all healed doc files for a repository |

### Auth

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new account |
| `POST` | `/api/auth/login` | Authenticate, receive session cookie |
| `POST` | `/api/auth/logout` | Revoke current session |
| `GET` | `/api/auth/me` | Get current user profile |
| `GET` | `/api/auth/github` | Start GitHub OAuth flow |
| `GET` | `/api/auth/github/callback` | GitHub OAuth callback |
| `PATCH` | `/api/auth/profile` | Update username/fullName |
| `PUT` | `/api/auth/password` | Change password |
| `GET` | `/api/auth/sessions` | List active sessions |
| `DELETE` | `/api/auth/sessions` | Revoke all other sessions |
| `DELETE` | `/api/auth/sessions/[id]` | Revoke specific session |
| `DELETE` | `/api/auth/account` | Permanently delete account |

### Repositories

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/repositories` | List connected repositories |
| `POST` | `/api/repositories` | Connect new repository |
| `DELETE` | `/api/repositories/[id]` | Disconnect repository |
| `GET` | `/api/repositories/[id]/heals` | Heal history |
| `GET` | `/api/repositories/[id]/branches` | List branches |
| `POST` | `/api/repositories/[id]/branches` | Add branch |
| `GET` | `/api/repositories/[id]/tree` | GitHub file tree |
| `GET/PATCH` | `/api/repositories/[id]/settings` | Repository settings |
| `GET/POST` | `/api/repositories/[id]/tokens` | Access tokens |
| `POST` | `/api/repositories/[id]/webhook-secret` | Rotate webhook secret |
| `POST` | `/api/repositories/[id]/commit` | Commit file to GitHub |
| `DELETE` | `/api/repositories/[id]/commit` | Delete file from GitHub |

### AI & Analysis

| Method | Route | Description |
|---|---|---|
| `GET/POST` | `/api/ai-quota` | Check / consume AI quota |
| `GET/POST` | `/api/health-score` | Doc health score (0–100) |
| `GET` | `/api/stale-docs` | Stale doc alerts |
| `POST` | `/api/changelog` | Generate CHANGELOG.md |
| `POST` | `/api/export` | Export docs (HTML/ZIP/JSON) |
| `POST` | `/api/ui-rater` | AI UI/UX rating |
| `POST` | `/api/security/scan` | Security vulnerability scan |
| `POST` | `/api/security/fix` | AI security fix suggestion |
| `POST` | `/api/webhook/pr-description` | Generate PR description |
| `POST/GET` | `/api/cron/heal` | Scheduled healing |
| `POST` | `/api/asm` | Code → assembly conversion |
| `POST` | `/api/vm` | VM bytecode execution |
| `POST` | `/api/parse-native` | Native Python AST analysis |

### GitHub Proxy

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/github/repos` | List/search GitHub repos (server-side proxy) |
| `GET` | `/api/github/validate` | Validate repo exists before connecting |

---

## Demo Mode (No Database)

SYNKRON works without a database configured. In demo mode:

- Auth uses an **in-memory store** (data lost on server restart)
- Heal events are not persisted
- Semantic search returns demo results
- Health score returns a static 87%
- Stale docs returns empty list

Set `DATABASE_URL` to enable full persistence.

---

## Deployment

Deploy to Vercel with one click. Set all environment variables in your Vercel project settings.

```bash
npm run build
npm run start
```

For scheduled healing, configure a Vercel Cron job:

```json
{
  "crons": [
    {
      "path": "/api/cron/heal",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

---

## License

MIT License — free for commercial and non-commercial use. See [LICENSE](LICENSE) for details.

Built by **Sonata Interactive**. Open-source & free forever.
