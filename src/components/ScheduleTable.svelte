<script lang="ts">
	import FilterDropdown from './FilterDropdown.svelte';
	import SortableTable from './SortableTable.svelte';

	export let initialData: any[] = [];
	export let allLeagues: Array<{ shortname: string; name: string }> = [];
	export let allSeasons: number[] = [];
	// URL param initial values
	export let initialLeagues: string[] = [];
	export let initialSeasons: string[] = [];
	export let initialRounds: string[] = [];
	export let initialTracks: string[] = [];
	export let initialTeams: string[] = [];
	export let initialSortColumns: string[] = [];
	export let initialSortDirections: string[] = [];

	// ── State ──────────────────────────────────────────────────────
	let selectedLeagues = initialLeagues;
	let selectedSeasons = initialSeasons;
	let selectedRounds = initialRounds;
	let selectedTracks = initialTracks;
	let selectedTeams = initialTeams;

	let sortColumns: Array<{ column: string; direction: string }> =
		initialSortColumns.length > 0
			? initialSortColumns.map((col, i) => ({ column: col, direction: initialSortDirections[i] ?? 'desc' }))
			: [{ column: 'date', direction: 'desc' }];

	let leagueOpen = false;
	let seasonOpen = false;
	let roundOpen = false;
	let teamOpen = false;
	let trackOpen = false;

	function closeAll() {
		leagueOpen = false;
		seasonOpen = false;
		roundOpen = false;
		teamOpen = false;
		trackOpen = false;
	}

	// ── Derived filter options ──────────────────────────────────────
	$: leagueOptions = allLeagues.map(l => ({ value: l.shortname, label: `${l.shortname} – ${l.name}` }));
	$: seasonOptions = allSeasons.slice().reverse().map(s => ({ value: String(s), label: String(s) }));

	$: allRounds = [...new Set(initialData.map(m => m.type).filter(Boolean))].sort() as string[];
	$: roundOptions = allRounds.map(r => ({ value: r, label: r }));

	$: allTrackValues = [...new Set(initialData.map(m => m.track).filter(Boolean))].sort() as string[];
	$: allTeamValues = [...new Set([
		...initialData.map(m => m.homeTeamShort),
		...initialData.map(m => m.awayTeamShort),
	].filter(Boolean))].sort() as string[];

	// Compute which tracks are available given current league/season/round/team filters (but not track filter itself)
	$: availableTracks = (() => {
		let d = initialData;
		if (selectedLeagues.length) d = d.filter(m => selectedLeagues.includes(m.league));
		if (selectedSeasons.length) d = d.filter(m => selectedSeasons.includes(String(m.season)));
		if (selectedRounds.length) d = d.filter(m => selectedRounds.includes(m.type));
		if (selectedTeams.length) d = d.filter(m => selectedTeams.includes(m.homeTeamShort) || selectedTeams.includes(m.awayTeamShort));
		return new Set(d.map(m => m.track).filter(Boolean));
	})();

	$: disabledTracks = allTrackValues.filter(t => !availableTracks.has(t));
	$: trackOptions = allTrackValues.map(t => ({ value: t, label: t }));

	// Compute which teams are available given current filters (but not team filter itself)
	$: availableTeams = (() => {
		let d = initialData;
		if (selectedLeagues.length) d = d.filter(m => selectedLeagues.includes(m.league));
		if (selectedSeasons.length) d = d.filter(m => selectedSeasons.includes(String(m.season)));
		if (selectedRounds.length) d = d.filter(m => selectedRounds.includes(m.type));
		if (selectedTracks.length) d = d.filter(m => selectedTracks.includes(m.track));
		const s = new Set<string>();
		d.forEach(m => { if (m.homeTeamShort) s.add(m.homeTeamShort); if (m.awayTeamShort) s.add(m.awayTeamShort); });
		return s;
	})();

	$: disabledTeams = allTeamValues.filter(t => !availableTeams.has(t));
	$: teamOptions = allTeamValues.map(t => ({ value: t, label: t }));

	// ── Filtering & sorting ─────────────────────────────────────────
	$: filteredData = (() => {
		let data = initialData;
		if (selectedLeagues.length) data = data.filter(m => selectedLeagues.includes(m.league));
		if (selectedSeasons.length) data = data.filter(m => selectedSeasons.includes(String(m.season)));
		if (selectedRounds.length) data = data.filter(m => selectedRounds.includes(m.type));
		if (selectedTracks.length) data = data.filter(m => selectedTracks.includes(m.track));
		if (selectedTeams.length) data = data.filter(m => selectedTeams.includes(m.homeTeamShort) || selectedTeams.includes(m.awayTeamShort));

		if (sortColumns.length > 0) {
			data = [...data].sort((a, b) => {
				for (const { column, direction: dir } of sortColumns) {
					const av = getColValue(a, column);
					const bv = getColValue(b, column);
					if (av == null) { if (bv == null) continue; return 1; }
					if (bv == null) return -1;
					const sign = dir === 'asc' ? 1 : -1;
					const result = typeof av === 'string' ? sign * av.localeCompare(bv) : sign * (av - bv);
					if (result !== 0) return result;
				}
				return 0;
			});
		}
		return data;
	})();

	function getColValue(row: any, col: string): any {
		switch (col) {
			case 'round':      return row.round ?? null;
			case 'type':       return row.type ?? null;
			case 'date':       return row.datetime ?? null;
			case 'match':      return row.matchName ?? null;
			case 'score':      return row.homeScore ?? null;
			case 'total':      return row.homeTotal ?? null;
			case 'attendance': return row.attendance ?? null;
			case 'track':      return row.track ?? null;
			case 'league':     return row.league ?? null;
			case 'season':     return row.season ?? null;
			default:           return null;
		}
	}

	// ── Sorting ─────────────────────────────────────────────────────
	function handleSort(column: string, event: MouseEvent) {
		if (event.shiftKey) {
			const idx = sortColumns.findIndex(s => s.column === column);
			if (idx >= 0) {
				if (sortColumns[idx].direction === 'desc') {
					sortColumns = sortColumns.map((s, i) => i === idx ? { ...s, direction: 'asc' } : s);
				} else {
					sortColumns = sortColumns.filter((_, i) => i !== idx);
				}
			} else {
				sortColumns = [...sortColumns, { column, direction: 'desc' }];
			}
		} else {
			const existing = sortColumns.find(s => s.column === column);
			if (sortColumns.length === 1 && existing) {
				if (existing.direction === 'desc') {
					sortColumns = [{ column, direction: 'asc' }];
				} else {
					sortColumns = [];
				}
			} else {
				sortColumns = [{ column, direction: 'desc' }];
			}
		}
		updateURL();
	}

	// ── URL sync ────────────────────────────────────────────────────
	function updateURL() {
		const params = new URLSearchParams();
		if (selectedLeagues.length) params.set('league', selectedLeagues.join(','));
		if (selectedSeasons.length) params.set('season', selectedSeasons.join(','));
		if (selectedRounds.length) params.set('round', selectedRounds.join(','));
		if (selectedTeams.length) params.set('team', selectedTeams.join(','));
		if (selectedTracks.length) params.set('track', selectedTracks.join(','));
		if (sortColumns.length) {
			params.set('sortColumn', sortColumns.map(s => s.column).join(','));
			params.set('sortDirection', sortColumns.map(s => s.direction).join(','));
		}
		const newURL = params.toString()
			? `${window.location.pathname}?${params.toString()}`
			: window.location.pathname;
		window.history.pushState({}, '', newURL);
	}

	// ── Formatting helpers ──────────────────────────────────────────
	function formatDate(dt: string): string {
		if (!dt) return '';
		return dt.slice(0, 16);
	}

	function resultClass(home: number | null, away: number | null, forHome: boolean): string {
		if (home == null || away == null) return '';
		const win = forHome ? home > away : away > home;
		const loss = forHome ? home < away : away < home;
		if (win) return 'bg-green-500/20 text-green-600 dark:text-green-400';
		if (loss) return 'bg-red-500/20 text-red-600 dark:text-red-400';
		return 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400';
	}

	function resultLabel(home: number | null, away: number | null, forHome: boolean): string {
		if (home == null || away == null) return '';
		const win = forHome ? home > away : away > home;
		const loss = forHome ? home < away : away < home;
		return win ? 'W' : loss ? 'L' : 'D';
	}

	const scheduleColumns = [
		{ key: 'round', sortKey: 'round', label: '#', align: 'left' as const, noWrap: true },
		{ key: 'type', sortKey: 'type', label: 'Round', align: 'left' as const, noWrap: true },
		{ key: 'datetime', sortKey: 'date', label: 'Date', align: 'left' as const, noWrap: true, customCell: true },
		{ key: 'matchName', sortKey: 'match', label: 'Match', align: 'left' as const },
		{ key: 'homeScore', sortKey: 'score', label: 'Score', align: 'left' as const, noWrap: true, customCell: true },
		{ key: 'homeTotal', sortKey: 'total', label: 'Total', align: 'left' as const, noWrap: true, customCell: true },
		{ key: 'attendance', sortKey: 'attendance', label: 'Attendance', align: 'right' as const, noWrap: true, responsiveClass: 'max-lg:hidden', customCell: true },
		{ key: 'track', sortKey: 'track', label: 'Track', align: 'left' as const, noWrap: true, isLink: true, responsiveClass: 'max-md:hidden' },
		{ key: 'league', sortKey: 'league', label: 'League', align: 'left' as const, noWrap: true, responsiveClass: 'max-md:hidden' },
	];
