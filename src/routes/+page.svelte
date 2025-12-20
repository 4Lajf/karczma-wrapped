<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { toPng } from 'html-to-image';
	import IntroSlide from '$lib/components/IntroSlide.svelte';
	import ActivitySlide from '$lib/components/ActivitySlide.svelte';
	import InteractionSlide from '$lib/components/InteractionSlide.svelte';
	import EmojiSlide from '$lib/components/EmojiSlide.svelte';
	import TimeSlide from '$lib/components/TimeSlide.svelte';
	import ChannelsSlide from '$lib/components/ChannelsSlide.svelte';
	import DeepStatsSlide from '$lib/components/DeepStatsSlide.svelte';
	import BadgesSlide from '$lib/components/BadgesSlide.svelte';
	import SpecialStatsSlide from '$lib/components/SpecialStatsSlide.svelte';
	import SummarySlide from '$lib/components/SummarySlide.svelte';

	let data = $state(null);
	let currentUser = $state(null);
	let currentSlide = $state(0);
	let searchTerm = $state('');
	let loading = $state(true);
	let wrappedContainer = $state(null);

	const slides = [
		IntroSlide,
		ActivitySlide,
		InteractionSlide,
		EmojiSlide,
		TimeSlide,
		ChannelsSlide,
		DeepStatsSlide,
		SpecialStatsSlide,
		BadgesSlide,
		SummarySlide
	];

	onMount(async () => {
		try {
			const res = await fetch('/wrap-2025.json');
			data = await res.json();

			// V2: URL deep-linking support
			if (browser) {
				const params = new URLSearchParams(window.location.search);
				const userId = params.get('user');
				if (userId && data) {
					const user = data.users.find((u) => u.id === userId);
					if (user) {
						selectUser(user);
					}
				}
			}
		} catch (e) {
			console.error(e);
		} finally {
			loading = false;
		}

		// V2: Keyboard navigation
		if (browser) {
			window.addEventListener('keydown', handleKeyboard);
			return () => {
				window.removeEventListener('keydown', handleKeyboard);
			};
		}
	});

	function selectUser(user) {
		currentUser = user;
		currentSlide = 0;

		// V2: Update URL with user ID
		if (browser) {
			const url = new URL(window.location.href);
			url.searchParams.set('user', user.id);
			window.history.pushState({}, '', url);
		}
	}

	function nextSlide() {
		if (currentSlide < slides.length - 1) currentSlide++;
	}

	function prevSlide() {
		if (currentSlide > 0) currentSlide--;
	}

	function close() {
		currentUser = null;
		currentSlide = 0;

		// V2: Clear URL parameter
		if (browser) {
			const url = new URL(window.location.href);
			url.searchParams.delete('user');
			window.history.pushState({}, '', url);
		}
	}

	async function downloadScreenshot() {
		if (!wrappedContainer) return;
		try {
			// Small delay to ensure any hover states/tooltips are cleared or just to be safe
			const dataUrl = await toPng(wrappedContainer, {
				quality: 0.95,
				pixelRatio: 2, // High quality
				backgroundColor: '#ffffff'
			});

			const link = document.createElement('a');
			link.download = `${currentUser.profile.name}-wrapped-2025-slide-${currentSlide + 1}.png`;
			link.href = dataUrl;
			link.click();
		} catch (err) {
			console.error('Failed to take screenshot:', err);
		}
	}

	function getFilteredUsers() {
		if (!data) return [];
		if (!searchTerm) return data.users.slice(0, 100);
		return data.users
			.filter((u) => u.profile.name.toLowerCase().includes(searchTerm.toLowerCase()))
			.slice(0, 100);
	}

	// V2: Keyboard navigation handler
	function handleKeyboard(event) {
		if (!currentUser) return;

		if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
			event.preventDefault();
			nextSlide();
		} else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
			event.preventDefault();
			prevSlide();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			close();
		}
	}
</script>

<svelte:head>
	<title>{data ? `${data.guild.name} Wrapped ${data.meta.year}` : 'Discord Wrapped'}</title>
</svelte:head>

<div
	class="relative min-h-screen overflow-hidden bg-background font-sans text-foreground selection:bg-primary selection:text-white"
