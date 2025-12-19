<script>
	let { user } = $props();
	let showTooltip = $state({});

	const isNumberOne = $derived(user.metrics.rank === 1);

	// Calculate precise percentile and top percentage (derived)
	const precisePercentile = $derived(user.metrics.percentile.toFixed(1));
	const topPercent = $derived((100 - user.metrics.percentile).toFixed(1));
	const avgDaily = $derived(
		user.metrics.activeDays > 0
			? (user.metrics.totalMessages / user.metrics.activeDays).toFixed(1)
			: 0
	);

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
	class="flex h-full flex-col items-center justify-center border-4 border-black bg-secondary p-6 text-secondary-foreground shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
>
	<h2 class="mb-8 w-full border-b-4 border-black pb-2 text-center text-3xl font-black uppercase">
		Twoja Aktywność
	</h2>

	<div class="grid w-full max-w-md grid-cols-2 gap-6">
		<div
			class="group relative col-span-2 border-4 border-black bg-white p-6 text-center text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
		>
			<button
				class="absolute top-2 right-2 z-20 h-6 w-6 rounded-full border-2 border-black bg-gray-100 text-xs font-bold transition-colors hover:bg-black hover:text-white"
				onmouseenter={() => showTooltipOnHover('percentile')}
				onmouseleave={() => hideTooltip('percentile')}
				onclick={() => toggleTooltip('percentile')}
				type="button">?</button
			>
			{#if showTooltip['percentile']}
				<div
					class="absolute right-2 bottom-full z-30 mb-2 w-40 rounded-lg border-2 border-black bg-black p-2 text-xs font-bold text-white shadow-lg"
				>
					{#if isNumberOne}
						Jesteś najbardziej aktywną osobą na całym serwerze!
					{:else}
						Jesteś w top {topPercent}% najbardziej aktywnych użytkowników serwera!
					{/if}
				</div>
			{/if}
			{#if isNumberOne}
				<p class="text-6xl font-black text-primary">#1</p>
				<p class="inline-block rotate-1 bg-primary px-2 text-lg font-bold text-primary-foreground">
					LEGENDA
				</p>
			{:else}
				<p class="text-6xl font-black text-primary">Top {topPercent}%</p>
				<p class="text-lg font-bold">Jesteś w topce serwera!</p>
			{/if}
			<p class="mt-2 text-sm text-muted-foreground">
				{#if isNumberOne}
					Największy/-a spamer/-ka w 2025 roku!
				{:else}
					Jesteś w top {topPercent}% najbardziej aktywnych użytkowników
				{/if}
			</p>
		</div>

		<div
			class="group relative -rotate-1 transform border-4 border-black bg-accent p-4 text-center text-accent-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
		>
			<button
				class="absolute top-1 right-1 z-20 h-5 w-5 rounded-full border-2 border-black bg-white/40 text-[10px] font-bold text-black transition-colors hover:bg-black hover:text-white"
				onmouseenter={() => showTooltipOnHover('activeDays')}
				onmouseleave={() => hideTooltip('activeDays')}
				onclick={() => toggleTooltip('activeDays')}
				type="button">?</button
			>
			{#if showTooltip['activeDays']}
				<div
					class="absolute right-1 bottom-full z-30 mb-2 w-40 rounded-lg border-2 border-black bg-black p-2 text-xs font-bold text-white shadow-lg"
				>
					Liczba unikalnych dni w roku, w których wysłałeś/-aś przynajmniej jedną wiadomość.
				</div>
			{/if}
			<p class="text-4xl font-black">{user.metrics.activeDays}</p>
			<p class="mt-1 text-xs font-bold uppercase">Aktywne dni</p>
		</div>

		<div
			class="group relative rotate-1 transform border-4 border-black bg-chart-1 p-4 text-center text-primary-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
		>
			<button
				class="absolute top-1 right-1 z-20 h-5 w-5 rounded-full border-2 border-black bg-white/40 text-[10px] font-bold text-black transition-colors hover:bg-black hover:text-white"
				onmouseenter={() => showTooltipOnHover('avgDaily')}
				onmouseleave={() => hideTooltip('avgDaily')}
				onclick={() => toggleTooltip('avgDaily')}
				type="button">?</button
			>
			{#if showTooltip['avgDaily']}
				<div
					class="absolute right-1 bottom-full z-30 mb-2 w-40 rounded-lg border-2 border-black bg-black p-2 text-xs font-bold text-white shadow-lg"
				>
					Średnia liczba wiadomości na aktywny dzień (dni kiedy cokolwiek napisałeś/-aś).
				</div>
			{/if}
			<p class="text-4xl font-black">{avgDaily}</p>
			<p class="mt-1 text-xs font-bold uppercase">Śr. dziennie</p>
		</div>
	</div>
</div>
