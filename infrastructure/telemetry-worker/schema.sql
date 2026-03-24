-- Telemetry beacon storage (Cloudflare D1 / SQLite)
-- Each install upserts its latest beacon; first_seen_at is preserved.

CREATE TABLE IF NOT EXISTS beacons (
  install_id       TEXT PRIMARY KEY,
  first_seen_at    TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at     TEXT NOT NULL DEFAULT (datetime('now')),

  -- App
  app_version      TEXT,
  beacon_version   INTEGER,

  -- Platform
  platform         TEXT,
  arch             TEXT,
  node_version     TEXT,

  -- Display
  display_width    INTEGER,
  display_height   INTEGER,
  display_transform TEXT,

  -- Usage
  screen_count     INTEGER,
  module_count     INTEGER,
  module_types     TEXT,  -- JSON object {"clock": 2, "weather": 1}
  profile_count    INTEGER,

  -- Feature adoption
  weather_provider   TEXT,
  transition_effect  TEXT,
  sleep_enabled      INTEGER,  -- 0/1
  alerts_enabled     INTEGER,
  auth_enabled       INTEGER,
  has_google_calendar INTEGER,
  has_ical_sources   INTEGER,
  plugin_count       INTEGER,

  -- Raw payload for forward compatibility
  raw_payload      TEXT
);

-- Index for aggregate queries
CREATE INDEX IF NOT EXISTS idx_beacons_last_seen ON beacons(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_beacons_app_version ON beacons(app_version);
