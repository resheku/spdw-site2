<script lang="ts">
	import { onMount } from 'svelte';
	import SortableTable from './SortableTable.svelte';
	import GateChart from './GateChart.svelte';

	type GateStatsRow = { Track: string; A: number | null; B: number | null; C: number | null; D: number | null; 'AC/BD': string | null; Bias: number | null };
	type GateWinRow = { Track: string; A: number | null; B: number | null; C: number | null; D: number | null; Bias: number | null };
	type TrendRow = { season: number; A: number; B: number; C: number; D: number };

	let seasons: number[] = [];
	let leagues: { code: string; name: string }[] = [];
	let selectedSeason = '';
	let selectedLeague = '';
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

	async function fetchData() {
		loading = true;
		const params = new URLSearchParams();
		if (selectedSeason) params.set('season', selectedSeason);
		if (selectedLeague) params.set('league', selectedLeague);
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
		if (selectedLeague) params.set('league', selectedLeague);
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

<h2 class="text-xl font-bold mt-6 mb-4">Gate stats</h2>
<div class="mb-4 flex flex-wrap gap-4 items-center">
	<div class="flex items-center gap-2">
		<label for="gate-season" class="text-sm font-medium">Season:</label>
		<select
			id="gate-season"
			bind:value={selectedSeason}
			on:change={fetchData}
			class="border border-border rounded px-2 py-1 text-sm bg-background"
		>
			<option value="">All seasons</option>
			{#each seasons as season}
				<option value={String(season)}>{season}</option>
			{/each}
		</select>
	</div>
	<div class="flex items-center gap-2">
		<label for="gate-league" class="text-sm font-medium">League:</label>
		<select
			id="gate-league"
			bind:value={selectedLeague}
			on:change={handleLeagueChange}
			class="border border-border rounded px-2 py-1 text-sm bg-background"
		>
			<option value="">All leagues</option>
			{#each leagues as league}
				<option value={league.code}>{league.name}</option>
			{/each}
		</select>
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
			<SortableTable columns={gateColumns} rows={gateStats} pinnedBottom="Total Average" defaultSortKey="AC/BD" showRowNumber />
		</div>
	</div>
	<div>
		<h3 class="text-base font-semibold mb-2 text-muted-foreground">Gate win percentage</h3>
		<div class="overflow-x-auto border border-border rounded-lg">
			<SortableTable columns={gateWinColumns} rows={gateWin} pinnedBottom="Total Average" defaultSortKey="A" showRowNumber />
		</div>
	</div>
</div>
