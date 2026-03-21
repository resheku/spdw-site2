<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';
	import SortableTable from './SortableTable.svelte';

	export let matches: Array<{
		id: number;
		date: string;
		league: string;
		leagueName: string;
		matchSubtype: string | null;
		homeTeamId: number;
		homeShort: string;
		home: string;
		awayTeamId: number;
		awayShort: string;
		away: string;
		homeScore: number | null;
		awayScore: number | null;
	}> = [];

	// Overall home vs away comparison
	$: valid = matches.filter((m) => m.homeScore != null && m.awayScore != null);
	$: total = valid.length;
	$: homeWins = valid.filter((m) => m.homeScore! > m.awayScore!).length;
	$: awayWins = valid.filter((m) => m.awayScore! > m.homeScore!).length;
	$: avgHomeScore = total ? valid.reduce((s, m) => s + m.homeScore!, 0) / total : null;
	$: avgAwayScore = total ? valid.reduce((s, m) => s + m.awayScore!, 0) / total : null;

	// Per-team stats — grouped by team ID
	$: teamRows = (() => {
		const map = new SvelteMap<
			number,
			{
				short: string;
				played: number;
				wins: number;
				draws: number;
				losses: number;
				pts: number;
				isHome: boolean;
			}
		>();
		function get(id: number, short: string) {
			if (!map.has(id))
				map.set(id, { short, played: 0, wins: 0, draws: 0, losses: 0, pts: 0, isHome: false });
			return map.get(id)!;
		}
		for (const m of matches) {
			if (m.homeScore == null || m.awayScore == null) continue;
			const h = get(m.homeTeamId, m.homeShort);
			const a = get(m.awayTeamId, m.awayShort);
			h.played++;
			h.pts += m.homeScore;
			h.isHome = true;
			a.played++;
			a.pts += m.awayScore;
			if (m.homeScore > m.awayScore) {
				h.wins++;
				a.losses++;
			} else if (m.awayScore > m.homeScore) {
				a.wins++;
				h.losses++;
			} else {
				h.draws++;
				a.draws++;
			}
		}
		return Array.from(map.values()).map((s) => ({
			Team: s.short,
			M: s.played,
			W: s.wins,
			D: s.draws,
			L: s.losses,
			'Win %': s.played > 0 ? parseFloat(((s.wins / s.played) * 100).toFixed(1)) : null,
			Pts: s.pts,
			'Avg Pts': s.played > 0 ? parseFloat((s.pts / s.played).toFixed(1)) : null,
			_bold: s.isHome,
		}));
	})();

	const teamColumns = [
		{ key: 'Team', label: 'Team', align: 'left' as const },
		{ key: 'M', label: 'M', align: 'right' as const },
		{ key: 'W', label: 'W', align: 'right' as const },
		{ key: 'D', label: 'D', align: 'right' as const },
		{ key: 'L', label: 'L', align: 'right' as const },
		{ key: 'Win %', label: 'Win %', align: 'right' as const, decimals: 1 },
		{ key: 'Pts', label: 'Pts', align: 'right' as const },
		{ key: 'Avg Pts', label: 'Avg Pts', align: 'right' as const, decimals: 1 },
	];
</script>

<div>
	{#if total > 0}
		<!-- Home vs Away summary -->
		<div class="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
			<div class="border-border bg-muted/30 rounded-lg border p-4 text-center">
				<div class="text-muted-foreground mb-1 text-xs">Home Win %</div>
				<div class="text-2xl font-bold tabular-nums">{((homeWins / total) * 100).toFixed(1)}%</div>
				<div class="text-muted-foreground mt-1 text-xs">{homeWins} of {total} matches</div>
			</div>
			<div class="border-border bg-muted/30 rounded-lg border p-4 text-center">
				<div class="text-muted-foreground mb-1 text-xs">Away Win %</div>
				<div class="text-2xl font-bold tabular-nums">{((awayWins / total) * 100).toFixed(1)}%</div>
				<div class="text-muted-foreground mt-1 text-xs">{awayWins} of {total} matches</div>
			</div>
			<div class="border-border bg-muted/30 rounded-lg border p-4 text-center">
				<div class="text-muted-foreground mb-1 text-xs">Avg Home Score</div>
				<div class="text-2xl font-bold tabular-nums">{avgHomeScore?.toFixed(1) ?? '—'}</div>
			</div>
			<div class="border-border bg-muted/30 rounded-lg border p-4 text-center">
				<div class="text-muted-foreground mb-1 text-xs">Avg Away Score</div>
				<div class="text-2xl font-bold tabular-nums">{avgAwayScore?.toFixed(1) ?? '—'}</div>
			</div>
		</div>

		<!-- Per-team breakdown -->
		<h3 class="mb-2 text-base font-semibold">Team Points at This Track</h3>
		<div class="border-border mb-8 overflow-x-auto rounded-lg border">
			<SortableTable
				columns={teamColumns}
				rows={teamRows}
				defaultSortKey="Avg Pts"
				defaultSortDir="desc"
				showRowNumber
			/>
		</div>
	{/if}
</div>
