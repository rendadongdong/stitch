<script lang="ts">
	import { base } from '$app/paths';

	// Keep a query parameter "steamid" in sync with the steamId variable
	import Bookmarklets from './components/Bookmarklets.svelte';
	import Comparisons from './components/Comparisons.svelte';
	import Config from './components/Config.svelte';
	import OtherLinks from './components/OtherLinks.svelte';
	import SteamUtmGenerator from './components/SteamUtmGenerator.svelte';
	import { config } from './lib/stores.js';
</script>

<svelte:head>
	<title>Steam Tools Portal | Stitch | Butterscotch Shenanigans</title>
	<meta
		name="description"
		content="Plug in your game's Steam App ID to get easy links to stats, UTM link generation, bookmarklets, and more."
	/>
</svelte:head>

<main>
	<h1>
		{$config.steamId} | Steam Tools Portal
	</h1>

	<p>
		This page provides a collection of useful tools and links for your Steam game. The URL stays up
		to date with the values you put into form fields, making your configuration shareable and
		saveable!
	</p>

	<Config />

	<Comparisons />

	<h2>Tools</h2>

	<section>
		<h3>
			<a data-sveltekit-reload href={`${base}/steam-tools/bbcode`}>Steam BBCode Generator</a>
		</h3>
	</section>

	<SteamUtmGenerator />

	<Bookmarklets />

	<OtherLinks />
</main>

<style>
	h1 {
		text-align: center;
	}
	main {
		--color-result: var(--color-logo-yellow);
		width: 100%;
		max-width: 720px;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
</style>
