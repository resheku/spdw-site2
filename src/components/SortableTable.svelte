<script lang="ts">
	import type { Snippet } from 'svelte';

	type Col = {
		key: string;
		label: string;
		align?: 'left' | 'right';
		decimals?: number;
		/** Value shown when the cell data is null (default '-') */
		nullValue?: string | number;
		isLink?: boolean;
		sticky?: boolean;
		bold?: boolean;
		heatmap?: boolean;
		heatmapInvert?: boolean;
		headerColor?: string;
		width?: string;
		labelParts?: Array<{ text: string; color?: string }>;
		/** Attribute value for data-column-id (used by CSS visibility overrides) */
		id?: string;
		/** Separate sort key when it differs from the data key, e.g. 'date' vs 'datetime' */
		sortKey?: string;
		/** Tailwind responsive classes applied to both th and td, e.g. 'max-lg:hidden' */
		responsiveClass?: string;
		/** Add whitespace-nowrap to td cells (headers always nowrap). Default false. */
		noWrap?: boolean;
		/** When true and a cell snippet is provided, use the snippet instead of default rendering */
		customCell?: boolean;
		/** Extra CSS classes applied to td only */
		cellClass?: string;
		/** alwaysVisible flag (informational, used by column-toggle UIs in parent) */
		alwaysVisible?: boolean;
	};

	export let columns: Col[];
	export let rows: Record<string, unknown>[];
	/** Value of pinnedKey that should always stay at the bottom regardless of sort */
	export let pinnedBottom: string | undefined = undefined;
	export let pinnedKey: string = 'Track';
	export let defaultSortKey: string | null = null;
	export let defaultSortDir: 'desc' | 'asc' = 'desc';
	export let showRowNumber: boolean = false;
	/** data-column-id applied to the row-number th/td when showRowNumber is true */
	export let rowNumberColId: string | undefined = undefined;

	// ── External sort mode ────────────────────────────────────────────────────
	/** Sort state owned by the parent; when provided, SortableTable shows icons but does not sort rows */
	export let externalSortColumns: Array<{ column: string; direction: string }> | undefined =
		undefined;
	/** Called when a header is clicked in external sort mode */
	export let onHeaderClick: ((col: string, e: MouseEvent) => void) | undefined = undefined;
	/** Returns extra CSS classes for a cell or header (used for column visibility overrides) */
	export let getExtraClass: ((col: Col, isHeader: boolean) => string) | undefined = undefined;
	/** Svelte 5 snippet for custom cell rendering; only used when col.customCell === true */
	export let cell: Snippet<[Record<string, unknown>, Col]> | undefined = undefined;

	$: isExternalSort = onHeaderClick !== undefined;

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

	function handleHeaderClick(col: Col, e: MouseEvent) {
		const key = col.sortKey ?? col.key;
		if (isExternalSort) onHeaderClick!(key, e);
		else cycleSort(key);
	}

	$: mainRows = pinnedBottom != null ? rows.filter((r) => r[pinnedKey] !== pinnedBottom) : rows;
	$: pinnedRow = pinnedBottom != null ? rows.find((r) => r[pinnedKey] === pinnedBottom) : null;

	$: sortedRows = (() => {
		// In external sort mode the parent pre-sorts rows
		if (isExternalSort) return mainRows;
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
			if (!col.heatmap && !col.heatmapInvert) continue;
			const vals = mainRows
				.map((r) => r[col.key])
				.filter((v): v is number => typeof v === 'number');
			if (vals.length === 0) continue;
			map[col.key] = { min: Math.min(...vals), max: Math.max(...vals) };
		}
		return map;
	})();

	function heatHue(col: Col, value: unknown): number | null {
		if (!col.heatmap && !col.heatmapInvert) return null;
		if (typeof value !== 'number') return null;
		const range = colRanges[col.key];
		if (!range || range.max === range.min) return null;
		const t = (value - range.min) / (range.max - range.min);
		return Math.round((col.heatmapInvert ? 1 - t : t) * 120); // 0 = red, 120 = green
	}

	type SortIconInfo = { arrow: '▼' | '▲'; rank: number | null } | null;

	// Reactive map so Svelte tracks externalSortColumns / sortKey / sortDir as dependencies.
	// A plain function call inside {@const} in {#each} is not tracked by the Svelte compiler.
	$: sortIcons = (() => {
		const map: Record<string, SortIconInfo> = {};
		for (const col of columns) {
			const key = col.sortKey ?? col.key;
			if (isExternalSort && externalSortColumns) {
				const s = externalSortColumns.find((sc) => sc.column === key);
				if (s) {
					const idx = externalSortColumns.indexOf(s);
					map[key] = {
						arrow: s.direction === 'desc' ? '▼' : '▲',
						rank: externalSortColumns.length > 1 ? idx + 1 : null,
					};
				}
			} else if (sortKey && sortKey === key && sortDir) {
				map[key] = { arrow: sortDir === 'desc' ? '▼' : '▲', rank: null };
			}
		}
		return map;
	})();

	function fmt(value: unknown, col: Col): string {
		if (value == null) return String(col.nullValue ?? '-');
		if (col.decimals != null && typeof value === 'number') return value.toFixed(col.decimals);
		return String(value);
	}
