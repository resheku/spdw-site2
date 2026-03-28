<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import SortableTable from './SortableTable.svelte';
	import GateChart from './GateChart.svelte';
	import FilterDropdown from './FilterDropdown.svelte';

	export let track: string;

	type SeasonRow = { season: number; A: number; B: number; C: number; D: number };
	type OverallGate = {
		A: number | null;
		B: number | null;
		C: number | null;
		D: number | null;
		Bias: number | null;
	};

	let avgPoints: SeasonRow[] = [];
	let winPct: SeasonRow[] = [];
	let overallAvg: OverallGate & { 'AC/BD': string | null } = {
		A: null,
		B: null,
		C: null,
		D: null,
		'AC/BD': null,
		Bias: null,
	};
	let overallWin: OverallGate = { A: null, B: null, C: null, D: null, Bias: null };
	// Static totals — set once on first (unfiltered) load, never updated by filter changes
	let staticAvg: OverallGate & { 'AC/BD': string | null } = {
		A: null,
		B: null,
		C: null,
		D: null,
		'AC/BD': null,
		Bias: null,
	};
	let staticWin: OverallGate = { A: null, B: null, C: null, D: null, Bias: null };
	let staticLoaded = false;
	let leagues: { code: string; name: string }[] = [];
	let selectedLeagues: string[] = [];
	let leagueOpen = false;
	let loading = true;

	$: leagueOptions = leagues.map((l) => ({ value: l.code, label: l.name }));

	$: avgSeasonRows = [
		...avgPoints.map((r) => {
			const a = r.A != null ? Number(r.A) : null;
			const b = r.B != null ? Number(r.B) : null;
			const c = r.C != null ? Number(r.C) : null;
			const d = r.D != null ? Number(r.D) : null;
			return {
				Season: r.season,
				A: a,
				B: b,
				C: c,
				D: d,
				'AC/BD': a != null && c != null ? `${(a + c).toFixed(2)}/${(b! + d!).toFixed(2)}` : null,
				Bias:
					a != null && b != null && c != null && d != null
						? parseFloat((Math.max(a, b, c, d) - Math.min(a, b, c, d)).toFixed(2))
						: null,
			};
		}),
		{
			Season: 'Total Average',
			A: overallAvg.A,
			B: overallAvg.B,
			C: overallAvg.C,
			D: overallAvg.D,
			'AC/BD': overallAvg['AC/BD'],
			Bias: overallAvg.Bias,
		},
	];

	$: winSeasonRows = [
		...winPct.map((r) => {
			const a = r.A != null ? Number(r.A) : null;
			const b = r.B != null ? Number(r.B) : null;
			const c = r.C != null ? Number(r.C) : null;
			const d = r.D != null ? Number(r.D) : null;
			return {
				Season: r.season,
				A: a,
				B: b,
				C: c,
				D: d,
				Bias:
					a != null && b != null && c != null && d != null
						? parseFloat((Math.max(a, b, c, d) - Math.min(a, b, c, d)).toFixed(1))
						: null,
			};
		}),
		{
			Season: 'Total Average',
			A: overallWin.A,
			B: overallWin.B,
			C: overallWin.C,
			D: overallWin.D,
			Bias: overallWin.Bias,
		},
	];

	const avgSeasonColumns = [
		{ key: 'Season', label: 'Season', align: 'left' as const },
		{
			key: 'A',
			label: 'Gate A',
			align: 'right' as const,
			decimals: 2,
			heatmap: true,
			headerColor: '#fca5a5',
		},
		{
			key: 'B',
			label: 'Gate B',
			align: 'right' as const,
			decimals: 2,
			heatmap: true,
			headerColor: '#93c5fd',
		},
		{
			key: 'C',
			label: 'Gate C',
			align: 'right' as const,
			decimals: 2,
			heatmap: true,
			headerColor: '#d1d5db',
		},
		{
			key: 'D',
			label: 'Gate D',
			align: 'right' as const,
			decimals: 2,
			heatmap: true,
			headerColor: '#fde047',
		},
		{ key: 'AC/BD', label: 'AC/BD', align: 'right' as const, width: '4rem' },
		{ key: 'Bias', label: 'Bias', align: 'right' as const, decimals: 2, heatmapInvert: true },
	];

	const winSeasonColumns = [
		{ key: 'Season', label: 'Season', align: 'left' as const },
		{
			key: 'A',
			label: 'Gate A %',
			align: 'right' as const,
			decimals: 1,
			heatmap: true,
			headerColor: '#fca5a5',
		},
		{
			key: 'B',
			label: 'Gate B %',
			align: 'right' as const,
			decimals: 1,
			heatmap: true,
			headerColor: '#93c5fd',
		},
		{
			key: 'C',
			label: 'Gate C %',
			align: 'right' as const,
			decimals: 1,
			heatmap: true,
			headerColor: '#d1d5db',
		},
		{
			key: 'D',
			label: 'Gate D %',
			align: 'right' as const,
			decimals: 1,
			heatmap: true,
			headerColor: '#fde047',
		},
		{ key: 'Bias', label: 'Bias', align: 'right' as const, decimals: 1, heatmapInvert: true },
	];

	async function fetchData() {
		loading = true;
		const params = new SvelteURLSearchParams();
		if (selectedLeagues.length > 0) params.set('league', selectedLeagues.join(','));
		const qs = params.toString() ? `?${params.toString()}` : '';

		const res = await fetch(`/api/sel/tracks/${encodeURIComponent(track)}/gate-history${qs}`);
		if (res.ok) {
			const data = (await res.json()) as {
				avgPoints: SeasonRow[];
				winPct: SeasonRow[];
				overall: { avgPoints: typeof overallAvg; winPct: OverallGate };
				leagues: { code: string; name: string }[];
			};
			const toNum = (v: unknown) => (v != null ? Number(v) : null);
			const castGate = <T extends Record<string, unknown>>(o: T) => ({
				...o,
				A: toNum(o.A),
				B: toNum(o.B),
				C: toNum(o.C),
				D: toNum(o.D),
				Bias: toNum(o.Bias),
			});

			avgPoints = data.avgPoints ?? [];
			winPct = data.winPct ?? [];
			overallAvg = data.overall?.avgPoints
				? {
						...castGate(data.overall.avgPoints as Record<string, unknown>),
						'AC/BD': (data.overall.avgPoints as typeof overallAvg)['AC/BD'],
					}
				: overallAvg;
			overallWin = data.overall?.winPct
				? (castGate(data.overall.winPct as Record<string, unknown>) as typeof overallWin)
				: overallWin;
			if (!staticLoaded) {
				staticAvg = overallAvg;
				staticWin = overallWin;
				staticLoaded = true;
			}
			if (leagues.length === 0) leagues = data.leagues ?? [];
		}
		loading = false;
	}

	onMount(() => {
		fetchData();
	});
