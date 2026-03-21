<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Chart, type ChartConfiguration } from 'chart.js';
	import 'chart.js/auto';

	interface SeasonRow {
		season: number;
		A: number;
		B: number;
		C: number;
		D: number;
	}

	let { avgPoints, winPct }: { avgPoints: SeasonRow[]; winPct: SeasonRow[] } = $props();

	let avgCanvas: HTMLCanvasElement;
	let winCanvas: HTMLCanvasElement;
	let avgChart: Chart | null = null;
	let winChart: Chart | null = null;

	// Gate colors: A=red, B=blue, C=lightgray, D=yellow — match table header colors
	const GATE_COLORS: Record<string, string> = {
		A: '#ef4444',
		B: '#3b82f6',
		C: '#9ca3af',
		D: '#eab308',
	};

	function makeDatasets(data: SeasonRow[]) {
		return (['A', 'B', 'C', 'D'] as const).map((g) => ({
			label: `Gate ${g}`,
			data: data.map((r) => r[g]),
			borderColor: GATE_COLORS[g],
			backgroundColor: GATE_COLORS[g],
			tension: 0.3,
			pointRadius: 2,
			pointHoverRadius: 4,
		}));
	}

	function baseOptions(
		yLabel: string,
		tooltipSuffix: string
	): ChartConfiguration<'line'>['options'] {
		return {
			responsive: true,
			maintainAspectRatio: false,
			interaction: { mode: 'index', intersect: false },
			plugins: {
				legend: { position: 'bottom', labels: { boxWidth: 12, padding: 16 } },
				tooltip: {
					callbacks: {
						label: (ctx) =>
							` ${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(tooltipSuffix === '%' ? 1 : 2) ?? '-'}${tooltipSuffix}`,
					},
				},
			},
			scales: {
				x: { title: { display: true, text: 'Season' } },
				y: { title: { display: true, text: yLabel } },
			},
		};
	}

	onMount(() => {
		const labels = avgPoints.map((r) => String(r.season));

		avgChart = new Chart(avgCanvas, {
			type: 'line',
			data: { labels, datasets: makeDatasets(avgPoints) },
			options: baseOptions('Avg Points', ''),
		} as ChartConfiguration<'line'>);

		winChart = new Chart(winCanvas, {
			type: 'line',
			data: { labels: winPct.map((r) => String(r.season)), datasets: makeDatasets(winPct) },
			options: baseOptions('Win %', '%'),
		} as ChartConfiguration<'line'>);
	});

	onDestroy(() => {
		avgChart?.destroy();
		winChart?.destroy();
	});
</script>

<div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
	<div>
		<h3 class="text-muted-foreground mb-2 text-base font-semibold">
			Average Points by Gate per Season
		</h3>
		<div style="position:relative; height:280px;">
			<canvas bind:this={avgCanvas}></canvas>
		</div>
	</div>
	<div>
		<h3 class="text-muted-foreground mb-2 text-base font-semibold">
			Win Percentage by Gate per Season
		</h3>
		<div style="position:relative; height:280px;">
			<canvas bind:this={winCanvas}></canvas>
		</div>
	</div>
</div>