</script>

<!-- Filters -->
<div class="mb-4 flex flex-wrap gap-3">
	<FilterDropdown
		id="sched-season"
		label="Seasons"
		options={seasonOptions}
		bind:selected={selectedSeasons}
		bind:isOpen={seasonOpen}
		minWidth="140px"
		on:change={(e) => { selectedSeasons = e.detail; closeAll(); seasonOpen = false; updateURL(); }}
	/>
	<FilterDropdown
		id="sched-league"
		label="Leagues"
		options={leagueOptions}
		bind:selected={selectedLeagues}
		bind:isOpen={leagueOpen}
		minWidth="200px"
		on:change={(e) => { selectedLeagues = e.detail; closeAll(); leagueOpen = false; updateURL(); }}
	/>
	<FilterDropdown
		id="sched-round"
		label="Rounds"
		options={roundOptions}
		bind:selected={selectedRounds}
		bind:isOpen={roundOpen}
		minWidth="120px"
		on:change={(e) => { selectedRounds = e.detail; closeAll(); roundOpen = false; updateURL(); }}
	/>
	<FilterDropdown
		id="sched-team"
		label="Teams"
		options={teamOptions}
		disabledValues={disabledTeams}
		bind:selected={selectedTeams}
		bind:isOpen={teamOpen}
		minWidth="140px"
		on:change={(e) => { selectedTeams = e.detail; closeAll(); teamOpen = false; updateURL(); }}
	/>
	<FilterDropdown
		id="sched-track"
		label="Tracks"
		options={trackOptions}
		disabledValues={disabledTracks}
		bind:selected={selectedTracks}
		bind:isOpen={trackOpen}
		minWidth="160px"
		on:change={(e) => { selectedTracks = e.detail; closeAll(); trackOpen = false; updateURL(); }}
	/>
