<script>
	import { onMount, tick } from 'svelte';
	import { toPng } from 'html-to-image';
	import { browser } from '$app/environment';
	import {
		Chart,
		LineController,
		LineElement,
		PointElement,
		LinearScale,
		Title,
		CategoryScale,
		BarController,
		BarElement,
		Tooltip,
		Legend,
		Filler,
		ArcElement,
		DoughnutController
	} from 'chart.js';

	Chart.register(
		LineController,
		LineElement,
		PointElement,
		LinearScale,
		Title,
		CategoryScale,
		BarController,
		BarElement,
		Tooltip,
		Legend,
		Filler,
		ArcElement,
		DoughnutController
	);

	const DAYS = ['Nie', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'];

	let stats = $state(null);
	let loading = $state(true);
	let statsContainer = $state(null);

	let timelineCanvas = $state(null);
	let hourlyCanvas = $state(null);
	let weeklyCanvas = $state(null);
	let timeOfDayCanvas = $state(null);
	let networkPage = $state(0);

	let charts = [];

	onMount(async () => {
		try {
			const res = await fetch('/global-stats-2025.json');
			stats = await res.json();
			console.log('Stats loaded:', !!stats);
		} catch (e) {
			console.error('Failed to load stats:', e);
		} finally {
			loading = false;
		}
	});

	$effect(() => {
		if (stats && !loading) {
			const snapshot = $state.snapshot(stats);
			tick().then(() => {
				setTimeout(() => initCharts(snapshot), 100); // Increased delay slightly
			});
		}
	});

	function initCharts(data) {
		if (!data || !browser) return;
		console.log('Initializing charts...');

		// Destroy existing charts to prevent duplication
		charts.forEach((c) => c.destroy());
		charts = [];

		// 1. Cartesian Options (Bar, Line)
		const cartesianOptions = {
			responsive: true,
			maintainAspectRatio: false,
			animation: false,
			layout: {
				padding: 10
			},
			plugins: {
				legend: { display: false },
				tooltip: {
					backgroundColor: '#000',
					titleFont: { weight: 'bold' },
					bodyFont: { weight: 'bold' },
					cornerRadius: 0,
					padding: 12,
					borderColor: '#fff',
					borderWidth: 2
				}
			},
			scales: {
				x: {
					grid: { display: false },
					border: { width: 4, color: '#000' },
					ticks: { font: { weight: 'bold', family: 'system-ui' }, color: '#000' }
				},
				y: {
					beginAtZero: true,
					grid: { color: 'rgba(0,0,0,0.1)', lineWidth: 2 },
					border: { width: 4, color: '#000' },
					ticks: { font: { weight: 'bold' }, color: '#000' }
				}
			}
		};

		// 2. Timeline Chart
		if (timelineCanvas) {
			console.log('Creating timeline chart');
			const c = new Chart(timelineCanvas, {
				type: 'line',
				data: {
					labels: data.timeline.map((d) => d.day),
					datasets: [
						{
							label: 'Wiadomości',
							data: data.timeline.map((d) => d.count),
							borderColor: '#000',
							borderWidth: 4,
							backgroundColor: '#FFD100',
							fill: true,
							tension: 0,
							pointRadius: 0,
							pointHoverRadius: 6,
							pointHoverBackgroundColor: '#fff',
							pointHoverBorderColor: '#000',
							pointHoverBorderWidth: 4
						}
					]
				},
				options: {
					...cartesianOptions,
					scales: {
						...cartesianOptions.scales,
						x: { ...cartesianOptions.scales.x, ticks: { display: false } }
					}
				}
			});
			charts.push(c);
		}

		// 3. Hourly Heatmap
		if (hourlyCanvas) {
			console.log('Creating hourly chart');
			const c = new Chart(hourlyCanvas, {
				type: 'bar',
				data: {
					labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
					datasets: [
						{
							label: 'Wiadomości',
							data: data.hourlyHeatmap,
							backgroundColor: '#FF60BB',
							borderColor: '#000',
							borderWidth: 3,
							borderRadius: 0
						}
					]
				},
				options: cartesianOptions
			});
			charts.push(c);
		}

		// 4. Weekly Rhythm
		if (weeklyCanvas) {
			console.log('Creating weekly chart');
			const c = new Chart(weeklyCanvas, {
				type: 'bar',
				data: {
					labels: DAYS,
					datasets: [
						{
							label: 'Wiadomości',
							data: data.weeklyHeatmap,
							backgroundColor: '#00E676',
							borderColor: '#000',
							borderWidth: 3,
							borderRadius: 0
						}
					]
				},
				options: cartesianOptions
			});
			charts.push(c);
		}

		// 5. Time of Day (Doughnut)
		if (timeOfDayCanvas) {
			console.log('Creating doughnut chart');
			const c = new Chart(timeOfDayCanvas, {
				type: 'doughnut',
				data: {
					labels: data.timeOfDay.map((p) => p.period),
					datasets: [
						{
							data: data.timeOfDay.map((p) => p.count),
							backgroundColor: ['#FFD100', '#FF60BB', '#00E676', '#000'],
							borderColor: '#000',
							borderWidth: 4,
							hoverOffset: 10
						}
					]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					animation: false,
					plugins: {
						legend: {
							display: true,
							position: 'bottom',
							labels: { font: { weight: 'bold', size: 12 }, color: '#000', padding: 20 }
						},
						tooltip: {
							backgroundColor: '#000',
							titleFont: { weight: 'bold' },
							bodyFont: { weight: 'bold' },
							cornerRadius: 0,
							padding: 12,
							borderColor: '#fff',
							borderWidth: 2
						}
					}
				}
			});
			charts.push(c);
		}
	}

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
				backgroundColor: '#ffffff'
			});

			const link = document.createElement('a');
			link.download = `karczma-stats-${stats?.meta?.year || 2025}.png`;
			link.href = dataUrl;
			link.click();
		} catch (err) {
			console.error('Failed to take screenshot:', err);
		}
	}

	function renderContent(content) {
		if (!content) return '';
		return content
			.replace(/<a?:\w+:(\d+)>/g, () => '')
			.replace(/<@!?\d+>/g, '@użytkownik')
			.replace(/<@&\d+>/g, '@rola')
			.replace(/<#\d+>/g, '#kanał')
			.trim();
	}

	function getEmojiUrls(content) {
		if (!content) return [];
		const emojiRegex = /<a?:\w+:(\d+)>/g;
		const urls = [];
		let match;
		while ((match = emojiRegex.exec(content)) !== null) {
			urls.push(`https://cdn.discordapp.com/emojis/${match[1]}.png`);
		}
		return urls;
	}
</script>

<svelte:head>
	<title>Globalne Statystyki {stats ? stats.meta.year : '2025'}</title>
</svelte:head>

<div class="min-h-screen bg-background p-4 font-sans text-foreground md:p-8">
	<div bind:this={statsContainer} class="mx-auto max-w-6xl space-y-12 bg-white pb-12">
		{#if loading}
			<div class="flex h-[60vh] flex-col items-center justify-center gap-4">
				<div
					class="h-16 w-16 animate-spin rounded-full border-8 border-black border-t-transparent"
				></div>
				<p class="text-xl font-black uppercase">Obliczanie statystyk...</p>
			</div>
		{:else if stats}
			<header
				class="relative border-4 border-black bg-primary p-8 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
			>
				<button
					onclick={downloadScreenshot}
					class="absolute top-4 right-4 z-20 flex h-12 w-12 items-center justify-center border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:scale-110 active:translate-x-1 active:translate-y-1 active:shadow-none"
					title="Pobierz screenshot"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="3"
						stroke-linecap="round"
						stroke-linejoin="round"
						><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline
							points="7 10 12 15 17 10"
						/><line x1="12" x2="12" y1="3" y2="15" /></svg
					>
				</button>

				<h1 class="mb-2 text-5xl font-black tracking-tighter uppercase md:text-7xl">
					{stats.guild.name}
				</h1>
				<div
					class="inline-block border-2 border-black bg-white px-4 py-1 text-2xl font-black uppercase"
				>
					Globalne Statystyki {stats.meta.year}
				</div>

				<div class="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
					<div class="border-4 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
						<div class="text-3xl font-black">
							{Math.round((stats.guild.timeSpentTypingMinutes || 0) / 60).toLocaleString()}h
						</div>
						<div class="text-xs font-bold text-gray-500 uppercase">Czas Pisania</div>
					</div>
					<div class="border-4 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
						<div class="text-3xl font-black">{stats.guild.totalMessages.toLocaleString()}</div>
						<div class="text-xs font-bold text-gray-500 uppercase">Wiadomości</div>
					</div>
					<div class="border-4 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
						<div class="text-3xl font-black">
							{stats.guild.totalWords ? (stats.guild.totalWords / 1000).toFixed(0) + 'k' : '0'}
						</div>
						<div class="text-xs font-bold text-gray-500 uppercase">Wysłanych Słów</div>
					</div>
					<div class="border-4 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
						<div class="text-3xl font-black">
							{(stats.globalAverages.totalReactions / 1000).toFixed(1)}k
						</div>
						<div class="text-xs font-bold text-gray-500 uppercase">Reakcji</div>
					</div>
				</div>
			</header>

			<!-- HALL OF FAME -->
			<section>
				<h2
					class="mb-2 inline-block border-4 border-black bg-accent px-6 py-2 text-3xl font-black uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
				>
					🏆 Hall of Fame
				</h2>
				<p class="mb-8 text-xs font-bold text-gray-500 uppercase">
					Jeden użytkownik może zdobyć tylko jedno wyróżnienie w tej sekcji.
				</p>
				<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{#each stats.hallOfFame as record}
						<div
							class="relative border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-1"
						>
							<div
								class="mx-auto mb-4 h-24 w-24 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
							>
								{#if record.user.avatar}
									<img
										src={record.user.avatar}
										alt={record.user.name}
										class="h-full w-full object-cover"
									/>
								{:else}
									<div
										class="flex h-full w-full items-center justify-center bg-gray-200 text-3xl font-black"
									>
										{record.user.name[0]}
									</div>
								{/if}
							</div>
							<h3 class="text-xl font-black uppercase">{record.user.name}</h3>
							<div
								class="my-2 inline-block border-2 border-black bg-primary px-2 py-0.5 text-xs font-black uppercase"
							>
								{record.title}
							</div>
							<div class="text-2xl font-black text-gray-600">{record.value}</div>
						</div>
					{/each}
				</div>
			</section>

			<!-- LEGENDARY UNANIMITY (MOST REACTED MESSAGES) -->
			<section>
				<h2
					class="mb-2 inline-block border-4 border-black bg-primary px-6 py-2 text-3xl font-black uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
				>
					🔥 NAJGORĘTSZE WIADOMOŚCI
				</h2>
				<p class="mb-8 text-xs font-bold text-gray-500 uppercase">
					Wiadomości, które otrzymały najwięcej reakcji jednego typu (w całym roku).
				</p>
				<div class="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
					{#each stats.mostReactedMessages as msg, i}
						<div
							class="flex flex-col border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-1"
						>
							<div class="mb-4 flex items-center gap-3">
								<div
									class="h-12 w-12 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
								>
									{#if msg.author.avatar}
										<img
											src={msg.author.avatar}
											alt={msg.author.name}
											class="h-full w-full object-cover"
										/>
									{:else}
										<div
											class="flex h-full w-full items-center justify-center bg-gray-200 text-xl font-black"
										>
											{msg.author.name[0]}
										</div>
									{/if}
								</div>
								<div>
									<div class="text-sm font-black uppercase">{msg.author.name}</div>
									<div class="text-[10px] font-bold text-gray-500 uppercase">Autor</div>
								</div>
							</div>

							<div class="flex-1">
								<p class="mb-4 text-sm italic leading-relaxed line-clamp-6 wrap-anywhere">
									"{renderContent(msg.content) || '(Tylko emoji/media)'}"
								</p>

								{#if !renderContent(msg.content)}
									<div class="mb-4 flex flex-wrap gap-1">
										{#each getEmojiUrls(msg.content) as url}
											<img src={url} alt="" class="h-8 w-8 object-contain" />
										{/each}
									</div>
								{/if}

								{#if msg.attachments && msg.attachments.length > 0}
									<div class="mb-4 flex flex-wrap gap-2">
										{#each msg.attachments as attr}
											{#if attr.type === 'image'}
												<img
													src={attr.url}
													alt=""
													class="max-h-48 w-full rounded border-2 border-black object-cover shadow-sm"
												/>
											{:else}
												<div
													class="flex items-center gap-1 border-2 border-black bg-gray-100 p-2 text-xs font-bold"
												>
													<span>📎</span> {attr.name}
												</div>
											{/if}
										{/each}
									</div>
								{/if}
							</div>

							<div class="mt-4 flex flex-wrap items-center gap-2">
								<div
									class="flex items-center gap-1.5 border-2 border-black bg-primary px-3 py-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
								>
									{#if msg.emoji_id}
										<img
											src="/emojis/{msg.emoji_id}.png"
											alt={msg.emoji_name}
											class="h-6 w-6 object-contain"
											onerror={(e) => {
												if (e.currentTarget.src.endsWith('.png')) {
													e.currentTarget.src = `/emojis/${msg.emoji_id}.gif`;
												}
											}}
										/>
									{:else}
										<span class="text-xl">{msg.emoji_name}</span>
									{/if}
									<span class="text-xl font-black">{msg.count}</span>
								</div>

								<div class="flex flex-wrap gap-1">
									{#each msg.reactions.filter((r) => r.emoji_name !== msg.emoji_name).slice(0, 3) as react}
										<div
											class="flex items-center gap-1 border border-black bg-gray-50 px-1.5 py-0.5 text-[10px] font-bold"
										>
											{#if react.emoji_id}
												<img
													src="/emojis/{react.emoji_id}.png"
													alt=""
													class="h-4 w-4 object-contain"
													onerror={(e) => {
														if (e.currentTarget.src.endsWith('.png')) {
															e.currentTarget.src = `/emojis/${react.emoji_id}.gif`;
														}
													}}
												/>
											{:else}
												<span>{react.emoji_name}</span>
											{/if}
											<span>{react.count}</span>
										</div>
									{/each}
								</div>
							</div>

							<a
								href={msg.link}
								target="_blank"
								class="mt-4 text-[10px] font-black text-blue-600 uppercase underline hover:text-blue-800"
							>
								Skocz do wiadomości &rarr;
							</a>
						</div>
					{/each}
				</div>
			</section>

			<!-- TIMELINE -->
			<section class="border-4 border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
				<h2 class="mb-8 text-3xl font-black uppercase italic">📈 Aktywność w ciągu roku</h2>
				<div class="h-64 w-full border-4 border-black bg-white">
					<canvas bind:this={timelineCanvas}></canvas>
				</div>
				<div class="mt-4 flex justify-between font-black uppercase">
					<span>Styczeń</span><span>Grudzień</span>
				</div>
			</section>

			<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
				<!-- HOURLY HEATMAP -->
				<section class="border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
					<h2 class="mb-6 text-2xl font-black uppercase">🕒 Godziny szczytu</h2>
					<div class="h-48 w-full border-4 border-black bg-white">
						<canvas bind:this={hourlyCanvas}></canvas>
					</div>
				</section>

				<!-- WEEKLY HEATMAP -->
				<section class="border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
					<h2 class="mb-6 text-2xl font-black uppercase">📅 Tygodniowy Rytm</h2>
					<div class="h-48 w-full border-4 border-black bg-white">
						<canvas bind:this={weeklyCanvas}></canvas>
					</div>
				</section>
			</div>

			<!-- INTERACTION NETWORK -->
			<section class="border-4 border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
				<h2 class="mb-2 text-3xl font-black uppercase italic">🤝 Najlepsze Duety</h2>
				<p class="mb-8 text-sm font-bold text-gray-500 uppercase">
					Obliczone na podstawie wzajemnych odpowiedzi w ciągu całego roku.
				</p>
				<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{#each stats.interactionNetwork.slice(networkPage * 12, (networkPage + 1) * 12) as pair}
						<div
							class="flex items-center justify-between border-4 border-black bg-accent/10 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
						>
							<div class="flex items-center gap-3">
								<div class="flex -space-x-4">
									<img
										src={pair.user1.avatar}
										alt=""
										class="h-12 w-12 rounded-full border-2 border-black bg-white"
									/>
									<img
										src={pair.user2.avatar}
										alt=""
										class="h-12 w-12 rounded-full border-2 border-black bg-white"
									/>
								</div>
								<div class="text-sm leading-tight font-black uppercase">
									{pair.user1.name} <br /> & {pair.user2.name}
								</div>
							</div>
							<div
								class="border-2 border-black bg-white px-2 py-1 font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
							>
								{pair.count}
							</div>
						</div>
					{/each}
				</div>

				{#if stats.interactionNetwork.length > 12}
					<div class="mt-8 flex justify-center gap-2">
						{#each Array(Math.min(5, Math.ceil(stats.interactionNetwork.length / 12))) as _, i}
							<button
								onclick={() => (networkPage = i)}
								class="h-10 w-10 border-4 border-black font-black transition-all {networkPage === i
									? 'bg-black text-white'
									: 'bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'}"
							>
								{i + 1}
							</button>
						{/each}
					</div>
				{/if}
			</section>

			<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
				<!-- TOP CHANNELS -->
				<section
					class="col-span-1 border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] md:col-span-2"
				>
					<h2 class="mb-6 text-2xl font-black uppercase">📢 Najpopularniejsze Kanały</h2>
					<div class="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
						{#each stats.channels.channels.slice(0, 20) as channel}
							<div class="group">
								<div class="mb-1 flex justify-between font-black uppercase">
									<span>#{channel.name}</span>
									<span>{channel.count.toLocaleString()}</span>
								</div>
								<div class="h-4 border-2 border-black bg-gray-100">
									<div
										class="h-full border-r-2 border-black bg-primary"
										style="width: {(channel.count / stats.channels.channels[0].count) * 100}%"
									></div>
								</div>
							</div>
						{/each}
					</div>
				</section>
			</div>

			<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
				<!-- CONTENT TYPES -->
				<section class="border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
					<h2 class="mb-6 text-2xl font-black uppercase">🖼️ Typy Mediów</h2>
					<div class="space-y-5">
						{#each Object.entries(stats.attachments) as [type, count]}
							<div class="flex items-center gap-4">
								<div class="w-24 text-sm font-black uppercase">{type}</div>
								<div class="h-6 flex-1 border-2 border-black bg-gray-100">
									<div
										class="h-full border-r-2 border-black bg-primary"
										style="width: {(count /
											Object.values(stats.attachments).reduce((a, b) => a + b, 0)) *
											100}%"
									></div>
								</div>
								<div class="w-16 text-right font-black">{count}</div>
							</div>
						{/each}
					</div>
				</section>

				<!-- LINK TYPES -->
				<section class="border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
					<h2 class="mb-6 text-2xl font-black uppercase">🔗 Linki</h2>
					<div class="grid grid-cols-2 gap-4">
						<div
							class="border-4 border-black bg-accent/20 p-4 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
						>
							<div class="text-3xl font-black">{stats.links.spotify}</div>
							<div class="text-xs font-black uppercase">Spotify</div>
						</div>
						<div
							class="border-4 border-black bg-primary/20 p-4 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
						>
							<div class="text-3xl font-black">{stats.links.youtube}</div>
							<div class="text-xs font-black uppercase">YouTube</div>
						</div>
						<div
							class="border-4 border-black bg-blue-200 p-4 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
						>
							<div class="text-3xl font-black">{stats.links.twitter}</div>
							<div class="text-xs font-black uppercase">Twitter / X</div>
						</div>
						<div
							class="border-4 border-black bg-orange-200 p-4 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
						>
							<div class="text-3xl font-black">{stats.links.pixiv}</div>
							<div class="text-xs font-black uppercase">Pixiv</div>
						</div>
					</div>
				</section>
			</div>

			<!-- EMOJIS -->
			<section
				class="border-4 border-black bg-white p-8 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
			>
				<h2 class="mb-8 text-3xl font-black uppercase italic">Top Emotki</h2>
				<div class="flex flex-wrap justify-center gap-6">
					{#each stats.emojis.slice(0, 30) as emoji}
						<div
							class="flex items-center gap-3 border-4 border-black bg-white p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:scale-110"
							title="{emoji.count} użyć"
						>
							{#if emoji.id}
								<img
									src="/emojis/{emoji.id}.png"
									alt={emoji.name}
									class="h-10 w-10 object-contain"
									onerror={(e) => {
										if (e.currentTarget.src.endsWith('.png')) {
											e.currentTarget.src = `/emojis/${emoji.id}.gif`;
										} else {
											e.currentTarget.style.display = 'none';
										}
									}}
								/>
							{/if}
							<div class="flex flex-col items-start">
								<span class="text-lg leading-none font-black"
									>{emoji.name}{emoji.server ? ` (${emoji.server})` : ''}</span
								>
								<span class="text-xs font-bold text-gray-500 uppercase"
									>{emoji.count.toLocaleString()}</span
								>
							</div>
						</div>
					{/each}
				</div>
			</section>

			<!-- WORD CLOUD -->
			<section
				class="border-4 border-black bg-black p-8 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
			>
				<h2 class="mb-12 text-3xl font-black text-white uppercase italic">Słownik Karczmy</h2>
				<div class="flex flex-wrap justify-center gap-x-6 gap-y-2">
					{#each stats.wordCloud as word}
						<span
							class="leading-none font-black uppercase transition-all hover:text-primary"
							style="font-size: {Math.max(
								1,
								Math.min(4, (word.value / stats.wordCloud[0].value) * 6)
							)}rem; color: {word.value / stats.wordCloud[0].value > 0.5
								? '#FFD100'
								: '#fff'}; opacity: {Math.max(0.4, word.value / stats.wordCloud[0].value)}"
						>
							{word.text}
						</span>
					{/each}
				</div>
			</section>

			<!-- TIME OF DAY -->
			<section class="border-4 border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
				<h2 class="mb-8 text-center text-3xl font-black uppercase italic">
					Kiedy żyje Karczma?
				</h2>
				<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
					<div class="h-64 border-4 border-black bg-white p-4">
						<canvas bind:this={timeOfDayCanvas}></canvas>
					</div>
					<div class="grid grid-cols-2 gap-4">
						{#each stats.timeOfDay as period}
							<div
								class="border-4 border-black p-4 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] {period.period ===
								'Night'
									? 'bg-black text-white'
									: 'bg-white'}"
							>
								<div class="text-3xl font-black">{period.count.toLocaleString()}</div>
								<div class="text-xs font-black uppercase">
									{period.period === 'Morning'
										? 'Poranek'
										: period.period === 'Afternoon'
											? 'Popołudnie'
											: period.period === 'Evening'
												? 'Wieczór'
												: 'Noc'}
								</div>
							</div>
						{/each}
					</div>
				</div>
			</section>
		{/if}
	</div>
</div>

<style>
	:global(body) {
		background-color: #f0f0f0;
	}
	canvas {
		display: block;
		width: 100% !important;
		height: 100% !important;
	}
</style>
