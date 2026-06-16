# GEX Dashboard

Read-only SPX gamma exposure dashboard querying Railway PostgreSQL populated by [GEX processor](https://github.com/TheMitchyBoy/GEX).

## Database tables used

| Table / view | Purpose |
|--------------|---------|
| `snapshots` | Core snapshot rows (`snapshot_at`, `prior_ts`, JSONB payloads) |
| `latest_snapshot` | Materialized view — latest row per ticker |
| `snapshot_strikes` | Full strike profile (±12% of spot in processor) |
| `snapshot_strikes_atm` | ATM subset (±3%) — used for charts |
| `snapshot_features` | Precomputed flip, walls, quality_score, ML features |
| `snapshot_diagnostics` | Write pipeline status and timing |
| `daily_quality_stats` | Per-day quality rollups |
| `prediction_accuracy_daily` | LLM prediction accuracy rollups |
| `training_snapshots` | View — high-quality training slices |
| `processor_state` | Backfill cursors and processor flags |
| `surface_json` | On `snapshots` — expiration/strike surface rows |
| `trades`, `decisions`, `llm_predictions`, `daily_insights` | Optional journal tables |

Walls and gamma flip prefer `snapshot_features` over client-side derivation.

## Features

| Page | Route | Description |
|------|-------|-------------|
| Overview | `/` | Live cards + quality panel + ML features |
| GEX Profile | `/profile` | ATM strike bars from `snapshot_strikes_atm` |
| Cumulative GEX | `/cumulative` | Cumulative curve + flip |
| Intraday | `/timeline` | Spot/GEX with quality columns |
| Heatmap | `/heatmap` | ATM strike × time ladder |
| Wall Drift | `/wall-drift` | Flip/walls from `snapshot_features` |
| History | `/history` | Table with quality + diagnostic status |
| Quality | `/quality` | Daily quality + prediction accuracy + processor_state |
| Training | `/training` | `training_snapshots` view |
| Surface | `/surface` | `snapshots.surface_json` table |
| Term Structure / Greeks / Trades / etc. | | See nav |

## Environment

```bash
DATABASE_URL=postgresql://...
GEX_TICKER=SPX
NODE_ENV=production
PROCESSOR_HEALTH_URL=
NEXT_PUBLIC_PROCESSOR_HEALTH_URL=
PG_POOL_MAX=5
BASIC_AUTH_USER=
BASIC_AUTH_PASSWORD=
```

## API

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Liveness + quality_score, diagnostic_status |
| `GET /api/db-info` | Database diagnostics (host, counts, schema issues) |
| `GET /api/ready` | Readiness (503 if DB down) |
| `GET /api/snapshots/latest` | Latest with features + walls |
| `GET /api/snapshots/:ts/features` | `snapshot_features` row |
| `GET /api/snapshots/:ts/diagnostics` | `snapshot_diagnostics` row |
| `GET /api/snapshots/:ts/strikes?source=atm\|full\|auto` | Strike profile |
| `GET /api/quality?market_date=` | `daily_quality_stats` |
| `GET /api/training?limit=` | `training_snapshots` view |
| `GET /api/processor-state` | `processor_state` table |
| `GET /api/snapshots/:ts/surface` | `surface_json` rows |

Legacy databases without new tables fall back to `snapshots` + `snapshot_strikes` only.

## Railway

1. Same project as processor + Postgres
2. `DATABASE_URL=${{Postgres.DATABASE_URL}}` — must reference the **same** Postgres service the processor writes to
3. Optional `GEX_TICKER=SPX` if your processor uses a different symbol
4. Healthcheck: `/api/health`

### No data after switching databases?

1. Open `/api/db-info` — shows host, row counts, tickers present, and specific issues
2. Confirm the dashboard `DATABASE_URL` matches the processor Postgres (not an old empty instance)
3. Run processor schema init: `python3 scripts/init_postgres_schema.py` in the GEX repo
4. Backfill: set `GEX_STARTUP_BACKFILL=1` on the processor or run `scripts/backfill_postgres_history.py`

## Local dev

```bash
cp .env.example .env.local
npm install
npm run dev
```
