<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Chart, type ChartConfiguration } from 'chart.js';
	import 'chart.js/auto';

	interface TrackSpeeds {
		Track: string;
		Average: number | null;
		seasons: Record<string, number>;
	}

	let { tracks, seasons }: { tracks: TrackSpeeds[]; seasons: number[] } = $props();

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;

	const PALETTE = [
		'oklch(65% 0.2 30)',
		'oklch(65% 0.2 90)',
		'oklch(65% 0.2 150)',
		'oklch(65% 0.2 210)',
		'oklch(65% 0.2 270)',
		'oklch(65% 0.2 330)',
		'oklch(70% 0.18 60)',
		'oklch(70% 0.18 120)',
		'oklch(70% 0.18 180)',
		'oklch(70% 0.18 240)',
		'oklch(70% 0.18 300)',
		'oklch(70% 0.18 360)',
	];

	onMount(() => {
		const config: ChartConfiguration<'line'> = {
			type: 'line',
			data: {
				labels: seasons.map(String),
				datasets: tracks.map((t, i) => ({
					label: t.Track,
					data: seasons.map((s) => t.seasons[s] ?? null),
					borderColor: PALETTE[i % PALETTE.length],
					backgroundColor: PALETTE[i % PALETTE.length],
					spanGaps: false,
					tension: 0.3,
					pointRadius: 4,
					pointHoverRadius: 6,
				})),
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: { mode: 'index', intersect: false },
				plugins: {
					legend: {
						position: 'bottom',
						labels: { boxWidth: 12, padding: 16 },
						onClick(e, legendItem, legend) {
							const index = legendItem.datasetIndex!;
							const ci = legend.chart;
							const nativeEvent = e.native as MouseEvent | null;

							if (nativeEvent?.altKey) {
								// Option/Alt + click: solo this track, or restore all if already soloed
								const datasets = ci.data.datasets;
								const isOnlyVisible = datasets.every((_, i) =>
									i === index ? ci.isDatasetVisible(i) : !ci.isDatasetVisible(i)
								);
								if (isOnlyVisible) {
									datasets.forEach((_, i) => ci.show(i));
								} else {
									datasets.forEach((_, i) => (i === index ? ci.show(i) : ci.hide(i)));
								}
							} else {
								// Normal click: toggle as default
								Chart.defaults.plugins.legend.onClick.call(this, e, legendItem, legend);
							}
						},
					},
					tooltip: {
						callbacks: {
							label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(2) ?? '-'} km/h`,
						},
					},
				},
				scales: {
					x: { title: { display: true, text: 'Season' } },
					y: { title: { display: true, text: 'Avg Max Speed (km/h)' } },
				},
			},
		};

		chart = new Chart(canvas, config);
	});

	onDestroy(() => chart?.destroy());
</script>

<div style="position:relative; height:380px;">
	<canvas bind:this={canvas}></canvas>
</div>
