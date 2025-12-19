<script>
	import { fly } from 'svelte/transition';
	let { user } = $props();
</script>

<div
	class="flex h-full flex-col items-center justify-center border-4 border-black bg-accent p-6 text-accent-foreground shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
>
	<h2
		class="mb-4 w-full border-b-4 border-black pb-4 text-center text-3xl font-black tracking-tight uppercase"
	>
		Twoje Ordery
	</h2>

	<div
		class="custom-scrollbar grid max-h-[65vh] w-full max-w-md grid-cols-1 gap-3 overflow-y-auto p-2"
	>
		{#each user.metrics.badges as badge, i}
			<div
				in:fly={{ y: 50, duration: 400, delay: i * 50 }}
				class="relative flex flex-col gap-2 border-4 border-black bg-white p-3 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform duration-300 {badge.achieved
					? 'opacity-100 hover:scale-[1.02] hover:-rotate-1'
					: 'opacity-90 grayscale-[0.5] hover:opacity-100 hover:grayscale-0'}"
			>
				{#if !badge.achieved}
					<div class="absolute top-2 right-2 z-10">
						<span class="text-xs font-bold text-gray-500">🔒</span>
					</div>
				{/if}

				<div class="flex items-start gap-3">
					<div class="shrink-0">
						<div
							class="flex h-10 w-10 items-center justify-center border-2 border-black {badge.achieved
								? 'bg-chart-1'
								: 'bg-gray-300'} text-lg font-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
						>
							{badge.label[0]}
						</div>
					</div>
					<div class="min-w-0 flex-1">
						<div class="flex items-start justify-between gap-2">
							<h3 class="text-base leading-tight font-black tracking-tight uppercase">
								{badge.label}
							</h3>
							{#if badge.achieved}
								<span
									class="shrink-0 border border-black bg-green-500 px-1.5 py-0.5 text-[10px] font-bold text-white uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
									>Zdobyte</span
								>
							{/if}
						</div>
						<p class="mt-0.5 text-[11px] leading-tight font-medium text-gray-600">
							{badge.description}
						</p>
					</div>
				</div>

				<!-- Progress Bar -->
				<div class="relative h-2.5 w-full overflow-hidden border-2 border-black bg-gray-200">
					<div
						class="h-full {badge.achieved
							? 'bg-chart-2'
							: 'bg-blue-400'} transition-all duration-1000 ease-out"
						style="width: {Math.min(100, (badge.progress / badge.threshold) * 100)}%"
					></div>
				</div>

				<div class="flex items-center justify-between text-[10px] font-bold uppercase">
					<span class="bg-black px-1 text-white">
						{#if badge.displayValue}
							{badge.displayValue}
						{:else}
							{typeof badge.progress === 'number' ? badge.progress.toFixed(1) : badge.progress} / {badge.threshold}
						{/if}
					</span>
					<span class="text-muted-foreground">{badge.globalPercentage || '0%'} karczmarzy</span>
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	.custom-scrollbar::-webkit-scrollbar {
		width: 8px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: #000;
		border-radius: 0;
	}
</style>
