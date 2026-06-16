# GEX Dashboard

Read-only SPX gamma exposure (GEX) dashboard that queries a shared Railway PostgreSQL database populated by the [GEX processor](https://github.com/TheMitchyBoy/GEX).

## Features

| Page | Route | Description |
|------|-------|-------------|
| Overview | `/` | Live cards, auto-refresh 90s, flow/macro badges |
| GEX Profile | `/profile` | Bar chart ±3% of spot |
| Cumulative GEX | `/cumulative` | Cumulative curve + gamma flip |
| Intraday | `/timeline` | Spot/GEX with regime bands |
| Heatmap | `/heatmap` | Strike × time GEX ladder |
| Wall Drift | `/wall-drift` | Flip & walls through session |
| History | `/history` | Table with deep links |
| Term Structure | `/term-structure` | Expiration GEX + expected move |
| Greeks | `/greeks` | Paginated greek exposure |
| Trades | `/trades` | Trade journal |
| Decisions | `/decisions` | Decision log |
| LLM | `/llm-predictions` | LLM forecast history |
| Insights | `/daily-insights` | Daily AI lessons |

**Shared snapshot context:** date + snapshot sync via URL (`?market_date=&ts=`).

## Environment

```bash
DATABASE_URL=postgresql://...          # required
NODE_ENV=production
PROCESSOR_HEALTH_URL=                  # server-side processor health (optional)
NEXT_PUBLIC_PROCESSOR_HEALTH_URL=        # client banner (optional)
PG_POOL_MAX=5
BASIC_AUTH_USER=                       # optional HTTP basic auth
BASIC_AUTH_PASSWORD=
```

`/api/health` and `/api/ready` are excluded from basic auth (Railway healthchecks).

## API

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Liveness (always 200) |
| `GET /api/ready` | Readiness (503 if DB down) |
| `GET /api/heatmap?market_date=` | Strike × time heatmap |
| `GET /api/wall-drift?market_date=` | Flip/wall drift series |
| `GET /api/trades` | Trade journal |
| `GET /api/decisions` | Decision log |
| `GET /api/llm-predictions` | LLM predictions |
| `GET /api/daily-insights` | Daily insights |
| `GET /api/snapshots/:ts/summary?greeks_only=1&limit=&offset=` | Paginated greeks |

Snapshot endpoints return `Cache-Control` headers for immutable historical data.

## Read-only DB user (recommended)

```sql
CREATE USER gex_reader WITH PASSWORD 'your-secure-password';
GRANT CONNECT ON DATABASE railway TO gex_reader;
GRANT USAGE ON SCHEMA public TO gex_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO gex_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO gex_reader;
```

## Local dev

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Railway

1. Same project as processor + Postgres
2. `DATABASE_URL=${{Postgres.DATABASE_URL}}`
3. Deploy from Dockerfile — healthcheck on `/api/health`
