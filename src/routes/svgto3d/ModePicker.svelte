<script lang="ts">
	import ICON from '$lib/components/icon'
	import { ViewerMode } from '$lib/components/Viewer/viewerType'
	interface Props {
		viewerMode: ViewerMode
		onchange?: (mode: ViewerMode) => void
		onkeypress?: (event: KeyboardEvent) => void
	}

	let { viewerMode = $bindable(), onchange, onkeypress }: Props = $props()

	function onSelectHeader(mode: ViewerMode) {
		viewerMode = mode
		onchange?.(mode)
	}

	function selectedStyle(viewerMode: ViewerMode, mode: ViewerMode) {
		return viewerMode === mode ? 'variant-filled' : 'variant-soft'
	}
	let cctvStyle = $derived(selectedStyle(viewerMode, ViewerMode.CCTV))
	let pipeStyle = $derived(selectedStyle(viewerMode, ViewerMode.PIPE))
</script>

<div>
	<button class="{cctvStyle} chip" onclick={() => onSelectHeader(ViewerMode.CCTV)} {onkeypress}>
		<span><ICON.GameIconsCctvCamera /></span>
		<span>CCTV</span>
	</button>
	<button class="{pipeStyle} chip" onclick={() => onSelectHeader(ViewerMode.PIPE)} {onkeypress}>
		<ICON.TablerLine />
		<span>PIPE</span>
	</button>
</div>
