<script>
	let { user } = $props();
</script>

<div
	class="flex h-full flex-col items-center justify-center border-4 border-black bg-chart-5 p-6 text-foreground shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
>
	<h2
		class="mb-4 border-4 border-black bg-white px-6 py-2 text-3xl font-black tracking-tight uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
	>
		Twoje Rewiry
	</h2>

	<!-- Scroll indicator -->
	<div
		class="mb-2 flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase opacity-70"
	>
		<span>↓</span>
		<span>Przewiń aby zobaczyć więcej</span>
		<span>↓</span>
	</div>

	<div
		class="custom-scrollbar max-h-[60vh] w-full max-w-md flex-1 space-y-4 overflow-y-auto pr-2 pb-4"
	>
		{#each user.metrics.topChannels as channel, i}
			<div
				class="flex items-center justify-between border-4 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:scale-[1.02] {i %
					2 ===
				0
					? 'rotate-1 transform'
					: '-rotate-1 transform'}"
			>
				<div class="flex min-w-0 flex-1 flex-col">
					<span
						class="mb-1 self-start bg-black px-1 text-xs font-black tracking-widest text-white uppercase"
						>Rank #{i + 1}</span
					>
					<span class="truncate text-xl font-black text-primary">#{channel.name}</span>
				</div>
				<div class="shrink-0 border-l-4 border-black pl-4 text-right">
					<span class="block text-3xl leading-none font-black">{channel.percentage}%</span>
					<span class="text-[10px] font-bold text-muted-foreground uppercase"
						>{channel.count.toLocaleString()} wiadomości</span
					>
				</div>
			</div>
		{/each}

		{#if user.metrics.topChannels.length === 0}
			<div class="rotate-2 transform border-4 border-black bg-white p-6 text-center">
				<p class="text-xl font-bold">Gdzie Ty w ogóle piszesz?</p>
				<p class="text-sm">(Brak danych o kanałach)</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.custom-scrollbar::-webkit-scrollbar {
		width: 8px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: #fff;
		border: 2px solid #000;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: #000;
	}
</style>
