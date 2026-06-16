# Database setup

The dashboard auto-detects which Postgres schema you use.

## Mode A: GEX processor (recommended)

Full features: quality scores, training view, journal tables, precomputed walls.

1. Link **the same** `DATABASE_URL` on dashboard and GEX processor services.
2. In the [GEX processor repo](https://github.com/TheMitchyBoy/GEX):

```bash
python3 scripts/init_postgres_schema.py
```

3. On Railway processor service:

```text
GEX_STARTUP_BACKFILL=1
GEX_DEFAULT_TICKERS=SPX
```

4. Verify dashboard:

```text
GET /api/schema        → { "mode": "processor" }
GET /api/db-info       → snapshot_count > 0
```

## Mode B: UW raw cache (`uw_periscope` / `uw_history`)

Charts and overview work from cached Unusual Whales JSON. Journal pages are hidden.

### Required UW endpoints in `uw_periscope`

| Endpoint pattern | Used for |
|------------------|----------|
| `spot-exposures/strike` or `greek-exposure/strike` | Profile, cumulative, walls |
| `spot-exposures` (not `/strike`) | Intraday timeline |
| `greek-exposure/expir*` | Term structure |

### Apply indexes (faster queries)

```bash
psql "$DATABASE_URL" -f scripts/postgres_uw_indexes.sql
```

### Explorer

Open `/uw-data` in the dashboard or `GET /api/uw-data` to inspect endpoints, row counts, and sample JSON keys.

### Verify

```text
GET /api/schema        → { "mode": "uw_raw" }
GET /api/uw-data       → endpoints + rows
GET /api/snapshots/latest
```

## Environment

```text
DATABASE_URL=postgresql://...
GEX_TICKER=SPX
NEXT_PUBLIC_PROCESSOR_HEALTH_URL=https://your-processor/health/live
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `schema_mode: uw_raw` but empty charts | Ensure strike endpoint rows exist; check `/uw-data` |
| Journal pages show “Processor required” | Expected on UW DB — run processor schema init |
| Wrong ticker | Set `GEX_TICKER` to match `uw_periscope.ticker` |
| Slow queries | Run `scripts/postgres_uw_indexes.sql` |
