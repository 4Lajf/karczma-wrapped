<script>
	let { user } = $props();
	let showTooltip = $state({
		entropy: false,
		vocab: false,
		sessions: false,
		sleep: false,
		wlb: false,
		latency: false,
		voidScore: false,
		caps: false,
		questions: false
	});
	let vocabSide = $state('unique'); // 'unique' or 'common'

	// Vocabulary fingerprint (derived)
	const hasVocab = $derived(
		user.metrics.vocabularyFingerprint && user.metrics.vocabularyFingerprint.length > 0
	);
	const hasTopWords = $derived(user.metrics.topWords && user.metrics.topWords.length > 0);

	// Session analysis (derived)
	const hasSessions = $derived(user.metrics.sessionAnalysis);

	// Chronotype (derived)
	const hasChronotype = $derived(user.metrics.chronotype);

	// Response latency (derived)
	const hasLatency = $derived(
		user.metrics.responseLatency && typeof user.metrics.responseLatency === 'object'
	);

	// Entropy (Persona) (derived)
	const hasEntropy = $derived(user.metrics.entropy);

	// Void Score (derived)
	const hasVoidScore = $derived(user.metrics.voidScore !== undefined);

	// Content Habits (derived)
	const hasHabits = $derived(user.metrics.contentHabits);

	// Work Life Balance (derived)
	const hasWLB = $derived(user.metrics.workLifeBalance);

	function toggleTooltip(key) {
		showTooltip[key] = !showTooltip[key];
	}

	function showTooltipOnHover(key) {
		showTooltip[key] = true;
	}

	function hideTooltip(key) {
		showTooltip[key] = false;
	}

	function formatDuration(seconds) {
		if (seconds < 60) return `${seconds}s`;
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = Math.round(seconds % 60);

		if (h > 0) return `${h}h ${m}m ${s}s`;
		return `${m}m ${s}s`;
	}
</script>

<div
	class="flex h-full flex-col items-center border-4 border-black bg-chart-4 p-6 text-foreground shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
