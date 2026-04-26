<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import FilterDropdown from './FilterDropdown.svelte';

	type MaxSpeedRow = {
		Match: string;
		Season: number;
		Date: string;
		Track: string;
		Team: string;
		Rider: string;
		Heat: number | null;
		'Max Speed': number | null;
		Points: number | null;
		Gate: string | null;
		Time: number | null;
		Reaction: number | null;
		L1: number | null;
		L2: number | null;
		L3: number | null;
		L4: number | null;
		'Z-Score': number | null;
		'Speed Index': number | null;
	};

	type FilterData = {
		seasons: number[];
		teams: string[];
		tracks: string[];
		leagues: string[];
	};

	export let initialData: MaxSpeedRow[] = [];
	export let initialTotal: number = 0;
	export let initialPage: number = 0;
	export let filterData: FilterData = { seasons: [], teams: [], tracks: [], leagues: [] };
	export let initialSearch: string = '';
	export let initialTeams: string[] = [];
	export let initialSeasons: string[] = [];
	export let initialTracks: string[] = [];
	export let initialSortColumn: string = 'Max Speed';
	export let initialSortDirection: string = 'desc';

	const PAGE_SIZE = 50;

	// ── State ─────────────────────────────────────────────────────────────────
	let search = initialSearch;
	let selectedTeams = [...initialTeams];
	let selectedSeasons = [...initialSeasons];
	let selectedTracks = [...initialTracks];
	let sortColumn = initialSortColumn;
	let sortDirection = initialSortDirection;

	let rows: MaxSpeedRow[] = initialData;
	let total = initialTotal;
	let page = initialPage;
	let isLoading = false;
	let debounceTimer: ReturnType<typeof setTimeout>;

	// ── Dropdown open states ──────────────────────────────────────────────────
	let teamDropdownOpen = false;
	let seasonDropdownOpen = false;
	let trackDropdownOpen = false;

	function closeAll() {
		teamDropdownOpen = false;
		seasonDropdownOpen = false;
		trackDropdownOpen = false;
	}

	// ── Filter options ────────────────────────────────────────────────────────
	$: teamOptions = filterData.teams.map((t) => ({ value: t, label: t }));
	$: seasonOptions = [...filterData.seasons]
		.sort((a, b) => b - a)
		.map((s) => ({ value: String(s), label: String(s) }));
	$: trackOptions = filterData.tracks.map((t) => ({ value: t, label: t }));

	// ── Pagination ────────────────────────────────────────────────────────────
	$: totalPages = Math.ceil(total / PAGE_SIZE);

	// ── Sort columns definition ───────────────────────────────────────────────
	const columns = [
		{ key: 'Date', label: 'Date', align: 'left' as const },
		{ key: 'Match', label: 'Match', align: 'left' as const },
		{ key: 'Heat', label: 'Heat', align: 'right' as const },
		{ key: 'Rider', label: 'Rider', align: 'left' as const },
		{ key: 'Team', label: 'Team', align: 'left' as const },
		{ key: 'Max Speed', label: 'Speed', align: 'right' as const },
		{ key: 'Points', label: 'Pts', align: 'right' as const },
		{ key: 'Track', label: 'Track', align: 'left' as const },
		{ key: 'Gate', label: 'Gate', align: 'right' as const },
		{ key: 'Reaction', label: 'Reaction', align: 'right' as const },
		{ key: 'Time', label: 'Time', align: 'right' as const },
		{ key: 'L1', label: 'L1', align: 'right' as const },
		{ key: 'L2', label: 'L2', align: 'right' as const },
		{ key: 'L3', label: 'L3', align: 'right' as const },
		{ key: 'L4', label: 'L4', align: 'right' as const },
		{ key: 'Z-Score', label: 'Z-Score', align: 'right' as const },
		{ key: 'Speed Index', label: 'Spd Idx', align: 'right' as const },
	];

	// ── Data fetching ─────────────────────────────────────────────────────────
	function buildParams(overridePage?: number): SvelteURLSearchParams {
		const params = new SvelteURLSearchParams();
		if (search) params.set('search', search);
		if (selectedTeams.length > 0) params.set('team', selectedTeams.join(','));
		if (selectedSeasons.length > 0) params.set('season', selectedSeasons.join(','));
		if (selectedTracks.length > 0) params.set('track', selectedTracks.join(','));
		params.set('sortColumn', sortColumn);
		params.set('sortDirection', sortDirection);
		params.set('page', String(overridePage ?? page));
		return params;
	}

	async function fetchData(targetPage: number = 0) {
		if (isLoading) return;
		isLoading = true;
		page = targetPage;
		const params = buildParams(targetPage);
		try {
			const res = await fetch(`/api/sel/max-speeds?${params}`);
			if (!res.ok) throw new Error('fetch failed');
			const data = (await res.json()) as {
				rows: MaxSpeedRow[];
				total: number;
				page: number;
				pageSize: number;
			};
			rows = data.rows;
			total = data.total;
		} catch (e) {
			console.error(e);
		} finally {
			isLoading = false;
		}
		updateURL();
	}

	function updateURL() {
		const params = buildParams();
		const newURL = params.toString() ? `${location.pathname}?${params}` : location.pathname;
		history.pushState({}, '', newURL);
	}

	// ── Event handlers ────────────────────────────────────────────────────────
	function onSearchInput(e: Event) {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			search = (e.target as HTMLInputElement).value;
			fetchData(0);
		}, 300);
	}

	function onFilterChange() {
		fetchData(0);
	}

	function onSort(key: string) {
		if (sortColumn === key) {
			sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
		} else {
			sortColumn = key;
			sortDirection = 'desc';
		}
		fetchData(0);
	}

	function goToPage(p: number) {
		if (p < 0 || p >= totalPages) return;
		fetchData(p);
	}

	function getSortIcon(key: string): string {
		if (sortColumn !== key) return '↕';
		return sortDirection === 'desc' ? '↓' : '↑';
	}

	function fmt(val: unknown, decimals?: number): string {
		if (val === null || val === undefined) return '-';
		if (typeof val === 'number' && decimals !== undefined) return val.toFixed(decimals);
		return String(val);
	}

	onMount(() => {
		// Seed initial data already provided via SSR
	});
