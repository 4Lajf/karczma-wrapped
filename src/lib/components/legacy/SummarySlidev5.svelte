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

	const activeDays = $derived(user.metrics.activeDays || 0);
	const mediaCount = $derived(user.metrics.attachmentCount || 0);
	const sessionCount = $derived(user.metrics.sessionAnalysis?.sessionCount || 0);

	const avgMessagesPerDay = $derived(
		user.metrics.activeDays ? (user.metrics.totalMessages / user.metrics.activeDays).toFixed(1) : 0
	);

	const uniqueWord = $derived(
		user.metrics.vocabularyFingerprint && user.metrics.vocabularyFingerprint[0]
			? user.metrics.vocabularyFingerprint[0].word
			: '-'
	);

	const mainChannelPercent = $derived(
		user.metrics.topChannels && user.metrics.topChannels[0]
			? user.metrics.topChannels[0].percentage
			: 0
	);

	let failedEmoji = $state(false);

	function handleEmojiError() {
		failedEmoji = true;
	}
</script>

<div class="h-full w-full overflow-hidden bg-black p-4 font-black uppercase text-black">
	<div class="relative flex h-full w-full flex-col gap-3 py-4">
		<!-- HEADER STICKER -->
		<div
			class="relative self-center border-4 border-black bg-white px-8 py-2 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
			style="transform: rotate(-1deg) translateY(-10px);"
		>
			<h2 class="text-2xl italic tracking-tighter md:text-4xl">PODSUMOWANIE 2025</h2>
		</div>

		<!-- PROFILE STRIP -->
		<div
			class="relative z-10 flex w-[90%] items-center gap-4 border-4 border-black bg-pink-400 p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
			style="transform: rotate(1deg) translateX(-5px);"
		>
			<div class="h-16 w-16 overflow-hidden border-4 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
				{#if user.profile.avatarUrl}
					<img src={user.profile.avatarUrl} alt="" class="h-full w-full object-cover" />
				{:else}
					<div class="flex h-full w-full items-center justify-center text-2xl">{user.profile.name[0]}</div>
				{/if}
			</div>
			<div class="flex flex-col">
				<span class="text-xs opacity-70">UŻYTKOWNIK</span>
				<h3 class="text-2xl leading-none break-all">{user.profile.name}</h3>
			</div>
			<div class="ml-auto flex flex-col items-center border-l-2 border-black pl-4">
				<span class="text-xs opacity-70">RANK</span>
				<span class="text-3xl italic">#{user.metrics.rank}</span>
			</div>
		</div>

		<!-- STATS ROW 1 -->
		<div class="flex w-full gap-3">
			<div
				class="flex-1 border-4 border-black bg-yellow-400 p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
				style="transform: rotate(-2deg);"
			>
				<span class="text-xs opacity-70">WIADOMOŚCI</span>
				<div class="text-3xl leading-none">{user.metrics.totalMessages.toLocaleString()}</div>
			</div>
			<div
				class="flex-1 border-4 border-black bg-cyan-400 p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
				style="transform: rotate(2deg) translateY(5px);"
			>
				<span class="text-xs opacity-70">SERIA</span>
				<div class="text-3xl leading-none">{user.metrics.longestStreak} DNI</div>
			</div>
		</div>

		<!-- CHANNEL STRIP -->
		<div
			class="relative w-[95%] border-4 border-black bg-orange-500 p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
			style="transform: rotate(-0.5deg) translateX(10px);"
		>
			<span class="text-xs opacity-70">GŁÓWNY KANAŁ</span>
			<div class="flex items-center justify-between">
				<h3 class="text-xl leading-tight break-all">#{topChannel}</h3>
				<span class="text-2xl italic">{mainChannelPercent}%</span>
			</div>
		</div>

		<!-- WORDS STACK -->
		<div class="flex w-full justify-between gap-2 px-2">
			<div
				class="w-[48%] border-4 border-black bg-white p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
				style="transform: rotate(1.5deg);"
			>
				<span class="text-xs opacity-70">ULUBIONE SŁOWO</span>
				<div class="text-sm italic truncate">"{topWord}"</div>
			</div>
			<div
				class="w-[48%] border-4 border-black bg-lime-400 p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
				style="transform: rotate(-1.5deg) translateY(-5px);"
			>
				<span class="text-xs opacity-70">UNIKALNE SŁOWO</span>
				<div class="text-sm italic truncate">"{uniqueWord}"</div>
			</div>
		</div>

		<!-- MID STRIP STATS -->
		<div class="flex w-full justify-between gap-3 px-4 pt-2">
			<div
				class="flex-1 border-4 border-black bg-sky-300 p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
				style="transform: rotate(-1.5deg) translateY(2px);"
			>
				<span class="text-xs opacity-70">ŚR. WIADOM. / DZIEŃ</span>
				<div class="text-xl leading-none">{avgMessagesPerDay}</div>
			</div>
			<div
				class="flex-1 border-4 border-black bg-orange-300 p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
				style="transform: rotate(2deg) translateY(-4px);"
			>
				<span class="text-xs opacity-70">SESJE</span>
				<div class="text-xl leading-none">{sessionCount}</div>
			</div>
		</div>

		<!-- BOTTOM MISC -->
		<div class="mt-auto grid grid-cols-4 gap-2 py-4">
			<div
				class="flex flex-col items-center border-2 border-black bg-purple-500 p-1 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
				style="transform: rotate(-3deg);"
			>
				<span class="text-xs opacity-70">EMOJI</span>
				<div class="h-8 w-8 p-1">
					{#if topEmojiData?.emoji_id && !failedEmoji}
						<img src="/emojis/{topEmojiData.emoji_id}.png" alt="" class="h-full w-full object-contain" onerror={handleEmojiError} />
					{:else}
						<span class="text-xl">{topEmojiKey.split(':')[0]}</span>
					{/if}
				</div>
			</div>
			<div
				class="flex flex-col items-center border-2 border-black bg-red-500 p-1 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
				style="transform: rotate(2deg) translateY(4px);"
			>
				<span class="text-xs opacity-70">STARS</span>
				<span class="text-xl leading-none">{starboardCount}</span>
			</div>
			<div
				class="flex flex-col items-center border-2 border-black bg-blue-300 p-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
				style="transform: rotate(-1deg) translateY(-2px);"
			>
				<span class="text-xs opacity-70">DNI</span>
				<span class="text-xl leading-none">{activeDays}</span>
			</div>
			<div
				class="flex flex-col items-center border-2 border-black bg-amber-400 p-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
				style="transform: rotate(4deg);"
			>
				<span class="text-xs opacity-70">ORDERY</span>
				<span class="text-xl leading-none">{badgesEarned}</span>
			</div>
		</div>

		<!-- FOOTER LABEL -->
		<div class="absolute -bottom-2 right-0 border-2 border-black bg-black px-2 py-1 text-white" style="transform: rotate(-1deg);">
			<span class="text-[10px] tracking-widest font-black">KARCZMA WRAPPED 2025</span>
		</div>
	</div>
</div>

