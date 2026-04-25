<script lang="ts">
	import { onDestroy } from 'svelte';
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

	let avgCanvas: HTMLCanvasElement | undefined = $state();
	let winCanvas: HTMLCanvasElement | undefined = $state();
	let avgChart: Chart | null = null;
	let winChart: Chart | null = null;

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

	$effect(() => {
		if (!avgCanvas || !winCanvas) return;

		const ap = avgPoints;
		const wp = winPct;

		if (!avgChart) {
			avgChart = new Chart(avgCanvas, {
				type: 'line',
				data: { labels: ap.map((r) => String(r.season)), datasets: makeDatasets(ap) },
				options: baseOptions('Avg Points', ''),
			} as ChartConfiguration<'line'>);
		} else {
			avgChart.data.labels = ap.map((r) => String(r.season));
			avgChart.data.datasets = makeDatasets(ap);
			avgChart.update();
		}

		if (!winChart) {
			winChart = new Chart(winCanvas, {
				type: 'line',
				data: { labels: wp.map((r) => String(r.season)), datasets: makeDatasets(wp) },
				options: baseOptions('Win %', '%'),
			} as ChartConfiguration<'line'>);
		} else {
			winChart.data.labels = wp.map((r) => String(r.season));
			winChart.data.datasets = makeDatasets(wp);
			winChart.update();
		}
	});

	onDestroy(() => {
		avgChart?.destroy();
		avgChart = null;
		winChart?.destroy();
		winChart = null;
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
