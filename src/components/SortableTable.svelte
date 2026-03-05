<script lang="ts">
	type Col = {
		key: string;
		label: string;
		align?: 'left' | 'right';
		decimals?: number;
		isLink?: boolean;
		sticky?: boolean;
		bold?: boolean;
		heatmap?: boolean;
		headerColor?: string;
		width?: string;
		labelParts?: Array<{ text: string; color?: string }>;
	};

	export let columns: Col[];
	export let rows: Record<string, any>[];
	/** Value of pinnedKey that should always stay at the bottom regardless of sort */
	export let pinnedBottom: string | undefined = undefined;
	export let pinnedKey: string = 'Track';
	export let defaultSortKey: string | null = null;
	export let defaultSortDir: 'desc' | 'asc' = 'desc';
	export let showRowNumber: boolean = false;

	type SortDir = 'desc' | 'asc' | null;
	let sortKey: string | null = defaultSortKey;
	let sortDir: SortDir = defaultSortKey ? defaultSortDir : null;

	function cycleSort(key: string) {
		if (sortKey !== key) {
			sortKey = key;
			sortDir = 'desc';
		} else if (sortDir === 'desc') {
			sortDir = 'asc';
		} else {
			sortDir = null;
			sortKey = null;
		}
	}

	$: mainRows = pinnedBottom != null ? rows.filter(r => r[pinnedKey] !== pinnedBottom) : rows;
	$: pinnedRow = pinnedBottom != null ? rows.find(r => r[pinnedKey] === pinnedBottom) : null;

	$: sortedRows = (() => {
		if (!sortKey || !sortDir) return mainRows;
		const key = sortKey;
		return [...mainRows].sort((a, b) => {
			const av = a[key];
			const bv = b[key];
			if (av == null && bv == null) return 0;
			if (av == null) return 1;
			if (bv == null) return -1;
			const cmp =
				typeof av === 'number' && typeof bv === 'number'
					? av - bv
					: String(av).localeCompare(String(bv));
			return sortDir === 'desc' ? -cmp : cmp;
		});
	})();

	// Per-column min/max computed from non-pinned rows (used for heatmap)
	$: colRanges = (() => {
		const map: Record<string, { min: number; max: number }> = {};
		for (const col of columns) {
			if (!col.heatmap) continue;
			const vals = mainRows.map(r => r[col.key]).filter((v): v is number => typeof v === 'number');
			if (vals.length === 0) continue;
			map[col.key] = { min: Math.min(...vals), max: Math.max(...vals) };
		}
		return map;
	})();

	function heatHue(col: Col, value: any): number | null {
		if (!col.heatmap || typeof value !== 'number') return null;
		const range = colRanges[col.key];
		if (!range || range.max === range.min) return null;
		const t = (value - range.min) / (range.max - range.min);
		return Math.round(t * 120); // 0 = red, 120 = green
	}

	function sortIcon(key: string): string {
		if (sortKey !== key) return '↕';
		return sortDir === 'desc' ? '↓' : '↑';
	}

	function fmt(value: any, col: Col): string {
		if (value == null) return '-';
		if (col.decimals != null && typeof value === 'number') return value.toFixed(col.decimals);
		return String(value);
	}
</script>

<table class="w-full text-sm">
	<thead class="bg-muted sticky top-0">
		<tr>
			{#if showRowNumber}
				<th class="px-3 py-2 text-right font-medium w-10 text-muted-foreground">#</th>
			{/if}
			{#each columns as col, i}
				<th
					class="px-3 py-2 font-medium cursor-pointer select-none whitespace-nowrap
						{col.align === 'left' ? 'text-left' : 'text-right'}
						{col.sticky ? 'sticky left-0 bg-muted z-10' : ''}"
					style="{col.headerColor ? `background-color: ${col.headerColor}; color: #111827;` : ''}{col.width ? ` width: ${col.width};` : ''}"
					on:click={() => cycleSort(col.key)}
				>
					<span class="inline-flex items-center gap-1 {col.align !== 'left' ? 'flex-row-reverse' : ''}">
						{#if col.labelParts}
							<span class="inline-flex items-center gap-0">
								{#each col.labelParts as part}
									{#if part.color}
										<span class="px-1 rounded font-bold text-[#111827]" style="background-color: {part.color}">{part.text}</span>
									{:else}
										<span>{part.text}</span>
									{/if}
								{/each}
							</span>
						{:else}
							{col.label}
						{/if}
						<span class="text-muted-foreground/60 text-xs">{sortIcon(col.key)}</span>
					</span>
				</th>
			{/each}
		</tr>
	</thead>
	<tbody>
		{#each sortedRows as row, i}
			<tr class="border-t border-border hover:bg-muted/50">
				{#if showRowNumber}
					<td class="px-3 py-2 text-right tabular-nums text-muted-foreground">{i + 1}</td>
				{/if}
				{#each columns as col}
					{@const hue = heatHue(col, row[col.key])}
					<td
						class="px-3 py-2 tabular-nums
							{col.align === 'left' ? 'text-left' : 'text-right'}
							{col.sticky ? 'sticky left-0 bg-background z-10' : ''}
							{col.bold ? 'font-semibold' : col.align === 'left' ? 'font-medium' : ''}
							{hue !== null ? 'heat' : ''}"
						style:--cell-hue={hue ?? ''}
					>
						{#if col.isLink && row[col.key] != null}
							<a href="/sel/tracks/{encodeURIComponent(String(row[col.key]))}" class="hover:underline">{row[col.key]}</a>
						{:else if row[col.key] == null}
							<span class="text-muted-foreground">-</span>
						{:else}
							{fmt(row[col.key], col)}
						{/if}
					</td>
				{/each}
			</tr>
		{/each}
		{#if pinnedRow}
			<tr class="border-t-2 border-border hover:bg-muted/50 font-semibold bg-muted/30">
				{#if showRowNumber}
					<td class="px-3 py-2"></td>
				{/if}
				{#each columns as col}
					<td
						class="px-3 py-2 tabular-nums
							{col.align === 'left' ? 'text-left' : 'text-right'}
							{col.sticky ? 'sticky left-0 bg-muted/30 z-10' : ''}"
					>
						{#if pinnedRow[col.key] == null}
							<span class="text-muted-foreground">-</span>
						{:else}
							{fmt(pinnedRow[col.key], col)}
						{/if}
					</td>
				{/each}
			</tr>
		{/if}
	</tbody>
</table>

<style>
	.heat {
		background-color: hsla(var(--cell-hue), 70%, 45%, 0.25);
	}
</style>
