<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { toPng } from 'html-to-image';

	const MONTHS = [
		'',
		'Styczeń',
		'Luty',
		'Marzec',
		'Kwiecień',
		'Maj',
		'Czerwiec',
		'Lipiec',
		'Sierpień',
		'Wrzesień',
		'Październik',
		'Listopad',
		'Grudzień'
	];

	let data = $state(null);
	let loading = $state(true);
	let selectedMonth = $state(null);
	let viewMode = $state('month'); // 'month' or 'year'
	let posterContainer = $state(null);

	onMount(async () => {
		try {
			const res = await fetch('/monthly-top-2025.json');
			data = await res.json();
			if (data && data.users) {
				const availableMonths = Object.keys(data.users)
					.map(Number)
					.filter((m) => data.users[m] && data.users[m].length > 0)
					.sort((a, b) => a - b);
				if (availableMonths.length > 0) {
					selectedMonth = availableMonths[availableMonths.length - 1]; // Latest month
				}
			}
		} catch (e) {
			console.error('Failed to load monthly top stats:', e);
		} finally {
			loading = false;
		}
	});

	async function downloadScreenshot() {
		if (!posterContainer) return;
		try {
			const dataUrl = await toPng(posterContainer, {
				quality: 0.95,
				pixelRatio: 2,
				backgroundColor: '#ffffff'
			});

			const link = document.createElement('a');
			const fileName =
				viewMode === 'month'
					? `monthly-top-${MONTHS[selectedMonth]}-2025.png`
					: `yearly-top-2025.png`;
			link.download = fileName;
			link.href = dataUrl;
			link.click();
		} catch (err) {
			console.error('Failed to take screenshot:', err);
		}
	}
</script>

<svelte:head>
	<title>TOP 10 Miesięczne - {data ? data.meta.year : '2025'}</title>
</svelte:head>

