<script lang="ts">
	import { onMount } from 'svelte';
	import SortableTable from './SortableTable.svelte';

	export let track: string;

	type Summary = {
		total: number;
		homeWins: number;
		awayWins: number;
		avgHomeScore: number | null;
		avgAwayScore: number | null;
	};
	type TeamRow = {
		team: string;
		name: string;
		played: number;
		wins: number;
		draws: number;
		losses: number;
		pts: number;
		avgPts: number | null;
		winPct: number | null;
		hasHome: boolean;
	};

	let summary: Summary | null = null;
	let teams: TeamRow[] = [];
	let loading = true;

	onMount(async () => {
		const res = await fetch(`/api/sel/tracks/${encodeURIComponent(track)}/teams`);
		if (res.ok) {
			const data = (await res.json()) as { summary: Summary | null; teams: TeamRow[] };
			summary = data.summary ?? null;
			teams = data.teams ?? [];
		}
		loading = false;
	});

	const teamColumns = [
		{ key: 'team', label: 'Team', align: 'left' as const },
		{ key: 'played', label: 'M', align: 'right' as const },
		{ key: 'wins', label: 'W', align: 'right' as const },
		{ key: 'draws', label: 'D', align: 'right' as const },
		{ key: 'losses', label: 'L', align: 'right' as const },
		{ key: 'winPct', label: 'Win %', align: 'right' as const, decimals: 1 },
		{ key: 'pts', label: 'Pts', align: 'right' as const },
		{ key: 'avgPts', label: 'Avg Pts', align: 'right' as const, decimals: 1 },
	];

	$: tableRows = teams.map((t) => ({ ...t, _bold: t.hasHome }));
</script>

<div>
	{#if loading}
		<div class="text-muted-foreground py-8 text-center text-sm">Loading…</div>
	{:else if summary && summary.total > 0}
		<!-- Home vs Away summary -->
		<div class="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
			<div class="border-border bg-muted/30 rounded-lg border p-4 text-center">
				<div class="text-muted-foreground mb-1 text-xs">Home Win %</div>
				<div class="text-2xl font-bold tabular-nums">
					{((summary.homeWins / summary.total) * 100).toFixed(1)}%
				</div>
				<div class="text-muted-foreground mt-1 text-xs">
					{summary.homeWins} of {summary.total} matches
				</div>
			</div>
			<div class="border-border bg-muted/30 rounded-lg border p-4 text-center">
				<div class="text-muted-foreground mb-1 text-xs">Away Win %</div>
				<div class="text-2xl font-bold tabular-nums">
					{((summary.awayWins / summary.total) * 100).toFixed(1)}%
				</div>
				<div class="text-muted-foreground mt-1 text-xs">
					{summary.awayWins} of {summary.total} matches
				</div>
			</div>
			<div class="border-border bg-muted/30 rounded-lg border p-4 text-center">
				<div class="text-muted-foreground mb-1 text-xs">Avg Home Score</div>
				<div class="text-2xl font-bold tabular-nums">{summary.avgHomeScore?.toFixed(1) ?? '—'}</div>
			</div>
			<div class="border-border bg-muted/30 rounded-lg border p-4 text-center">
				<div class="text-muted-foreground mb-1 text-xs">Avg Away Score</div>
				<div class="text-2xl font-bold tabular-nums">{summary.avgAwayScore?.toFixed(1) ?? '—'}</div>
			</div>
		</div>

		<!-- Per-team breakdown -->
		<h3 class="mb-2 text-base font-semibold">Team Points at This Track</h3>
		<div class="border-border mb-8 overflow-x-auto rounded-lg border">
			<SortableTable
				columns={teamColumns}
				rows={tableRows}
				defaultSortKey="avgPts"
				defaultSortDir="desc"
				showRowNumber
			/>
		</div>
	{/if}
</div>
