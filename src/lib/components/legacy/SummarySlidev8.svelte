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

<div class="h-full w-full overflow-hidden bg-white font-black uppercase text-black flex flex-col items-center justify-center p-4">
	<!-- THE RECEIPT CONTAINER -->
	<div class="relative w-full max-w-[400px] h-full bg-black text-white flex flex-col shadow-[10px_10px_0px_0px_rgba(0,0,0,0.2)]">
		
		<!-- TOP ZIG ZAG (Simulated) -->
		<div class="absolute -top-3 left-0 w-full h-4 bg-white" style="clip-path: polygon(0% 100%, 5% 0%, 10% 100%, 15% 0%, 20% 100%, 25% 0%, 30% 100%, 35% 0%, 40% 100%, 45% 0%, 50% 100%, 55% 0%, 60% 100%, 65% 0%, 70% 100%, 75% 0%, 80% 100%, 85% 0%, 90% 100%, 95% 0%, 100% 100%);"></div>

		<!-- CONTENT -->
		<div class="flex-1 flex flex-col p-6 overflow-y-auto no-scrollbar">
			<!-- RECEIPT HEADER -->
			<div class="text-center mb-6 border-b-2 border-dashed border-white pb-4">
				<h2 class="text-2xl tracking-[0.2em]">KARCZMA WRAPPED</h2>
				<p class="text-xs opacity-70">TERMINAL: #2025-STATS</p>
				<p class="text-xs opacity-70">USER: {user.profile.name}</p>
			</div>

			<!-- STATS ROWS -->
			<div class="space-y-4">
				<div class="flex justify-between items-end border-b-2 border-white/20 pb-1">
					<span class="text-xs">RANKING OGÓLNY</span>
					<span class="text-3xl italic">#{user.metrics.rank}</span>
				</div>

				<div class="flex justify-between items-end border-b-2 border-white/20 pb-1">
					<span class="text-xs">SUMA WIADOMOŚCI</span>
					<span class="text-3xl">{user.metrics.totalMessages.toLocaleString()}</span>
				</div>

				<div class="flex justify-between items-end border-b-2 border-white/20 pb-1">
					<span class="text-xs">DNI AKTYWNOŚCI</span>
					<span class="text-3xl">{activeDays}</span>
				</div>

				<!-- EMOJI SECTION -->
				<div class="py-4 border-b-2 border-dashed border-white">
					<div class="flex justify-between items-center">
						<div class="flex flex-col">
							<span class="text-xs">TOP EMOJI</span>
							<span class="text-lg text-yellow-400">{topEmojiKey}</span>
						</div>
						<div class="h-16 w-16 bg-white border-4 border-white p-1">
							{#if topEmojiData?.emoji_id && !failedEmoji}
								<img src="/emojis/{topEmojiData.emoji_id}.png" alt="" class="h-full w-full object-contain" onerror={handleEmojiError} />
							{:else}
								<span class="text-3xl text-black flex items-center justify-center h-full">{topEmojiKey.split(':')[0]}</span>
							{/if}
						</div>
					</div>
				</div>

				<!-- CHANNEL SECTION -->
				<div class="py-4 border-b-2 border-dashed border-white">
					<span class="text-xs">DOMINACJA KANAŁU</span>
					<h3 class="text-xl leading-tight break-all">#{topChannel}</h3>
					<div class="mt-2 flex items-center gap-2">
						<div class="flex-1 h-3 bg-white/20 relative">
							<div class="h-full bg-cyan-400" style="width: {mainChannelPercent}%"></div>
						</div>
						<span class="text-sm font-black text-cyan-400">{mainChannelPercent}%</span>
					</div>
				</div>

				<!-- WORDS SECTION -->
				<div class="grid grid-cols-2 gap-4 py-4 border-b-2 border-dashed border-white">
					<div>
						<span class="text-[10px] opacity-70">FAV WORD</span>
						<p class="text-lg italic text-pink-400 truncate">"{topWord}"</p>
					</div>
					<div>
						<span class="text-[10px] opacity-70">UNIQUE</span>
						<p class="text-lg italic text-lime-400 truncate">"{uniqueWord}"</p>
					</div>
				</div>

				<!-- ADDITIONAL STATS -->
				<div class="grid grid-cols-2 gap-2 pt-2 text-center">
					<div class="bg-white text-black p-2">
						<span class="text-[10px]">STARS</span>
						<p class="text-2xl leading-none">{starboardCount}</p>
					</div>
					<div class="bg-white text-black p-2">
						<span class="text-[10px]">ORDERY</span>
						<p class="text-2xl leading-none">{badgesEarned}</p>
					</div>
				</div>
			</div>

			<!-- BARCODE SIMULATION -->
			<div class="mt-8 mb-4 flex flex-col items-center">
				<div class="h-12 w-full bg-white flex gap-px px-2 py-1">
					{#each Array(40) as _, i}
						<div class="h-full bg-black" style="width: {Math.random() * 4 + 1}px"></div>
					{/each}
				</div>
				<span class="text-[8px] mt-1 tracking-[0.5em]">2025-KARCZMA-WRAPPED-CERTIFIED</span>
			</div>
		</div>

		<!-- BOTTOM ZIG ZAG (Simulated) -->
		<div class="absolute -bottom-3 left-0 w-full h-4 bg-white" style="clip-path: polygon(0% 0%, 5% 100%, 10% 0%, 15% 100%, 20% 0%, 25% 100%, 30% 0%, 35% 100%, 40% 0%, 45% 100%, 50% 0%, 55% 100%, 60% 0%, 65% 100%, 70% 0%, 75% 100%, 80% 0%, 85% 100%, 90% 0%, 95% 100%, 100% 0%);"></div>
	</div>
</div>

<style>
	.no-scrollbar::-webkit-scrollbar {
		display: none;
	}
	.no-scrollbar {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
</style>