>
	{#if loading}
		<div class="flex h-screen flex-col items-center justify-center gap-4">
			<div
				class="h-16 w-16 animate-spin rounded-full border-8 border-black border-t-transparent"
			></div>
			<p class="text-xl font-black uppercase">Ładowanie...</p>
		</div>
	{:else if !data}
		<div class="flex h-screen items-center justify-center p-4 text-center font-bold text-red-500">
			Failed to load data. Make sure wrap-2025.json exists in static folder.
		</div>
	{:else if !currentUser}
		<!-- Landing / Selection -->
		<div class="container mx-auto flex h-screen max-w-md flex-col p-4">
			<header class="py-8 text-center">
				<div class="mb-4 inline-block -rotate-2 transform">
					<h1
						class="border-4 border-black bg-primary p-3 text-4xl font-black text-primary-foreground uppercase shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] md:text-5xl"
					>
						{data.guild.name}
					</h1>
				</div>
				<h2
					class="mb-4 inline-block border-2 border-black bg-white px-2 text-2xl font-black tracking-widest uppercase"
				>
					Wrapped {data.meta.year}
				</h2>
				<p class="mb-2 font-bold">Znajdź siebie:</p>
			</header>

			<div class="relative mb-6">
				<input
					type="text"
					placeholder="Wpisz swój nick..."
					bind:value={searchTerm}
					class="w-full border-4 border-black p-4 text-xl font-bold shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all outline-none placeholder:text-gray-400 focus:translate-x-1 focus:translate-y-1 focus:shadow-none"
				/>
			</div>

			<div class="custom-scrollbar flex-1 space-y-3 overflow-y-auto pr-2 pb-8">
				{#each getFilteredUsers() as user}
					<button
						onclick={() => selectUser(user)}
						class="group flex w-full items-center border-4 border-black bg-white p-3 text-left shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-accent hover:text-accent-foreground active:translate-x-1 active:translate-y-1 active:shadow-none"
					>
						{#if user.profile.avatarUrl}
							<img
								src={user.profile.avatarUrl}
								alt=""
								class="mr-4 h-12 w-12 rounded-full border-2 border-black bg-gray-200"
							/>
						{:else}
							<div
								class="mr-4 flex h-12 w-12 items-center justify-center rounded-full border-2 border-black bg-gray-200 text-xl font-black group-hover:bg-white"
							>
								{user.profile.name[0]}
							</div>
						{/if}
						<div class="flex flex-col">
							<span class="truncate text-lg leading-tight font-black">{user.profile.name}</span>
							<span class="text-xs font-bold text-muted-foreground uppercase group-hover:text-black"
								>Rank #{user.metrics.rank}</span
							>
						</div>
					</button>
				{/each}
				{#if getFilteredUsers().length === 0}
					<div class="border-2 border-dashed border-black p-4 text-center font-bold opacity-50">
						Nie znaleziono użytkownika "{searchTerm}"
					</div>
				{/if}
			</div>
		</div>
	{:else}
		<!-- Slide Deck -->
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-0 md:p-4">
			<!-- Mobile Container -->
			<div
				bind:this={wrappedContainer}
				class="relative flex h-full w-full flex-col border-0 bg-background shadow-2xl md:max-h-[850px] md:max-w-[420px] md:border-4 md:border-white"
			>
				<!-- Screenshot Button -->
				<button
					onclick={downloadScreenshot}
					class="absolute top-4 right-4 z-60 flex h-10 w-10 items-center justify-center rounded-full border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:scale-110 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
					title="Pobierz screenshot"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
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

				<!-- Progress -->
				<div class="flex h-2 w-full shrink-0 bg-black">
					{#each slides as _, i}
						<div
							class="h-full flex-1 border-r border-black last:border-0 {i <= currentSlide
								? 'bg-primary'
								: 'bg-gray-800'} transition-all duration-300"
						></div>
					{/each}
				</div>

				<!-- Slide Content -->
				<div class="relative flex-1 overflow-hidden bg-white">
					<div class="absolute inset-0">
						{#key currentSlide}
							<!-- svelte-ignore svelte_component_deprecated -->
							<svelte:component
								this={slides[currentSlide]}
								user={currentUser}
								guild={data.guild}
								year={data.meta.year}
							/>
						{/key}
					</div>
				</div>

				<!-- Controls -->
				<div
					class="flex h-20 shrink-0 items-center justify-between border-t-4 border-black bg-black px-4 pb-2"
				>
					<button
						onclick={close}
						class="flex h-12 items-center justify-center border-2 border-white bg-black px-4 text-xs font-black text-white uppercase shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-all hover:scale-105 hover:bg-white hover:text-black active:translate-x-1 active:translate-y-1 active:shadow-none"
					>
						✕ Zamknij (ESC)
					</button>

					<div class="flex items-center justify-center gap-4">
						<button
							onclick={prevSlide}
							disabled={currentSlide === 0}
							aria-label="Poprzedni slajd"
							class="flex h-12 w-12 items-center justify-center border-2 border-white bg-white text-black shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-all hover:scale-105 active:translate-x-1 active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none disabled:hover:scale-100"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="4"
								stroke-linecap="round"
								stroke-linejoin="round"><path d="m15 18-6-6 6-6" /></svg
							>
						</button>
						<button
							onclick={nextSlide}
							disabled={currentSlide === slides.length - 1}
							aria-label="Następny slajd"
							class="flex h-12 w-12 items-center justify-center border-2 border-white bg-primary text-primary-foreground shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-all hover:scale-105 active:translate-x-1 active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:scale-100"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="4"
								stroke-linecap="round"
								stroke-linejoin="round"><path d="m9 18 6-6-6-6" /></svg
							>
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.custom-scrollbar::-webkit-scrollbar {
		width: 12px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: #fff;
		border-left: 4px solid #000;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: #000;
		border: 2px solid #fff;
	}
</style>
