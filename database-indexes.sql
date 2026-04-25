-- =====================================================
-- Database Performance Indexes for SPDW (PostgreSQL)
-- =====================================================
-- Schema: sel
-- Apply with: psql -U postgres -d postgres -f database-indexes.sql
-- =====================================================

-- ============= HEATS TABLE INDEXES =============
-- Biggest table (131k rows), most expensive queries
-- Index for join with matches and gate-condition filtering
CREATE INDEX IF NOT EXISTS idx_heats_match_id
  ON sel.heats (match_id);

-- Partial index covering the standard gate query filter.
-- Used by gate-stats, gate-trends, gate-win, gate-history, gate-filters.
CREATE INDEX IF NOT EXISTS idx_heats_gate_query
  ON sel.heats (match_id, gate, points)
  WHERE gate IN ('a', 'b', 'c', 'd') AND canceled = 0 AND points IS NOT NULL;

-- ============= MATCHES TABLE INDEXES =============
-- Used by all per-track API routes
CREATE INDEX IF NOT EXISTS idx_matches_track_city
  ON sel.matches (track_city);

-- Used by gate-filters, stats/filters, schedule/filters season lookups
CREATE INDEX IF NOT EXISTS idx_matches_season
  ON sel.matches (season);

-- Covering index for gate-stats / gate-trends season+league filters
-- Also used as prefix scan for season-only filters, so no standalone type index needed
CREATE INDEX IF NOT EXISTS idx_matches_season_type
  ON sel.matches (season, match_type_shortname);

-- ============= TELEMETRY TABLE INDEXES =============
-- Used in all speed queries joining on match_id
CREATE INDEX IF NOT EXISTS idx_telemetry_match_id
  ON sel.telemetry (match_id);

-- Partial index for speed queries (max-speeds, tracks/speeds)
CREATE INDEX IF NOT EXISTS idx_telemetry_speed
  ON sel.telemetry (match_id, max_speed DESC)
  WHERE max_speed IS NOT NULL AND max_speed > 0;

-- ============= LINEUP TABLE INDEXES =============
-- NOTE: prod DB already has unique index lineup_match_rider_idx ON lineup(match_id, rider_id)
-- from postgres_indexes.sql — no additional index needed here.

-- ============= STATS TABLE INDEXES =============
-- Used by best-averages, telem-seasons, seasons API
CREATE INDEX IF NOT EXISTS idx_stats_league_season
  ON sel.stats ("League", "Season");

-- Covering partial index for best-averages query
CREATE INDEX IF NOT EXISTS idx_stats_best_avg
  ON sel.stats ("League", "Season", "Average" DESC, "Heats")
  WHERE "Average" IS NOT NULL AND "League" = 'PGEE';

-- =====================================================
-- Update planner statistics after index creation
-- =====================================================
ANALYZE sel.heats;
ANALYZE sel.matches;
ANALYZE sel.telemetry;
ANALYZE sel.lineup;
ANALYZE sel.stats;