</script>

<div>
	{#if loading}
		<div class="text-muted-foreground py-8 text-center text-sm">Loading…</div>
	{:else if avgPoints.length === 0}
		<div class="text-muted-foreground py-8 text-center text-sm">
			No gate data available for this track.
		</div>
	{:else}
		<!-- Overall summary — one card per gate -->
		{@const GATE_COLORS = {
			A: { bg: '#fca5a5', border: '#ef4444', text: '#7f1d1d' },
			B: { bg: '#93c5fd', border: '#3b82f6', text: '#1e3a5f' },
			C: { bg: '#e5e7eb', border: '#9ca3af', text: '#374151' },
			D: { bg: '#fde047', border: '#eab308', text: '#713f12' },
		}}
		<div class="mb-6" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem;">
			{#each ['A', 'B', 'C', 'D'] as const as gate (gate)}
				{@const c = GATE_COLORS[gate]}
				<div class="overflow-hidden rounded-lg border" style="border-color: {c.border};">
					<div
						class="px-3 py-1.5 text-center text-sm font-bold"
						style="background-color: {c.border}; color: #fff;"
					>
						Gate {gate}
					</div>
					<div class="px-3 py-3 text-center" style="background-color: {c.bg}; color: {c.text};">
						<div class="mb-1 text-xs font-medium opacity-80">Avg pts</div>
						<div class="font-mono text-2xl font-bold tabular-nums">
							{staticAvg[gate]?.toFixed(2) ?? '—'}
						</div>
						<div class="mt-2 text-xs font-medium opacity-80">Win %</div>
						<div class="font-mono text-lg font-semibold tabular-nums">
							{staticWin[gate]?.toFixed(1) ?? '—'}%
						</div>
					</div>
				</div>
			{/each}
		</div>
		{#if overallAvg.Bias != null || overallWin.Bias != null}
			<div class="text-muted-foreground mb-4 flex flex-wrap gap-4 text-xs">
				{#if overallAvg.Bias != null}<span
						>Avg pts AC/BD: {overallAvg['AC/BD']} · Bias: {overallAvg.Bias?.toFixed(2)}</span
					>{/if}
				{#if overallWin.Bias != null}<span>Win % Bias: {overallWin.Bias?.toFixed(1)}</span>{/if}
			</div>
		{/if}

		<!-- League filter -->
		{#if leagues.length > 0}
			<div class="mb-6 flex flex-wrap items-center gap-3">
				<FilterDropdown
					id="track-gate-league"
					label="All leagues"
					options={leagueOptions}
					bind:selected={selectedLeagues}
					bind:isOpen={leagueOpen}
					minWidth="200px"
					on:change={() => fetchData()}
				/>
			</div>
		{/if}

		<!-- Gate trend charts -->
		{#if avgPoints.length > 1}
			<div class="mb-6">
				<GateChart {avgPoints} {winPct} />
			</div>
		{/if}

		<!-- Per-season breakdown tables -->
		<div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
			<div>
				<h3 class="mb-2 text-base font-semibold">Average Points by Season</h3>
				<SortableTable
					columns={avgSeasonColumns}
					rows={avgSeasonRows}
					pinnedBottom="Total Average"
					pinnedKey="Season"
					defaultSortKey="Season"
					defaultSortDir="desc"
				/>
			</div>
			<div>
				<h3 class="mb-2 text-base font-semibold">Win % by Season</h3>
				<SortableTable
					columns={winSeasonColumns}
					rows={winSeasonRows}
					pinnedBottom="Total Average"
					pinnedKey="Season"
					defaultSortKey="Season"
					defaultSortDir="desc"
				/>
			</div>
		</div>
	{/if}
</div>
