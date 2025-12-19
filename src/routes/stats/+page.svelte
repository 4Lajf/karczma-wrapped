<script>
	import { onMount } from 'svelte';
	import { toPng } from 'html-to-image';

	let stats = null;
	let loading = true;
	let statsContainer = $state(null);

	onMount(async () => {
		try {
			const res = await fetch('/global-stats-2025.json');
			stats = await res.json();
		} catch (e) {
			console.error(e);
		} finally {
			loading = false;
		}
	});

	function getMax(arr, key) {
		if (!arr) return 0;
		return Math.max(...arr.map((i) => (key ? i[key] : i)));
	}

	async function downloadScreenshot() {
		if (!statsContainer) return;
		try {
			const dataUrl = await toPng(statsContainer, {
				quality: 0.95,
				pixelRatio: 2,
				backgroundColor: '#171717' // Match neutral-900
			});

			const link = document.createElement('a');
			link.download = `karczma-stats-2025.png`;
			link.href = dataUrl;
			link.click();
		} catch (err) {
			console.error('Failed to take screenshot:', err);
		}
	}
</script>

<div class="min-h-screen bg-neutral-900 p-8 text-white">
	<div bind:this={statsContainer} class="mx-auto max-w-6xl space-y-12 bg-neutral-900">
		<header class="relative text-center">
			<button
				onclick={downloadScreenshot}
				class="absolute top-0 right-0 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-neutral-700 bg-neutral-800 shadow-lg transition-all hover:scale-110 active:scale-95 active:bg-neutral-700"
				title="Pobierz screenshot"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline
						points="7 10 12 15 17 10"
					/><line x1="12" x2="12" y1="3" y2="15" /></svg
				>
			</button>
			<h1
				class="bg-gradient-to-r from-yellow-400 to-red-500 bg-clip-text text-4xl font-bold text-transparent"
			>
				Karczma Stats 2025
			</h1>
			<p class="mt-2 text-neutral-400">Server-wide analytics & trends</p>

			{#if stats && stats.globalAverages}
				<div class="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
					<div class="rounded-lg bg-neutral-800 p-4">
						<div class="text-2xl font-bold text-yellow-400">{stats.guild.activeUsers}</div>
						<div class="text-xs text-neutral-500 uppercase">Active Users</div>
					</div>
					<div class="rounded-lg bg-neutral-800 p-4">
						<div class="text-2xl font-bold text-blue-400">
							{stats.guild.totalMessages.toLocaleString()}
						</div>
						<div class="text-xs text-neutral-500 uppercase">Total Messages</div>
					</div>
					<div class="rounded-lg bg-neutral-800 p-4">
						<div class="text-2xl font-bold text-purple-400">
							{Math.round(stats.globalAverages.avgMessageLength)}
						</div>
						<div class="text-xs text-neutral-500 uppercase">Avg Char Length</div>
					</div>
					<div class="rounded-lg bg-neutral-800 p-4">
						<div class="text-2xl font-bold text-green-400">
							{(stats.globalAverages.totalReactions / 1000).toFixed(1)}k
						</div>
						<div class="text-xs text-neutral-500 uppercase">Total Reactions</div>
					</div>
				</div>
			{/if}
		</header>

		{#if loading}
			<div class="py-20 text-center text-neutral-500">Loading metrics...</div>
		{:else if stats}
			<!-- HALL OF FAME -->
			{#if stats.hallOfFame}
				<section>
					<h2 class="mb-6 flex items-center justify-center gap-2 text-2xl font-bold text-yellow-500">
						<span>🏆</span> Hall of Fame
					</h2>
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{#each stats.hallOfFame as record}
							<div
								class="relative overflow-hidden rounded-xl border border-yellow-500/20 bg-neutral-800 p-6 text-center shadow-[0_0_15px_rgba(234,179,8,0.1)] transition-transform hover:scale-105"
							>
								<div class="absolute top-0 right-0 rounded-bl bg-yellow-500/10 px-2 py-1 text-xs text-yellow-500">
									Record Holder
								</div>
								<div class="mx-auto mb-4 h-20 w-20 overflow-hidden rounded-full border-2 border-yellow-500/50">
									{#if record.user.avatar}
										<img src={record.user.avatar} alt={record.user.name} class="h-full w-full object-cover" />
									{:else}
										<div class="flex h-full w-full items-center justify-center bg-neutral-700 text-2xl">
											{record.user.name[0]}
										</div>
									{/if}
								</div>
								<h3 class="text-lg font-bold text-white">{record.user.name}</h3>
								<div class="mb-1 text-sm font-medium text-yellow-400 uppercase tracking-widest">
									{record.title}
								</div>
								<div class="text-neutral-400">{record.value}</div>
							</div>
						{/each}
					</div>
				</section>
			{/if}

			<!-- TIMELINE -->
			<section class="rounded-xl border border-neutral-700 bg-neutral-800 p-6">
				<h2 class="mb-6 flex items-center gap-2 text-xl font-bold">
					<span>📈</span> Activity Timeline
				</h2>
				<div class="flex h-48 items-end gap-[1px]">
					{#each stats.timeline as day}
						<div
							class="group relative flex-1 bg-yellow-500/50 transition-colors hover:bg-yellow-400"
							style="height: {(day.count / getMax(stats.timeline, 'count')) * 100}%"
						>
							<div
								class="absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded border border-neutral-600 bg-black p-1 text-xs whitespace-nowrap group-hover:block"
							>
								{day.day}: {day.count} msgs
							</div>
						</div>
					{/each}
				</div>
				<div class="mt-2 flex justify-between text-xs text-neutral-500">
					<span>Jan</span><span>Dec</span>
				</div>
			</section>

			<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
				<!-- HOURLY HEATMAP -->
				<section class="rounded-xl border border-neutral-700 bg-neutral-800 p-6">
					<h2 class="mb-6 text-xl font-bold">🕒 Most Active Hours</h2>
					<div class="flex h-40 items-end justify-between gap-1">
						{#each stats.hourlyHeatmap as count, i}
							<div class="group flex flex-1 flex-col items-center gap-1">
								<div
									class="w-full rounded-t bg-blue-500/60 transition-all group-hover:bg-blue-400"
									style="height: {(count / Math.max(...stats.hourlyHeatmap)) * 100}%"
								></div>
								<span class="text-[10px] text-neutral-500">{i}</span>
							</div>
						{/each}
					</div>
				</section>

				<!-- WEEKLY HEATMAP -->
				<section class="rounded-xl border border-neutral-700 bg-neutral-800 p-6">
					<h2 class="mb-6 text-xl font-bold">📅 Weekly Rhythm</h2>
					<div class="flex h-40 items-end justify-between gap-2">
						{#each ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as day, i}
							<div class="flex flex-1 flex-col items-center gap-1">
								<div
									class="w-full rounded-t bg-green-500/60"
									style="height: {(stats.weeklyHeatmap[i] / Math.max(...stats.weeklyHeatmap)) *
										100}%"
								></div>
								<span class="text-xs text-neutral-500">{day}</span>
							</div>
						{/each}
					</div>
				</section>

				<!-- INTERACTION NETWORK -->
				{#if stats.interactionNetwork}
					<section class="rounded-xl border border-neutral-700 bg-neutral-800 p-6">
						<h2 class="mb-6 text-xl font-bold">🤝 Top Interactions</h2>
						<div class="grid gap-4 sm:grid-cols-2">
							{#each stats.interactionNetwork as pair, i}
								<div class="flex items-center justify-between rounded-lg bg-neutral-700/30 p-3">
									<div class="flex items-center gap-3">
										<div class="flex -space-x-2">
											<img
												src={pair.user1.avatar}
												alt={pair.user1.name}
												class="h-8 w-8 rounded-full border border-neutral-800 bg-neutral-700"
											/>
											<img
												src={pair.user2.avatar}
												alt={pair.user2.name}
												class="h-8 w-8 rounded-full border border-neutral-800 bg-neutral-700"
											/>
										</div>
										<div class="text-sm">
											<span class="font-medium text-neutral-300">{pair.user1.name}</span>
											<span class="mx-1 text-neutral-500">&</span>
											<span class="font-medium text-neutral-300">{pair.user2.name}</span>
										</div>
									</div>
									<div class="rounded bg-neutral-700 px-2 py-0.5 text-xs font-mono text-neutral-300">
										{pair.count}
									</div>
								</div>
							{/each}
						</div>
					</section>
			</div>

			<!-- TOP CHANNELS & ROLES -->
			<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
				<section class="rounded-xl border border-neutral-700 bg-neutral-800 p-6">
					<h2 class="mb-6 text-xl font-bold">📢 Top Channels</h2>
					<div class="space-y-3">
						{#each stats.channels.channels.slice(0, 10) as channel}
							<div class="group">
								<div class="mb-1 flex justify-between text-sm">
									<span class="font-medium text-neutral-300">#{channel.name}</span>
									<span class="text-neutral-500">{channel.count.toLocaleString()}</span>
								</div>
								<div class="h-2 overflow-hidden rounded-full bg-neutral-700">
									<div
										class="h-full rounded-full bg-purple-500"
										style="width: {(channel.count / stats.channels.channels[0].count) * 100}%"
									></div>
								</div>
							</div>
						{/each}
					</div>
				</section>

				{#if stats.roleDistribution}
					<section class="rounded-xl border border-neutral-700 bg-neutral-800 p-6">
						<h2 class="mb-6 text-xl font-bold">🎭 Role Distribution</h2>
						<div class="space-y-3">
							{#each stats.roleDistribution as role}
								<div class="flex items-center justify-between">
									<span class="text-sm text-neutral-300">{role.name}</span>
									<div class="flex items-center gap-3">
										<div class="h-1.5 w-24 rounded-full bg-neutral-700">
											<div
												class="h-full rounded-full bg-blue-500"
												style="width: {(role.count / stats.roleDistribution[0].count) * 100}%"
											></div>
										</div>
										<span class="w-8 text-right text-xs text-neutral-500">{role.count}</span>
									</div>
								</div>
							{/each}
						</div>
					</section>
				{/if}
			</div>

			<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
				<!-- CONTENT TYPES -->
				<section class="rounded-xl border border-neutral-700 bg-neutral-800 p-6">
					<h2 class="mb-6 text-xl font-bold">🖼️ Content Breakdown</h2>
					<div class="space-y-4">
						{#each Object.entries(stats.attachments) as [type, count]}
							<div class="flex items-center gap-4">
								<div class="w-20 text-sm text-neutral-400 capitalize">{type}</div>
								<div class="h-3 flex-1 rounded-full bg-neutral-700">
									<div
										class="h-full rounded-full bg-pink-500"
										style="width: {(count /
											Object.values(stats.attachments).reduce((a, b) => a + b, 0)) *
											100}%"
									></div>
								</div>
								<div class="w-12 text-right text-sm">{count}</div>
							</div>
						{/each}
					</div>
				</section>

				<!-- LINK TYPES -->
				<section class="rounded-xl border border-neutral-700 bg-neutral-800 p-6">
					<h2 class="mb-6 text-xl font-bold">🔗 Most Shared Links</h2>
					<div class="grid grid-cols-2 gap-4">
						<div class="rounded-lg bg-neutral-700/50 p-4 text-center">
							<div class="text-2xl font-bold text-green-400">{stats.links.spotify}</div>
							<div class="mt-1 text-xs tracking-wider text-neutral-400 uppercase">Spotify</div>
						</div>
						<div class="rounded-lg bg-neutral-700/50 p-4 text-center">
							<div class="text-2xl font-bold text-red-400">{stats.links.youtube}</div>
							<div class="mt-1 text-xs tracking-wider text-neutral-400 uppercase">YouTube</div>
						</div>
						<div class="rounded-lg bg-neutral-700/50 p-4 text-center">
							<div class="text-2xl font-bold text-blue-400">{stats.links.twitter}</div>
							<div class="mt-1 text-xs tracking-wider text-neutral-400 uppercase">Twitter / X</div>
						</div>
						<div class="rounded-lg bg-neutral-700/50 p-4 text-center">
							<div class="text-2xl font-bold text-orange-400">{stats.links.pixiv}</div>
							<div class="mt-1 text-xs tracking-wider text-neutral-400 uppercase">Pixiv</div>
						</div>
					</div>
				</section>
			</div>

			<!-- EMOJIS -->
			{#if stats.emojis}
				<section class="rounded-xl border border-neutral-700 bg-neutral-800 p-6">
					<h2 class="mb-6 text-xl font-bold">😂 Top Emojis</h2>
					<div class="flex flex-wrap justify-center gap-2">
						{#each stats.emojis as emoji}
							<div
								class="flex items-center gap-1 rounded bg-neutral-700/30 px-2 py-1 text-xs text-neutral-400 transition-colors hover:bg-neutral-700"
								title="{emoji.count} uses"
							>
								<span class="text-base text-white">{emoji.name}</span>
								<span class="opacity-60">{emoji.count}</span>
							</div>
						{/each}
					</div>
				</section>
			{/if}

			<!-- WORD CLOUD (SIMPLE LIST) -->
			<section class="rounded-xl border border-neutral-700 bg-neutral-800 p-6">
				<h2 class="mb-6 text-xl font-bold">💬 Top Words</h2>
				<div class="flex flex-wrap justify-center gap-2">
					{#each stats.wordCloud as word}
						<span
							class="rounded bg-neutral-700/50 px-2 py-1 text-neutral-300"
							style="font-size: {Math.max(
								0.8,
								Math.min(2, (word.value / stats.wordCloud[0].value) * 3)
							)}rem; opacity: {Math.max(0.4, word.value / stats.wordCloud[0].value)}"
						>
							{word.text}
						</span>
					{/each}
				</div>
			</section>
		{/if}
	</div>
</div>
