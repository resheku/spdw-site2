SELECT DISTINCT m.match_type_shortname AS code, m.match_type_name AS name
FROM matches m
WHERE m.track_city = $1
ORDER BY m.match_type_shortname