</script>

<svelte:window on:click={closeAll} />

<!-- Controls -->
<div class="mb-4 flex flex-wrap gap-3">
	<!-- Search -->
	<div class="min-w-[200px] flex-1">
		<input
			type="text"
			placeholder="Search rider..."
			value={initialSearch}
			on:input={onSearchInput}
			class="border-border bg-background text-foreground focus:ring-muted w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
		/>
	</div>

	<!-- Season Filter -->
	<FilterDropdown
		id="season"
		label="Season"
		options={seasonOptions}
		bind:selected={selectedSeasons}
		bind:isOpen={seasonDropdownOpen}
		on:change={() => {
			teamDropdownOpen = false;
			trackDropdownOpen = false;
			onFilterChange();
		}}
	/>

	<!-- Team Filter -->
	<FilterDropdown
		id="team"
		label="Team"
		options={teamOptions}
		bind:selected={selectedTeams}
		bind:isOpen={teamDropdownOpen}
		on:change={() => {
			seasonDropdownOpen = false;
			trackDropdownOpen = false;
			onFilterChange();
		}}
	/>

	<!-- Track Filter -->
	<FilterDropdown
		id="track"
		label="Track"
		options={trackOptions}
		bind:selected={selectedTracks}
		bind:isOpen={trackDropdownOpen}
		on:change={() => {
			teamDropdownOpen = false;
			seasonDropdownOpen = false;
			onFilterChange();
		}}
	/>
</div>

