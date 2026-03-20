<script lang="ts">
	import { onMount } from 'svelte';
	import SortableTable from './SortableTable.svelte';
	import GateChart from './GateChart.svelte';
	import FilterDropdown from './FilterDropdown.svelte';

	type GateStatsRow = {
		Track: string;
		A: number | null;
		B: number | null;
		C: number | null;
		D: number | null;
		'AC/BD': string | null;
		Bias: number | null;
	};
	type GateWinRow = {
		Track: string;
		A: number | null;
		B: number | null;
		C: number | null;
		D: number | null;
		Bias: number | null;
	};
	type TrendRow = { season: number; A: number; B: number; C: number; D: number };

	let seasons: number[] = [];
	let leagues: { code: string; name: string }[] = [];
	let selectedSeasons: string[] = [];
	let selectedLeagues: string[] = [];
	let seasonOpen = false;
	let leagueOpen = false;

	function closeAll() {
		seasonOpen = false;
		leagueOpen = false;
	}

	$: seasonOptions = seasons
		.slice()
		.reverse()
		.map((s) => ({ value: String(s), label: String(s) }));
	$: leagueOptions = leagues.map((l) => ({ value: l.code, label: l.name }));
	let gateStats: GateStatsRow[] = [];
	let gateWin: GateWinRow[] = [];
	let trendAvgPoints: TrendRow[] = [];
	let trendWinPct: TrendRow[] = [];
	let loading = true;
	let trendsLoading = true;

	const gateColumns = [
		{ key: 'Track', label: 'Track', align: 'left' as const, isLink: true },
		{ key: 'A', label: 'Gate A', align: 'right' as const, decimals: 2, heatmap: true },
		{ key: 'B', label: 'Gate B', align: 'right' as const, decimals: 2, heatmap: true },
		{ key: 'C', label: 'Gate C', align: 'right' as const, decimals: 2, heatmap: true },
		{ key: 'D', label: 'Gate D', align: 'right' as const, decimals: 2, heatmap: true },
		{ key: 'AC/BD', label: 'AC/BD', align: 'right' as const, width: '4rem' },
		{ key: 'Bias', label: 'Bias', align: 'right' as const, decimals: 2, heatmapInvert: true },
	];

	const gateWinColumns = [
		{ key: 'Track', label: 'Track', align: 'left' as const, isLink: true },
		{ key: 'A', label: 'Gate A %', align: 'right' as const, decimals: 1, heatmap: true },
		{ key: 'B', label: 'Gate B %', align: 'right' as const, decimals: 1, heatmap: true },
		{ key: 'C', label: 'Gate C %', align: 'right' as const, decimals: 1, heatmap: true },
		{ key: 'D', label: 'Gate D %', align: 'right' as const, decimals: 1, heatmap: true },
		{ key: 'Bias', label: 'Bias', align: 'right' as const, decimals: 1, heatmapInvert: true },
	];

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

	onMount(async () => {
		const filtersRes = await fetch('/api/sel/tracks/gate-filters');
		if (filtersRes.ok) {
			const data = (await filtersRes.json()) as {
				seasons: number[];
				leagues: { code: string; name: string }[];
			};
			seasons = data.seasons ?? [];
			leagues = data.leagues ?? [];
		}
		await Promise.all([fetchData(), fetchTrends()]);
	});
</script>

<h2 class="mt-6 mb-4 text-xl font-bold">Gate stats</h2>
<div class="mb-4 flex flex-wrap items-center gap-3">
	<FilterDropdown
		id="gate-season"
		label="All seasons"
		options={seasonOptions}
		bind:selected={selectedSeasons}
		bind:isOpen={seasonOpen}
		minWidth="160px"
		on:change={() => {
			closeAll();
			fetchData();
		}}
	/>
	<FilterDropdown
		id="gate-league"
		label="All leagues"
		options={leagueOptions}
		bind:selected={selectedLeagues}
		bind:isOpen={leagueOpen}
		minWidth="160px"
		on:change={() => {
			closeAll();
			fetchData();
			fetchTrends();
		}}
	/>
	{#if loading || trendsLoading}
		<span class="text-muted-foreground text-sm">Loading…</span>
	{/if}
</div>
{#if !trendsLoading && trendAvgPoints.length > 0}
	<div class="mt-6 mb-8">
		<GateChart avgPoints={trendAvgPoints} winPct={trendWinPct} />
	</div>
{/if}

<div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
	<div>
		<h3 class="text-muted-foreground mb-2 text-base font-semibold">Gate points average</h3>
		<div class="border-border overflow-x-auto rounded-lg border">
			<SortableTable
				columns={gateColumns}
				rows={gateStats}
				pinnedBottom="Total Average"
				defaultSortKey="Bias"
				defaultSortDir="asc"
				showRowNumber
			/>
		</div>
	</div>
	<div>
		<h3 class="text-muted-foreground mb-2 text-base font-semibold">Gate win percentage</h3>
		<div class="border-border overflow-x-auto rounded-lg border">
			<SortableTable
				columns={gateWinColumns}
				rows={gateWin}
				pinnedBottom="Total Average"
				defaultSortKey="Bias"
				defaultSortDir="asc"
				showRowNumber
			/>
		</div>
	</div>
</div>
