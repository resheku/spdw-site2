-- =====================================================
-- Database Performance Indexes for SPDW
-- =====================================================
-- Run this to create all necessary indexes
-- Estimated performance improvement: 10-50x faster queries
-- =====================================================

-- ============= STATS TABLE INDEXES =============
-- Primary filtering columns
CREATE INDEX IF NOT EXISTS idx_stats_league ON stats(League);
CREATE INDEX IF NOT EXISTS idx_stats_season ON stats(Season);
CREATE INDEX IF NOT EXISTS idx_stats_league_season ON stats(League, Season);

-- Sorting and filtering columns
CREATE INDEX IF NOT EXISTS idx_stats_average ON stats(Average DESC) WHERE Average IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stats_max_speed ON stats("Max Speed" DESC) WHERE "Max Speed" IS NOT NULL;

-- Combined index for best-averages query (covering index)
CREATE INDEX IF NOT EXISTS idx_stats_best_avg ON stats(League, Season, Average DESC, Heats) 
WHERE Average IS NOT NULL AND League = 'PGEE';

-- Search and filter columns
CREATE INDEX IF NOT EXISTS idx_stats_name ON stats("Name");
CREATE INDEX IF NOT EXISTS idx_stats_team ON stats(Team);

-- ============= TELEMETRY TABLE INDEXES =============
-- Primary lookup columns
CREATE INDEX IF NOT EXISTS idx_telemetry_match_rider ON telemetry(match_id, rider_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_max_speed ON telemetry(max_speed DESC) WHERE max_speed IS NOT NULL;

-- Combined index for speed queries
CREATE INDEX IF NOT EXISTS idx_telemetry_speed_match ON telemetry(max_speed DESC, match_id) 
WHERE max_speed IS NOT NULL;

-- ============= MATCHES TABLE INDEXES =============
-- Primary filtering columns
CREATE INDEX IF NOT EXISTS idx_matches_id ON matches(match_id);
CREATE INDEX IF NOT EXISTS idx_matches_season ON matches(season);
CREATE INDEX IF NOT EXISTS idx_matches_season_telem ON matches(season, has_telemetry) 
WHERE has_telemetry = 1;

-- Team lookups
CREATE INDEX IF NOT EXISTS idx_matches_home_team ON matches(home_team_id);
CREATE INDEX IF NOT EXISTS idx_matches_away_team ON matches(away_team_id);

-- ============= LINEUP TABLE INDEXES =============
-- Primary lookup columns
CREATE INDEX IF NOT EXISTS idx_lineup_match ON lineup(match_id);
CREATE INDEX IF NOT EXISTS idx_lineup_match_rider ON lineup(match_id, rider_id);
CREATE INDEX IF NOT EXISTS idx_lineup_team ON lineup(team_id);

-- Name search for EXISTS queries
CREATE INDEX IF NOT EXISTS idx_lineup_name ON lineup(rider_name, rider_surname);

-- ============= HEATS TABLE INDEXES =============
CREATE INDEX IF NOT EXISTS idx_heats_match ON heats(match_id);
CREATE INDEX IF NOT EXISTS idx_heats_rider ON heats(rider_id);

-- =====================================================
-- ANALYZE after index creation for query planner
-- =====================================================
ANALYZE;