<!-- Table -->
<div class="overflow-x-auto">
	{#if isLoading}
		<div class="text-muted-foreground py-8 text-center text-sm">Loading...</div>
	{:else if rows.length === 0}
		<div class="text-muted-foreground py-8 text-center text-sm">No results found.</div>
	{:else}
		<table class="w-full text-sm">
			<thead>
				<tr class="border-border border-b">
					<th class="text-muted-foreground px-2 py-2 text-right font-medium">#</th>
					{#each columns as col (col.key)}
						<th
							class="text-muted-foreground hover:text-foreground cursor-pointer px-2 py-2 font-medium whitespace-nowrap select-none {col.align ===
							'right'
								? 'text-right'
								: 'text-left'}"
							on:click={() => onSort(col.key)}
						>
							{col.label}
							<span class="text-muted-foreground/50 ml-1 text-xs">{getSortIcon(col.key)}</span>
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each rows as row, i (i)}
					<tr class="border-border hover:bg-muted/50 border-b">
						<td class="text-muted-foreground px-2 py-1.5 text-right tabular-nums">
							{page * PAGE_SIZE + i + 1}
						</td>
						<td class="px-2 py-1.5 text-left">{fmt(row['Date'])}</td>
						<td class="px-2 py-1.5 text-left">{fmt(row['Match'])}</td>
						<td class="px-2 py-1.5 text-right tabular-nums">{fmt(row['Heat'])}</td>
						<td class="px-2 py-1.5 text-left font-medium">{fmt(row['Rider'])}</td>
						<td class="px-2 py-1.5 text-left">{fmt(row['Team'])}</td>
						<td class="px-2 py-1.5 text-right font-semibold tabular-nums">
							{row['Max Speed'] != null ? (row['Max Speed'] as number).toFixed(2) : '-'}
						</td>
						<td class="px-2 py-1.5 text-right tabular-nums">{fmt(row['Points'])}</td>
						<td class="px-2 py-1.5 text-left">{fmt(row['Track'])}</td>
						<td class="px-2 py-1.5 text-right tabular-nums">{fmt(row['Gate'])}</td>
						<td class="px-2 py-1.5 text-right tabular-nums">
							{row['Reaction'] != null ? (row['Reaction'] as number).toFixed(3) : '-'}
						</td>
						<td class="px-2 py-1.5 text-right tabular-nums">
							{row['Time'] != null ? (row['Time'] as number).toFixed(3) : '-'}
						</td>
						<td class="px-2 py-1.5 text-right tabular-nums">
							{row['L1'] != null ? (row['L1'] as number).toFixed(3) : '-'}
						</td>
						<td class="px-2 py-1.5 text-right tabular-nums">
							{row['L2'] != null ? (row['L2'] as number).toFixed(3) : '-'}
						</td>
						<td class="px-2 py-1.5 text-right tabular-nums">
							{row['L3'] != null ? (row['L3'] as number).toFixed(3) : '-'}
						</td>
						<td class="px-2 py-1.5 text-right tabular-nums">
							{row['L4'] != null ? (row['L4'] as number).toFixed(3) : '-'}
						</td>
						<td class="px-2 py-1.5 text-right tabular-nums">
							{row['Z-Score'] != null ? (row['Z-Score'] as number).toFixed(3) : '-'}
						</td>
						<td class="px-2 py-1.5 text-right tabular-nums">
							{row['Speed Index'] != null ? (row['Speed Index'] as number).toFixed(4) : '-'}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>

<!-- Pagination -->
{#if totalPages > 1}
	<div class="mt-4 flex items-center justify-between gap-4 text-sm">
		<span class="text-muted-foreground">
			{total.toLocaleString()} rows &mdash; page {page + 1} of {totalPages}
		</span>
		<div class="flex items-center gap-1">
			<button
				class="border-border hover:bg-muted rounded border px-2 py-1 disabled:opacity-40"
				disabled={page === 0 || isLoading}
				on:click={() => goToPage(0)}>«</button
			>
			<button
				class="border-border hover:bg-muted rounded border px-2 py-1 disabled:opacity-40"
				disabled={page === 0 || isLoading}
				on:click={() => goToPage(page - 1)}>‹</button
			>
			{#each Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
				const half = 3;
				let start = Math.max(0, page - half);
				const end = Math.min(totalPages - 1, start + 6);
				start = Math.max(0, end - 6);
				return start + i;
			}) as p (p)}
				<button
					class="border-border rounded border px-2.5 py-1 {p === page
						? 'bg-foreground text-background'
						: 'hover:bg-muted'}"
					disabled={isLoading}
					on:click={() => goToPage(p)}>{p + 1}</button
				>
			{/each}
			<button
				class="border-border hover:bg-muted rounded border px-2 py-1 disabled:opacity-40"
				disabled={page >= totalPages - 1 || isLoading}
				on:click={() => goToPage(page + 1)}>›</button
			>
			<button
				class="border-border hover:bg-muted rounded border px-2 py-1 disabled:opacity-40"
				disabled={page >= totalPages - 1 || isLoading}
				on:click={() => goToPage(totalPages - 1)}>»</button
			>
		</div>
	</div>
{/if}
