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

	const mainChannelPercent = $derived(
		user.metrics.topChannels && user.metrics.topChannels[0]
			? user.metrics.topChannels[0].percentage
			: 0
	);

	const uniqueWord = $derived(
		user.metrics.vocabularyFingerprint && user.metrics.vocabularyFingerprint[0]
			? user.metrics.vocabularyFingerprint[0].word
			: '-'
	);

	let failedEmoji = $state(false);

	function handleEmojiError() {
		failedEmoji = true;
	}
</script>

<!-- LAYOUT 7 (v7 style: The Dashboard - Structured Grid / Technical) -->
<div class="h-full w-full bg-black p-2 font-black uppercase text-black">
	<div class="grid h-full w-full grid-cols-6 grid-rows-8 gap-2">
		<!-- HEADER -->
		<div class="col-span-6 row-span-1 flex items-stretch border-4 border-black bg-white overflow-hidden">
			<div class="flex items-center bg-black px-4 text-white">
				<span class="text-sm font-black tracking-[0.2em]">PODSUMOWANIE ROKU 2025</span>
			</div>
			<div class="flex flex-1 items-center justify-end px-4">
				<span class="text-2xl font-black italic tracking-tighter">KARCZMA WRAPPED</span>
			</div>
		</div>

		<!-- PROFILE BLOCK -->
		<div class="col-span-3 row-span-3 relative border-4 border-black bg-pink-400 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center justify-center">
			<div class="absolute top-1 left-1 text-[12px] opacity-70">PROFIL</div>
			<div class="h-20 w-20 overflow-hidden border-4 border-black bg-white mb-2">
				{#if user.profile.avatarUrl}
					<img src={user.profile.avatarUrl} alt="" class="h-full w-full object-cover" />
				{:else}
					<div class="flex h-full w-full items-center justify-center text-4xl">{user.profile.name[0]}</div>
				{/if}
			</div>
			<h3 class="text-3xl leading-none text-center break-all">{user.profile.name}</h3>
		</div>

		<!-- RANK BLOCK -->
		<div class="col-span-3 row-span-1 relative border-4 border-black bg-yellow-400 flex items-center justify-center">
			<div class="absolute top-1 left-1 text-[12px] opacity-70">RANKING</div>
			<span class="text-6xl italic">#{user.metrics.rank}</span>
		</div>

		<!-- MESSAGES BLOCK -->
		<div class="col-span-3 row-span-2 relative border-4 border-black bg-cyan-400 flex flex-col items-center justify-center">
			<div class="absolute top-1 left-1 text-[12px] opacity-70">WIADOMOŚCI</div>
			<span class="text-5xl leading-none">{user.metrics.totalMessages.toLocaleString()}</span>
			<span class="text-xs mt-1">RAZEM</span>
		</div>

		<!-- TOP CHANNEL -->
		<div class="col-span-4 row-span-2 relative border-4 border-black bg-white p-4">
			<div class="absolute top-1 left-1 text-[12px] opacity-70">GŁÓWNY KANAŁ</div>
			<div class="h-full flex flex-col justify-center">
				<h3 class="text-2xl leading-tight break-all">#{topChannel}</h3>
				<div class="mt-2 h-4 w-full border-2 border-black bg-black">
					<div class="h-full bg-cyan-400" style="width: {mainChannelPercent}%"></div>
				</div>
				<p class="text-[12px] mt-1">{mainChannelPercent}% CAŁEJ AKTYWNOŚCI</p>
			</div>
		</div>

		<!-- TOP EMOJI -->
		<div class="col-span-2 row-span-2 relative border-4 border-black bg-purple-500 text-white flex flex-col items-center justify-center">
			<div class="absolute top-1 left-1 text-[12px] opacity-70">TOP EMOJI</div>
			<div class="h-14 w-14 flex items-center justify-center bg-white border-2 border-black p-1">
				{#if topEmojiData?.emoji_id && !failedEmoji}
					<img src="/emojis/{topEmojiData.emoji_id}.png" alt="" class="h-full w-full object-contain" onerror={handleEmojiError} />
				{:else}
					<span class="text-3xl text-black">{topEmojiKey.split(':')[0]}</span>
				{/if}
			</div>
			<span class="text-xl mt-2 text-center leading-none">{topEmojiData?.count || 0}<br/><span class="text-xs">UŻYĆ</span></span>
		</div>

		<!-- SŁOWO ROKU -->
		<div class="col-span-3 row-span-1 relative border-4 border-black bg-lime-400 flex items-center justify-center overflow-hidden px-2">
			<div class="absolute top-1 left-1 text-[12px] opacity-70">SŁOWO ROKU</div>
			<span class="italic text-center whitespace-nowrap" style="font-size: {Math.min(1.8, 14 / (topWord.length + 2))}rem">
				"{topWord}"
			</span>
		</div>

		<!-- UNIKALNE (Now in span 3) -->
		<div class="col-span-3 row-span-1 relative border-4 border-black bg-white flex items-center justify-center overflow-hidden px-2">
			<div class="absolute top-1 left-1 text-[12px] opacity-70">UNIKALNE</div>
			<span class="italic text-center whitespace-nowrap" style="font-size: {Math.min(1.8, 14 / (uniqueWord.length + 2))}rem">
				"{uniqueWord}"
			</span>
		</div>

		<!-- BOTTOM BAR -->
		<div class="col-span-2 row-span-1 relative border-4 border-black bg-sky-400 flex flex-col items-center justify-center">
			<div class="absolute top-1 left-1 text-[12px] opacity-70">DNI</div>
			<span class="text-4xl">{user.metrics.activeDays || 0}</span>
		</div>
		<div class="col-span-2 row-span-1 relative border-4 border-black bg-orange-400 flex flex-col items-center justify-center">
			<div class="absolute top-1 left-1 text-[12px] opacity-70">STARBOARD</div>
			<span class="text-4xl">{starboardCount}</span>
		</div>
		<div class="col-span-2 row-span-1 relative border-4 border-black bg-black flex flex-col items-center justify-center">
			<div class="absolute top-1 left-1 text-[12px] opacity-70 text-white">ORDERY</div>
			<span class="text-4xl text-white">{badgesEarned}</span>
		</div>
	</div>
</div>
