<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import ICON from '$lib/components/icon'
	import { ViewerMode } from '$lib/components/Viewer/viewerType'
	const dispatch = createEventDispatcher()
	export let viewerMode: ViewerMode

	$: cctvStyle = selectedStyle(viewerMode, ViewerMode.CCTV)
	$: pipeStyle = selectedStyle(viewerMode, ViewerMode.PIPE)

	function onSelectHeader(mode: ViewerMode) {
		viewerMode = mode
		dispatch('change', mode)
	}

	function selectedStyle(viewerMode: ViewerMode, mode: ViewerMode) {
		return viewerMode === mode ? 'variant-filled' : 'variant-soft'
	}
</script>

<div>
	<button class="{cctvStyle} chip" on:click={() => onSelectHeader(ViewerMode.CCTV)} on:keypress>
		<span><ICON.GameIconsCctvCamera /></span>
		<span>CCTV</span>
	</button>
	<button class="{pipeStyle} chip" on:click={() => onSelectHeader(ViewerMode.PIPE)} on:keypress>
		<ICON.TablerLine />
		<span>PIPE</span>
	</button>
</div>
