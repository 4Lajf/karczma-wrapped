<script>
	let { user } = $props();
	let showTooltip = $state({});

	function toggleTooltip(key) {
		showTooltip[key] = !showTooltip[key];
	}

	function showTooltipOnHover(key) {
		showTooltip[key] = true;
	}

	function hideTooltip(key) {
		showTooltip[key] = false;
	}
</script>

<div
	class="flex h-full flex-col items-center justify-center border-4 border-black bg-chart-2 p-6 text-foreground shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
>
	<h2 class="mb-6 text-3xl font-black tracking-tight uppercase">Twoja Ekipa</h2>

	<div class="w-full max-w-md space-y-6">
		<!-- Top Mentions -->
		<div class="relative border-4 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
			<button
				class="absolute top-2 right-2 z-20 h-5 w-5 rounded-full border-2 border-black bg-gray-100 text-[10px] font-bold transition-colors hover:bg-black hover:text-white"
				onmouseenter={() => showTooltipOnHover('mentions')}
				onmouseleave={() => hideTooltip('mentions')}
				onclick={() => toggleTooltip('mentions')}
				type="button">?</button
			>
			{#if showTooltip['mentions']}
				<div
					class="absolute right-2 bottom-full z-30 mb-2 w-44 rounded-lg border-2 border-black bg-black p-2 text-xs font-bold text-white shadow-lg"
				>
					Osoby które najczęściej oznaczasz (@) w swoich wiadomościach.
				</div>
			{/if}
			<h3 class="mb-3 text-xs font-black tracking-widest text-muted-foreground uppercase">
				Kogo zaczepiasz
			</h3>
			<div class="space-y-3">
				{#each user.metrics.topMentions.slice(0, 3) as friend, i}
					<div
						class="flex items-center justify-between border-b-2 border-black pb-2 last:border-0 last:pb-0"
					>
						<div class="flex items-center gap-3">
							<div
								class="flex h-8 w-8 items-center justify-center rounded-full border-2 border-black bg-gray-200 text-xs font-bold"
							>
								{i + 1}
							</div>
							<span class="max-w-[140px] truncate font-bold">{friend.name}</span>
						</div>
						<span
							class="border-2 border-black bg-primary px-2 py-0.5 font-mono text-xs font-bold text-primary-foreground"
							>{friend.count.toLocaleString()}</span
						>
					</div>
				{/each}
				{#if user.metrics.topMentions.length === 0}
					<p class="py-4 text-center text-sm italic">Jesteś samotnym wilkiem (0 oznaczeń)</p>
				{/if}
			</div>
		</div>

		<!-- Top Mentioned By -->
		<div
			class="relative translate-x-2 rotate-1 transform border-4 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
		>
			<button
				class="absolute top-2 right-2 z-20 h-5 w-5 rounded-full border-2 border-black bg-gray-100 text-[10px] font-bold transition-colors hover:bg-black hover:text-white"
				onmouseenter={() => showTooltipOnHover('mentionedBy')}
				onmouseleave={() => hideTooltip('mentionedBy')}
				onclick={() => toggleTooltip('mentionedBy')}
				type="button">?</button
			>
			{#if showTooltip['mentionedBy']}
				<div
					class="absolute right-2 bottom-full z-30 mb-2 w-44 rounded-lg border-2 border-black bg-black p-2 text-xs font-bold text-white shadow-lg"
				>
					Osoby które najczęściej oznaczają Ciebie (@) w swoich wiadomościach.
				</div>
			{/if}
			<h3 class="mb-3 text-xs font-black tracking-widest text-muted-foreground uppercase">
				Twoi Fani
			</h3>
			<div class="space-y-3">
				{#each user.metrics.topMentionedBy.slice(0, 3) as fan, i}
					<div
						class="flex items-center justify-between border-b-2 border-black pb-2 last:border-0 last:pb-0"
					>
						<div class="flex items-center gap-3">
							<div
								class="flex h-8 w-8 items-center justify-center rounded-full border-2 border-black bg-gray-200 text-xs font-bold"
							>
								{i + 1}
							</div>
							<span class="max-w-[140px] truncate font-bold">{fan.name}</span>
						</div>
						<span
							class="border-2 border-black bg-accent px-2 py-0.5 font-mono text-xs font-bold text-accent-foreground"
							>{fan.count.toLocaleString()}</span
						>
					</div>
				{/each}
				{#if user.metrics.topMentionedBy.length === 0}
					<p class="py-4 text-center text-sm italic">Nikt Cię nie oznacza :(</p>
				{/if}
			</div>
		</div>
	</div>
</div>
