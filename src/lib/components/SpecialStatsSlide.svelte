<script>
	let { user } = $props();

	const funniestMessages = $derived(user.metrics.funniestMessages || []);
	const mostReactedMessages = $derived(user.metrics.mostReactedMessages || []);
	const longestMessage = $derived(user.metrics.longestMessage);
	const mostRepliedToMessage = $derived(user.metrics.mostRepliedToMessage);
	const totalWords = $derived(user.metrics.totalWords || 0);
	const typingTime = $derived(user.metrics.typingTimeMinutes || 0);
	const topRepliesTo = $derived(user.metrics.topRepliesTo?.[0]);
	const topRepliedBy = $derived(user.metrics.topRepliedBy?.[0]);

	let funnyPage = $state(0);
	let reactedPage = $state(0);
	const itemsPerPage = 3;

	const displayedFunniest = $derived(funniestMessages.slice(funnyPage * itemsPerPage, (funnyPage + 1) * itemsPerPage));
	const displayedReacted = $derived(mostReactedMessages.slice(reactedPage * itemsPerPage, (reactedPage + 1) * itemsPerPage));

	function formatTypingTime(minutes) {
		if (minutes < 60) return `${minutes} min`;
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		if (mins === 0) return `${hours}h`;
		return `${hours}h ${mins}m`;
	}

	function renderContent(content) {
		if (!content) return '';
		// Replace Discord custom emojis <:name:id> or <a:name:id> with something readable or nothing
		return content.replace(/<a?:\w+:(\d+)>/g, (match, id) => {
			return ''; // We'll show reactions separately
		}).trim();
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

<div
	class="flex h-full flex-col items-center border-4 border-black bg-[#FF90E8] p-4 text-foreground shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
>
	<h2
		class="mb-4 rotate-1 transform border-4 border-black bg-white px-6 py-2 text-2xl font-black tracking-tight uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
	>
		WIĘCEJ STATYSTYK
	</h2>

	<div class="custom-scrollbar w-full max-w-md flex-1 space-y-4 overflow-y-auto pr-2 pb-8">
		<!-- Replies Section -->
		<div class="grid grid-cols-2 gap-3">
			<div class="border-4 border-black bg-white p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
				<p class="text-[10px] font-black uppercase text-gray-500">Najwięcej odpisałeś</p>
				{#if topRepliesTo}
					<p class="truncate text-sm font-black uppercase">{topRepliesTo.name}</p>
					<p class="text-xs font-bold text-primary">{topRepliesTo.count} razy</p>
				{:else}
					<p class="text-xs font-bold italic">Brak danych</p>
				{/if}
			</div>
			<div class="border-4 border-black bg-white p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
				<p class="text-[10px] font-black uppercase text-gray-500">Najwięcej Ci odpisali</p>
				{#if topRepliedBy}
					<p class="truncate text-sm font-black uppercase">{topRepliedBy.name}</p>
					<p class="text-xs font-bold text-accent">{topRepliedBy.count} razy</p>
				{:else}
					<p class="text-xs font-bold italic">Brak danych</p>
				{/if}
			</div>
		</div>

		<!-- Typing Stats -->
		<div class="border-4 border-black bg-yellow-300 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
			<h3 class="mb-2 text-xs font-black uppercase">Statystyki Pisania</h3>
			<div class="flex justify-between items-center">
				<div>
					<p class="text-2xl font-black">{totalWords.toLocaleString()}</p>
					<p class="text-[10px] font-bold uppercase">Wysłanych słów</p>
				</div>
				<div class="text-right">
					<p class="text-2xl font-black">{formatTypingTime(typingTime)}</p>
					<p class="text-[10px] font-bold uppercase">Czas spędzony na pisaniu*</p>
				</div>
			</div>
			<p class="mt-2 text-[8px] italic opacity-70">*szacowane przy 40 WPM</p>
		</div>

		<!-- Funniest Messages -->
		{#if funniestMessages.length > 0}
			<div class="border-4 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
				<div class="mb-3 flex items-center justify-between">
					<h3 class="text-xs font-black uppercase">Top Najzabawniejsze</h3>
					<div class="flex items-center gap-2">
						<button 
							onclick={() => funnyPage = Math.max(0, funnyPage - 1)}
							disabled={funnyPage === 0}
							class="flex h-6 w-6 items-center justify-center border-2 border-black bg-gray-100 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-30"
						>
							&larr;
						</button>
						<span class="text-[10px] font-bold">{funnyPage + 1}/{Math.min(5, Math.ceil(funniestMessages.length / itemsPerPage))}</span>
						<button 
							onclick={() => funnyPage = Math.min(4, Math.max(0, Math.ceil(funniestMessages.length / itemsPerPage) - 1), funnyPage + 1)}
							disabled={funnyPage >= 4 || (funnyPage + 1) * itemsPerPage >= funniestMessages.length}
							class="flex h-6 w-6 items-center justify-center border-2 border-black bg-gray-100 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-30"
						>
							&rarr;
						</button>
					</div>
				</div>
				<div class="space-y-4">
					{#each displayedFunniest as msg, i}
						<div class="relative border-l-4 border-pink-500 pl-3">
							<div class="absolute -left-7 top-0 flex h-5 w-5 items-center justify-center bg-black text-[10px] font-black text-white">
								{funnyPage * itemsPerPage + i + 1}
							</div>
							<p class="text-xs leading-relaxed italic line-clamp-6 wrap-anywhere">"{renderContent(msg.content) || '(Tylko emoji/media)'}"</p>
							
							<!-- Inline Emojis if content was only emojis -->
							{#if !renderContent(msg.content)}
								<div class="mt-2 flex flex-wrap gap-1">
									{#each getEmojiUrls(msg.content) as url}
										<img src={url} alt="" class="h-8 w-8 object-contain" />
									{/each}
								</div>
							{/if}

							<!-- Attachments if any -->
							{#if msg.attachments && msg.attachments.length > 0}
								<div class="mt-2 flex flex-wrap gap-2">
									{#each msg.attachments as attr}
										{#if attr.type === 'image'}
											<img src={attr.url} alt="" class="max-h-32 rounded border border-black shadow-sm" />
										{:else}
											<div class="flex items-center gap-1 rounded bg-gray-100 p-1 text-[8px] border border-black">
												<span>📎</span> {attr.name}
											</div>
										{/if}
									{/each}
								</div>
							{/if}

							<div class="mt-2 flex flex-wrap gap-1">
								{#each msg.reactions.slice(0, 5) as react}
									<div class="flex items-center gap-0.5 rounded-full border border-black bg-gray-100 px-1.5 py-0.5 text-[10px]">
										{#if react.emoji_id}
											<img src="/emojis/{react.emoji_id}.png" alt="" class="h-3 w-3 object-contain" />
										{:else}
											<span>{react.emoji_name}</span>
										{/if}
										<span class="font-bold">{react.count}</span>
									</div>
								{/each}
							</div>
							<a href={msg.link} target="_blank" class="mt-1 block text-[10px] font-bold text-blue-600 underline">Skocz do wiadomości</a>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Most Reacted Messages -->
		{#if mostReactedMessages.length > 0}
			<div class="border-4 border-black bg-cyan-200 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
				<div class="mb-3 flex items-center justify-between">
					<h3 class="text-xs font-black uppercase text-cyan-900">Najwięcej Reakcji</h3>
					<div class="flex items-center gap-2">
						<button 
							onclick={() => reactedPage = Math.max(0, reactedPage - 1)}
							disabled={reactedPage === 0}
							class="flex h-6 w-6 items-center justify-center border-2 border-black bg-white/50 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-30"
						>
							&larr;
						</button>
						<span class="text-[10px] font-bold text-cyan-900">{reactedPage + 1}/{Math.min(5, Math.ceil(mostReactedMessages.length / itemsPerPage))}</span>
						<button 
							onclick={() => reactedPage = Math.min(4, Math.max(0, Math.ceil(mostReactedMessages.length / itemsPerPage) - 1), reactedPage + 1)}
							disabled={reactedPage >= 4 || (reactedPage + 1) * itemsPerPage >= mostReactedMessages.length}
							class="flex h-6 w-6 items-center justify-center border-2 border-black bg-white/50 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-30"
						>
							&rarr;
						</button>
					</div>
				</div>
				<div class="space-y-4">
					{#each displayedReacted as msg, i}
						<div class="relative border-l-4 border-cyan-500 pl-3">
							<div class="absolute -left-7 top-0 flex h-5 w-5 items-center justify-center bg-cyan-900 text-[10px] font-black text-white">
								{reactedPage * itemsPerPage + i + 1}
							</div>
							<p class="text-xs leading-relaxed italic line-clamp-6 wrap-anywhere">"{renderContent(msg.content) || '(Tylko emoji/media)'}"</p>
							
							<!-- Inline Emojis if content was only emojis -->
							{#if !renderContent(msg.content)}
								<div class="mt-2 flex flex-wrap gap-1">
									{#each getEmojiUrls(msg.content) as url}
										<img src={url} alt="" class="h-8 w-8 object-contain" />
									{/each}
								</div>
							{/if}

							<!-- Attachments if any -->
							{#if msg.attachments && msg.attachments.length > 0}
								<div class="mt-2 flex flex-wrap gap-2">
									{#each msg.attachments as attr}
										{#if attr.type === 'image'}
											<img src={attr.url} alt="" class="max-h-32 rounded border border-black shadow-sm" />
										{:else}
											<div class="flex items-center gap-1 rounded bg-gray-100 p-1 text-[8px] border border-black">
												<span>📎</span> {attr.name}
											</div>
										{/if}
									{/each}
								</div>
							{/if}

							<div class="mt-2 flex flex-wrap gap-1">
								{#each msg.reactions.slice(0, 5) as react}
									<div class="flex items-center gap-0.5 rounded-full border border-black {react.emoji_name === msg.emoji_name ? 'bg-cyan-400' : 'bg-white'} px-1.5 py-0.5 text-[10px]">
										{#if react.emoji_id}
											<img src="/emojis/{react.emoji_id}.png" alt="" class="h-3 w-3 object-contain" />
										{:else}
											<span>{react.emoji_name}</span>
										{/if}
										<span class="font-bold">{react.count}</span>
									</div>
								{/each}
							</div>
							<a href={msg.link} target="_blank" class="mt-1 block text-[10px] font-bold text-blue-600 underline">Skocz do wiadomości</a>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Longest Message -->
		{#if longestMessage}
			<div class="border-4 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
				<h3 class="mb-2 text-xs font-black uppercase">Twoja Najdłuższa Wiadomość</h3>
				<div class="bg-gray-50 p-2 border-2 border-dashed border-black">
					<p class="text-xs italic leading-relaxed wrap-anywhere">"{longestMessage.content}"</p>
					<div class="mt-2 flex justify-between items-center">
						<span class="text-[10px] font-bold text-gray-500">{longestMessage.char_count} znaków</span>
						<a href={longestMessage.link} target="_blank" class="text-[10px] font-bold text-blue-600 underline">Zobacz całość</a>
					</div>
				</div>
			</div>
		{/if}

		<!-- Most Replied To Message -->
		{#if mostRepliedToMessage}
			<div class="border-4 border-black bg-green-200 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
				<h3 class="mb-2 text-xs font-black uppercase text-green-900">Rozpocząłeś Wielką Dyskusję</h3>
				<p class="text-[10px] mb-2 font-bold opacity-70">Ta wiadomość otrzymała {mostRepliedToMessage.count} odpowiedzi:</p>
				<div class="bg-white p-3 border-2 border-black rounded-lg">
					<p class="text-xs leading-relaxed line-clamp-12 wrap-anywhere">"{mostRepliedToMessage.content}"</p>
					
					{#if !renderContent(mostRepliedToMessage.content)}
						<div class="mt-2 flex flex-wrap gap-1">
							{#each getEmojiUrls(mostRepliedToMessage.content) as url}
								<img src={url} alt="" class="h-8 w-8 object-contain" />
							{/each}
						</div>
					{/if}

					{#if mostRepliedToMessage.attachments && mostRepliedToMessage.attachments.length > 0}
						<div class="mt-2 flex flex-wrap gap-2">
							{#each mostRepliedToMessage.attachments as attr}
								{#if attr.type === 'image'}
									<img src={attr.url} alt="" class="max-h-32 rounded border border-black shadow-sm" />
								{:else}
									<div class="flex items-center gap-1 rounded bg-gray-100 p-1 text-[8px] border border-black">
										<span>📎</span> {attr.name}
									</div>
								{/if}
							{/each}
						</div>
					{/if}

					<div class="mt-3 flex flex-wrap gap-1">
						{#each mostRepliedToMessage.reactions.slice(0, 8) as react}
							<div class="flex items-center gap-0.5 rounded-full border border-black bg-gray-50 px-1.5 py-0.5 text-[10px]">
								{#if react.emoji_id}
									<img src="/emojis/{react.emoji_id}.png" alt="" class="h-3 w-3 object-contain" />
								{:else}
									<span>{react.emoji_name}</span>
								{/if}
								<span class="font-bold">{react.count}</span>
							</div>
						{/each}
					</div>
					<a href={mostRepliedToMessage.link} target="_blank" class="mt-2 block text-[10px] font-bold text-blue-600 underline">Link do dyskusji</a>
				</div>
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

