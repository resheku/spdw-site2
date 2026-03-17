<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Chart, type ChartConfiguration } from 'chart.js';
	import 'chart.js/auto';

	export let matchAverages: Array<{ matchId: number; date: string; time: string; home: string; away: string; homeScore: number | null; awayScore: number | null; round: string | null; avgSpeed: number | null; homeAvgSpeed: number | null; awayAvgSpeed: number | null }> = [];

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;

	onMount(() => {
		const labels = matchAverages.map(r => r.date);
		const data = matchAverages.map(r => r.avgSpeed);
		const validSpeeds = data.filter((v): v is number => v != null);
		const yMin = validSpeeds.length > 0 ? Math.floor(Math.min(...validSpeeds)) - 2 : 0;

		chart = new Chart(canvas, {
			type: 'line',
			data: {
				labels,
				datasets: [
					{
						label: 'Avg Max Speed (km/h)',
						data,
						borderColor: 'rgba(59, 130, 246, 1)',
						backgroundColor: 'rgba(59, 130, 246, 1)',
						spanGaps: false,
						tension: 0.3,
						pointRadius: 2,
						pointHoverRadius: 4,
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: { mode: 'index', intersect: false },
				plugins: {
					legend: { display: false },
					tooltip: {
						callbacks: {
							title: ctx => {
								const r = matchAverages[ctx[0]?.dataIndex ?? 0];
								if (!r) return '';
							const round = r.round ? ` - ${r.round}` : '';
							return `${r.date} ${r.time}${round}`;
						},
						afterTitle: ctx => {
							const r = matchAverages[ctx[0]?.dataIndex ?? 0];
							if (!r) return [];
							const score = (r.homeScore != null && r.awayScore != null)
								? `${r.home} ${r.homeScore}:${r.awayScore} ${r.away}`
								: `${r.home} vs ${r.away}`;
							return [score];
						},
						beforeLabel: ctx => {
							const r = matchAverages[ctx.dataIndex];
							if (!r) return [];
							return [
								`${r.home} avg: ${r.homeAvgSpeed?.toFixed(2) ?? '-'} km/h`,
								`${r.away} avg: ${r.awayAvgSpeed?.toFixed(2) ?? '-'} km/h`,
							];
						},
						label: ctx => {
							const r = matchAverages[ctx.dataIndex];
							if (!r) return '';
							return ` Meeting avg: ${r.avgSpeed?.toFixed(2) ?? '-'} km/h`;
						},
						},
					},
				},
				scales: {
					x: { title: { display: true, text: 'Match Date' }, ticks: { maxTicksLimit: 12, maxRotation: 45 } },
					y: {
						title: { display: true, text: 'km/h' },
						suggestedMin: yMin,
					},
				},
			},
		} as ChartConfiguration<'line'>);
	});

	onDestroy(() => {
		chart?.destroy();
	});
</script>

<div style="position:relative; height:260px;">
	<canvas bind:this={canvas}></canvas>
</div>
