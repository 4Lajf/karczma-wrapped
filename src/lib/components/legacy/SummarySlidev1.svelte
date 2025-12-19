<script>
	let { user } = $props();

	// Data preparation
	const topWord = $derived(
		user.metrics.topWords && user.metrics.topWords[0] ? user.metrics.topWords[0].word : '-'
	);

	const topEmojiData = $derived(
		user.metrics.topEmojisSent && user.metrics.topEmojisSent[0]
			? user.metrics.topEmojisSent[0]
			: null
	);
	const topEmojiKey = $derived(topEmojiData ? topEmojiData.key : '-');

	const topChannel = $derived(
		user.metrics.topChannels && user.metrics.topChannels[0] ? user.metrics.topChannels[0].name : '-'
	);
	const badgesEarned = $derived(user.metrics.badges.filter((b) => b.achieved).length);
	const starboardCount = $derived(user.metrics.starboardCount || 0);

	// Deep stats helpers
	const sleepStart = $derived(user.metrics.chronotype?.sleepStart || 0);
	const sleepEnd = $derived(user.metrics.chronotype?.sleepEnd || 0);
	const capsRatio = $derived(((user.metrics.contentHabits?.capsRatio || 0) * 100).toFixed(1));

	// New stats
	const activeDays = $derived(user.metrics.activeDays || 0);
	const mediaCount = $derived(user.metrics.attachmentCount || 0);
	const sessionCount = $derived(user.metrics.sessionAnalysis?.sessionCount || 0);

	const avgMessagesPerDay = $derived(
		user.metrics.activeDays ? (user.metrics.totalMessages / user.metrics.activeDays).toFixed(1) : 0
	);

	const daysOfWeek = [
		'Niedziela',
		'Poniedziałek',
		'Wtorek',
		'Środa',
		'Czwartek',
		'Piątek',
		'Sobota'
	];
	const mostActiveDay = $derived(
		user.metrics.dailyDistribution
			? daysOfWeek[
					user.metrics.dailyDistribution.indexOf(Math.max(...user.metrics.dailyDistribution))
				]
			: '-'
	);

	const uniqueWord = $derived(
		user.metrics.vocabularyFingerprint && user.metrics.vocabularyFingerprint[0]
			? user.metrics.vocabularyFingerprint[0].word
			: '-'
	);

	const mostPinged = $derived(
		user.metrics.topMentions && user.metrics.topMentions[0] ? user.metrics.topMentions[0].name : '-'
	);
	const topPinger = $derived(
		user.metrics.topMentionedBy && user.metrics.topMentionedBy[0]
			? user.metrics.topMentionedBy[0].name
			: '-'
	);

	const emojiFactoryBadge = $derived(user.metrics.badges.find((b) => b.label === 'Fabryka Emoji'));
	const mainChannelPercent = $derived(
		user.metrics.topChannels && user.metrics.topChannels[0]
			? user.metrics.topChannels[0].percentage
			: 0
	);

	let failedEmoji = $state(false);

	function handleEmojiError() {
		failedEmoji = true;
	}

	function formatDuration(seconds) {
		if (!seconds) return '0s';
		if (seconds < 60) return `${seconds}s`;
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		if (h > 0) return `${h}h ${m}m`;
		return `${m}m`;
	}

	const avgLatency = $derived(formatDuration(user.metrics.responseLatency?.average));
</script>

