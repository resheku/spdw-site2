<script lang="ts">
	import { onMount } from 'svelte';
	import SortableTable from './SortableTable.svelte';
	import GateChart from './GateChart.svelte';

	type GateStatsRow = { Track: string; A: number | null; B: number | null; C: number | null; D: number | null; 'AC/BD': string | null; Bias: number | null };
	type GateWinRow = { Track: string; A: number | null; B: number | null; C: number | null; D: number | null; Bias: number | null };
	type TrendRow = { season: number; A: number; B: number; C: number; D: number };

	let seasons: number[] = [];
	let leagues: { code: string; name: string }[] = [];
	let selectedSeasons: string[] = [];
	let selectedLeagues: string[] = [];
	let seasonOpen = false;
	let leagueOpen = false;
	let gateStats: GateStatsRow[] = [];
	let gateWin: GateWinRow[] = [];
	let trendAvgPoints: TrendRow[] = [];
	let trendWinPct: TrendRow[] = [];
	let loading = true;
	let trendsLoading = true;

	const gateColumns = [
		{ key: 'Track', label: 'Track', align: 'left' as const },
		{ key: 'A', label: 'Gate A', align: 'right' as const, decimals: 2, heatmap: true },
		{ key: 'B', label: 'Gate B', align: 'right' as const, decimals: 2, heatmap: true },
		{ key: 'C', label: 'Gate C', align: 'right' as const, decimals: 2, heatmap: true },
		{ key: 'D', label: 'Gate D', align: 'right' as const, decimals: 2, heatmap: true },
		{ key: 'AC/BD', label: 'AC/BD', align: 'right' as const, width: '4rem' },
		{ key: 'Bias', label: 'Bias', align: 'right' as const, decimals: 2, heatmapInvert: true },
	];

	const gateWinColumns = [
		{ key: 'Track', label: 'Track', align: 'left' as const },
		{ key: 'A', label: 'Gate A %', align: 'right' as const, decimals: 1, heatmap: true },
		{ key: 'B', label: 'Gate B %', align: 'right' as const, decimals: 1, heatmap: true },
		{ key: 'C', label: 'Gate C %', align: 'right' as const, decimals: 1, heatmap: true },
		{ key: 'D', label: 'Gate D %', align: 'right' as const, decimals: 1, heatmap: true },
		{ key: 'Bias', label: 'Bias', align: 'right' as const, decimals: 1, heatmapInvert: true },
	];

	function seasonLabel() {
		if (selectedSeasons.length === 0) return 'All seasons';
		if (selectedSeasons.length === 1) return selectedSeasons[0];
		return `Seasons (${selectedSeasons.length})`;
	}

	function leagueLabel() {
		if (selectedLeagues.length === 0) return 'All leagues';
		if (selectedLeagues.length === 1) return leagues.find(l => l.code === selectedLeagues[0])?.name ?? selectedLeagues[0];
		return `Leagues (${selectedLeagues.length})`;
	}

	function toggleSeason(s: string) {
		if (selectedSeasons.includes(s)) {
			selectedSeasons = selectedSeasons.filter(v => v !== s);
		} else {
			selectedSeasons = [...selectedSeasons, s];
		}
		fetchData();
	}

	function selectOnlySeason(s: string) {
		selectedSeasons = [s];
		seasonOpen = false;
		fetchData();
	}

	function toggleLeague(code: string) {
		if (selectedLeagues.includes(code)) {
			selectedLeagues = selectedLeagues.filter(v => v !== code);
		} else {
			selectedLeagues = [...selectedLeagues, code];
		}
		handleLeagueChange();
	}

	function selectOnlyLeague(code: string) {
		selectedLeagues = [code];
		leagueOpen = false;
		handleLeagueChange();
	}

	async function fetchData() {
		loading = true;
		const params = new URLSearchParams();
		if (selectedSeasons.length > 0) params.set('season', selectedSeasons.join(','));
		if (selectedLeagues.length > 0) params.set('league', selectedLeagues.join(','));
		const qs = params.toString() ? `?${params.toString()}` : '';

		const [statsRes, winRes] = await Promise.allSettled([
			fetch(`/api/sel/tracks/gate-stats${qs}`),
			fetch(`/api/sel/tracks/gate-win${qs}`),
		]);

		if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
			gateStats = ((await statsRes.value.json()) as { rows: GateStatsRow[] }).rows ?? [];
		}
		if (winRes.status === 'fulfilled' && winRes.value.ok) {
			gateWin = ((await winRes.value.json()) as { rows: GateWinRow[] }).rows ?? [];
		}
		loading = false;
	}

	async function fetchTrends() {
		trendsLoading = true;
		const params = new URLSearchParams();
		if (selectedLeagues.length > 0) params.set('league', selectedLeagues.join(','));
		const qs = params.toString() ? `?${params.toString()}` : '';

		const res = await fetch(`/api/sel/tracks/gate-trends${qs}`);
		if (res.ok) {
			const data = (await res.json()) as { avgPoints: TrendRow[]; winPct: TrendRow[] };
			trendAvgPoints = data.avgPoints ?? [];
			trendWinPct = data.winPct ?? [];
		}
		trendsLoading = false;
	}

	async function handleLeagueChange() {
		await Promise.all([fetchData(), fetchTrends()]);
	}

	function closeAll() {
		seasonOpen = false;
		leagueOpen = false;
	}

	onMount(async () => {
		const filtersRes = await fetch('/api/sel/tracks/gate-filters');
		if (filtersRes.ok) {
			const data = (await filtersRes.json()) as { seasons: number[]; leagues: { code: string; name: string }[] };
			seasons = data.seasons ?? [];
			leagues = data.leagues ?? [];
		}
		await Promise.all([fetchData(), fetchTrends()]);
	});
