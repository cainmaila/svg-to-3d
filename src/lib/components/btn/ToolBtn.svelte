<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import ICON from '$lib/components/icon'

	export let select: boolean = false
</script>

<button class="chip {select ? 'variant-filled' : 'variant-soft'}" on:click>
	{#if select}<ICON.TablerSelect />{/if}
	<span><slot /></span>
</button>

<style lang="postcss">
	button {
		pointer-events: auto;
	}
</style>
