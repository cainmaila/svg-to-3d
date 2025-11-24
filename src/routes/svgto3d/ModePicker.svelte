<script lang="ts">
	import { createBubbler } from 'svelte/legacy'

	const bubble = createBubbler()
	import { createEventDispatcher } from 'svelte'
	import ICON from '$lib/components/icon'
	import { ViewerMode } from '$lib/components/Viewer/viewerType'
	const dispatch = createEventDispatcher()
	interface Props {
		viewerMode: ViewerMode
	}

	let { viewerMode = $bindable() }: Props = $props()

	function onSelectHeader(mode: ViewerMode) {
		viewerMode = mode
		dispatch('change', mode)
	}

	function selectedStyle(viewerMode: ViewerMode, mode: ViewerMode) {
		return viewerMode === mode ? 'variant-filled' : 'variant-soft'
	}
	let cctvStyle = $derived(selectedStyle(viewerMode, ViewerMode.CCTV))
	let pipeStyle = $derived(selectedStyle(viewerMode, ViewerMode.PIPE))
</script>

<div>
	<button
		class="{cctvStyle} chip"
		onclick={() => onSelectHeader(ViewerMode.CCTV)}
		onkeypress={bubble('keypress')}
	>
		<span><ICON.GameIconsCctvCamera /></span>
		<span>CCTV</span>
	</button>
	<button
		class="{pipeStyle} chip"
		onclick={() => onSelectHeader(ViewerMode.PIPE)}
		onkeypress={bubble('keypress')}
	>
		<ICON.TablerLine />
		<span>PIPE</span>
	</button>
</div>