</script>

<svelte:window on:click={closeAll} />

<h2 class="text-xl font-bold mt-6 mb-4">Gate stats</h2>
<div class="mb-4 flex flex-wrap gap-3 items-center">
	<!-- Season Dropdown -->
	<div class="min-w-[160px] relative">
		<button
			on:click|stopPropagation={() => { seasonOpen = !seasonOpen; leagueOpen = false; }}
			class="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm text-left flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-muted"
		>
			<span>{seasonLabel()}</span>
			<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>
		{#if seasonOpen}
		<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
			<div
				on:click|stopPropagation={() => {}}
				class="absolute z-50 mt-1 w-full max-h-[300px] overflow-y-auto rounded-md border border-border bg-background shadow-lg"
			>
				<div class="sticky top-0 bg-background border-b border-border p-2">
					<button
						class="text-sm px-3 py-2 rounded bg-red-500/10 text-red-600 hover:bg-red-500/20 hover:text-red-700 active:bg-red-500/30 disabled:bg-muted/50 disabled:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-150 w-full font-medium cursor-pointer"
						disabled={selectedSeasons.length === 0}
						on:click={() => { selectedSeasons = []; fetchData(); }}
					>Clear Filter</button>
				</div>
				<div class="p-2">
					{#each seasons as season}
						<div class="flex items-center gap-2 py-1 rounded px-1 hover:bg-muted/50">
							<input
								type="checkbox"
								id="gate-season-{season}"
								checked={selectedSeasons.includes(String(season))}
								class="cursor-pointer"
								on:change={() => toggleSeason(String(season))}
							/>
						<button
							class="flex-1 text-sm text-left hover:underline cursor-pointer"
							on:click={() => selectOnlySeason(String(season))}
						>{season}</button>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<!-- League Dropdown -->
	<div class="min-w-[160px] relative">
		<button
			on:click|stopPropagation={() => { leagueOpen = !leagueOpen; seasonOpen = false; }}
			class="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm text-left flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-muted"
		>
			<span>{leagueLabel()}</span>
			<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>
		{#if leagueOpen}
		<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
			<div
				on:click|stopPropagation={() => {}}
				class="absolute z-50 mt-1 w-full max-h-[300px] overflow-y-auto rounded-md border border-border bg-background shadow-lg"
			>
				<div class="sticky top-0 bg-background border-b border-border p-2">
					<button
						class="text-sm px-3 py-2 rounded bg-red-500/10 text-red-600 hover:bg-red-500/20 hover:text-red-700 active:bg-red-500/30 disabled:bg-muted/50 disabled:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-150 w-full font-medium cursor-pointer"
						disabled={selectedLeagues.length === 0}
						on:click={() => { selectedLeagues = []; handleLeagueChange(); }}
					>Clear Filter</button>
				</div>
				<div class="p-2">
					{#each leagues as league}
						<div class="flex items-center gap-2 py-1 rounded px-1 hover:bg-muted/50">
							<input
								type="checkbox"
								id="gate-league-{league.code}"
								checked={selectedLeagues.includes(league.code)}
								class="cursor-pointer"
								on:change={() => toggleLeague(league.code)}
							/>
						<button
							class="flex-1 text-sm text-left hover:underline cursor-pointer"
							on:click={() => selectOnlyLeague(league.code)}
						>{league.name}</button>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	{#if loading || trendsLoading}
		<span class="text-sm text-muted-foreground">Loading…</span>
	{/if}
</div>
{#if !trendsLoading && trendAvgPoints.length > 0}
	<div class="mt-6 mb-8">
		<GateChart avgPoints={trendAvgPoints} winPct={trendWinPct} />
	</div>
{/if}

<div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
	<div>
        <h3 class="text-base font-semibold mb-2 text-muted-foreground">Gate points average</h3>
		<div class="overflow-x-auto border border-border rounded-lg">
			<SortableTable columns={gateColumns} rows={gateStats} pinnedBottom="Total Average" defaultSortKey="Bias" defaultSortDir="asc" showRowNumber />
		</div>
	</div>
	<div>
		<h3 class="text-base font-semibold mb-2 text-muted-foreground">Gate win percentage</h3>
		<div class="overflow-x-auto border border-border rounded-lg">
			<SortableTable columns={gateWinColumns} rows={gateWin} pinnedBottom="Total Average" defaultSortKey="Bias" defaultSortDir="asc" showRowNumber />
		</div>
	</div>
</div>
