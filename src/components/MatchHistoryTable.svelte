<script lang="ts">
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

	type SortKey = 'date' | 'league' | 'subtype' | 'home' | 'score' | 'away' | 'homeAvgSpeed' | 'awayAvgSpeed';
	type SortDir = 'asc' | 'desc' | null;

	let sortKey: SortKey = 'date';
	let sortDir: SortDir = 'desc';

	function cycleSort(key: SortKey) {
		if (sortKey !== key) {
			sortKey = key;
			sortDir = 'desc';
		} else if (sortDir === 'desc') {
			sortDir = 'asc';
		} else if (sortDir === 'asc') {
			sortDir = null;
		} else {
			sortDir = 'desc';
		}
		page = 0;
	}

	function sortIcon(key: SortKey) {
		if (sortKey !== key || sortDir === null) return '↕';
		return sortDir === 'desc' ? '↓' : '↑';
	}

	$: sorted = (() => {
		if (sortDir === null) return matches;
		return [...matches].sort((a, b) => {
			let cmp: number;
			if (sortKey === 'score') {
				// sort by home score descending/ascending, then away score as tiebreak
				const ah = a.homeScore ?? -1, bh = b.homeScore ?? -1;
				const aa = a.awayScore ?? -1, ba = b.awayScore ?? -1;
				cmp = ah !== bh ? ah - bh : aa - ba;
			} else if (sortKey === 'homeAvgSpeed' || sortKey === 'awayAvgSpeed') {
				const av = sortKey === 'homeAvgSpeed' ? (a.homeAvgSpeed ?? -1) : (a.awayAvgSpeed ?? -1);
				const bv = sortKey === 'homeAvgSpeed' ? (b.homeAvgSpeed ?? -1) : (b.awayAvgSpeed ?? -1);
				cmp = av - bv;
			} else {
				let av: string, bv: string;
				if (sortKey === 'subtype') { av = a.matchSubtype ?? ''; bv = b.matchSubtype ?? ''; }
				else if (sortKey === 'date') { av = a.date; bv = b.date; }
				else if (sortKey === 'league') { av = a.league; bv = b.league; }
				else if (sortKey === 'home') { av = a.home; bv = b.home; }
				else { av = a.away; bv = b.away; }
				cmp = av < bv ? -1 : av > bv ? 1 : 0;
			}
			return sortDir === 'asc' ? cmp : -cmp;
		});
	})();

	$: totalPages = Math.ceil(sorted.length / PAGE_SIZE);
	$: pageRows = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
	$: globalOffset = page * PAGE_SIZE;

	function thClass(key: SortKey, align: 'left' | 'center' = 'left') {
		const base = `px-3 py-2 font-medium cursor-pointer select-none hover:bg-muted/60 whitespace-nowrap text-${align}`;
		return sortKey === key && sortDir !== null ? base + ' text-foreground' : base + ' text-muted-foreground';
	}
</script>

<div>
	<div class="overflow-x-auto">
		<table class="w-full text-sm">
			<thead class="bg-muted sticky top-0">
				<tr>
					<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
					<th class={thClass('date')} on:click={() => cycleSort('date')}>
						Date <span class="text-xs opacity-60">{sortIcon('date')}</span>
					</th>
					<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
					<th class={thClass('league')} on:click={() => cycleSort('league')}>
						League <span class="text-xs opacity-60">{sortIcon('league')}</span>
					</th>
					<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
					<th class={thClass('subtype')} on:click={() => cycleSort('subtype')}>
						Round <span class="text-xs opacity-60">{sortIcon('subtype')}</span>
					</th>
					<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
					<th class={thClass('home')} on:click={() => cycleSort('home')}>
						Home <span class="text-xs opacity-60">{sortIcon('home')}</span>
					</th>
					<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
					<th class={thClass('score', 'center')} on:click={() => cycleSort('score')}>
						Score <span class="text-xs opacity-60">{sortIcon('score')}</span>
					</th>
					<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
					<th class={thClass('away')} on:click={() => cycleSort('away')}>
						Away <span class="text-xs opacity-60">{sortIcon('away')}</span>
					</th>				<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
				<th class={thClass('homeAvgSpeed', 'center')} on:click={() => cycleSort('homeAvgSpeed')}>
					Home Avg <span class="text-xs opacity-60">{sortIcon('homeAvgSpeed')}</span>
				</th>
				<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
				<th class={thClass('awayAvgSpeed', 'center')} on:click={() => cycleSort('awayAvgSpeed')}>
					Away Avg <span class="text-xs opacity-60">{sortIcon('awayAvgSpeed')}</span>
				</th>				</tr>
			</thead>
			<tbody>
				{#each pageRows as m, i}
					{@const homeWin = m.homeScore != null && m.awayScore != null && m.homeScore > m.awayScore}
					{@const awayWin = m.homeScore != null && m.awayScore != null && m.awayScore > m.homeScore}
					<tr class={(globalOffset + i) % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
						<td class="px-3 py-2 tabular-nums">{m.date}</td>
						<td class="px-3 py-2">
						<span class="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{m.league}</span>
					</td>
					<td class="px-3 py-2">
						{#if m.matchSubtype}
							<span class="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{m.matchSubtype}</span>
						{/if}
					</td>
						<td class="px-3 py-2 font-medium {homeWin ? 'text-green-600 dark:text-green-400' : awayWin ? 'text-red-500 dark:text-red-400' : ''}">{m.home}</td>
						<td class="px-3 py-2 text-center tabular-nums font-mono font-semibold">
							{m.homeScore ?? '–'}:{m.awayScore ?? '–'}
						</td>
						<td class="px-3 py-2 font-medium {awayWin ? 'text-green-600 dark:text-green-400' : homeWin ? 'text-red-500 dark:text-red-400' : ''}">{m.away}</td>
					<td class="px-3 py-2 text-center tabular-nums">{m.homeAvgSpeed != null ? m.homeAvgSpeed.toFixed(2) : '–'}</td>
					<td class="px-3 py-2 text-center tabular-nums">{m.awayAvgSpeed != null ? m.awayAvgSpeed.toFixed(2) : '–'}</td>
					</tr>
				{/each}
			</tbody>
		</table>
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