<div class="h-full w-full overflow-hidden bg-black font-black text-black uppercase">
	<div
		class="grid h-full w-full grid-cols-4 grid-rows-[repeat(11,minmax(0,1fr))] gap-0 border-4 border-black"
	>
		<!-- ROW 1: TITLE -->
		<div
			class="relative col-span-4 row-span-1 flex items-center justify-center overflow-hidden border-2 border-black bg-white"
		>
			<h2
				class="px-4 text-center text-[8px] leading-none font-black tracking-tighter italic md:text-xl"
			>
				Podsumowanie 2025
			</h2>
		</div>

		<!-- ROW 2-3: PROFILE & BASIC STATS -->
		<div
			class="relative col-span-2 row-span-2 flex flex-col items-center justify-center border-2 border-black bg-pink-400 p-2 md:p-4"
		>
			<div
				class="mb-2 h-16 w-16 shrink-0 overflow-hidden border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] md:h-24 md:w-24 md:border-4"
			>
				{#if user.profile.avatarUrl}
					<img src={user.profile.avatarUrl} alt="" class="h-full w-full object-cover" />
				{:else}
					<div class="flex h-full w-full items-center justify-center text-xl md:text-4xl">
						{user.profile.name[0]}
					</div>
				{/if}
			</div>
			<div class="w-full min-w-0 text-center">
				<h3 class="text-sm leading-tight wrap-break-word md:text-2xl">{user.profile.name}</h3>
			</div>
		</div>

		<div
			class="col-span-1 row-span-1 flex flex-col items-center justify-center border-2 border-black bg-yellow-400 p-1 md:p-2"
		>
			<div class="text-[8px] leading-none md:text-xs">Rank</div>
			<div class="text-2xl leading-none md:text-5xl">#{user.metrics.rank}</div>
		</div>

		<div
			class="col-span-1 row-span-1 flex flex-col items-center justify-center border-2 border-black bg-cyan-400 p-1 md:p-2"
		>
			<div class="text-center text-[8px] leading-none md:text-xs">Seria (Dni)</div>
			<div class="text-xl leading-none md:text-4xl">{user.metrics.longestStreak}</div>
		</div>

		<div
			class="col-span-2 row-span-1 flex flex-col justify-center border-2 border-black bg-green-400 p-2 md:p-4"
		>
			<div class="text-center text-[8px] leading-none opacity-80 md:text-xs">
				Wysłano Wiadomości
			</div>
			<div class="text-center text-xl leading-none md:text-4xl">
				{user.metrics.totalMessages.toLocaleString()}
			</div>
		</div>

		<!-- ROW 4-5: SOCIAL & CONTENT -->
		<div
			class="relative col-span-2 row-span-2 flex flex-col justify-center border-2 border-black bg-orange-500 p-2 md:p-4"
		>
			<div class="text-[8px] opacity-80 md:text-xs">Główny Kanał</div>
			<div
				class="text-[clamp(0.5rem,4vw,1rem)] leading-[0.9] wrap-break-word md:text-xl md:break-all md:whitespace-normal"
			>
				#{topChannel}
			</div>
			<div class="mt-1 text-[8px] font-black">{mainChannelPercent}% wiadomości</div>
			<div class="mt-2">
				<div class="text-[8px] opacity-80 md:text-xs">Zasięg</div>
				<div class="mt-1 flex gap-0.5 md:gap-1">
					{#each Array(5) as _, i}
						<div
							class="h-1 flex-1 border border-black md:h-2 md:border-2 {i <
							Math.min(5, Math.ceil(user.metrics.entropy?.normalized / 2))
								? 'bg-black'
								: 'bg-white'}"
						></div>
					{/each}
				</div>
			</div>
		</div>

		<div
			class="relative col-span-2 row-span-1 flex flex-col justify-center overflow-hidden border-2 border-black bg-white p-2 md:p-4"
		>
			<div class="text-[8px] opacity-60 md:text-xs">Ulubione Słowo</div>
			<div class="text-[0.7rem] leading-tight wrap-break-word md:text-xl">"{topWord}"</div>
		</div>

		<div
			class="relative col-span-2 row-span-1 flex flex-col justify-center overflow-hidden border-2 border-black bg-neutral-100 p-2 md:p-4"
		>
			<div class="text-[8px] opacity-60 md:text-xs">Unikalne Słowo</div>
			<div class="text-[0.7rem] leading-tight wrap-break-word md:text-xl">"{uniqueWord}"</div>
		</div>

		<div
			class="col-span-1 row-span-1 flex flex-col items-center justify-center border-2 border-black bg-purple-500 p-1 text-white md:p-2"
		>
			<div class="text-center text-[8px] opacity-80 md:text-xs">Emoji</div>
			<div class="flex h-8 w-8 items-center justify-center md:h-12 md:w-12">
				{#if topEmojiData?.emoji_id && !failedEmoji}
					<img
						src="/emojis/{topEmojiData.emoji_id}.png"
						alt={topEmojiKey}
						class="h-full w-full object-contain"
						onerror={handleEmojiError}
					/>
				{:else}
					<div class="text-xl md:text-3xl">{topEmojiKey.split(':')[0]}</div>
				{/if}
			</div>
		</div>

		<div
			class="col-span-1 row-span-1 flex flex-col items-center justify-center border-2 border-black bg-red-500 p-1 text-white md:p-2"
		>
			<div class="text-center text-[8px] leading-tight opacity-80 md:text-xs">STARBOARD</div>
			<div class="text-lg leading-none md:text-4xl">{starboardCount}</div>
		</div>

		<div
			class="col-span-1 row-span-1 flex flex-col items-center justify-center border-2 border-black bg-lime-400 p-1 md:p-2"
		>
			<div class="text-center text-[8px] opacity-80 md:text-xs">Ordery</div>
			<div class="text-xl leading-none md:text-5xl">{badgesEarned}</div>
		</div>

		<div
			class="col-span-1 row-span-1 flex flex-col items-center justify-center border-2 border-black bg-blue-300 p-1 md:p-2"
		>
			<div class="text-center text-[8px] opacity-80 md:text-xs">Dni Aktyw.</div>
			<div class="text-xl leading-none md:text-4xl">{activeDays}</div>
		</div>

		<!-- ROW 6: DAY -->
		<div
			class="relative col-span-4 row-span-1 flex flex-col justify-center border-2 border-black bg-indigo-600 p-2 text-white md:p-4"
		>
			<div class="text-[8px] opacity-80 md:text-xs">Najaktywniej</div>
			<div class="text-base leading-none wrap-break-word md:text-2xl">{mostActiveDay}</div>
		</div>

		<!-- ROW 7: PINGS -->
		<div
			class="col-span-2 row-span-1 flex flex-col justify-center border-2 border-black bg-cyan-600 p-2 text-white md:p-4"
		>
			<div class="text-[8px] opacity-80 md:text-xs">Najczęściej Oznaczasz</div>
			<div class="text-sm leading-none wrap-break-word md:text-xl">{mostPinged}</div>
		</div>

		<div
			class="col-span-2 row-span-1 flex flex-col justify-center border-2 border-black bg-blue-700 p-2 text-white md:p-4"
		>
			<div class="text-[8px] opacity-80 md:text-xs">Najczęściej Oznacza Cię</div>
			<div class="text-sm leading-none wrap-break-word md:text-xl">{topPinger}</div>
		</div>

		<!-- ROW 8: CHRONO & EMOJI FACTORY -->
		<div
			class="col-span-2 row-span-1 flex flex-col justify-center border-2 border-black bg-blue-500 p-2 text-white md:p-4"
		>
			<div class="text-[8px] opacity-80 md:text-xs">TRYB ŻYCIA</div>
			<div class="flex items-center gap-1 md:gap-2">
				<span class="text-sm md:text-2xl">{sleepStart}:00</span>
				<span class="text-[8px] opacity-50">DO</span>
				<span class="text-sm md:text-2xl">{sleepEnd}:00</span>
			</div>
			<div class="text-[6px] italic opacity-70 md:text-[10px]">Cisza nocna</div>
		</div>

		<div
			class="col-span-2 row-span-1 flex flex-col justify-center border-2 border-black bg-pink-500 p-2 text-white md:p-4"
		>
			<div class="text-[8px] uppercase opacity-80 md:text-xs">Fabryka Emoji</div>
			{#if emojiFactoryBadge}
				<div class="flex items-baseline gap-1">
					<span class="text-xl leading-none md:text-3xl"
						>{(emojiFactoryBadge.progress * 100).toFixed(1)}%</span
					>
					<span class="text-[6px] leading-none opacity-80">wiadomości</span>
				</div>
			{:else}
				<div class="text-xs italic opacity-70">Brak danych</div>
			{/if}
		</div>

		<!-- ROW 9: MISC STATS -->
		<div
			class="relative col-span-1 row-span-1 flex flex-col items-center justify-center border-2 border-black bg-amber-400 p-1 md:p-2"
		>
			<div class="text-[8px] opacity-80 md:text-xs">CAPS</div>
			<div class="text-lg leading-none md:text-3xl">{capsRatio}%</div>
		</div>

		<div
			class="relative col-span-1 row-span-1 flex flex-col items-center justify-center border-2 border-black bg-sky-400 p-1 md:p-2"
		>
			<div class="text-center text-[8px] leading-tight opacity-80 md:text-xs">ŚR. WIADOM.</div>
			<div class="text-lg leading-none md:text-3xl">{avgMessagesPerDay}</div>
		</div>

		<div
			class="relative col-span-1 row-span-1 flex flex-col items-center justify-center border-2 border-black bg-yellow-300 p-1 md:p-2"
		>
			<div class="text-center text-[8px] leading-tight opacity-80 md:text-xs">MEDIA</div>
			<div class="text-lg leading-none md:text-3xl">{mediaCount}</div>
		</div>

		<div
			class="relative col-span-1 row-span-1 flex flex-col items-center justify-center border-2 border-black bg-orange-300 p-1 md:p-2"
		>
			<div class="text-center text-[8px] leading-tight opacity-80 md:text-xs">SESJE</div>
			<div class="text-lg leading-none md:text-3xl">{sessionCount}</div>
		</div>

		<!-- ROW 10: FOOTER -->
		<div
			class="col-span-4 row-span-1 flex items-center justify-center border-2 border-black bg-black p-2 text-white md:p-4"
		>
			<span class="text-[10px] font-black tracking-[0.2em] md:text-lg">KARCZMA WRAPPED 2025</span>
		</div>
	</div>
</div>

<style>
	/* Custom animations if needed */
	@keyframes pulse-subtle {
		0%,
		100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.02);
		}
	}
</style>