</div>

<!-- Row count -->
<div class="mb-2 flex items-center justify-between text-sm text-muted-foreground">
	<span>{filteredData.length} match{filteredData.length !== 1 ? 'es' : ''}</span>
	<div class="text-xs opacity-75">
		Hold <kbd class="px-1.5 py-0.5 bg-muted border border-border rounded text-xs font-mono">Shift</kbd> to sort by multiple columns
	</div>
</div>

<!-- Table -->
<div class="overflow-x-auto border border-border rounded-lg">
	<SortableTable
		columns={scheduleColumns}
		rows={filteredData}
		externalSortColumns={sortColumns}
		onHeaderClick={handleSort}
	>
		{#snippet cell(m, col)}
			{#if col.key === 'datetime'}
				<span class="font-mono text-xs">{formatDate(m.datetime)}</span>
			{:else if col.key === 'homeScore'}
				{#if m.homeScore != null && m.awayScore != null}
					<span class="inline-flex items-center gap-1.5">
						<span class="inline-block text-[0.65rem] font-bold px-1 py-0.5 rounded leading-none {resultClass(m.homeScore, m.awayScore, true)}">{resultLabel(m.homeScore, m.awayScore, true)}</span>
						<span class="font-medium">{m.homeScore}:{m.awayScore}</span>
						<span class="inline-block text-[0.65rem] font-bold px-1 py-0.5 rounded leading-none {resultClass(m.homeScore, m.awayScore, false)}">{resultLabel(m.homeScore, m.awayScore, false)}</span>
					</span>
				{:else}
					-
				{/if}
			{:else if col.key === 'homeTotal'}
				<span class="text-muted-foreground">{m.homeTotal != null && m.awayTotal != null ? `${m.homeTotal}:${m.awayTotal}` : ''}</span>
			{:else if col.key === 'attendance'}
				{m.attendance ? m.attendance.toLocaleString() : ''}
			{/if}
		{/snippet}
	</SortableTable>
</div>
