<script lang="ts">
	import { onMount } from 'svelte';
	import FilterDropdown from './FilterDropdown.svelte';

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
		heatsDropdownOpen = false; columnDropdownOpen = false;
		teamDropdownOpen = false; leagueDropdownOpen = false; seasonDropdownOpen = false;
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
		[10, 25, 50, 75, 100].forEach(v => { if (v > min && v < max) ticks.push(v); });
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
		} catch (e) { console.error(e); }
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
		try { localStorage.setItem(COLUMN_OVERRIDE_KEY, JSON.stringify(columnOverrides)); } catch {}
	}

	function showAllColumns() {
		const next: Record<string, 'show' | 'hide' | null> = {};
		columns.forEach(c => { next[c.id] = 'show'; });
		columnOverrides = next;
		try { localStorage.setItem(COLUMN_OVERRIDE_KEY, JSON.stringify(columnOverrides)); } catch {}
	}

	function resetColumns() {
		const next: Record<string, 'show' | 'hide' | null> = {};
		columns.forEach(c => { next[c.id] = null; });
		columnOverrides = next;
		try { localStorage.setItem(COLUMN_OVERRIDE_KEY, JSON.stringify(columnOverrides)); } catch {}
	}

	// ── Filter options (computed from filterMapping) ───────────────────────────
	$: teamOptions = (filterMapping?.all?.teams ?? []).map((t: string) => ({ value: t, label: t }));
	$: leagueOptions = (filterMapping?.all?.leagues ?? []).map((l: string) => ({ value: l, label: l }));
	$: seasonOptions = [...(filterMapping?.all?.seasons ?? [])].reverse().map((s: number) => ({ value: String(s), label: String(s) }));

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
			if (leagues.length === 0) seasons.forEach((s: string) => (filterMapping.bySeason?.[s]?.teams ?? []).forEach((t: string) => valid.add(t)));
			else if (seasons.length === 0) leagues.forEach((l: string) => (filterMapping.byLeague?.[l]?.teams ?? []).forEach((t: string) => valid.add(t)));
			else seasons.forEach((s: string) => leagues.forEach((l: string) => (filterMapping.combinations?.seasonLeague?.[`${s}:${l}`] ?? []).forEach((t: string) => valid.add(t))));
		} else if (target === 'league') {
			const [teams, seasons] = [other1, other2];
			if (teams.length === 0) seasons.forEach((s: string) => (filterMapping.bySeason?.[s]?.leagues ?? []).forEach((l: string) => valid.add(l)));
			else if (seasons.length === 0) teams.forEach((t: string) => (filterMapping.byTeam?.[t]?.leagues ?? []).forEach((l: string) => valid.add(l)));
			else teams.forEach((t: string) => seasons.forEach((s: string) => (filterMapping.combinations?.teamSeason?.[`${t}:${s}`] ?? []).forEach((l: string) => valid.add(l))));
		} else if (target === 'season') {
			const [teams, leagues] = [other1, other2];
			if (teams.length === 0) leagues.forEach((l: string) => (filterMapping.byLeague?.[l]?.seasons ?? []).forEach((s: any) => valid.add(String(s))));
			else if (leagues.length === 0) teams.forEach((t: string) => (filterMapping.byTeam?.[t]?.seasons ?? []).forEach((s: any) => valid.add(String(s))));
			else teams.forEach((t: string) => leagues.forEach((l: string) => (filterMapping.combinations?.teamLeague?.[`${t}:${l}`] ?? []).forEach((s: any) => valid.add(String(s)))));
		}
		return Array.from(valid);
	}

	$: validTeams = getValidOptions('team', selectedLeagues, selectedSeasons);
	$: validLeagues = getValidOptions('league', selectedTeams, selectedSeasons);
	$: validSeasons = getValidOptions('season', selectedTeams, selectedLeagues);
	$: disabledTeams = teamOptions.filter((o: { value: string }) => !validTeams.includes(o.value)).map((o: { value: string }) => o.value);
	$: disabledLeagues = leagueOptions.filter((o: { value: string }) => !validLeagues.includes(o.value)).map((o: { value: string }) => o.value);
	$: disabledSeasons = seasonOptions.filter((o: { value: string }) => !validSeasons.includes(o.value)).map((o: { value: string }) => o.value);

	// ── Sort ──────────────────────────────────────────────────────────────────
	function handleSort(col: string, event: MouseEvent) {
		if (event.shiftKey) {
			const idx = sortColumns.findIndex(s => s.column === col);
			if (idx >= 0) {
				if (sortColumns[idx].direction === 'desc') {
					sortColumns[idx].direction = 'asc';
					sortColumns = [...sortColumns];
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

	function sortIndicator(col: string): string {
		const idx = sortColumns.findIndex(s => s.column === col);
		if (idx < 0) return '';
		const arrow = sortColumns[idx].direction === 'desc' ? '▼' : '▲';
		return sortColumns.length > 1 ? ` ${arrow}${idx + 1}` : ` ${arrow}`;
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
				(ct.length === 0 || (selectedTeams.length > 0 && selectedTeams.every(t => ct.includes(t)))) &&
				(cl.length === 0 || (selectedLeagues.length > 0 && selectedLeagues.every(l => cl.includes(l)))) &&
				(cs.length === 0 || (selectedSeasons.length > 0 && selectedSeasons.every(s => cs.includes(s))));
			if (ok) return data;
		}
		return null;
	}

	const specialEmpty = ['Average', 'Home Avg.', 'Away Avg.', 'Max Speed'];

	function filterAndSortClientSide(src: any[]): any[] {
		let data = src;
		if (selectedTeams.length > 0)
			data = data.filter(s => s.Team.split('/').map((t: string) => t.trim()).some((t: string) => selectedTeams.includes(t)));
		if (selectedLeagues.length > 0)
			data = data.filter(s => selectedLeagues.includes(s.League));
		if (selectedSeasons.length > 0)
			data = data.filter(s => selectedSeasons.includes(String(s.Season)));
		if (heatsMin !== null || heatsMax !== null)
			data = data.filter(s => {
				const h = s.Heats || 0;
				return (heatsMin === null || h >= heatsMin) && (heatsMax === null || h <= heatsMax);
			});
		if (search) {
			const lower = search.toLowerCase();
			data = data.filter(s => s.Name.toLowerCase().includes(lower));
		}
		if (sortColumns.length > 0) {
			data = [...data].sort((a, b) => {
				for (const { column: col, direction: dir } of sortColumns) {
					const d = dir === 'asc' ? 1 : -1;
					const av = a[col], bv = b[col];
					if (specialEmpty.includes(col)) {
						const ae = !av || av === '-', be = !bv || bv === '-';
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
		} catch (e) { console.error(e); }
		finally { isLoading = false; }
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
			params.set('sortColumn', sortColumns.map(s => s.column).join(','));
			params.set('sortDirection', sortColumns.map(s => s.direction).join(','));
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

	function onTeamsChange() { updateHeatsRange(); applyFiltersAndSort(); }
	function onLeaguesChange() { updateHeatsRange(); applyFiltersAndSort(); }
	function onSeasonsChange() { updateHeatsRange(); applyFiltersAndSort(); }

	// ── Init ──────────────────────────────────────────────────────────────────
	onMount(() => {
		// Load column overrides
		try {
			const stored = localStorage.getItem(COLUMN_OVERRIDE_KEY);
			columnOverrides = stored ? JSON.parse(stored) : {};
		} catch { columnOverrides = {}; }

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
	<div class="flex-1 min-w-[200px]">
		<input
			type="text"
			placeholder="Search by name..."
			value={initialSearch}
			on:input={onSearchInput}
			class="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-muted"
		/>
	</div>

	<!-- Heats Filter -->
	<div class="min-w-[140px] relative">
		<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
		<button
			on:click|stopPropagation={() => { openOtherFilter('heats'); heatsDropdownOpen = !heatsDropdownOpen; }}
			class="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm text-left flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-muted"
		>
			<span>{heatsFilterLabel}</span>
			<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>
		{#if heatsDropdownOpen}
			<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
			<div
				on:click|stopPropagation={() => {}}
				class="absolute z-50 mt-1 rounded-md border border-border bg-background shadow-lg p-4"
				style="width: 200px;"
			>
				<div class="flex gap-4">
					<!-- Vertical slider -->
					<div class="flex flex-col items-end" style="width: 60px;">
						<div class="text-xs font-mono mb-1">{heatsSliderMax}</div>
						<!-- svelte-ignore a11y-no-static-element-interactions -->
						<div class="relative flex-1 flex items-center" style="width: 44px; min-height: 400px;" bind:this={sliderContainer}>
							<!-- Tick labels -->
							<div class="absolute left-0 h-full text-xs font-mono text-muted-foreground pointer-events-none" style="width: 20px;">
								{#each heatsTickValues as v}
									<span class="absolute block text-right leading-none" style="top: {tickPct(v)}%; transform: translateY(-50%); width: 100%;">{v}</span>
								{/each}
							</div>
							<!-- Slider track -->
							<div class="absolute h-full flex flex-col" style="left: 24px; width: 20px;">
								<div class="absolute left-1/2 top-0 bottom-0 w-[2px] bg-foreground/20 -translate-x-1/2"></div>
								{#each heatsTickValues as v}
									<div
										class="absolute left-1/2 h-[2px] -translate-x-1/2 {v === heatsRangeMin || v === heatsRangeMax ? 'w-[8px] bg-foreground/30' : 'w-[6px] bg-foreground/20'}"
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
						<div class="text-xs font-mono mt-1">{heatsSliderMin}</div>
					</div>
					<!-- Clear button -->
					<div class="flex flex-col justify-end flex-1">
						<button
							class="text-sm px-3 py-2 rounded bg-red-500/10 text-red-600 hover:bg-red-500/20 hover:text-red-700 active:bg-red-500/30 disabled:bg-muted/50 disabled:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-150 font-medium cursor-pointer"
							disabled={heatsMin === null && heatsMax === null}
							on:click={() => { heatsMin = null; heatsMax = null; applyFiltersAndSort(); }}
						>Clear</button>
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
			on:click|stopPropagation={() => { openOtherFilter('column'); columnDropdownOpen = !columnDropdownOpen; }}
			class="px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-muted"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
			</svg>
			<span>Columns</span>
		</button>
		{#if columnDropdownOpen}
			<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
			<div
				on:click|stopPropagation={() => {}}
				class="absolute right-0 z-50 rounded-md border border-border bg-background shadow-lg p-3 min-w-[250px]"
			>
				<div class="text-xs font-semibold mb-2 text-foreground">Toggle Columns</div>
				<div class="space-y-1 max-h-[400px] overflow-y-auto">
					{#each columns as col}
						<div class="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50">
							<input
								type="checkbox"
								id="col-{col.id}"
								checked={isColChecked(col.id)}
								disabled={col.alwaysVisible ?? false}
								class="{col.alwaysVisible ? 'cursor-not-allowed' : 'cursor-pointer'}"
								on:change={e => toggleColumnOverride(col.id, (e.target as HTMLInputElement).checked)}
							/>
							<label
								for="col-{col.id}"
								class="flex-1 text-sm {col.alwaysVisible ? 'text-muted-foreground' : 'cursor-pointer'}"
							>{col.label}</label>
						</div>
					{/each}
				</div>
				<div class="mt-3 pt-3 border-t border-border flex gap-2">
					<button
						class="flex-1 text-xs px-2 py-1.5 rounded bg-muted hover:bg-muted/80 text-foreground"
						on:click|stopPropagation={showAllColumns}
					>Show All</button>
					<button
						class="flex-1 text-xs px-2 py-1.5 rounded bg-muted hover:bg-muted/80 text-foreground"
						on:click|stopPropagation={resetColumns}
					>Reset</button>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Sort hint -->
<div class="mb-2 flex items-center justify-end text-sm text-muted-foreground">
	<div class="text-xs opacity-75">
		Hold <kbd class="px-1.5 py-0.5 bg-muted border border-border rounded text-xs font-mono">Shift</kbd> to sort by multiple columns
	</div>
</div>

<!-- Table -->
<div class="overflow-x-auto border border-border rounded-lg">
	<table class="w-full text-sm">
		<thead class="bg-muted sticky top-0">
			<tr>
				<th class="px-2 py-2 text-right font-medium w-16 {colClass('rank')}" data-column-id="rank">#</th>
				<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
				<th class="px-3 py-2 text-left font-medium cursor-pointer hover:bg-muted/80 min-w-[150px] {colClass('name')}" data-column-id="name" on:click={e => handleSort('Name', e)}>Name<span class="sort-indicator">{sortIndicator('Name')}</span></th>
				<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
				<th class="px-3 py-2 text-left font-medium cursor-pointer hover:bg-muted/80 {colClass('team')}" data-column-id="team" on:click={e => handleSort('Team', e)}>Team<span class="sort-indicator">{sortIndicator('Team')}</span></th>
				<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
				<th class="px-0 py-2 text-center font-medium cursor-pointer hover:bg-muted/80 {colClass('average')}" data-column-id="average" on:click={e => handleSort('Average', e)}>Average<span class="sort-indicator">{sortIndicator('Average')}</span></th>
				<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
				<th class="px-0 py-2 text-right font-medium cursor-pointer hover:bg-muted/80 max-lg:hidden {colClass('match')}" data-column-id="match" on:click={e => handleSort('Match', e)}>M<span class="sort-indicator">{sortIndicator('Match')}</span></th>
				<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
				<th class="px-0 py-2 text-right font-medium cursor-pointer hover:bg-muted/80 max-lg:hidden {colClass('heats')}" data-column-id="heats" on:click={e => handleSort('Heats', e)}>H<span class="sort-indicator">{sortIndicator('Heats')}</span></th>
				<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
				<th class="px-0 py-2 text-right font-medium cursor-pointer hover:bg-muted/80 max-lg:hidden {colClass('points')}" data-column-id="points" on:click={e => handleSort('Points', e)}>Pts<span class="sort-indicator">{sortIndicator('Points')}</span></th>
				<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
				<th class="px-0 py-2 text-right font-medium cursor-pointer hover:bg-muted/80 max-lg:hidden {colClass('bonus')}" data-column-id="bonus" on:click={e => handleSort('Bonus', e)}>Bon<span class="sort-indicator">{sortIndicator('Bonus')}</span></th>
				<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
				<th class="px-0 py-2 text-right font-medium cursor-pointer hover:bg-muted/80 max-sm:hidden {colClass('home')}" data-column-id="home" on:click={e => handleSort('Home Avg.', e)}>Home<span class="sort-indicator">{sortIndicator('Home Avg.')}</span></th>
				<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
				<th class="px-0 py-2 text-right font-medium cursor-pointer hover:bg-muted/80 max-sm:hidden {colClass('away')}" data-column-id="away" on:click={e => handleSort('Away Avg.', e)}>Away<span class="sort-indicator">{sortIndicator('Away Avg.')}</span></th>
				<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
				<th class="px-0 py-2 text-right font-medium cursor-pointer hover:bg-muted/80 max-xl:hidden {colClass('i')}" data-column-id="i" on:click={e => handleSort('I', e)}>I<span class="sort-indicator">{sortIndicator('I')}</span></th>
				<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
				<th class="px-0 py-2 text-right font-medium cursor-pointer hover:bg-muted/80 max-xl:hidden {colClass('ii')}" data-column-id="ii" on:click={e => handleSort('II', e)}>II<span class="sort-indicator">{sortIndicator('II')}</span></th>
				<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
				<th class="px-0 py-2 text-right font-medium cursor-pointer hover:bg-muted/80 max-xl:hidden {colClass('iii')}" data-column-id="iii" on:click={e => handleSort('III', e)}>III<span class="sort-indicator">{sortIndicator('III')}</span></th>
				<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
				<th class="px-0 py-2 text-right font-medium cursor-pointer hover:bg-muted/80 max-xl:hidden {colClass('iv')}" data-column-id="iv" on:click={e => handleSort('IV', e)}>IV<span class="sort-indicator">{sortIndicator('IV')}</span></th>
				<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
				<th class="px-0 py-2 text-right font-medium cursor-pointer hover:bg-muted/80 max-xl:hidden {colClass('r')}" data-column-id="r" on:click={e => handleSort('R', e)}>R<span class="sort-indicator">{sortIndicator('R')}</span></th>
				<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
				<th class="px-0 py-2 text-right font-medium cursor-pointer hover:bg-muted/80 max-xl:hidden {colClass('t')}" data-column-id="t" on:click={e => handleSort('T', e)}>T<span class="sort-indicator">{sortIndicator('T')}</span></th>
				<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
				<th class="px-0 py-2 text-right font-medium cursor-pointer hover:bg-muted/80 max-xl:hidden {colClass('m')}" data-column-id="m" on:click={e => handleSort('M', e)}>M<span class="sort-indicator">{sortIndicator('M')}</span></th>
				<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
				<th class="px-0 py-2 text-right font-medium cursor-pointer hover:bg-muted/80 max-xl:hidden {colClass('x')}" data-column-id="x" on:click={e => handleSort('X', e)}>X<span class="sort-indicator">{sortIndicator('X')}</span></th>
				<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
				<th class="px-0 py-2 text-right font-medium cursor-pointer hover:bg-muted/80 max-xl:hidden {colClass('f')}" data-column-id="f" on:click={e => handleSort('F', e)}>F<span class="sort-indicator">{sortIndicator('F')}</span></th>
				<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
				<th class="px-0 py-2 text-right font-medium cursor-pointer hover:bg-muted/80 max-xl:hidden {colClass('warn')}" data-column-id="warn" on:click={e => handleSort('Warn', e)}>W<span class="sort-indicator">{sortIndicator('Warn')}</span></th>
				<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
				<th class="px-0 py-2 text-right font-medium cursor-pointer hover:bg-muted/80 max-md:hidden {colClass('maxspeed')}" data-column-id="maxspeed" on:click={e => handleSort('Max Speed', e)}>Mx Speed<span class="sort-indicator">{sortIndicator('Max Speed')}</span></th>
				<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
				<th class="px-3 py-2 text-left font-medium cursor-pointer hover:bg-muted/80 max-md:hidden {colClass('league')}" data-column-id="league" on:click={e => handleSort('League', e)}>League<span class="sort-indicator">{sortIndicator('League')}</span></th>
				<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
				<th class="px-3 py-2 text-left font-medium cursor-pointer hover:bg-muted/80 max-md:hidden {colClass('season')}" data-column-id="season" on:click={e => handleSort('Season', e)}>Season<span class="sort-indicator">{sortIndicator('Season')}</span></th>
			</tr>
		</thead>
		<tbody>
			{#if isLoading}
				<tr><td colspan="24" class="px-3 py-8 text-center text-muted-foreground">Loading…</td></tr>
			{:else}
				{#each displayData as stat, index}
					<tr class="border-t border-border hover:bg-muted/50">
						<td class="px-2 py-2 text-right text-muted-foreground {colClass('rank')}" data-column-id="rank">{index + 1}</td>
						<td class="px-3 py-2 text-left font-medium {colClass('name')}" data-column-id="name">{stat.Name ?? ''}</td>
						<td class="px-3 py-2 text-left {colClass('team')}" data-column-id="team">{stat.Team ?? ''}</td>
						<td class="px-3 py-2 text-right {colClass('average')}" data-column-id="average">{stat.Average != null ? stat.Average.toFixed(3) : '-'}</td>
						<td class="px-3 py-2 text-right max-lg:hidden {colClass('match')}" data-column-id="match">{stat.Match ?? 0}</td>
						<td class="px-3 py-2 text-right max-lg:hidden {colClass('heats')}" data-column-id="heats">{stat.Heats ?? 0}</td>
						<td class="px-3 py-2 text-right max-lg:hidden {colClass('points')}" data-column-id="points">{stat.Points ?? 0}</td>
						<td class="px-3 py-2 text-right max-lg:hidden {colClass('bonus')}" data-column-id="bonus">{stat.Bonus ?? 0}</td>
						<td class="px-3 py-2 text-right max-sm:hidden {colClass('home')}" data-column-id="home">{stat['Home Avg.'] != null ? stat['Home Avg.'].toFixed(3) : '-'}</td>
						<td class="px-3 py-2 text-right max-sm:hidden {colClass('away')}" data-column-id="away">{stat['Away Avg.'] != null ? stat['Away Avg.'].toFixed(3) : '-'}</td>
						<td class="px-3 py-2 text-right max-xl:hidden {colClass('i')}" data-column-id="i">{stat.I ?? 0}</td>
						<td class="px-3 py-2 text-right max-xl:hidden {colClass('ii')}" data-column-id="ii">{stat.II ?? 0}</td>
						<td class="px-3 py-2 text-right max-xl:hidden {colClass('iii')}" data-column-id="iii">{stat.III ?? 0}</td>
						<td class="px-3 py-2 text-right max-xl:hidden {colClass('iv')}" data-column-id="iv">{stat.IV ?? 0}</td>
						<td class="px-3 py-2 text-right max-xl:hidden {colClass('r')}" data-column-id="r">{stat.R ?? 0}</td>
						<td class="px-3 py-2 text-right max-xl:hidden {colClass('t')}" data-column-id="t">{stat.T ?? 0}</td>
						<td class="px-3 py-2 text-right max-xl:hidden {colClass('m')}" data-column-id="m">{stat.M ?? 0}</td>
						<td class="px-3 py-2 text-right max-xl:hidden {colClass('x')}" data-column-id="x">{stat.X ?? 0}</td>
						<td class="px-3 py-2 text-right max-xl:hidden {colClass('f')}" data-column-id="f">{stat.F ?? 0}</td>
						<td class="px-3 py-2 text-right max-xl:hidden {colClass('warn')}" data-column-id="warn">{stat.Warn ?? 0}</td>
						<td class="px-3 py-2 text-right max-md:hidden {colClass('maxspeed')}" data-column-id="maxspeed">{stat['Max Speed'] != null ? stat['Max Speed'].toFixed(2) : '-'}</td>
						<td class="px-3 py-2 text-left max-md:hidden {colClass('league')}" data-column-id="league">{stat.League ?? ''}</td>
						<td class="px-3 py-2 text-left max-md:hidden {colClass('season')}" data-column-id="season">{stat.Season ?? ''}</td>
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>
</div>

<style>
	.sort-indicator {
		display: inline-block;
		min-width: 1.5em;
		text-align: left;
		font-size: 0.75em;
		opacity: 0.7;
		margin-left: 0.25em;
	}

	kbd {
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
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
		&.\!hidden { display: none !important; }
		&.\!table-cell { display: table-cell !important; }
	}
</style>
