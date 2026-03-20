<script lang="ts">
	import { onMount } from 'svelte';
	import FilterDropdown from './FilterDropdown.svelte';
	import SortableTable from './SortableTable.svelte';

	export let initialData: any[] = [];
	export let filterMapping: any = null;
	export let initialTeams: string[] = [];
	export let initialLeagues: string[] = [];
	export let initialSeasons: string[] = [];
	export let initialHeatsMin: number | null = null;
	export let initialHeatsMax: number | null = null;
	export let initialSortColumns: string[] = [];
	export let initialSortDirections: string[] = [];
	export let initialSearch: string = '';

	// ── Filter state ──────────────────────────────────────────────────────────
	let search = initialSearch;
	let selectedTeams = [...initialTeams];
	let selectedLeagues = [...initialLeagues];
	let selectedSeasons = [...initialSeasons];
	let heatsMin: number | null = initialHeatsMin;
	let heatsMax: number | null = initialHeatsMax;
	let sortColumns: Array<{ column: string; direction: string }> = initialSortColumns.map(
		(col, i) => ({ column: col, direction: initialSortDirections[i] ?? 'desc' })
	);

	// ── Dropdown open states ──────────────────────────────────────────────────
	let teamDropdownOpen = false;
	let leagueDropdownOpen = false;
	let seasonDropdownOpen = false;
	let heatsDropdownOpen = false;
	let columnDropdownOpen = false;

	function closeAll() {
		heatsDropdownOpen = false;
		columnDropdownOpen = false;
		teamDropdownOpen = false;
		leagueDropdownOpen = false;
		seasonDropdownOpen = false;
	}

	function openOtherFilter(except: string) {
		if (except !== 'team') teamDropdownOpen = false;
		if (except !== 'league') leagueDropdownOpen = false;
		if (except !== 'season') seasonDropdownOpen = false;
		if (except !== 'heats') heatsDropdownOpen = false;
		if (except !== 'column') columnDropdownOpen = false;
	}

	// ── Heats slider ──────────────────────────────────────────────────────────
	let heatsRangeMin = 0;
	let heatsRangeMax = 100;
	let isDraggingMin = false;
	let isDraggingMax = false;
	let sliderContainer: HTMLElement;

	$: heatsSliderMin = heatsMin ?? heatsRangeMin;
	$: heatsSliderMax = heatsMax ?? heatsRangeMax;
	$: heatsRange = heatsRangeMax - heatsRangeMin || 1;
	$: minPct = ((heatsRangeMax - heatsSliderMin) / heatsRange) * 100;
	$: maxPct = ((heatsRangeMax - heatsSliderMax) / heatsRange) * 100;
	$: heatsFilterLabel =
		heatsMin !== null || heatsMax !== null
			? heatsMin !== null && heatsMax !== null
				? `${heatsSliderMin}–${heatsSliderMax}`
				: heatsMin !== null
					? `≥${heatsSliderMin}`
					: `≤${heatsSliderMax}`
			: 'Heats';
	$: heatsTickValues = generateTickValues(heatsRangeMin, heatsRangeMax);

	function generateTickValues(min: number, max: number): number[] {
		const ticks = [min];
		[10, 25, 50, 75, 100].forEach((v) => {
			if (v > min && v < max) ticks.push(v);
		});
		if (max > 100) for (let v = 125; v < max; v += 25) if (v > min) ticks.push(v);
		if (max !== min) ticks.push(max);
		return [...new Set(ticks)].sort((a, b) => a - b);
	}

	function tickPct(v: number): number {
		return ((heatsRangeMax - v) / heatsRange) * 100;
	}

	function handleSliderMove(e: MouseEvent | TouchEvent) {
		if (!isDraggingMin && !isDraggingMax) return;
		const rect = sliderContainer.getBoundingClientRect();
		const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
		const pct = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
		const value = Math.round(heatsRangeMax - (pct / 100) * heatsRange);
		if (isDraggingMin) heatsMin = Math.min(value, heatsMax ?? heatsRangeMax);
		else if (isDraggingMax) heatsMax = Math.max(value, heatsMin ?? heatsRangeMin);
	}

	function stopDrag() {
		if (isDraggingMin || isDraggingMax) {
			isDraggingMin = false;
			isDraggingMax = false;
			applyFiltersAndSort();
		}
	}

	async function updateHeatsRange() {
		const params = new URLSearchParams();
		if (selectedTeams.length > 0) params.set('team', selectedTeams.join(','));
		if (selectedLeagues.length > 0) params.set('league', selectedLeagues.join(','));
		if (selectedSeasons.length > 0) params.set('season', selectedSeasons.join(','));
		try {
			const res = await fetch(`/api/sel/stats/filters?${params}`);
			if (!res.ok) return;
			const data = (await res.json()) as any;
			if (data.heatsRange) {
				heatsRangeMin = data.heatsRange.min || 0;
				heatsRangeMax = data.heatsRange.max || 100;
				if (heatsMin !== null && heatsMin < heatsRangeMin) heatsMin = heatsRangeMin;
				if (heatsMax !== null && heatsMax > heatsRangeMax) heatsMax = heatsRangeMax;
			}
		} catch (e) {
			console.error(e);
		}
	}

	// ── Column visibility ─────────────────────────────────────────────────────
	const COLUMN_OVERRIDE_KEY = 'sel-stats-column-overrides';
	const columns = [
		{ id: 'rank', label: '#', alwaysVisible: true },
		{ id: 'name', label: 'Name', alwaysVisible: true },
		{ id: 'team', label: 'Team', alwaysVisible: true },
		{ id: 'average', label: 'Average', alwaysVisible: true },
		{ id: 'match', label: 'M (Match)', responsiveClass: 'max-lg:hidden' },
		{ id: 'heats', label: 'H (Heats)', responsiveClass: 'max-lg:hidden' },
		{ id: 'points', label: 'Pts (Points)', responsiveClass: 'max-lg:hidden' },
		{ id: 'bonus', label: 'Bon (Bonus)', responsiveClass: 'max-lg:hidden' },
		{ id: 'home', label: 'Home Avg.', responsiveClass: 'max-sm:hidden' },
		{ id: 'away', label: 'Away Avg.', responsiveClass: 'max-sm:hidden' },
		{ id: 'i', label: 'I', responsiveClass: 'max-xl:hidden' },
		{ id: 'ii', label: 'II', responsiveClass: 'max-xl:hidden' },
		{ id: 'iii', label: 'III', responsiveClass: 'max-xl:hidden' },
		{ id: 'iv', label: 'IV', responsiveClass: 'max-xl:hidden' },
		{ id: 'r', label: 'R', responsiveClass: 'max-xl:hidden' },
		{ id: 't', label: 'T', responsiveClass: 'max-xl:hidden' },
		{ id: 'm', label: 'M (DNF)', responsiveClass: 'max-xl:hidden' },
		{ id: 'x', label: 'X (Excl.)', responsiveClass: 'max-xl:hidden' },
		{ id: 'f', label: 'F (Fall)', responsiveClass: 'max-xl:hidden' },
		{ id: 'warn', label: 'W (Warn)', responsiveClass: 'max-xl:hidden' },
		{ id: 'maxspeed', label: 'Mx Speed', responsiveClass: 'max-md:hidden' },
		{ id: 'league', label: 'League', responsiveClass: 'max-md:hidden' },
		{ id: 'season', label: 'Season', responsiveClass: 'max-md:hidden' },
	];

	/** Column definitions for SortableTable (rank is handled via showRowNumber) */
	const tableColumns = [
		{
			id: 'name',
			key: 'Name',
			label: 'Name',
			align: 'left' as const,
			nullValue: '' as string | number,
			alwaysVisible: true,
		},
		{
			id: 'team',
			key: 'Team',
			label: 'Team',
			align: 'left' as const,
			nullValue: '' as string | number,
			alwaysVisible: true,
		},
		{
			id: 'average',
			key: 'Average',
			label: 'Average',
			align: 'right' as const,
			alwaysVisible: true,
		},
		{
			id: 'match',
			key: 'Match',
			label: 'M',
			align: 'right' as const,
			nullValue: 0 as string | number,
			responsiveClass: 'max-lg:hidden',
		},
		{
			id: 'heats',
			key: 'Heats',
			label: 'H',
			align: 'right' as const,
			nullValue: 0 as string | number,
			responsiveClass: 'max-lg:hidden',
		},
		{
			id: 'points',
			key: 'Points',
			label: 'Pts',
			align: 'right' as const,
			nullValue: 0 as string | number,
			responsiveClass: 'max-lg:hidden',
		},
		{
			id: 'bonus',
			key: 'Bonus',
			label: 'Bon',
			align: 'right' as const,
			nullValue: 0 as string | number,
			responsiveClass: 'max-lg:hidden',
		},
		{
			id: 'home',
			key: 'Home Avg.',
			label: 'Home',
			align: 'right' as const,
			decimals: 3,
			responsiveClass: 'max-sm:hidden',
		},
		{
			id: 'away',
			key: 'Away Avg.',
			label: 'Away',
			align: 'right' as const,
			decimals: 3,
			responsiveClass: 'max-sm:hidden',
		},
		{
			id: 'i',
			key: 'I',
			label: 'I',
			align: 'right' as const,
			nullValue: 0 as string | number,
			responsiveClass: 'max-xl:hidden',
		},
		{
			id: 'ii',
			key: 'II',
			label: 'II',
			align: 'right' as const,
			nullValue: 0 as string | number,
			responsiveClass: 'max-xl:hidden',
		},
		{
			id: 'iii',
			key: 'III',
			label: 'III',
			align: 'right' as const,
			nullValue: 0 as string | number,
			responsiveClass: 'max-xl:hidden',
		},
		{
			id: 'iv',
			key: 'IV',
			label: 'IV',
			align: 'right' as const,
			nullValue: 0 as string | number,
			responsiveClass: 'max-xl:hidden',
		},
		{
			id: 'r',
			key: 'R',
			label: 'R',
			align: 'right' as const,
			nullValue: 0 as string | number,
			responsiveClass: 'max-xl:hidden',
		},
		{
			id: 't',
			key: 'T',
			label: 'T',
			align: 'right' as const,
			nullValue: 0 as string | number,
			responsiveClass: 'max-xl:hidden',
		},
		{
			id: 'm',
			key: 'M',
			label: 'M',
			align: 'right' as const,
			nullValue: 0 as string | number,
			responsiveClass: 'max-xl:hidden',
		},
		{
			id: 'x',
			key: 'X',
			label: 'X',
			align: 'right' as const,
			nullValue: 0 as string | number,
			responsiveClass: 'max-xl:hidden',
		},
		{
			id: 'f',
			key: 'F',
			label: 'F',
			align: 'right' as const,
			nullValue: 0 as string | number,
			responsiveClass: 'max-xl:hidden',
		},
		{
			id: 'warn',
			key: 'Warn',
			label: 'W',
			align: 'right' as const,
			nullValue: 0 as string | number,
			responsiveClass: 'max-xl:hidden',
		},
		{
			id: 'maxspeed',
			key: 'Max Speed',
			label: 'Mx Speed',
			align: 'right' as const,
			decimals: 2,
			responsiveClass: 'max-md:hidden',
		},
		{
			id: 'league',
			key: 'League',
			label: 'League',
			align: 'left' as const,
			nullValue: '' as string | number,
			responsiveClass: 'max-md:hidden',
		},
		{
			id: 'season',
			key: 'Season',
			label: 'Season',
			align: 'left' as const,
			nullValue: '' as string | number,
			responsiveClass: 'max-md:hidden',
		},
	];

	let columnOverrides: Record<string, 'show' | 'hide' | null> = {};

	function colClass(id: string): string {
		const o = columnOverrides[id];
		if (o === 'show') return '!table-cell';
		if (o === 'hide') return '!hidden';
		return '';
	}

	function isColChecked(id: string): boolean {
		return columnOverrides[id] !== 'hide';
	}

	function toggleColumnOverride(id: string, visible: boolean) {
		columnOverrides = { ...columnOverrides, [id]: visible ? 'show' : 'hide' };
		try {
			localStorage.setItem(COLUMN_OVERRIDE_KEY, JSON.stringify(columnOverrides));
		} catch {}
	}

	function showAllColumns() {
		const next: Record<string, 'show' | 'hide' | null> = {};
		columns.forEach((c) => {
			next[c.id] = 'show';
		});
		columnOverrides = next;
		try {
			localStorage.setItem(COLUMN_OVERRIDE_KEY, JSON.stringify(columnOverrides));
		} catch {}
	}

	function resetColumns() {
		const next: Record<string, 'show' | 'hide' | null> = {};
		columns.forEach((c) => {
			next[c.id] = null;
		});
		columnOverrides = next;
		try {
			localStorage.setItem(COLUMN_OVERRIDE_KEY, JSON.stringify(columnOverrides));
		} catch {}
	}

	// ── Filter options (computed from filterMapping) ───────────────────────────
	$: teamOptions = (filterMapping?.all?.teams ?? []).map((t: string) => ({ value: t, label: t }));
	$: leagueOptions = (filterMapping?.all?.leagues ?? []).map((l: string) => ({
		value: l,
		label: l,
	}));
	$: seasonOptions = [...(filterMapping?.all?.seasons ?? [])]
		.reverse()
		.map((s: number) => ({ value: String(s), label: String(s) }));

	function getValidOptions(target: string, other1: string[], other2: string[]): string[] {
		if (!filterMapping) return [];
		if (other1.length === 0 && other2.length === 0) {
			if (target === 'team') return filterMapping.all?.teams ?? [];
			if (target === 'league') return filterMapping.all?.leagues ?? [];
			if (target === 'season') return (filterMapping.all?.seasons ?? []).map(String);
			return [];
		}
		const valid = new Set<string>();
		if (target === 'team') {
			const [leagues, seasons] = [other1, other2];
			if (leagues.length === 0)
				seasons.forEach((s: string) =>
					(filterMapping.bySeason?.[s]?.teams ?? []).forEach((t: string) => valid.add(t))
				);
			else if (seasons.length === 0)
				leagues.forEach((l: string) =>
					(filterMapping.byLeague?.[l]?.teams ?? []).forEach((t: string) => valid.add(t))
				);
			else
				seasons.forEach((s: string) =>
					leagues.forEach((l: string) =>
						(filterMapping.combinations?.seasonLeague?.[`${s}:${l}`] ?? []).forEach((t: string) =>
							valid.add(t)
						)
					)
				);
		} else if (target === 'league') {
			const [teams, seasons] = [other1, other2];
			if (teams.length === 0)
				seasons.forEach((s: string) =>
					(filterMapping.bySeason?.[s]?.leagues ?? []).forEach((l: string) => valid.add(l))
				);
			else if (seasons.length === 0)
				teams.forEach((t: string) =>
					(filterMapping.byTeam?.[t]?.leagues ?? []).forEach((l: string) => valid.add(l))
				);
			else
				teams.forEach((t: string) =>
					seasons.forEach((s: string) =>
						(filterMapping.combinations?.teamSeason?.[`${t}:${s}`] ?? []).forEach((l: string) =>
							valid.add(l)
						)
					)
				);
		} else if (target === 'season') {
			const [teams, leagues] = [other1, other2];
			if (teams.length === 0)
				leagues.forEach((l: string) =>
					(filterMapping.byLeague?.[l]?.seasons ?? []).forEach((s: any) => valid.add(String(s)))
				);
			else if (leagues.length === 0)
				teams.forEach((t: string) =>
					(filterMapping.byTeam?.[t]?.seasons ?? []).forEach((s: any) => valid.add(String(s)))
				);
			else
				teams.forEach((t: string) =>
					leagues.forEach((l: string) =>
						(filterMapping.combinations?.teamLeague?.[`${t}:${l}`] ?? []).forEach((s: any) =>
							valid.add(String(s))
						)
					)
				);
		}
		return Array.from(valid);
	}

	$: validTeams = getValidOptions('team', selectedLeagues, selectedSeasons);
	$: validLeagues = getValidOptions('league', selectedTeams, selectedSeasons);
	$: validSeasons = getValidOptions('season', selectedTeams, selectedLeagues);
	$: disabledTeams = teamOptions
		.filter((o: { value: string }) => !validTeams.includes(o.value))
		.map((o: { value: string }) => o.value);
	$: disabledLeagues = leagueOptions
		.filter((o: { value: string }) => !validLeagues.includes(o.value))
		.map((o: { value: string }) => o.value);
	$: disabledSeasons = seasonOptions
		.filter((o: { value: string }) => !validSeasons.includes(o.value))
		.map((o: { value: string }) => o.value);

	// ── Sort ──────────────────────────────────────────────────────────────────
	function handleSort(col: string, event: MouseEvent) {
		if (event.shiftKey) {
			const idx = sortColumns.findIndex((s) => s.column === col);
			if (idx >= 0) {
				if (sortColumns[idx].direction === 'desc') {
					sortColumns = sortColumns.map((s, i) => (i === idx ? { ...s, direction: 'asc' } : s));
				} else {
					sortColumns = sortColumns.filter((_, i) => i !== idx);
				}
			} else {
				sortColumns = [...sortColumns, { column: col, direction: 'desc' }];
			}
		} else {
			if (sortColumns.length === 1 && sortColumns[0].column === col) {
				if (sortColumns[0].direction === 'desc') sortColumns = [{ column: col, direction: 'asc' }];
				else sortColumns = [];
			} else {
				sortColumns = [{ column: col, direction: 'desc' }];
			}
		}
		applyFiltersAndSort();
	}

	// ── Data cache + filtering ────────────────────────────────────────────────
	const dataCache = new Map<string, any[]>();
	let isLoading = false;
	let debounceTimer: ReturnType<typeof setTimeout>;
	let displayData: any[] = [];

	function getCacheKey(teams: string[], leagues: string[], seasons: string[]): string {
		return `${[...teams].sort().join(',')}:${[...leagues].sort().join(',')}:${[...seasons].sort().join(',')}`;
	}

	function findSupersetInCache(): any[] | null {
		const exactKey = getCacheKey(selectedTeams, selectedLeagues, selectedSeasons);
		if (dataCache.has(exactKey)) return dataCache.get(exactKey)!;
		for (const [key, data] of dataCache.entries()) {
			const [ts, ls, ss] = key.split(':');
			const ct = ts ? ts.split(',') : [];
			const cl = ls ? ls.split(',') : [];
			const cs = ss ? ss.split(',') : [];
			const ok =
				(ct.length === 0 ||
					(selectedTeams.length > 0 && selectedTeams.every((t) => ct.includes(t)))) &&
				(cl.length === 0 ||
					(selectedLeagues.length > 0 && selectedLeagues.every((l) => cl.includes(l)))) &&
				(cs.length === 0 ||
					(selectedSeasons.length > 0 && selectedSeasons.every((s) => cs.includes(s))));
			if (ok) return data;
		}
		return null;
	}

	const specialEmpty = ['Average', 'Home Avg.', 'Away Avg.', 'Max Speed'];

	function filterAndSortClientSide(src: any[]): any[] {
		let data = src;
		if (selectedTeams.length > 0)
			data = data.filter((s) =>
				s.Team.split('/')
					.map((t: string) => t.trim())
					.some((t: string) => selectedTeams.includes(t))
			);
		if (selectedLeagues.length > 0) data = data.filter((s) => selectedLeagues.includes(s.League));
		if (selectedSeasons.length > 0)
			data = data.filter((s) => selectedSeasons.includes(String(s.Season)));
		if (heatsMin !== null || heatsMax !== null)
			data = data.filter((s) => {
				const h = s.Heats || 0;
				return (heatsMin === null || h >= heatsMin) && (heatsMax === null || h <= heatsMax);
			});
		if (search) {
			const lower = search.toLowerCase();
			data = data.filter((s) => s.Name.toLowerCase().includes(lower));
		}
		if (sortColumns.length > 0) {
			data = [...data].sort((a, b) => {
				for (const { column: col, direction: dir } of sortColumns) {
					const d = dir === 'asc' ? 1 : -1;
					const av = a[col],
						bv = b[col];
					if (specialEmpty.includes(col)) {
						const ae = !av || av === '-',
							be = !bv || bv === '-';
						if (ae && be) continue;
						if (ae) return 1;
						if (be) return -1;
					}
					const result = typeof av === 'string' ? d * av.localeCompare(bv) : d * (av - bv);
					if (result !== 0) return result;
				}
				return 0;
			});
		} else {
			data = [...data].sort((a, b) => {
				const ae = !a.Average || a.Average === '-';
				const be = !b.Average || b.Average === '-';
				if (ae) return be ? a.__originalIndex - b.__originalIndex : 1;
				if (be) return -1;
				return a.__originalIndex - b.__originalIndex;
			});
		}
		return data;
	}

	async function fetchStats() {
		if (isLoading) return;
		isLoading = true;
		const params = new URLSearchParams();
		if (selectedTeams.length > 0) params.set('team', selectedTeams.join(','));
		if (selectedLeagues.length > 0) params.set('league', selectedLeagues.join(','));
		if (selectedSeasons.length > 0) params.set('season', selectedSeasons.join(','));
		try {
			const res = await fetch(`/api/sel/stats?${params}`);
			if (!res.ok) throw new Error('fetch failed');
			const data = (await res.json()) as any;
			const indexed = (data.stats as any[]).map((item, i) => ({ ...item, __originalIndex: i }));
			dataCache.set(getCacheKey(selectedTeams, selectedLeagues, selectedSeasons), indexed);
			displayData = filterAndSortClientSide(indexed);
		} catch (e) {
			console.error(e);
		} finally {
			isLoading = false;
		}
	}

	async function applyFiltersAndSort() {
		const cached = findSupersetInCache();
		if (cached) displayData = filterAndSortClientSide(cached);
		else await fetchStats();
		updateURL();
	}

	function updateURL() {
		const params = new URLSearchParams();
		if (search) params.set('search', search);
		if (selectedTeams.length > 0) params.set('team', selectedTeams.join(','));
		if (selectedLeagues.length > 0) params.set('league', selectedLeagues.join(','));
		if (selectedSeasons.length > 0) params.set('season', selectedSeasons.join(','));
		if (heatsMin !== null) params.set('heatsMin', String(heatsMin));
		if (heatsMax !== null) params.set('heatsMax', String(heatsMax));
		if (sortColumns.length > 0) {
			params.set('sortColumn', sortColumns.map((s) => s.column).join(','));
			params.set('sortDirection', sortColumns.map((s) => s.direction).join(','));
		}
		const newURL = params.toString() ? `${location.pathname}?${params}` : location.pathname;
		history.pushState({}, '', newURL);
	}

	// ── Event handlers ────────────────────────────────────────────────────────
	function onSearchInput(e: Event) {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			search = (e.target as HTMLInputElement).value;
			applyFiltersAndSort();
		}, 300);
	}

	function onTeamsChange() {
		updateHeatsRange();
		applyFiltersAndSort();
	}
	function onLeaguesChange() {
		updateHeatsRange();
		applyFiltersAndSort();
	}
	function onSeasonsChange() {
		updateHeatsRange();
		applyFiltersAndSort();
	}

	// ── Init ──────────────────────────────────────────────────────────────────
	onMount(() => {
		// Load column overrides
		try {
			const stored = localStorage.getItem(COLUMN_OVERRIDE_KEY);
			columnOverrides = stored ? JSON.parse(stored) : {};
		} catch {
			columnOverrides = {};
		}

		// Seed cache from SSR data
		const key = getCacheKey(initialTeams, initialLeagues, initialSeasons);
		const indexed = initialData.map((item, i) => ({ ...item, __originalIndex: i }));
		dataCache.set(key, indexed);

		// Heats range from filterMapping
		if (filterMapping?.heatsRange) {
			heatsRangeMin = filterMapping.heatsRange.min || 0;
			heatsRangeMax = filterMapping.heatsRange.max || 100;
		}

		// Initial display
		displayData = filterAndSortClientSide(indexed);

		// Drag event listeners
		window.addEventListener('mousemove', handleSliderMove);
		window.addEventListener('touchmove', handleSliderMove);
		window.addEventListener('mouseup', stopDrag);
		window.addEventListener('touchend', stopDrag);

		return () => {
			window.removeEventListener('mousemove', handleSliderMove);
			window.removeEventListener('touchmove', handleSliderMove);
			window.removeEventListener('mouseup', stopDrag);
			window.removeEventListener('touchend', stopDrag);
		};
	});
