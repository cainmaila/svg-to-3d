<script lang="ts">
	import { debounce } from 'lodash-es'
	import Viewer from '$lib/components/Viewer'
	import ICON from '$lib/components/icon'
	import { SlideToggle } from '@skeletonlabs/skeleton'
	import { PIPE_MODE, ViewerMode } from '$lib/components/Viewer/viewerType'
	import ModePicker from './ModePicker.svelte'

	export let data: {
		svgString: string
	}
	const MAX_CCTV_NUM = 10 //最大CCTV數量
	let viewer: Viewer
	let nowGenerate = true //是否正在生成模型
	let downloadGLB: string = '' //下載的模型路徑
	let cctvsSettings = []
	let cameraNum = 0
	let bgImageDisable = false //底圖是否顯示
	let viewerMode: ViewerMode = ViewerMode.CCTV //viewer模式
	let cctvMode = '' //cctv模式
	let pipeMode = '' //pipe模式
	let topLineMode = false //屋頂拉線模式

	try {
		cctvsSettings = JSON.parse(localStorage.getItem('cctvs') || '[]')
		cameraNum = cctvsSettings.length
	} catch (error) {
		cctvsSettings = []
	}
	const cctvsMap: Map<string, object> = new Map()
	cctvsSettings.forEach((cctv: any) => {
		cctvsMap.set(cctv[0], cctv[1])
	})
	const debouncedHandler = debounce((detail) => {
		cctvsMap.set(detail.name, {
			matrix: detail.matrix,
			focalLength: detail.focalLength
		})
		cameraNum = cctvsMap.size
		//把所有的CCTV資料轉成字串 放進 localStorage
		localStorage.setItem('cctvs', JSON.stringify(Array.from(cctvsMap.entries())))
	}, 300)
	function onCCTVchangeMoveModeHandler(e: CustomEvent) {
		debouncedHandler(e.detail)
	}
	function onLineModeHandler() {
		switch (true) {
			case pipeMode === PIPE_MODE.ADD:
			case pipeMode === PIPE_MODE.CREATE:
				viewer.addLineEnd()
				break
			case pipeMode === PIPE_MODE.NONE:
				viewer.createLines()
				break
		}
	}
	function onModelChangeHandler(e: CustomEvent) {
		viewerMode = e.detail.viewerMode
		cctvMode = e.detail.cctvMode
		pipeMode = e.detail.pipeMode
	}
	function onViewerModeChangeHandler(e: CustomEvent) {
		viewer.setViewerMode(e.detail)
	}
</script>

<Viewer
	bind:this={viewer}
	{MAX_CCTV_NUM}
	{data}
	{cctvsSettings}
	bind:downloadGLB
	bind:bgImageDisable
	bind:topLineMode
	on:modelReady={() => (nowGenerate = false)}
	on:cctvChange={onCCTVchangeMoveModeHandler}
	on:cctvDel={(e) => {
		cctvsMap.delete(e.detail.name)
		cameraNum = cctvsMap.size
		localStorage.setItem('cctvs', JSON.stringify(Array.from(cctvsMap.entries())))
	}}
	on:modeChange={onModelChangeHandler}
/>
{#if nowGenerate}
	<div class="nowGenerate">模型生成中，請稍等...</div>
{/if}
{#if downloadGLB}
	<div id="UI">
		<a
			class="variant-filled btn-icon"
			role="button"
			href={downloadGLB}
			download="area.glb"
			title="下載模型"
		>
			<ICON.EntypoDownload /></a
		>
		<button
			class="variant-filled btn-icon"
			on:click={viewer.addCCTV}
			disabled={cameraNum >= MAX_CCTV_NUM}
			title={cameraNum >= MAX_CCTV_NUM ? `最多只能新增${MAX_CCTV_NUM}個CCTV` : '新增CCTV'}
		>
			<ICON.MaterialSymbolsAdd /></button
		>
		<button
			class={`${pipeMode} variant-filled btn-icon bg-primary-500`}
			on:click={onLineModeHandler}
			title="新增線路"
		>
			<ICON.MaterialSymbolsAdd /></button
		>
		<button
			class="variant-filled btn-icon"
			on:click={viewer.delAllCCTV}
			disabled={cameraNum === 0}
			title="重置全部CCTV"
		>
			<ICON.MaterialSymbolsRestore /></button
		>
		<ModePicker {viewerMode} on:change={onViewerModeChangeHandler} />
		<SlideToggle name="slider-label" size="sm" bind:checked={bgImageDisable}>底圖顯示</SlideToggle>
		{#if viewerMode === ViewerMode.PIPE}
			<SlideToggle name="slider-label" size="sm" bind:checked={topLineMode}>屋頂拉線</SlideToggle>
			<button class="variant-filled btn-icon" on:click={viewer.unDoAddLine} title="Undo">
				<ICON.MaterialSymbolsUndo /></button
			>
		{/if}
	</div>
{/if}

<style lang="postcss">
	button {
		&.pipeModeCreate {
			background-color: rgb(0, 145, 255);
		}
		&.pipeModeAdd {
			background-color: rgb(255, 191, 0);
		}
	}
	#UI {
		padding: 5px;
		margin: 5px;
		position: absolute;
		top: 0;
		left: 0;
		display: flex;
		align-items: center;
		gap: 5px;
		z-index: 100;
		pointer-events: none;
		& a {
			pointer-events: auto;
		}
		& button {
			pointer-events: auto;
		}
		& .slide-toggle-track {
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
