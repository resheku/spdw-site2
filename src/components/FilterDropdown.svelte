<script lang="ts">
	/**
	 * Reusable multi-select filter dropdown used across all pages.
	 *
	 * Props:
	 *   id          – unique DOM prefix (e.g. "season", "league")
	 *   label       – default button label when nothing is selected (e.g. "Seasons")
	 *   options     – full list of { value, label } items to show
	 *   selected    – currently selected values (bind)
	 *   disabledValues – values that exist but are greyed-out / not selectable
	 *   isOpen      – controlled open state (bind); parent manages mutual exclusion
	 *   minWidth    – optional CSS min-width, default "140px"
	 */

	export let id: string;
	export let label: string;
	export let options: Array<{ value: string; label: string }> = [];
	export let selected: string[] = [];
	export let disabledValues: string[] = [];
	export let isOpen = false;
	export let minWidth = '140px';

	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher<{ change: string[] }>();

	$: buttonLabel =
		selected.length === 0
			? label
			: selected.length === 1
				? (options.find(o => o.value === selected[0])?.label ?? selected[0])
				: `${label} (${selected.length})`;

	function toggle(value: string) {
		if (disabledValues.includes(value)) return;
		selected = selected.includes(value)
			? selected.filter(v => v !== value)
			: [...selected, value];
		dispatch('change', selected);
	}

	function selectOnly(value: string) {
		if (disabledValues.includes(value)) return;
		selected = [value];
		isOpen = false;
		dispatch('change', selected);
	}

	function clear() {
		selected = [];
		dispatch('change', selected);
	}
</script>

<div class="relative" style="min-width: {minWidth}">
	<button
		on:click|stopPropagation={() => (isOpen = !isOpen)}
		class="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm text-left flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-muted"
	>
		<span>{buttonLabel}</span>
		<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>

	{#if isOpen}
		<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
		<div
			on:click|stopPropagation={() => {}}
			class="absolute z-50 mt-1 w-full max-h-[70vh] overflow-y-auto rounded-md border border-border bg-background shadow-lg"
		>
			<div class="sticky top-0 bg-background border-b border-border p-2">
				<button
					class="text-sm px-3 py-2 rounded bg-red-500/10 text-red-600 hover:bg-red-500/20 hover:text-red-700 active:bg-red-500/30 disabled:bg-muted/50 disabled:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-150 w-full font-medium cursor-pointer"
					disabled={selected.length === 0}
					on:click={clear}
				>Clear Filter</button>
			</div>
			<div class="p-2">
				{#each options as opt}
					{@const isDisabled = disabledValues.includes(opt.value)}
					<div
						class="flex items-center gap-2 py-1 rounded px-1 {isDisabled ? 'opacity-40' : 'hover:bg-muted/50'}"
					>
						<input
							type="checkbox"
							id="{id}-{opt.value}"
							checked={selected.includes(opt.value)}
							disabled={isDisabled}
							class="{isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}"
							on:change={() => toggle(opt.value)}
						/>
						<button
							class="flex-1 text-sm text-left {isDisabled ? 'cursor-not-allowed' : 'hover:underline cursor-pointer'}"
							disabled={isDisabled}
							on:click={() => selectOnly(opt.value)}
						>{opt.label}</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