>
	<h2
		class="mb-4 -rotate-1 transform border-2 border-white bg-black px-6 py-2 text-3xl font-black tracking-tight text-white uppercase"
	>
		Deep Stats 🔬
	</h2>

	<!-- Scroll indicator -->
	<div
		class="mb-2 flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase opacity-70"
	>
		<span>↓</span>
		<span>Przewiń aby zobaczyć więcej</span>
		<span>↓</span>
	</div>

	<div class="custom-scrollbar w-full max-w-md flex-1 space-y-5 overflow-y-auto pr-2 pb-8">
		<!-- Entropy (Explorer Persona) -->
		{#if hasEntropy}
			<div
				class="relative rotate-1 transform border-4 border-black bg-yellow-300 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:scale-[1.02] {showTooltip[
					'entropy'
				]
					? 'z-40'
					: 'z-10'}"
			>
				<button
					class="absolute top-2 right-2 z-20 h-5 w-5 rounded-full border-2 border-black bg-white/40 text-[10px] font-bold text-black transition-colors hover:bg-black hover:text-white"
					onmouseenter={() => showTooltipOnHover('entropy')}
					onmouseleave={() => hideTooltip('entropy')}
					onclick={() => toggleTooltip('entropy')}
					type="button">?</button
				>
				{#if showTooltip['entropy']}
					<div
						class="absolute top-full right-2 z-30 mt-2 w-44 rounded-lg border-2 border-black bg-black p-2 text-xs font-bold text-white shadow-lg"
					>
						Entropia Shannona - miara zróżnicowania kanałów, w których się udzielasz. Im wyższy
						wynik (max 10), tym bardziej 'wszędobylski/-a' jesteś na serwerze.
					</div>
				{/if}
				<h3 class="mb-2 text-xs font-black tracking-widest text-black uppercase">
					Styl Eksploracji
				</h3>
				<div class="flex items-center justify-between">
					<div>
						<p class="text-2xl leading-none font-black uppercase">{user.metrics.entropy.persona}</p>
						<p class="mt-1 text-[10px] font-bold">Różnorodność kanałów</p>
					</div>
					<div class="text-right">
						<p class="text-xl font-black">{user.metrics.entropy.normalized}/10</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- Vocabulary Fingerprint -->
		{#if hasVocab}
			<div
				class="relative border-4 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:scale-[1.02] {showTooltip[
					'vocab'
				]
					? 'z-40'
					: 'z-10'}"
			>
				<div class="absolute top-2 right-2 z-20 flex items-center gap-2">
					<button
						class="h-5 w-5 rounded-full border-2 border-black bg-gray-100 text-[10px] font-bold transition-colors hover:bg-black hover:text-white"
						onmouseenter={() => showTooltipOnHover('vocab')}
						onmouseleave={() => hideTooltip('vocab')}
						onclick={() => toggleTooltip('vocab')}
						type="button">?</button
					>
				</div>
				<button
					class="absolute right-0 bottom-0 z-20 flex h-10 w-10 items-center justify-center border-t-4 border-l-4 border-black bg-yellow-400 transition-colors hover:bg-black hover:text-white"
					onclick={() => (vocabSide = vocabSide === 'unique' ? 'part2' : 'unique')}
					title={vocabSide === 'unique' ? 'Pokaż więcej' : 'Wróć'}
					type="button"
				>
					{#if vocabSide === 'unique'}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="4"
							stroke-linecap="round"
							stroke-linejoin="round"><path d="m9 18 6-6-6-6" /></svg
						>
					{:else}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="4"
							stroke-linecap="round"
							stroke-linejoin="round"><path d="m15 18-6-6 6-6" /></svg
						>
					{/if}
				</button>
				{#if showTooltip['vocab']}
					<div
						class="absolute right-2 bottom-full z-30 mb-2 w-44 rounded-lg border-2 border-black bg-black p-2 text-xs font-bold text-white shadow-lg"
					>
						Słowa, których używasz częściej niż statystyczny użytkownik tego serwera. Liczba
						pokazuje ile razy częściej używasz tego słowa.
					</div>
				{/if}

				{#if vocabSide === 'unique'}
					<h3 class="mb-3 text-xs font-black tracking-widest uppercase">
						Twoje Unikalne Słowa (1/2)
					</h3>
					<div class="space-y-2">
						{#each user.metrics.vocabularyFingerprint.slice(0, 5) as w, i}
							<div
								class="flex items-center justify-between border-b-2 border-dashed border-gray-300 pb-2 last:border-0"
							>
								<span class="text-lg font-bold text-primary">"{w.word}"</span>
								<span
									class="border-2 border-black bg-secondary px-2 py-1 font-mono text-xs text-secondary-foreground"
									>×{Math.round(w.score)} częściej</span
								>
							</div>
						{/each}
					</div>
				{:else}
					<h3 class="mb-3 text-xs font-black tracking-widest uppercase">
						Twoje Unikalne Słowa (2/2)
					</h3>
					<div class="space-y-2">
						{#each user.metrics.vocabularyFingerprint.slice(5, 10) as w, i}
							<div
								class="flex items-center justify-between border-b-2 border-dashed border-gray-300 pb-2 last:border-0"
							>
								<span class="text-lg font-bold text-primary">"{w.word}"</span>
								<span
									class="border-2 border-black bg-secondary px-2 py-1 font-mono text-xs text-secondary-foreground"
									>×{Math.round(w.score)} częściej</span
								>
							</div>
						{/each}
					</div>
				{/if}
				<p class="mt-3 text-xs text-muted-foreground italic">Używasz tych słów częściej niż inni</p>
			</div>
		{/if}

		<!-- Session Analysis -->
		{#if hasSessions}
			<div
				class="relative rotate-1 transform border-4 border-black bg-secondary p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:scale-[1.02] {showTooltip[
					'sessions'
				]
					? 'z-40'
					: 'z-10'}"
			>
				<button
					class="absolute top-2 right-2 z-20 h-5 w-5 rounded-full border-2 border-black bg-white/40 text-[10px] font-bold text-black transition-colors hover:bg-black hover:text-white"
					onmouseenter={() => showTooltipOnHover('sessions')}
					onmouseleave={() => hideTooltip('sessions')}
					onclick={() => toggleTooltip('sessions')}
					type="button">?</button
				>
				{#if showTooltip['sessions']}
					<div
						class="absolute right-2 bottom-full z-30 mb-2 w-44 rounded-lg border-2 border-black bg-black p-2 text-xs font-bold text-white shadow-lg"
					>
						Sesja to ciąg wiadomości wysyłanych z przerwami nie dłuższymi niż 30 minut. Pokazuje ile
						razy 'zasiadałeś/-aś' do Discorda.
					</div>
				{/if}
				<h3 class="mb-3 text-xs font-black tracking-widest uppercase">Analiza Sesji</h3>
				<div class="grid grid-cols-2 gap-4">
					<div class="text-center">
						<p class="text-3xl font-black text-primary">
							{user.metrics.sessionAnalysis.sessionCount.toLocaleString()}
						</p>
						<p class="text-[10px] font-bold uppercase">Sesji</p>
					</div>
					<div class="text-center">
						<p class="text-3xl font-black text-accent">
							{user.metrics.sessionAnalysis.avgSessionLength}m
						</p>
						<p class="text-[10px] font-bold uppercase">Śr. długość</p>
					</div>
				</div>
				<div class="mt-3 border-t-2 border-black pt-2 text-center">
					<p class="text-lg font-black">{user.metrics.sessionAnalysis.avgAttentionSpan}s</p>
					<p class="text-[10px] font-bold text-muted-foreground uppercase">
						Średni odstęp między wiadomościami
					</p>
				</div>
			</div>
		{/if}

		<!-- Chronotype (Sleep Schedule) -->
		{#if hasChronotype}
			<div
				class="relative -rotate-1 transform border-4 border-black bg-accent p-4 text-accent-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:scale-[1.02] {showTooltip[
					'sleep'
				]
					? 'z-40'
					: 'z-10'}"
			>
				<button
					class="absolute top-2 right-2 z-20 h-5 w-5 rounded-full border-2 border-black bg-white/40 text-[10px] font-bold text-black transition-colors hover:bg-black hover:text-white"
					onmouseenter={() => showTooltipOnHover('sleep')}
					onmouseleave={() => hideTooltip('sleep')}
					onclick={() => toggleTooltip('sleep')}
					type="button">?</button
				>
				{#if showTooltip['sleep']}
					<div
						class="absolute right-2 bottom-full z-30 mb-2 w-44 rounded-lg border-2 border-black bg-black p-2 text-xs font-bold text-white shadow-lg"
					>
						Najdłuższy okres braku aktywności w ciągu doby. Algorytm szuka godzin gdy prawie nigdy
						nie piszesz - prawdopodobnie śpisz.
					</div>
				{/if}
				<h3 class="mb-3 text-xs font-black tracking-widest uppercase">Szacowany Sen</h3>
				<div class="flex items-center justify-center gap-4">
					<div class="text-center">
						<p class="text-4xl font-black">{user.metrics.chronotype.sleepStart}:00</p>
						<p class="text-[10px] font-bold uppercase">Cisza od</p>
					</div>
					<span class="text-2xl">→</span>
					<div class="text-center">
						<p class="text-4xl font-black">{user.metrics.chronotype.sleepEnd}:00</p>
						<p class="text-[10px] font-bold uppercase">Cisza do</p>
					</div>
				</div>
				<p class="mt-3 text-center text-sm font-bold">
					{user.metrics.chronotype.duration}h ciszy dziennie
				</p>
			</div>
		{/if}

		<!-- Work Life Balance -->
		{#if hasWLB}
			<div
				class="relative border-4 border-black bg-pink-300 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:scale-[1.02] {showTooltip[
					'wlb'
				]
					? 'z-40'
					: 'z-10'}"
			>
				<button
					class="absolute top-2 right-2 z-20 h-5 w-5 rounded-full border-2 border-black bg-white/40 text-[10px] font-bold text-black transition-colors hover:bg-black hover:text-white"
					onmouseenter={() => showTooltipOnHover('wlb')}
					onmouseleave={() => hideTooltip('wlb')}
					onclick={() => toggleTooltip('wlb')}
					type="button">?</button
				>
				{#if showTooltip['wlb']}
					<div
						class="absolute right-2 bottom-full z-30 mb-2 w-44 rounded-lg border-2 border-black bg-black p-2 text-xs font-bold text-white shadow-lg"
					>
						Stosunek wiadomości wysłanych w dni robocze (Pn-Pt) vs weekendy (Sob-Nd).
					</div>
				{/if}
				<h3 class="mb-3 text-xs font-black tracking-widest uppercase">Work-Life Balance</h3>
				<div class="flex h-8 w-full border-2 border-black">
					<div
						class="flex items-center justify-center bg-black text-[10px] font-bold text-white"
						style="width: {hasWLB.weekday * 100}%"
					>
						{Math.round(hasWLB.weekday * 100)}% Wk
					</div>
					<div
						class="flex items-center justify-center bg-white text-[10px] font-bold text-black"
						style="width: {hasWLB.weekend * 100}%"
					>
						{Math.round(hasWLB.weekend * 100)}% Wkd
					</div>
				</div>
			</div>
		{/if}

		<!-- Response Latency -->
		{#if hasLatency}
			<div
				class="relative border-4 border-black bg-chart-1 p-4 text-primary-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:scale-[1.02] {showTooltip[
					'latency'
				]
					? 'z-40'
					: 'z-10'}"
			>
				<button
					class="absolute top-2 right-2 z-20 h-5 w-5 rounded-full border-2 border-black bg-white/40 text-[10px] font-bold text-black transition-colors hover:bg-black hover:text-white"
					onmouseenter={() => showTooltipOnHover('latency')}
					onmouseleave={() => hideTooltip('latency')}
					onclick={() => toggleTooltip('latency')}
					type="button">?</button
				>
				{#if showTooltip['latency']}
					<div
						class="absolute right-2 bottom-full z-30 mb-2 w-44 rounded-lg border-2 border-black bg-black p-2 text-xs font-bold text-white shadow-lg"
					>
						Czas jaki upływa od momentu gdy ktoś Cię oznaczy (@) lub odpowie na Twoją wiadomość, do
						Twojej pierwszej reakcji w tym kanale.
					</div>
				{/if}
				<h3 class="mb-2 text-xs font-black tracking-widest uppercase">Czas Reakcji</h3>
				<p class="text-center text-4xl font-black">
					{formatDuration(user.metrics.responseLatency.average)}
				</p>
				<div class="mt-2 text-center text-[10px] font-bold uppercase opacity-70">
					Średni czas odpowiedzi
				</div>
			</div>
		{/if}

		<!-- Void Score -->
		{#if hasVoidScore && user.metrics.voidScore > 0}
			<div
				class="relative rotate-1 transform border-4 border-black bg-gray-200 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:scale-[1.02] {showTooltip[
					'voidScore'
				]
					? 'z-40'
					: 'z-10'}"
			>
				<button
					class="absolute top-2 right-2 z-20 h-5 w-5 rounded-full border-2 border-black bg-white/40 text-[10px] font-bold text-black transition-colors hover:bg-black hover:text-white"
					onmouseenter={() => showTooltipOnHover('voidScore')}
					onmouseleave={() => hideTooltip('voidScore')}
					onclick={() => toggleTooltip('voidScore')}
					type="button">?</button
				>
				{#if showTooltip['voidScore']}
					<div
						class="absolute right-2 bottom-full z-30 mb-2 w-44 rounded-lg border-2 border-black bg-black p-2 text-xs font-bold text-white shadow-lg"
					>
						Stosunek wysłanych wiadomości do otrzymanych odpowiedzi i reakcji. Wynik {user.metrics
							.voidScore} oznacza, że na każde {user.metrics.voidScore} Twoich wiadomości przypada 1 reakcja/odpowiedź
						innych.
					</div>
				{/if}
				<div class="flex items-center justify-between">
					<span class="text-xs font-black tracking-widest uppercase">Krzyk w próżnię</span>
					<span class="text-xl font-black">{user.metrics.voidScore}</span>
				</div>
				<p class="mt-1 text-[10px] font-bold text-muted-foreground">
					Im wyżej, tym bardziej Twoje wiadomości są ignorowane przez społeczność.
				</p>
			</div>
		{/if}

		<!-- Content Habits (Caps, Questions) -->
		{#if hasHabits}
			<div class="grid grid-cols-2 gap-4">
				<div
					class="relative border-4 border-black bg-white p-2 text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform hover:scale-[1.02] {showTooltip[
						'caps'
					]
						? 'z-40'
						: 'z-10'}"
				>
					<button
						class="absolute top-1 right-1 z-20 h-4 w-4 rounded-full border border-black bg-gray-100 text-[8px] font-bold transition-colors hover:bg-black hover:text-white"
						onmouseenter={() => showTooltipOnHover('caps')}
						onmouseleave={() => hideTooltip('caps')}
						onclick={() => toggleTooltip('caps')}
						type="button">?</button
					>
					{#if showTooltip['caps']}
						<div
							class="absolute bottom-full left-1/2 z-50 mb-2 w-40 -translate-x-1/2 rounded-lg border-2 border-black bg-black p-2 text-[10px] font-bold text-white shadow-lg"
						>
							Procent wiadomości zawierających więcej niż 60% wielkich liter (KRZYCZYSZ!).
						</div>
					{/if}
					<p class="text-xl font-black">{(hasHabits.capsRatio * 100).toFixed(1)}%</p>
					<p class="text-[10px] font-bold uppercase">Caps Lock</p>
				</div>
				<div
					class="relative border-4 border-black bg-white p-2 text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform hover:scale-[1.02] {showTooltip[
						'questions'
					]
						? 'z-40'
						: 'z-10'}"
				>
					<button
						class="absolute top-1 right-1 z-20 h-4 w-4 rounded-full border border-black bg-gray-100 text-[8px] font-bold transition-colors hover:bg-black hover:text-white"
						onmouseenter={() => showTooltipOnHover('questions')}
						onmouseleave={() => hideTooltip('questions')}
						onclick={() => toggleTooltip('questions')}
						type="button">?</button
					>
					{#if showTooltip['questions']}
						<div
							class="absolute bottom-full left-1/2 z-50 mb-2 w-40 -translate-x-1/2 rounded-lg border-2 border-black bg-black p-2 text-[10px] font-bold text-white shadow-lg"
						>
							Procent wiadomości zakończonych znakiem zapytania.
						</div>
					{/if}
					<p class="text-xl font-black">{(hasHabits.questionRatio * 100).toFixed(1)}%</p>
					<p class="text-[10px] font-bold uppercase">Pytania</p>
				</div>
			</div>
		{/if}

		{#if !hasVocab && !hasSessions && !hasChronotype && !hasLatency && !hasEntropy}
			<div
				class="border-4 border-black bg-white p-8 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
			>
				<p class="mb-2 text-2xl font-black">🔬</p>
				<p class="font-bold">Brak zaawansowanych statystyk</p>
				<p class="mt-2 text-sm text-muted-foreground">Zbyt mało danych do głębszej analizy</p>
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
