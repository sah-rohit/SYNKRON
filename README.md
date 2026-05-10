# SYNKRON — Self-Healing AI Documentation Engine

SYNKRON treats documentation as a dynamic reflection of source code. When a developer pushes a change, SYNKRON detects the diff via GitHub Webhooks, uses AI to reason through the *intent* of the change, and automatically updates the documentation.

## Features

- **Continuous Self-Healing** — GitHub Webhooks trigger AST-diff analysis. If code diverges from docs, AI reconciles them automatically.
- **Bento-Grid Dashboard** — At-a-glance view of API health, heal history, and dependency graph.
- **Context-Aware Explanations** — Uses Groq (llama-3.3-70b) with OpenAI fallback to explain *why* code exists, not just *what* it does.
- **Live API Playground** — Test every endpoint directly from the dashboard with real responses.
- **Semantic Search** — Ask natural language questions; vector similarity returns the exact code block and explanation.
- **HMAC-SHA256 Webhook Validation** — All GitHub payloads are cryptographically verified.
- **GDPR/CCPA Data Export** — One-click JSON export of all user data.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database | Neon Serverless Postgres + Drizzle ORM |
| AI (Primary) | Groq `llama-3.3-70b-versatile` via Vercel AI SDK |
| AI (Fallback) | OpenAI `gpt-4o-mini` |
| Embeddings | OpenAI `text-embedding-3-small` |
| Real-time | Convex |
| Auth | PBKDF2 password hashing + httpOnly session cookies |

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.local` and fill in your values:

```bash
# Required for full functionality
DATABASE_URL=postgresql://...        # Neon Postgres connection string
GROQ_API_KEY=gsk_...                 # https://console.groq.com (free tier available)
OPENAI_API_KEY=sk-...                # https://platform.openai.com (for embeddings + fallback)
GITHUB_WEBHOOK_SECRET=<random-hex>  # openssl rand -hex 32
```

### 3. Push the database schema

```bash
npm run db:push
```

### 4. Run the development server

```bash
npm run dev
```

### 5. Configure GitHub Webhook

In your GitHub repository → Settings → Webhooks → Add webhook:
- **Payload URL**: `https://your-domain.com/api/webhook`
- **Content type**: `application/json`
- **Secret**: Same value as `GITHUB_WEBHOOK_SECRET`
- **Events**: Just the `push` event

## API Reference

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/v1/health` | System health check (DB, AI providers, webhook) |
| `POST` | `/api/webhook` | GitHub push webhook receiver (HMAC-SHA256 validated) |
| `POST` | `/api/heal` | AI self-healing: AST diff + Groq/OpenAI reconciliation |
| `POST` | `/api/v1/search` | Semantic search across healed documentation |
| `GET` | `/api/v1/docs` | List all healed doc files |
| `POST` | `/api/auth/register` | Register a new developer account |
| `POST` | `/api/auth/login` | Authenticate and receive session cookie |
| `POST` | `/api/auth/logout` | Revoke current session |

## The Healing Pipeline

```
1. Developer pushes to main
2. GitHub sends POST to /api/webhook
3. HMAC-SHA256 signature is verified
4. Modified .ts/.tsx/.js files are identified
5. AST snapshot is compared against stored snapshot
6. If structural changes detected → POST /api/heal
7. Groq llama-3.3-70b generates updated Markdown
8. OpenAI embedding is generated for semantic search
9. Documentation is updated; Bento grid shows "Healed X minutes ago"
```

### Setup
1. Copy `.env.example` to `.env.local`
2. Configure `DATABASE_URL` (Neon Postgres) and `GROQ_API_KEY` (AI provider)
3. Run `npm install`
4. Run `npx convex dev` (Initializes Convex Auth + Tracking DB)
5. Run `npm run db:push` (Syncs Drizzle schema)
6. Start dev server: `npm run dev`

## Deployment

Deploy to Vercel with one click. All API routes run on the Edge Runtime.

```bash
npm run build
npm run start
```

Set all environment variables in your Vercel project settings.
