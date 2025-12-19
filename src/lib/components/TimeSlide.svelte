<script>
	let { user } = $props();
	let showTooltip = $state({});

	const maxHour = $derived(Math.max(...user.metrics.hourlyDistribution));
	// Normalize for height, min 5%
	const bars = $derived(
		user.metrics.hourlyDistribution.map((h) => (maxHour ? Math.max(5, (h / maxHour) * 100) : 0))
	);

	const maxMonth = $derived(Math.max(...user.metrics.monthlyDistribution));
	const monthBars = $derived(
		user.metrics.monthlyDistribution.map((m) => (maxMonth ? Math.max(5, (m / maxMonth) * 100) : 0))
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
	class="flex h-full flex-col items-center justify-center border-4 border-black bg-chart-4 p-4 text-foreground shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
>
	<div
		class="relative mb-4 rotate-1 transform border-4 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
	>
		<button
			class="absolute top-2 right-2 z-20 h-5 w-5 rounded-full border-2 border-black bg-gray-100 text-[10px] font-bold transition-colors hover:bg-black hover:text-white"
			onmouseenter={() => showTooltipOnHover('chronotype')}
			onmouseleave={() => hideTooltip('chronotype')}
			onclick={() => toggleTooltip('chronotype')}
			type="button">?</button
		>
		{#if showTooltip['chronotype']}
			<div
				class="absolute right-2 bottom-full z-30 mb-2 w-44 rounded-lg border-2 border-black bg-black p-2 text-xs font-bold text-white shadow-lg"
			>
				Twój typ aktywności oparty na godzinach, w których najczęściej piszesz.
			</div>
		{/if}
		<p class="mb-1 text-center text-xs font-bold tracking-widest text-muted-foreground uppercase">
			Twój chronotyp
		</p>
		<h2 class="text-center text-4xl font-black text-primary uppercase">{user.metrics.persona}</h2>
	</div>

	<!-- Hourly Chart -->
	<div class="relative mb-6 flex w-full max-w-md flex-col items-center pt-2">
		<button
			class="absolute top-0 right-0 z-20 h-5 w-5 rounded-full border-2 border-black bg-white/40 text-[10px] font-bold text-black transition-colors hover:bg-black hover:text-white"
			onmouseenter={() => showTooltipOnHover('hourly')}
			onmouseleave={() => hideTooltip('hourly')}
			onclick={() => toggleTooltip('hourly')}
			type="button">?</button
		>
		{#if showTooltip['hourly']}
			<div
				class="absolute top-full right-0 z-30 mt-2 w-44 rounded-lg border-2 border-black bg-black p-2 text-xs font-bold text-white shadow-lg"
			>
				Rozkład wiadomości według godziny. Najedź na słupek, aby zobaczyć dokładną liczbę.
			</div>
		{/if}
		<p class="mb-2 text-xs font-bold tracking-widest uppercase">Aktywność godzinowa</p>
		<div
			class="flex h-28 w-full items-end justify-between gap-[2px] border-b-4 border-black bg-white/50 p-2"
		>
			{#each bars as h, i}
				<div
					class="group relative w-full cursor-pointer bg-black transition-colors hover:bg-accent"
					style="height: {h}%"
				>
					<!-- Tooltip -->
					<span
						class="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 border-2 border-black bg-white px-2 py-1 text-xs font-bold whitespace-nowrap text-black opacity-0 group-hover:opacity-100"
					>
						{i}:00 - {user.metrics.hourlyDistribution[i].toLocaleString()} msg
					</span>
				</div>
			{/each}
		</div>
		<div class="mt-1 flex w-full justify-between px-1 text-xs font-black uppercase">
			<span>00</span>
			<span>06</span>
			<span>12</span>
			<span>18</span>
			<span>23</span>
		</div>
	</div>

	<!-- Daily Chart -->
	<div class="relative w-full max-w-md pt-2">
		<button
			class="absolute top-0 right-0 z-20 h-5 w-5 rounded-full border-2 border-black bg-white/40 text-[10px] font-bold text-black transition-colors hover:bg-black hover:text-white"
			onmouseenter={() => showTooltipOnHover('daily')}
			onmouseleave={() => hideTooltip('daily')}
			onclick={() => toggleTooltip('daily')}
			type="button">?</button
		>
		{#if showTooltip['daily']}
			<div
				class="absolute top-full right-0 z-30 mt-2 w-44 rounded-lg border-2 border-black bg-black p-2 text-xs font-bold text-white shadow-lg"
			>
				Rozkład wiadomości według dnia tygodnia.
			</div>
		{/if}
		<p class="mb-2 text-center text-xs font-bold tracking-widest uppercase">Dni tygodnia</p>
		<div class="grid grid-cols-7 gap-2">
			{#each user.metrics.dailyDistribution as d, i}
				<div class="group flex flex-col items-center">
					<div
						class="relative flex h-16 w-full cursor-pointer items-end border-2 border-black bg-white"
					>
						<div
							class="w-full border-t-2 border-black bg-chart-5 transition-colors group-hover:bg-accent"
							style="height: {Math.max(...user.metrics.dailyDistribution)
								? (d / Math.max(...user.metrics.dailyDistribution)) * 100
								: 0}%"
						></div>
						<span
							class="absolute -top-6 left-1/2 z-10 -translate-x-1/2 bg-black px-1 text-[10px] font-bold whitespace-nowrap text-white opacity-0 group-hover:opacity-100"
						>
							{d.toLocaleString()}
						</span>
					</div>
					<span class="mt-1 text-[10px] font-black"
						>{['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So'][i]}</span
					>
				</div>
			{/each}
		</div>
	</div>

	<!-- Monthly Chart -->
	<div class="relative w-full max-w-md pt-2">
		<button
			class="absolute top-0 right-0 z-20 h-5 w-5 rounded-full border-2 border-black bg-white/40 text-[10px] font-bold text-black transition-colors hover:bg-black hover:text-white"
			onmouseenter={() => showTooltipOnHover('monthly')}
			onmouseleave={() => hideTooltip('monthly')}
			onclick={() => toggleTooltip('monthly')}
			type="button">?</button
		>
		{#if showTooltip['monthly']}
			<div
				class="absolute bottom-full right-0 z-30 mb-2 w-44 rounded-lg border-2 border-black bg-black p-2 text-xs font-bold text-white shadow-lg"
			>
				Twoja aktywność w poszczególnych miesiącach roku.
			</div>
		{/if}
		<p class="mb-2 text-center text-xs font-bold tracking-widest uppercase">Aktywność miesięczna</p>
		<div class="grid grid-cols-12 gap-1 h-12 items-end border-b-2 border-black bg-white/30 px-1 pb-1">
			{#each monthBars as m, i}
				<div class="group relative flex h-full w-full flex-col justify-end">
					<div 
						class="w-full bg-chart-1 border-x border-t border-black/20 group-hover:bg-accent transition-colors" 
						style="height: {m}%"
					></div>
					<span class="absolute -top-6 left-1/2 -translate-x-1/2 bg-black px-1 text-[8px] font-bold text-white opacity-0 group-hover:opacity-100 whitespace-nowrap z-50">
						{user.metrics.monthlyDistribution[i]}
					</span>
				</div>
			{/each}
		</div>
		<div class="mt-1 flex w-full justify-between px-0.5 text-[8px] font-black uppercase opacity-60">
			<span>STY</span>
			<span>GRU</span>
		</div>
	</div>
</div>