<div class="min-h-screen bg-background p-4 font-sans text-foreground md:p-8">
	<!-- Controls (Not included in screenshot) -->
	<div
		class="mx-auto mb-8 flex max-w-6xl flex-wrap items-center justify-between gap-4 border-4 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
	>
		<div class="flex gap-2">
			<button
				onclick={() => (viewMode = 'month')}
				class="border-2 border-black px-4 py-2 font-black uppercase transition-all {viewMode ===
				'month'
					? 'bg-black text-white'
					: 'bg-white hover:bg-gray-100'}"
			>
				Widok Miesiąca
			</button>
			<button
				onclick={() => (viewMode = 'year')}
				class="border-2 border-black px-4 py-2 font-black uppercase transition-all {viewMode ===
				'year'
					? 'bg-black text-white'
					: 'bg-white hover:bg-gray-100'}"
			>
				Plakat Roczny
			</button>
		</div>

		<div class="flex items-center gap-4">
			{#if viewMode === 'month'}
				<select
					bind:value={selectedMonth}
					class="border-2 border-black bg-white px-3 py-2 font-bold uppercase outline-none"
				>
					{#each Array.from({ length: 12 }, (_, i) => i + 1) as month}
						<option value={month} disabled={!data?.users[month]?.length}>
							{MONTHS[month]}
						</option>
					{/each}
				</select>
			{/if}

			<button
				onclick={downloadScreenshot}
				class="flex items-center gap-2 border-4 border-black bg-primary px-6 py-2 font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:scale-105 active:translate-x-1 active:translate-y-1 active:shadow-none"
			>
				📸 Pobierz Screen
			</button>
		</div>
	</div>

	<!-- Screenshot Container -->
	<div bind:this={posterContainer} class="mx-auto max-w-6xl bg-white p-8">
		{#if loading}
			<div class="flex h-[60vh] flex-col items-center justify-center gap-4">
				<div
					class="h-16 w-16 animate-spin rounded-full border-8 border-black border-t-transparent"
				></div>
				<p class="text-xl font-black uppercase">Obliczanie...</p>
			</div>
		{:else if data}
			<header
				class="mb-8 border-4 border-black bg-primary p-6 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
			>
				<h1 class="text-4xl font-black uppercase tracking-tighter md:text-6xl">
					{#if viewMode === 'month'}
						TOP 10: {MONTHS[selectedMonth]}
					{:else}
						TOP 10: ROK {data.meta.year}
					{/if}
				</h1>
				<div
					class="mt-2 inline-block border-2 border-black bg-white px-3 py-1 text-xl font-black"
				>
					{data.meta.year} • FANTASTYCZNA KARCZMA
				</div>
			</header>

			{#if viewMode === 'month'}
				<!-- Compact Side-by-Side Monthly View -->
				<div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
					<!-- Users Column -->
					<div class="space-y-4">
						<h2 class="inline-block border-b-4 border-black pb-1 text-2xl font-black uppercase">
							👥 Top Użytkownicy
						</h2>
						{#each data.users[selectedMonth] as user, i}
							<div
								class="flex items-center gap-3 border-2 border-black bg-white p-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
							>
								<div
									class="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-black bg-primary font-black"
								>
									{i + 1}
								</div>
								{#if user.avatar}
									<img
										src={user.avatar}
										alt=""
										class="h-10 w-10 border-2 border-black object-cover"
									/>
								{:else}
									<div
										class="flex h-10 w-10 border-2 border-black bg-gray-200 text-center leading-10 font-black"
									>
										{user.name[0]}
									</div>
								{/if}
								<div class="min-w-0 flex-1">
									<div class="truncate text-sm font-black uppercase leading-tight">
										{user.name}
									</div>
									<div class="text-[10px] font-bold text-gray-500">
										{user.count.toLocaleString()} msg
									</div>
								</div>
								<div class="h-2 w-24 overflow-hidden border border-black bg-gray-100">
									<div
										class="h-full bg-primary"
										style="width: {(user.count / data.users[selectedMonth][0].count) * 100}%"
									></div>
								</div>
							</div>
						{/each}
					</div>

					<!-- Channels Column -->
					<div class="space-y-4">
						<h2 class="inline-block border-b-4 border-black pb-1 text-2xl font-black uppercase">
							📢 Top Kanały
						</h2>
						{#each data.channels[selectedMonth] as channel, i}
							<div
								class="flex items-center gap-3 border-2 border-black bg-white p-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
							>
								<div
									class="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-black bg-accent font-black"
								>
									{i + 1}
								</div>
								<div class="min-w-0 flex-1">
									<div class="truncate text-sm font-black uppercase leading-tight">
										#{channel.name}
									</div>
									<div class="truncate text-[10px] font-bold text-gray-500">
										{channel.count.toLocaleString()} msg
									</div>
								</div>
								<div class="h-2 w-24 overflow-hidden border border-black bg-gray-100">
									<div
										class="h-full bg-accent"
										style="width: {(channel.count / data.channels[selectedMonth][0].count) * 100}%"
									></div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{:else}
				<!-- Yearly Poster View (3x4 Grid) -->
				<div class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
					{#each Array.from({ length: 12 }, (_, i) => i + 1) as month}
						{@const monthUsers = data.users[month] || []}
						{@const monthChannels = data.channels[month] || []}
						<div
							class="border-4 border-black bg-white p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
						>
							<h3 class="mb-2 border-b-2 border-black text-center text-lg font-black uppercase">
								{MONTHS[month]}
							</h3>

							<div class="mb-2">
								<div class="text-xs font-black uppercase text-primary mb-1">Top 10 Użytkownicy</div>
								{#each monthUsers.slice(0, 10) as user, i}
									<div class="flex items-center gap-1.5 text-xs font-bold uppercase leading-snug">
										<span class="text-gray-400 shrink-0">#{i + 1}</span>
										{#if user.avatar}
											<img
												src={user.avatar}
												alt=""
												class="h-5 w-5 shrink-0 border border-black object-cover"
											/>
										{:else}
											<div
												class="flex h-5 w-5 shrink-0 items-center justify-center border border-black bg-gray-200 text-[8px] font-black"
											>
												{user.name[0]}
											</div>
										{/if}
										<span class="truncate min-w-0">{user.name}</span>
										<span class="ml-auto font-mono text-[10px] shrink-0">{user.count}</span>
									</div>
								{/each}
							</div>

							<div>
								<div class="text-xs font-black uppercase text-accent mb-1">Top 10 Kanały</div>
								{#each monthChannels.slice(0, 10) as channel, i}
									<div class="flex items-center gap-1.5 text-xs font-bold uppercase leading-snug">
										<span class="text-gray-400 shrink-0">#{i + 1}</span>
										<span class="truncate min-w-0">#{channel.name}</span>
										<span class="ml-auto font-mono text-[10px] shrink-0">{channel.count}</span>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{/if}

			<footer
				class="mt-8 border-t-4 border-black pt-4 text-center text-[10px] font-bold text-gray-400 uppercase"
			>
				Wygenerowano dnia {new Date(data.meta.generatedAt).toLocaleDateString()} • Karczma Wrapped
			</footer>
		{/if}
	</div>
</div>

<style>
	:global(body) {
		background-color: #f0f0f0;
	}
	@media print {
		.no-print {
			display: none;
		}
	}
</style>
