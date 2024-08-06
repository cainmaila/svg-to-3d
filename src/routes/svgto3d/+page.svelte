<script lang="ts">
	import { debounce } from 'lodash-es'
	import Viewer from './Viewer.svelte'
	import ICON from '$lib/components/icon'

	export let data: {
		svgString: string
	}

	let nowGenerate = true //是否正在生成模型
	let downloadGLB: string = '' //下載的模型路徑

	const cctvsMap: Map<string, string> = new Map()
	const debouncedHandler = debounce((detail) => {
		cctvsMap.set(detail.name, detail.matrix)
		//把所有的CCTV資料轉成字串 放進 localStorage
		localStorage.setItem('cctvs', JSON.stringify(Array.from(cctvsMap.entries())))
	}, 300)
	function onCCTVchangeMoveModeHandler(e: CustomEvent) {
		debouncedHandler(e.detail)
	}
</script>

<Viewer
	{data}
	bind:downloadGLB
	on:modelReady={() => (nowGenerate = false)}
	on:cctvChange={onCCTVchangeMoveModeHandler}
/>
{#if nowGenerate}
	<div class="nowGenerate">模型生成中，請稍等...</div>
{/if}
{#if downloadGLB}
	<div id="UI">
		<a
			class="variant-filled btn"
			role="button"
			href={downloadGLB}
			download="area.glb"
			title="下載模型"
		>
			<ICON.EntypoDownload /></a
		>
	</div>
{/if}

<style lang="postcss">
	#UI {
		padding: 5px;
		margin: 5px;
		position: absolute;
		top: 0;
		left: 0;
		z-index: 100;
		pointer-events: none;
		& a {
			margin: 10px;
			pointer-events: auto;
		}
	}
	.nowGenerate {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 100;
		background-color: rgba(0, 0, 0, 0.5);
		color: white;
		padding: 10px;
		border-radius: 5px;
	}
</style>
