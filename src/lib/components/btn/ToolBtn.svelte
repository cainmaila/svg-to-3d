<script lang="ts">
	import ICON from '$lib/components/icon'

	interface Props {
		select?: boolean
		onclick?: (event: MouseEvent) => void
		children?: import('svelte').Snippet
	}

	let { select = false, onclick, children }: Props = $props()
</script>

<button class="chip {select ? 'variant-filled' : 'variant-soft'}" {onclick}>
	{#if select}<ICON.TablerSelect />{/if}
	<span>{@render children?.()}</span>
</button>

<style lang="postcss">
	button {
		pointer-events: auto;
	}
</style>
