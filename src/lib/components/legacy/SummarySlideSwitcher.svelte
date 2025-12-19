<script>
	import SummarySlidev1 from './SummarySlidev1.svelte';
	import SummarySlidev2 from './SummarySlidev2.svelte';
	import SummarySlidev3 from './SummarySlidev3.svelte';
	import SummarySlidev4 from './SummarySlidev4.svelte';
	import SummarySlidev5 from './SummarySlidev5.svelte';
	import SummarySlidev8 from './SummarySlidev8.svelte';
	import SummarySlideNGO from '../SummarySlide.svelte';

	let { user } = $props();

	// Shared State for layout switching
	let layoutIndex = $state(0);
	const totalLayouts = 7;

	const layouts = [
		SummarySlideNGO,
		SummarySlidev1,
		SummarySlidev2,
		SummarySlidev3,
		SummarySlidev4,
		SummarySlidev5,
		SummarySlidev8
	];

	function nextLayout() {
		layoutIndex = (layoutIndex + 1) % totalLayouts;
	}
</script>

<div class="group relative h-full w-full overflow-hidden bg-black font-black text-black uppercase">
	<!-- Layout Switcher Button -->
	<button
		onclick={nextLayout}
		class="absolute top-2 left-2 z-50 flex h-8 w-8 items-center justify-center border-2 border-black bg-yellow-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform hover:scale-110 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none md:h-12 md:w-12 md:border-4 md:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
		title="Zmień układ"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="3"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="h-4 w-4 md:h-6 md:w-6"
		>
			<path d="M7 21l-4-4 4-4" />
			<path d="M3 17h18" />
			<path d="M17 3l4 4-4 4" />
			<path d="M21 7H3" />
		</svg>
	</button>

	<!-- svelte-ignore svelte_component_deprecated -->
	<svelte:component this={layouts[layoutIndex]} {user} />
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
