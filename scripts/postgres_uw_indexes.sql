-- Performance indexes for uw_periscope / uw_history (idempotent)
CREATE INDEX IF NOT EXISTS idx_uw_periscope_ticker_created
  ON uw_periscope (ticker, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_uw_periscope_ticker_date_endpoint
  ON uw_periscope (ticker, date, endpoint);

CREATE INDEX IF NOT EXISTS idx_uw_periscope_date
  ON uw_periscope (date DESC);

CREATE INDEX IF NOT EXISTS idx_uw_history_date
  ON uw_history (date DESC);

CREATE INDEX IF NOT EXISTS idx_uw_history_created
  ON uw_history (created_at DESC);
