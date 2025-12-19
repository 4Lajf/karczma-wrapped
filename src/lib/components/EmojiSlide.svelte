<script>
	let { user } = $props();

	// Track which emoji images failed to load (reactive object)
	let failedImages = $state({});
	let showTooltip = $state({});

	function handleImageError(event, emojiKey) {
		const img = event.target;
		if (img.src.endsWith('.png')) {
			// Try .gif instead of .png if it fails
			img.src = img.src.replace('.png', '.gif');
		} else {
			failedImages[emojiKey] = true;
			img.style.display = 'none';
		}
	}

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
	class="flex h-full flex-col items-center justify-center border-4 border-black bg-chart-3 p-6 text-foreground shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
>
	<h2
		class="mb-4 inline-block -rotate-2 transform border-4 border-black bg-white px-6 py-2 text-3xl font-black tracking-tight uppercase"
	>
		Vibe Check
	</h2>

	<!-- Scroll indicator -->
	<div
		class="mb-2 flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase opacity-70"
	>
		<span>↓</span>
		<span>Przewiń aby zobaczyć więcej</span>
		<span>↓</span>
	</div>

	<div
		class="custom-scrollbar w-full max-w-md flex-1 space-y-8 overflow-y-auto px-2 pb-4 text-center"
	>
		<!-- Inline -->
		<div class="relative pt-2">
			<button
				class="absolute top-0 right-0 z-20 h-5 w-5 rounded-full border-2 border-black bg-white/40 text-[10px] font-bold text-black transition-colors hover:bg-black hover:text-white"
				onmouseenter={() => showTooltipOnHover('inline')}
				onmouseleave={() => hideTooltip('inline')}
				onclick={() => toggleTooltip('inline')}
				type="button">?</button
			>
			{#if showTooltip['inline']}
				<div
					class="absolute top-full right-0 z-30 mt-2 w-44 rounded-lg border-2 border-black bg-black p-2 text-xs font-bold text-white shadow-lg"
				>
					Emoji których sam/-a używasz bezpośrednio w treści swoich wiadomości.
				</div>
			{/if}
			<h3
				class="mb-4 inline-block bg-black px-2 text-sm font-black tracking-widest text-white uppercase"
			>
				Twoje ulubione w tekście
			</h3>
			<div class="flex flex-wrap items-end justify-center gap-3">
				{#each (user.metrics.topEmojisInline || []).slice(0, 3) as emoji, i}
					<div
						class="flex flex-col items-center border-4 border-black bg-white p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
					>
						{#if emoji.emoji_id && !failedImages[emoji.key]}
							<div class="mb-1 flex h-10 w-10 items-center justify-center">
								<img
									src="/emojis/{emoji.emoji_id}.png"
									alt={emoji.key.split(':')[0]}
									class="h-full w-full object-contain"
									onerror={(e) => handleImageError(e, emoji.key)}
								/>
							</div>
						{/if}
						{#if !emoji.emoji_id || failedImages[emoji.key]}
							<div class="mb-1 text-2xl">{emoji.key.split(':')[0]}</div>
						{/if}
						<div class="bg-black px-1.5 py-0.5 text-[10px] font-bold text-white">
							{emoji.count.toLocaleString()}
						</div>
					</div>
				{/each}
				{#if (user.metrics.topEmojisInline || []).length === 0}
					<p class="border-2 border-black bg-white p-2 text-xs font-bold italic">
						Brak emoji w tekście
					</p>
				{/if}
			</div>
		</div>

		<!-- Sent Reactions -->
		<div class="relative pt-2">
			<button
				class="absolute top-0 right-0 z-20 h-5 w-5 rounded-full border-2 border-black bg-white/40 text-[10px] font-bold text-black transition-colors hover:bg-black hover:text-white"
				onmouseenter={() => showTooltipOnHover('sent')}
				onmouseleave={() => hideTooltip('sent')}
				onclick={() => toggleTooltip('sent')}
				type="button">?</button
			>
			{#if showTooltip['sent']}
				<div
					class="absolute top-full right-0 z-30 mt-2 w-44 rounded-lg border-2 border-black bg-black p-2 text-xs font-bold text-white shadow-lg"
				>
					Reakcje które Ty klikasz pod wiadomościami innych (lub swoimi).
				</div>
			{/if}
			<h3
				class="mb-4 inline-block border-2 border-black bg-white px-2 text-sm font-black tracking-widest uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
			>
				Twoje reakcje pod postami
			</h3>
			<div class="flex flex-wrap items-end justify-center gap-3">
				{#each (user.metrics.topReactionsSent || []).slice(0, 3) as emoji, i}
					<div
						class="flex flex-col items-center border-4 border-black bg-white p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
					>
						{#if emoji.emoji_id && !failedImages[emoji.key + '_sent']}
							<div class="mb-1 flex h-10 w-10 items-center justify-center">
								<img
									src="/emojis/{emoji.emoji_id}.png"
									alt={emoji.key.split(':')[0]}
									class="h-full w-full object-contain"
									onerror={(e) => handleImageError(e, emoji.key + '_sent')}
								/>
							</div>
						{/if}
						{#if !emoji.emoji_id || failedImages[emoji.key + '_sent']}
							<div class="mb-1 text-2xl">{emoji.key.split(':')[0]}</div>
						{/if}
						<div class="border border-black bg-white px-1.5 py-0.5 text-[10px] font-bold">
							{emoji.count.toLocaleString()}
						</div>
					</div>
				{/each}
				{#if (user.metrics.topReactionsSent || []).length === 0}
					<p class="border-2 border-black bg-white p-2 text-xs font-bold italic">
						Zero reakcji wysłanych
					</p>
				{/if}
			</div>
		</div>

		<!-- Received -->
		<div class="relative pt-2">
			<button
				class="absolute top-0 right-0 z-20 h-5 w-5 rounded-full border-2 border-black bg-white/40 text-[10px] font-bold text-black transition-colors hover:bg-black hover:text-white"
				onmouseenter={() => showTooltipOnHover('received')}
				onmouseleave={() => hideTooltip('received')}
				onclick={() => toggleTooltip('received')}
				type="button">?</button
			>
			{#if showTooltip['received']}
				<div
					class="absolute top-full right-0 z-30 mt-2 w-44 rounded-lg border-2 border-black bg-black p-2 text-xs font-bold text-white shadow-lg"
				>
					Reakcje które inni użytkownicy najczęściej dodają do Twoich wiadomości.
				</div>
			{/if}
			<h3
				class="mb-4 inline-block border-2 border-black bg-accent px-2 text-sm font-black tracking-widest text-accent-foreground uppercase"
			>
				Reakcje innych pod Twoimi
			</h3>
			<div class="flex flex-wrap items-end justify-center gap-3">
				{#each user.metrics.topEmojisReceived.slice(0, 3) as emoji, i}
					<div
						class="flex flex-col items-center border-4 border-black bg-white p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
					>
						{#if emoji.emoji_id && !failedImages[emoji.key + '_rec']}
							<div class="mb-1 flex h-10 w-10 items-center justify-center">
								<img
									src="/emojis/{emoji.emoji_id}.png"
									alt={emoji.key.split(':')[0]}
									class="h-full w-full object-contain"
									onerror={(e) => handleImageError(e, emoji.key + '_rec')}
								/>
							</div>
						{/if}
						{#if !emoji.emoji_id || failedImages[emoji.key + '_rec']}
							<div class="mb-1 text-2xl">{emoji.key.split(':')[0]}</div>
						{/if}
						<div
							class="border-2 border-black bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground"
						>
							{emoji.count.toLocaleString()}
						</div>
					</div>
				{/each}
				{#if user.metrics.topEmojisReceived.length === 0}
					<p class="border-2 border-black bg-white p-2 text-xs font-bold italic">Zero reakcji :(</p>
				{/if}
			</div>
		</div>

		<!-- Words -->
		{#if user.metrics.topWords && user.metrics.topWords.length > 0}
			<div
				class="relative rotate-1 transform border-4 border-black bg-chart-4 p-3 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
			>
				<button
					class="absolute top-1 right-1 z-20 h-5 w-5 rounded-full border-2 border-black bg-white/40 text-[10px] font-bold text-black transition-colors hover:bg-black hover:text-white"
					onmouseenter={() => showTooltipOnHover('words')}
					onmouseleave={() => hideTooltip('words')}
					onclick={() => toggleTooltip('words')}
					type="button">?</button
				>
				{#if showTooltip['words']}
					<div
						class="absolute right-1 bottom-full z-30 mb-2 w-44 rounded-lg border-2 border-black bg-black p-2 text-xs font-bold text-white shadow-lg"
					>
						Słowa, których używasz najczęściej (po odfiltrowaniu 'bo', 'ale', 'chyba' itp.)
					</div>
				{/if}
				<p class="mb-1 text-[10px] font-black tracking-widest uppercase">Twój Słownik</p>
				<p class="text-lg leading-tight font-black wrap-break-word">
					"{user.metrics.topWords
						.map((w) => w.word)
						.slice(0, 5)
						.join(', ')}"
				</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.custom-scrollbar::-webkit-scrollbar {
		width: 8px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: #fff;
		border: 2px solid #000;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: #000;
	}
</style>
