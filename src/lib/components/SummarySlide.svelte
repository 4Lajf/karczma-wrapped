<script>
	let { user } = $props();

	// Stats derived from user data
	const rank = $derived(user.metrics.rank || 0);
	const totalMessages = $derived(user.metrics.totalMessages || 0);
	const activeDays = $derived(user.metrics.activeDays || 0);
	const topChannelData = $derived(user.metrics.topChannels?.[0]);
	const topChannel = $derived(topChannelData?.name || '-');
	const topChannelPercent = $derived(topChannelData?.percentage || 0);
	const topChannelCount = $derived(topChannelData?.count || 0);

	const customEmojis = $derived((user.metrics.topEmojisInline || []).filter(r => r.emoji_id));
	const topEmoji = $derived(customEmojis[0]?.key || '❓');
	const topEmojiId = $derived(customEmojis[0]?.emoji_id);
	const secondEmoji = $derived(customEmojis[1]?.key || '📂');
	const secondEmojiId = $derived(customEmojis[1]?.emoji_id);
	const thirdEmoji = $derived(customEmojis[2]?.key || '🎨');
	const thirdEmojiId = $derived(customEmojis[2]?.emoji_id);
	const topWord = $derived(user.metrics.topWords?.[0]?.word || '-');

	// New detailed stats
	const starboardCount = $derived(user.metrics.starboardCount || 0);
	const attachmentCount = $derived(user.metrics.attachmentCount || 0);
	const sessionCount = $derived(user.metrics.sessionAnalysis?.sessionCount || 0);
	const badgesEarned = $derived(user.metrics.badges?.filter((b) => b.achieved).length || 0);
	const avgMsgsPerDay = $derived(activeDays > 0 ? (totalMessages / activeDays).toFixed(1) : 0);
	const longestStreak = $derived(user.metrics.longestStreak || 0);
	const avgCharCount = $derived(user.metrics.avgMessageLength || 0);
	const dayNames = ['NIEDZIELA', 'PONIEDZIAŁEK', 'WTOREK', 'ŚRODA', 'CZWARTEK', 'PIĄTEK', 'SOBOTA'];
	const topDay = $derived(user.metrics.dailyDistribution ? dayNames[user.metrics.dailyDistribution.indexOf(Math.max(...user.metrics.dailyDistribution))] : '-');
	const chronotype = $derived(user.metrics.chronotype || { sleepStart: 0, sleepEnd: 0 });
	const uniqueWordsLine = $derived(user.metrics.vocabularyFingerprint?.slice(0, 4).map(v => v.word).join(', ') || '');
	const monthNames = ['STY', 'LUT', 'MAR', 'KWI', 'MAJ', 'CZE', 'LIP', 'SIE', 'WRZ', 'PAŹ', 'LIS', 'GRU'];
	const topMonth = $derived(user.metrics.mostActiveMonth ? monthNames[user.metrics.mostActiveMonth - 1] : '-');
	const topMentioned = $derived(user.metrics.topMentions?.[0]?.name || '-');
	const topMentionedBy = $derived(user.metrics.topMentionedBy?.[0]?.name || '-');
	const avgResponseTime = $derived(user.metrics.responseLatency?.average || 0);

	function formatTime(seconds) {
		const d = Math.floor(seconds / 86400);
		const h = Math.floor((seconds % 86400) / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = Math.round(seconds % 60);

		let res = [];
		if (d > 0) res.push(`${d}d`);
		if (h > 0) res.push(`${h}h`);
		if (m > 0) res.push(`${m}m`);
		if (s > 0 || res.length === 0) res.push(`${s}s`);
		return res.join(' ');
	}

	// Graph data
	const hourlyDist = $derived(user.metrics.hourlyDistribution || new Array(24).fill(0));
	const maxHourlyMsgs = $derived(Math.max(...hourlyDist, 1));

	let failedEmojis = $state({});
	function handleEmojiError(id) {
		failedEmojis[id] = true;
	}

	const currentTime = $derived(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
</script>

<div class="ngo-desktop relative h-full w-full overflow-hidden bg-[#b498f0] font-mono text-[10px] uppercase text-black sm:text-xs">
	<!-- Background Pattern -->
	<div class="absolute inset-0 opacity-20" style="background-image: radial-gradient(#000 1px, transparent 1px); background-size: 8px 8px;"></div>

	<!-- Desktop Icons -->
	<div class="absolute left-4 top-4 z-10 flex flex-col gap-6">
		<div class="flex flex-col items-center gap-1 group cursor-pointer">
			<div class="h-10 w-10 bg-pink-400 border-2 border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-xl">📈</div>
			<div class="max-w-[80px] text-center leading-tight">
				<span class="bg-blue-900/50 px-1 text-[8px] text-white drop-shadow-[1px_1px_0px_rgba(0,0,0,1)] [box-decoration-break:clone]">Rank #{rank}</span>
			</div>
		</div>
		<div class="flex flex-col items-center gap-1 group cursor-pointer">
			<div class="h-10 w-10 bg-purple-400 border-2 border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-xl">📺</div>
			<div class="max-w-[80px] text-center leading-tight">
				<span class="bg-blue-900/50 px-1 text-[8px] text-white drop-shadow-[1px_1px_0px_rgba(0,0,0,1)] [box-decoration-break:clone]">#{topChannel}<br />({topChannelPercent}%)</span>
			</div>
		</div>
		<div class="flex flex-col items-center gap-1 group cursor-pointer">
			<div class="h-10 w-10 bg-cyan-400 border-2 border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-xl">⏰</div>
			<div class="max-w-[80px] text-center leading-tight">
				<span class="bg-blue-900/50 px-1 text-[8px] text-white drop-shadow-[1px_1px_0px_rgba(0,0,0,1)] [box-decoration-break:clone]">Sen {chronotype.sleepStart}-{chronotype.sleepEnd}</span>
			</div>
		</div>
		<div class="flex flex-col items-center gap-1 group cursor-pointer">
			<div class="h-10 w-10 bg-yellow-400 border-2 border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-xl">🏆</div>
			<div class="max-w-[80px] text-center leading-tight">
				<span class="bg-blue-900/50 px-1 text-[8px] text-white drop-shadow-[1px_1px_0px_rgba(0,0,0,1)] [box-decoration-break:clone]">{badgesEarned} Odznak</span>
			</div>
		</div>
		<div class="flex flex-col items-center gap-1 group cursor-pointer">
			<div class="h-10 w-10 bg-orange-400 border-2 border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-xl">🖼️</div>
			<div class="max-w-[80px] text-center leading-tight">
				<span class="bg-blue-900/50 px-1 text-[8px] text-white drop-shadow-[1px_1px_0px_rgba(0,0,0,1)] [box-decoration-break:clone]">{attachmentCount} Media</span>
			</div>
		</div>
		<div class="flex flex-col items-center gap-1 group cursor-pointer mt-auto">
			<div class="h-10 w-10 bg-gray-400 border-2 border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-xl">🗑️</div>
			<div class="max-w-[80px] text-center leading-tight">
				<span class="bg-blue-900/50 px-1 text-[8px] text-white drop-shadow-[1px_1px_0px_rgba(0,0,0,1)] [box-decoration-break:clone]">Kosz</span>
			</div>
		</div>
	</div>

	<!-- Mobile Container -->
	<div class="relative mx-auto flex h-full max-w-[420px] flex-col p-4 pb-16">
		
		<!-- WEBCAM WINDOW -->
		<div class="ngo-window mb-4 w-48 self-center shadow-xl">
			<div class="ngo-title-bar bg-linear-to-r from-pink-500 to-purple-600">
				<span class="text-[8px] flex items-center gap-1">🎥 webcam.exe</span>
				<div class="flex gap-0.5">
					<div class="h-3 w-3 border border-black bg-white flex items-center justify-center text-[8px] text-black">_</div>
					<div class="h-3 w-3 border border-black bg-white flex items-center justify-center text-[8px] text-black">X</div>
				</div>
			</div>
			<div class="ngo-window-content aspect-square bg-slate-900 relative overflow-hidden">
				<img src={user.profile.avatarUrl} alt="avatar" class="h-full w-full object-cover opacity-90 sepia-[0.2] hue-rotate-320" />
				<div class="absolute top-2 left-2 flex items-center gap-1 bg-red-600 px-1 text-[8px] text-white animate-pulse">
					<span class="h-1.5 w-1.5 rounded-full bg-white"></span> LIVE
				</div>
				<div class="absolute bottom-2 right-2 text-[8px] text-white/50">REC 2025</div>
				<div class="scanline"></div>
				<div class="vignette"></div>
			</div>
		</div>

		<!-- STATS WINDOW (Task Manager Style) -->
		<div class="ngo-window ml-auto -mt-12 mb-4 w-52 z-20">
			<div class="ngo-title-bar bg-linear-to-r from-blue-600 to-cyan-500">
				<span class="text-[8px]">📊 Statystyki_Użytkownika</span>
			</div>
			<div class="ngo-window-content space-y-3 p-3 bg-white/90 backdrop-blur-sm">
				<div class="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] font-bold">
					<div class="flex justify-between border-b border-black/5 pb-0.5">
						<span class="opacity-60 uppercase text-[9px] self-end">Starboard:</span>
						<span class="text-orange-600 leading-none">{starboardCount}</span>
					</div>
					<div class="flex justify-between border-b border-black/5 pb-0.5">
						<span class="opacity-60 uppercase text-[9px] self-end">Sesje:</span>
						<span class="text-blue-600 leading-none">{sessionCount}</span>
					</div>
					<div class="flex justify-between border-b border-black/5 pb-0.5">
						<span class="opacity-60 uppercase text-[9px] self-end">Msg/dzien:</span>
						<span class="text-green-600 leading-none">{avgMsgsPerDay}</span>
					</div>
					<div class="flex justify-between border-b border-black/5 pb-0.5">
						<span class="opacity-60 uppercase text-[9px] self-end">Dzień:</span>
						<span class="text-pink-600 leading-none text-[8px]">{topDay}</span>
					</div>
				</div>
				<!-- REAL DATA GRAPH -->
				<div class="h-8 w-full border border-black bg-black relative overflow-hidden">
					<div class="absolute inset-0 flex items-end gap-px px-1">
						{#each hourlyDist as count, i}
							<div class="bg-green-500 w-full" style="height: {(count / maxHourlyMsgs) * 85 + 5}%; opacity: {0.4 + (i/24)*0.6}"></div>
						{/each}
					</div>
					<span class="absolute top-0.5 left-1 text-[6px] text-green-500">MESSAGES_BY_HOUR</span>
				</div>
			</div>
		</div>

		<!-- JINE WINDOW (Chat) -->
		<div class="ngo-window w-64 z-10 mt-2 shadow-2xl">
			<div class="ngo-title-bar bg-[#5cb85c]">
				<span class="text-[8px]">💬 JINE: {user.profile.name}</span>
			</div>
			<div class="ngo-window-content h-40 bg-[#f0fff0] p-2 flex flex-col gap-2 overflow-y-auto no-scrollbar border-t-0">
				<div class="self-start bg-white border border-black/10 p-2 shadow-sm rounded-lg rounded-tl-none max-w-[95%]">
					<p class="text-[9px]">No to ile nabiłeś na #{topChannel}?</p>
				</div>
				<div class="self-end bg-[#95ec69] border border-black/10 p-2 shadow-sm rounded-lg rounded-tr-none max-w-[95%] flex items-center gap-2">
					<p class="text-[9px] font-bold">{topChannelCount.toLocaleString()} wiadomości</p>
					<img src="/emojis/945796454021222441.webp" alt="" class="h-4 w-4 object-contain" />
				</div>
				<div class="self-start bg-white border border-black/10 p-2 shadow-sm rounded-lg rounded-tl-none max-w-[95%]">
					<p class="text-[9px]">A Twoje ulubione emoji?</p>
				</div>
				<div class="self-end bg-[#95ec69] border border-black/10 p-2 shadow-sm rounded-lg rounded-tr-none max-w-[95%] flex items-center gap-2">
					<span class="text-[9px] font-bold">{topEmoji}</span>
					{#if topEmojiId && !failedEmojis[topEmojiId]}
						<img src="/emojis/{topEmojiId}.png" alt="" class="h-4 w-4 object-contain" onerror={() => handleEmojiError(topEmojiId)} />
					{/if}
				</div>
			</div>
			<div class="bg-white border-t border-black p-1 flex gap-1">
				<div class="flex-1 bg-gray-100 border border-black/20 h-4"></div>
				<div class="w-8 bg-gray-200 border border-black text-[8px] flex items-center justify-center">SEND</div>
			</div>
		</div>

		<!-- SYSTEM LOGS WINDOW (Next to JINE) -->
		<div class="ngo-window absolute right-2 top-[48%] w-32 z-0 transform rotate-1 shadow-lg">
			<div class="ngo-title-bar bg-linear-to-r from-slate-500 to-slate-700">
				<span class="text-[8px]">logs.txt</span>
			</div>
			<div class="ngo-window-content p-2 bg-slate-50 text-[10px] space-y-1.5 leading-tight">
				<div class="flex flex-col border-b border-black/5 pb-1">
					<span class="opacity-50 uppercase text-[8px]">Zaczepiasz:</span>
					<span class="font-bold text-blue-700 truncate">{topMentioned}</span>
				</div>
				<div class="flex flex-col border-b border-black/5 pb-1">
					<span class="opacity-50 uppercase text-[8px]">Twój Fan:</span>
					<span class="font-bold text-orange-700 truncate">{topMentionedBy}</span>
				</div>
				<div class="flex flex-col">
					<span class="opacity-50 uppercase text-[8px]">Czas odp.:</span>
					<span class="font-bold text-slate-700 whitespace-nowrap">{formatTime(avgResponseTime)}</span>
				</div>
			</div>
		</div>
		
		<!-- VOCABULARY WINDOW -->
		<div class="ngo-window absolute left-6 bottom-16 w-36 z-30 transform -rotate-3">
			<div class="ngo-title-bar bg-linear-to-r from-orange-400 to-yellow-400">
				<span class="text-[8px] flex items-center gap-1">📖 slownik.exe</span>
			</div>
			<div class="ngo-window-content p-2 bg-white/90 min-h-[140px] flex flex-col justify-between">
				<div class="space-y-1">
					{#each user.metrics.topWords?.slice(0, 6) || [] as word}
						<div class="flex justify-between items-center border-b border-black/5 pb-0.5">
							<span class="text-[9px] truncate max-w-[70%] font-bold text-orange-800">{word.word}</span>
							<span class="text-[8px] opacity-50 italic">{word.count}</span>
						</div>
					{/each}
				</div>
				<div class="mt-2 text-[8px] text-center font-black border-t-2 border-black/10 pt-1 text-purple-700 leading-tight">
					{uniqueWordsLine}
				</div>
			</div>
		</div>

		<div class="absolute right-6 bottom-20 w-32 transform rotate-6 z-30">
			<div class="bg-[#ffff88] border-2 border-black p-2 shadow-[6px_6px_0px_rgba(0,0,0,0.2)] text-black font-bold">
				<div class="text-[10px] border-b-2 border-black mb-2 pb-1 text-center italic">PODSUMOWANIE</div>
				<div class="space-y-1 text-[9px]">
					<div class="flex justify-between">
						<span>TOP MIES:</span>
						<span class="text-xs">{topMonth}</span>
					</div>
					<div class="flex justify-between">
						<span>MSGS:</span>
						<span>{totalMessages.toLocaleString()}</span>
					</div>
					<div class="flex justify-between">
						<span>DNI AKTYW:</span>
						<span>{activeDays}</span>
					</div>
				</div>
			</div>
		</div>

	</div>

	<!-- TASKBAR -->
	<div class="absolute bottom-0 left-0 flex h-12 w-full items-center border-t-2 border-white bg-[#c0c0c0] px-2 shadow-[inset_1px_1px_0px_rgba(255,255,255,1)] z-50">
		<button class="flex h-9 items-center gap-1 border-2 border-black bg-[#c0c0c0] px-3 font-black shadow-[inset_1px_1px_0px_rgba(255,255,255,1),2px_2px_0px_rgba(0,0,0,1)] active:shadow-none -translate-x-px -translate-y-px active:translate-x-0 active:translate-y-0">
			{#if topEmojiId && !failedEmojis[topEmojiId]}
				<img src="/emojis/{topEmojiId}.png" alt="" class="h-5 w-5 object-contain" onerror={() => handleEmojiError(topEmojiId)} />
			{:else}
				<span class="text-lg">{topEmoji || '👼'}</span>
			{/if}
			<span class="text-[10px] ml-0.5">START</span>
		</button>
		
		<div class="ml-2 flex gap-1 overflow-hidden">
			<div class="h-9 w-9 border-2 border-black bg-[#e0e0e0] flex items-center justify-center shadow-[inset_1px_1px_0px_white]">
				{#if secondEmojiId && !failedEmojis[secondEmojiId]}
					<img src="/emojis/{secondEmojiId}.png" alt="" class="h-5 w-5 object-contain" onerror={() => handleEmojiError(secondEmojiId)} />
				{:else}
					<span class="text-lg">{secondEmoji}</span>
				{/if}
			</div>
			<div class="h-9 w-9 border-2 border-black bg-[#e0e0e0] flex items-center justify-center shadow-[inset_1px_1px_0px_white]">
				{#if thirdEmojiId && !failedEmojis[thirdEmojiId]}
					<img src="/emojis/{thirdEmojiId}.png" alt="" class="h-5 w-5 object-contain" onerror={() => handleEmojiError(thirdEmojiId)} />
				{:else}
					<span class="text-lg">{thirdEmoji}</span>
				{/if}
			</div>
		</div>

		<div class="ml-auto flex h-9 items-center gap-2 border-2 border-black bg-[#c0c0c0] px-3 shadow-[inset_-1px_-1px_0px_rgba(255,255,255,1)]">
			<div class="flex items-center gap-1 opacity-70">
				<div class="h-2 w-2 rounded-full bg-green-500"></div>
				<span class="text-[8px]">ON</span>
			</div>
			<span class="font-bold text-[10px] tabular-nums">{currentTime}</span>
		</div>
	</div>
</div>

<style>
	.ngo-desktop {
		background: linear-gradient(135deg, #b498f0 0%, #ff99cc 50%, #99ffff 100%);
		background-size: 400% 400%;
		animation: gradientBG 15s ease infinite;
	}

	@keyframes gradientBG {
		0% { background-position: 0% 50%; }
		50% { background-position: 100% 50%; }
		100% { background-position: 0% 50%; }
	}

	.ngo-window {
		border: 2px solid black;
		background: #c0c0c0;
		box-shadow: 4px 4px 0px 0px rgba(0,0,0,0.2);
	}

	.ngo-title-bar {
		color: white;
		padding: 3px 6px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-weight: black;
		border-bottom: 2px solid black;
	}

	.ngo-window-content {
		border-top: 1px solid white;
		color: black;
	}

	.scanline {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 4px;
		background: rgba(255, 255, 255, 0.1);
		animation: scanline 6s linear infinite;
		pointer-events: none;
	}

	@keyframes scanline {
		0% { transform: translateY(-100%); }
		100% { transform: translateY(400px); }
	}

	.vignette {
		position: absolute;
		inset: 0;
		background: radial-gradient(circle, transparent 50%, rgba(0,0,0,0.3) 100%);
		pointer-events: none;
	}

	.no-scrollbar::-webkit-scrollbar {
		display: none;
	}
	.no-scrollbar {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
</style>
