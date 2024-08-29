<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import ICON from '$lib/components/icon'
	const dispatch = createEventDispatcher()
	const CCTV = 'cctv'
	const PIPE = 'pipe'
	export let cctvMode: string = CCTV

	function onSelectHeader(mode: string) {
		cctvMode = mode
		dispatch('change', mode)
	}

	function selectedStyle(cctvMode: string, mode: string) {
		return cctvMode === mode ? 'variant-filled' : 'variant-soft'
	}
</script>

<div>
	<button
		class="{selectedStyle(cctvMode, CCTV)} chip"
		on:click={() => onSelectHeader(CCTV)}
		on:keypress
	>
		<span><ICON.GameIconsCctvCamera /></span>
		<span>CCTV</span>
	</button>
	<button
		class="{selectedStyle(cctvMode, PIPE)} chip"
		on:click={() => onSelectHeader(PIPE)}
		on:keypress
	>
		<ICON.TablerLine />
		<span>PIPE</span>
	</button>
</div>
