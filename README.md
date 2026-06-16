# GEX Dashboard

Read-only SPX gamma exposure (GEX) dashboard that queries a shared Railway PostgreSQL database populated by the [GEX processor](https://github.com/TheMitchyBoy/GEX).

```
┌─────────────────────┐         ┌──────────────────────┐
│  GEX Processor      │         │  GEX Dashboard       │
│  (UW API → process) │──writes─►│  Railway Postgres   │
│                     │         │  ◄── reads           │
└─────────────────────┘         └──────────────────────┘
```

This app does **not** fetch Unusual Whales or write to Postgres.

## Features

| Page | Description |
|------|-------------|
| **Overview** | Latest snapshot cards: spot, GEX, regime, flip, VIX, walls |
| **GEX Profile** | Bar chart: strike vs `gex_bn_per_pct` |
| **Cumulative GEX** | Cumulative curve with gamma flip marker |
| **Intraday** | Spot + total GEX timeline for a trading day |
| **History** | Date picker → snapshot table |
| **Term Structure** | GEX by expiration from `expiration_json` |
| **Greeks** | Table from `greek_exposure_json` |

Times display in **America/New_York**.

## Tech Stack

- **Next.js 15** (App Router) — UI + API routes
- **pg** — PostgreSQL connection pool (Railway SSL)
- **Recharts** — charts
- **Docker** — Railway deployment

## Environment

Copy `.env.example` to `.env.local` for local dev:

```bash
DATABASE_URL=postgresql://user:pass@host:port/db?sslmode=require
PORT=3000
NODE_ENV=development
PROCESSOR_HEALTH_URL=https://your-processor.railway.app/health/live  # optional
```

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | Same Railway Postgres as processor |
| `PORT` | No | Default 3000 |
| `PROCESSOR_HEALTH_URL` | No | Optional processor health monitoring |

## Local Development

```bash
npm install
npm run dev
```

Open http://localhost:3000

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | DB connectivity + data freshness |
| GET | `/api/snapshots/latest` | Latest SPX snapshot with walls |
| GET | `/api/snapshots/dates?limit=90` | Available trading days |
| GET | `/api/snapshots?market_date=YYYY-MM-DD` | Intraday timeline |
| GET | `/api/snapshots?series=multi&limit=500` | Multi-day series |
| GET | `/api/snapshots/:ts/strikes` | Strike profile |
| GET | `/api/snapshots/:ts/summary` | Full summary + expiration + greeks |

## Railway Deployment

1. Create a new service in the same Railway project as the processor and Postgres.
2. Connect this repo (or deploy via Dockerfile).
3. Set `DATABASE_URL` from the shared Postgres service (read-only user recommended).
4. Set `PORT=3000` and `NODE_ENV=production`.
5. Deploy — health check hits `/api/health`.

```bash
# Docker build (matches Railway)
docker build -t gex-dashboard .
docker run -p 3000:3000 -e DATABASE_URL="..." gex-dashboard
```

## Database Schema

Reads from tables written by the processor:

- `snapshots` — one row per ~10 min intraday slice
- `snapshot_strikes` — per-strike GEX profile

See [processor schema docs](https://github.com/TheMitchyBoy/GEX/blob/main/docs/DASHBOARD_SCHEMA.md).

## Domain Glossary

| Term | Meaning |
|------|---------|
| GEX | Dealer gamma exposure — hedging flow per 1% spot move |
| LONG gamma | Positive total GEX — dampens moves |
| SHORT gamma | Negative total GEX — can amplify moves |
| Gamma flip | Strike where cumulative GEX crosses zero |
| Call wall | Strike with largest positive GEX |
| Put wall | Strike with largest negative GEX |
| Bn$/1% | Billions of dollars per 1% index move |

## License

MIT
