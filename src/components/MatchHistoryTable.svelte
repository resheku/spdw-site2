<script lang="ts">
	import SortableTable from './SortableTable.svelte';

	export let matches: Array<{
		id: number;
		date: string;
		league: string;
		leagueName: string;
		matchSubtype: string | null;
		home: string;
		away: string;
		homeScore: number | null;
		awayScore: number | null;
		homeAvgSpeed: number | null;
		awayAvgSpeed: number | null;
	}> = [];

	const PAGE_SIZE = 20;
	let page = 0;

	// Multi-column sort state — same pattern as StatsTable / ScheduleTable
	let sortColumns: Array<{ column: string; direction: string }> = [{ column: 'date', direction: 'desc' }];

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
				if (existing.direction === 'desc') sortColumns = [{ column, direction: 'asc' }];
				else sortColumns = [];
			} else {
				sortColumns = [{ column, direction: 'desc' }];
			}
		}
		page = 0;
	}

	$: sorted = (() => {
		if (!sortColumns.length) return matches;
		return [...matches].sort((a, b) => {
			for (const { column, direction: dir } of sortColumns) {
				const d = dir === 'asc' ? 1 : -1;
				let cmp = 0;
				if (column === 'score') {
					const ah = a.homeScore ?? -1, bh = b.homeScore ?? -1;
					const aa = a.awayScore ?? -1, ba = b.awayScore ?? -1;
					cmp = ah !== bh ? ah - bh : aa - ba;
				} else if (column === 'homeAvgSpeed') {
					cmp = (a.homeAvgSpeed ?? -Infinity) - (b.homeAvgSpeed ?? -Infinity);
				} else if (column === 'awayAvgSpeed') {
					cmp = (a.awayAvgSpeed ?? -Infinity) - (b.awayAvgSpeed ?? -Infinity);
				} else if (column === 'subtype') {
					cmp = (a.matchSubtype ?? '').localeCompare(b.matchSubtype ?? '');
				} else if (column === 'date') {
					cmp = a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
				} else if (column === 'league') {
					cmp = a.league.localeCompare(b.league);
				} else if (column === 'home') {
					cmp = a.home.localeCompare(b.home);
				} else if (column === 'away') {
					cmp = a.away.localeCompare(b.away);
				}
				if (cmp !== 0) return d * cmp;
			}
			return 0;
		});
	})();

	$: totalPages = Math.ceil(sorted.length / PAGE_SIZE);
	$: pageRows = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

	const columns = [
		{ key: 'date',         sortKey: 'date',         label: 'Date',     align: 'left'  as const, noWrap: true },
		{ key: 'league',       sortKey: 'league',       label: 'League',   align: 'left'  as const, noWrap: true, customCell: true },
		{ key: 'matchSubtype', sortKey: 'subtype',      label: 'Round',    align: 'left'  as const, noWrap: true, customCell: true },
		{ key: 'home',         sortKey: 'home',         label: 'Home',     align: 'left'  as const, customCell: true },
		{ key: 'homeScore',    sortKey: 'score',        label: 'Score',    align: 'left'  as const, noWrap: true, customCell: true },
		{ key: 'away',         sortKey: 'away',         label: 'Away',     align: 'left'  as const, customCell: true },
		{ key: 'homeAvgSpeed', sortKey: 'homeAvgSpeed', label: 'Home Avg', align: 'right' as const, noWrap: true, decimals: 2 },
		{ key: 'awayAvgSpeed', sortKey: 'awayAvgSpeed', label: 'Away Avg', align: 'right' as const, noWrap: true, decimals: 2 },
	];
</script>

<div>
	<div class="overflow-x-auto border border-border rounded-lg">
		<SortableTable
			{columns}
			rows={pageRows}
			externalSortColumns={sortColumns}
			onHeaderClick={handleSort}
		>
			{#snippet cell(m, col)}
				{#if col.key === 'league'}
					<span class="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{m.league}</span>
				{:else if col.key === 'matchSubtype'}
					{#if m.matchSubtype}
						<span class="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{m.matchSubtype}</span>
					{/if}
				{:else if col.key === 'home'}
					{@const homeWin = m.homeScore != null && m.awayScore != null && m.homeScore > m.awayScore}
					{@const awayWin = m.homeScore != null && m.awayScore != null && m.awayScore > m.homeScore}
					<span class="font-medium {homeWin ? 'text-green-600 dark:text-green-400' : awayWin ? 'text-red-500 dark:text-red-400' : ''}">{m.home}</span>
				{:else if col.key === 'homeScore'}
					<span class="font-mono font-semibold">{m.homeScore ?? '–'}:{m.awayScore ?? '–'}</span>
				{:else if col.key === 'away'}
					{@const homeWin = m.homeScore != null && m.awayScore != null && m.homeScore > m.awayScore}
					{@const awayWin = m.homeScore != null && m.awayScore != null && m.awayScore > m.homeScore}
					<span class="font-medium {awayWin ? 'text-green-600 dark:text-green-400' : homeWin ? 'text-red-500 dark:text-red-400' : ''}">{m.away}</span>
				{/if}
			{/snippet}
		</SortableTable>
	</div>

	{#if totalPages > 1}
		<div class="flex items-center justify-between mt-3 text-sm text-muted-foreground">
			<span>{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, matches.length)} of {matches.length}</span>
			<div class="flex items-center gap-1">
				<button
					class="px-2 py-1 rounded border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
					disabled={page === 0}
					on:click={() => (page = 0)}
					aria-label="First page"
				>«</button>
				<button
					class="px-2 py-1 rounded border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
					disabled={page === 0}
					on:click={() => page--}
					aria-label="Previous page"
				>‹</button>
				<span class="px-2">Page {page + 1} / {totalPages}</span>
				<button
					class="px-2 py-1 rounded border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
					disabled={page === totalPages - 1}
					on:click={() => page++}
					aria-label="Next page"
				>›</button>
				<button
					class="px-2 py-1 rounded border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
					disabled={page === totalPages - 1}
					on:click={() => (page = totalPages - 1)}
					aria-label="Last page"
				>»</button>
			</div>
		</div>
	{/if}
</div>