</script>

<svelte:window on:click={closeAll} />

<!-- Controls -->
<div class="mb-4 flex flex-wrap gap-3">
	<!-- Search -->
	<div class="min-w-[200px] flex-1">
		<input
			type="text"
			placeholder="Search by name..."
			value={initialSearch}
			on:input={onSearchInput}
			class="border-border bg-background text-foreground focus:ring-muted w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
		/>
	</div>

	<!-- Heats Filter -->
	<div class="relative min-w-[140px]">
		<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
		<button
			on:click|stopPropagation={() => {
				openOtherFilter('heats');
				heatsDropdownOpen = !heatsDropdownOpen;
			}}
			class="border-border bg-background text-foreground focus:ring-muted flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm focus:ring-2 focus:outline-none"
		>
			<span>{heatsFilterLabel}</span>
			<svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>
		{#if heatsDropdownOpen}
			<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
			<div
				on:click|stopPropagation={() => {}}
				class="border-border bg-background absolute z-50 mt-1 rounded-md border p-4 shadow-lg"
				style="width: 200px;"
			>
				<div class="flex gap-4">
					<!-- Vertical slider -->
					<div class="flex flex-col items-end" style="width: 60px;">
						<div class="mb-1 font-mono text-xs">{heatsSliderMax}</div>
						<!-- svelte-ignore a11y-no-static-element-interactions -->
						<div
							class="relative flex flex-1 items-center"
							style="width: 44px; min-height: 400px;"
							bind:this={sliderContainer}
						>
							<!-- Tick labels -->
							<div
								class="text-muted-foreground pointer-events-none absolute left-0 h-full font-mono text-xs"
								style="width: 20px;"
							>
								{#each heatsTickValues as v}
									<span
										class="absolute block text-right leading-none"
										style="top: {tickPct(v)}%; transform: translateY(-50%); width: 100%;">{v}</span
									>
								{/each}
							</div>
							<!-- Slider track -->
							<div class="absolute flex h-full flex-col" style="left: 24px; width: 20px;">
								<div
									class="bg-foreground/20 absolute top-0 bottom-0 left-1/2 w-[2px] -translate-x-1/2"
								></div>
								{#each heatsTickValues as v}
									<div
										class="absolute left-1/2 h-[2px] -translate-x-1/2 {v === heatsRangeMin ||
										v === heatsRangeMax
											? 'bg-foreground/30 w-[8px]'
											: 'bg-foreground/20 w-[6px]'}"
										style="top: {tickPct(v)}%"
									></div>
								{/each}
								<!-- Max indicator (top) -->
								<!-- svelte-ignore a11y-no-static-element-interactions -->
								<div
									class="heats-indicator absolute left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
									style="top: {maxPct}%"
									on:mousedown|preventDefault={() => (isDraggingMax = true)}
									on:touchstart|preventDefault={() => (isDraggingMax = true)}
								></div>
								<!-- Min indicator (bottom) -->
								<!-- svelte-ignore a11y-no-static-element-interactions -->
								<div
									class="heats-indicator absolute left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
									style="top: {minPct}%"
									on:mousedown|preventDefault={() => (isDraggingMin = true)}
									on:touchstart|preventDefault={() => (isDraggingMin = true)}
								></div>
							</div>
						</div>
						<div class="mt-1 font-mono text-xs">{heatsSliderMin}</div>
					</div>
					<!-- Clear button -->
					<div class="flex flex-1 flex-col justify-end">
						<button
							class="disabled:bg-muted/50 disabled:text-muted-foreground cursor-pointer rounded bg-red-500/10 px-3 py-2 text-sm font-medium text-red-600 transition-all duration-150 hover:bg-red-500/20 hover:text-red-700 active:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
							disabled={heatsMin === null && heatsMax === null}
							on:click={() => {
								heatsMin = null;
								heatsMax = null;
								applyFiltersAndSort();
							}}>Clear</button
						>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Team Filter -->
	<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
	<div on:click|capture={() => openOtherFilter('team')}>
		<FilterDropdown
			id="team"
			label="Teams"
			options={teamOptions}
			bind:selected={selectedTeams}
			disabledValues={disabledTeams}
			bind:isOpen={teamDropdownOpen}
			minWidth="200px"
			on:change={onTeamsChange}
		/>
	</div>

	<!-- League Filter -->
	<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
	<div on:click|capture={() => openOtherFilter('league')}>
		<FilterDropdown
			id="league"
			label="Leagues"
			options={leagueOptions}
			bind:selected={selectedLeagues}
			disabledValues={disabledLeagues}
			bind:isOpen={leagueDropdownOpen}
			minWidth="200px"
			on:change={onLeaguesChange}
		/>
	</div>

	<!-- Season Filter -->
	<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
	<div on:click|capture={() => openOtherFilter('season')}>
		<FilterDropdown
			id="season"
			label="Seasons"
			options={seasonOptions}
			bind:selected={selectedSeasons}
			disabledValues={disabledSeasons}
			bind:isOpen={seasonDropdownOpen}
			minWidth="200px"
			on:change={onSeasonsChange}
		/>
	</div>

	<!-- Column Selector -->
	<div class="relative">
		<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
		<button
			on:click|stopPropagation={() => {
				openOtherFilter('column');
				columnDropdownOpen = !columnDropdownOpen;
			}}
			class="border-border bg-background text-foreground focus:ring-muted flex items-center gap-2 rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
		>
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 6h16M4 12h16M4 18h16"
				/>
			</svg>
			<span>Columns</span>
		</button>
		{#if columnDropdownOpen}
			<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
			<div
				on:click|stopPropagation={() => {}}
				class="border-border bg-background absolute right-0 z-50 min-w-[250px] rounded-md border p-3 shadow-lg"
			>
				<div class="text-foreground mb-2 text-xs font-semibold">Toggle Columns</div>
				<div class="max-h-[400px] space-y-1 overflow-y-auto">
					{#each columns as col}
						<div class="hover:bg-muted/50 flex items-center gap-2 rounded px-2 py-1.5">
							<input
								type="checkbox"
								id="col-{col.id}"
								checked={isColChecked(col.id)}
								disabled={col.alwaysVisible ?? false}
								class={col.alwaysVisible ? 'cursor-not-allowed' : 'cursor-pointer'}
								on:change={(e) =>
									toggleColumnOverride(col.id, (e.target as HTMLInputElement).checked)}
							/>
							<label
								for="col-{col.id}"
								class="flex-1 text-sm {col.alwaysVisible
									? 'text-muted-foreground'
									: 'cursor-pointer'}">{col.label}</label
							>
						</div>
					{/each}
				</div>
				<div class="border-border mt-3 flex gap-2 border-t pt-3">
					<button
						class="bg-muted hover:bg-muted/80 text-foreground flex-1 rounded px-2 py-1.5 text-xs"
						on:click|stopPropagation={showAllColumns}>Show All</button
					>
					<button
						class="bg-muted hover:bg-muted/80 text-foreground flex-1 rounded px-2 py-1.5 text-xs"
						on:click|stopPropagation={resetColumns}>Reset</button
					>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Sort hint -->
<div class="text-muted-foreground mb-2 flex items-center justify-end text-sm">
	<div class="text-xs opacity-75">
		Hold <kbd class="bg-muted border-border rounded border px-1.5 py-0.5 font-mono text-xs"
			>Shift</kbd
		> to sort by multiple columns
	</div>
</div>

<!-- Table -->
<div class="border-border overflow-x-auto rounded-lg border">
	{#if isLoading}
		<div class="text-muted-foreground px-3 py-8 text-center text-sm">Loading…</div>
	{:else}
		<SortableTable
			columns={tableColumns}
			rows={displayData}
			showRowNumber
			rowNumberColId="rank"
			externalSortColumns={sortColumns}
			onHeaderClick={handleSort}
			getExtraClass={(col, _isHeader) => colClass(col.id ?? '')}
		/>
	{/if}
</div>

<style>
	kbd {
		font-family:
			ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
	}

	.heats-indicator {
		width: 0;
		height: 0;
		border-top: 8px solid transparent;
		border-bottom: 8px solid transparent;
		border-right: 12px solid currentColor;
		color: hsl(var(--foreground));
		transition: color 0.15s ease;
	}

	.heats-indicator:hover {
		color: hsl(var(--foreground) / 0.7);
	}

	.heats-indicator:active {
		color: hsl(var(--foreground) / 0.9);
	}

	/* Manual column overrides take priority over responsive classes */
	:global([data-column-id]) {
		&.\!hidden {
			display: none !important;
		}
		&.\!table-cell {
			display: table-cell !important;
		}
	}
</style>
