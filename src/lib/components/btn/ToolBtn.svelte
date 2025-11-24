<script lang="ts">
	import { createBubbler } from 'svelte/legacy'

	const bubble = createBubbler()
	import { createEventDispatcher } from 'svelte'
	import ICON from '$lib/components/icon'

	interface Props {
		select?: boolean
		children?: import('svelte').Snippet
	}

	let { select = false, children }: Props = $props()
</script>

<button class="chip {select ? 'variant-filled' : 'variant-soft'}" onclick={bubble('click')}>
	{#if select}<ICON.TablerSelect />{/if}
	<span>{@render children?.()}</span>
</button>

<style lang="postcss">
	button {
		pointer-events: auto;
	}
</style>