</script>

<table class="w-full text-sm">
	<thead class="bg-muted sticky top-0">
		<tr>
			{#if showRowNumber}
				<th
					class="text-muted-foreground w-10 px-3 py-2 text-right align-middle font-medium whitespace-nowrap {getExtraClass?.(
						{ key: '__rank', label: '#', id: rowNumberColId },
						true
					) ?? ''}"
					data-column-id={rowNumberColId}>#</th
				>
			{/if}
			{#each columns as col (col.key)}
				{@const _icon = sortIcons[col.sortKey ?? col.key] ?? null}
				<th
					class="hover:bg-muted/80 cursor-pointer px-3 py-2 align-middle font-medium whitespace-nowrap select-none
						{col.align === 'left' ? 'text-left' : 'text-right'}
						{col.sticky ? 'bg-muted sticky left-0 z-10' : ''}
						{col.responsiveClass ?? ''}
						{getExtraClass?.(col, true) ?? ''}"
					style="{col.headerColor
						? `background-color: ${col.headerColor}; color: #111827;`
						: ''}{col.width ? ` width: ${col.width};` : ''}"
					data-column-id={col.id}
					on:click={(e) => handleHeaderClick(col, e)}
				>
					<span
						class="inline-flex items-center gap-1 {col.align !== 'left' ? 'flex-row-reverse' : ''}"
					>
						{#if col.labelParts}
							<span class="inline-flex items-center gap-0">
								{#each col.labelParts as part, pi (pi)}
									{#if part.color}
										<span
											class="rounded px-1 font-bold text-[#111827]"
											style="background-color: {part.color}">{part.text}</span
										>
									{:else}
										<span>{part.text}</span>
									{/if}
								{/each}
							</span>
						{:else}
							{col.label}
						{/if}
						{#if _icon}
							<span class="inline-flex items-baseline gap-[1px] text-xs">
								{_icon.arrow}
								{#if _icon.rank !== null}<sup class="text-[0.6rem] leading-none font-semibold"
										>{_icon.rank}</sup
									>{/if}
							</span>
						{:else}
							<span class="text-muted-foreground/40 text-xs">↕</span>
						{/if}
					</span>
				</th>
			{/each}
		</tr>
	</thead>
	<tbody>
		{#each sortedRows as row, i (i)}
			<tr class="border-border hover:bg-muted/50 border-t">
				{#if showRowNumber}
					<td
						class="text-muted-foreground px-3 py-2 text-right tabular-nums {getExtraClass?.(
							{ key: '__rank', label: '#', id: rowNumberColId },
							false
						) ?? ''}"
						data-column-id={rowNumberColId}>{i + 1}</td
					>
				{/if}
				{#each columns as col (col.key)}
					{@const hue = heatHue(col, row[col.key])}
					<td
						class="px-3 py-2 tabular-nums
							{col.align === 'left' ? 'text-left' : 'text-right'}
							{col.sticky ? 'bg-background sticky left-0 z-10' : ''}
							{row._bold ? 'font-bold' : col.bold ? 'font-semibold' : col.align === 'left' ? 'font-medium' : ''}
							{hue !== null ? 'heat' : ''}
							{col.noWrap ? 'whitespace-nowrap' : ''}
							{col.responsiveClass ?? ''}
							{col.cellClass ?? ''}
							{getExtraClass?.(col, false) ?? ''}"
						style:--cell-hue={hue ?? ''}
						data-column-id={col.id}
					>
						{#if col.customCell && cell}
							{@render cell(row, col)}
						{:else if col.isLink && row[col.key] != null}
							<a
								href="/sel/tracks/{encodeURIComponent(String(row[col.key]))}"
								class="hover:underline">{row[col.key]}</a
							>
						{:else if row[col.key] == null}
							{#if col.nullValue === undefined || col.nullValue === null}
								<span class="text-muted-foreground">-</span>
							{:else}
								{col.nullValue}
							{/if}
						{:else}
							{fmt(row[col.key], col)}
						{/if}
					</td>
				{/each}
			</tr>
		{/each}
		{#if pinnedRow}
			<tr class="border-border hover:bg-muted/50 bg-muted/30 border-t-2 font-semibold">
				{#if showRowNumber}
					<td class="px-3 py-2" data-column-id={rowNumberColId}></td>
				{/if}
				{#each columns as col (col.key)}
					<td
						class="px-3 py-2 tabular-nums
							{col.align === 'left' ? 'text-left' : 'text-right'}
							{col.sticky ? 'bg-muted/30 sticky left-0 z-10' : ''}
							{col.responsiveClass ?? ''}
							{getExtraClass?.(col, false) ?? ''}"
						data-column-id={col.id}
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
