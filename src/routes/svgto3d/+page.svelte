<script lang="ts">
	import * as THREE from 'three'
	import { debounce } from 'lodash-es'
	import { onMount } from 'svelte'
	import Viewer from '$lib/components/Viewer'
	import ICON from '$lib/components/icon'
	import { SlideToggle } from '@skeletonlabs/skeleton'
	import { PIPE_MODE, ViewerMode } from '$lib/components/Viewer/viewerType'
	import ModePicker from './ModePicker.svelte'

	interface Props {
		data: {
			svgString: string
		}
	}

	let { data }: Props = $props()
	const MAX_CCTV_NUM = 10 //最大CCTV數量
	let viewer: Viewer | undefined = $state()
	let nowGenerate = $state(true) //是否正在生成模型
	let downloadGLB: string = $state('') //下載的模型路徑
	let cctvsSettings = $state<any[]>([])
	let cameraNum = $state(0)
	let bgImageDisable = $state(false) //底圖是否顯示
	let viewerMode: ViewerMode = $state(ViewerMode.CCTV) //viewer模式
	let cctvMode = $state('') //cctv模式
	let pipeMode = $state('') //pipe模式
	let topLineMode = $state(false) //屋頂拉線模式
	let pipes: {
		name: string
		length: number
	}[] = $state([])
	let selectPipeName = $state('') //選擇的pipe

	const cctvsMap: Map<string, object> = new Map()

	// Initialize from localStorage on mount
	onMount(() => {
		try {
			const stored = localStorage.getItem('cctvs')
			if (stored) {
				cctvsSettings = JSON.parse(stored)
				cameraNum = cctvsSettings.length
				cctvsSettings.forEach((cctv: any) => {
					cctvsMap.set(cctv[0], cctv[1])
				})
			}
		} catch (error) {
			console.error('Error loading CCTVs from localStorage:', error)
			cctvsSettings = []
		}
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
	function onCCTVchangeMoveModeHandler(data: {
		name: string
		matrix: THREE.Matrix4
		focalLength: number
	}) {
		debouncedHandler(data)
	}
	function onLineModeHandler() {
		switch (true) {
			case pipeMode === PIPE_MODE.ADD:
			case pipeMode === PIPE_MODE.CREATE:
				viewer?.addLineEnd()
				break
			case pipeMode === PIPE_MODE.NONE:
				viewer?.createLines()
				break
		}
	}
	function onModelChangeHandler(data: { viewerMode: string; cctvMode: string; pipeMode: string }) {
		viewerMode = data.viewerMode as ViewerMode
		cctvMode = data.cctvMode
		pipeMode = data.pipeMode
	}
	function onViewerModeChangeHandler(mode: ViewerMode) {
		viewer?.setViewerMode(mode)
	}
	function onSelectLineHandler(line: string) {
		viewer?.selectLine(line)
	}
	function onPipeMapUpdateHandler(pipeInfos: Array<{ name: string; length: number }>) {
		pipes = pipeInfos
	}
	function onSelectedPipeHandler(pipeName: string) {
		selectPipeName = pipeName
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
	onmodelReady={() => (nowGenerate = false)}
	oncctvChange={onCCTVchangeMoveModeHandler}
	oncctvDel={(data) => {
		cctvsMap.delete(data.name)
		cameraNum = cctvsMap.size
		localStorage.setItem('cctvs', JSON.stringify(Array.from(cctvsMap.entries())))
	}}
	onmodeChange={onModelChangeHandler}
	onpipeMapUpdate={onPipeMapUpdateHandler}
	onselectedPipe={onSelectedPipeHandler}
/>
{#if nowGenerate}
	<div class="nowGenerate">模型生成中，請稍等...</div>
{/if}
{#if viewerMode === ViewerMode.PIPE}
	<div class="fixed left-5 top-20 z-10">
		<ul>
			{#each pipes as { name, length } (name)}
				<li>
					<button
						class="card p-1 hover:text-rose-500 {selectPipeName === name ? 'text-amber-400' : ''}"
						onclick={() => onSelectLineHandler(name)}
						>{name}
						{#if length}
							<code class="code">{~~length}cm</code>
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	</div>
{/if}
{#if downloadGLB}
	<div id="UI">
		<div class="card flex p-2">
			底圖顯示
			<SlideToggle name="slider-label" size="sm" bind:checked={bgImageDisable} />
		</div>
		<a
			class="variant-filled btn-icon"
			role="button"
			href={downloadGLB}
			download="area.glb"
			title="下載模型"
		>
			<ICON.EntypoDownload /></a
		>
		{#if viewerMode === ViewerMode.CCTV}
			<button
				class="{cctvMode} variant-filled btn-icon"
				onclick={viewer?.addCCTV}
				disabled={cameraNum >= MAX_CCTV_NUM}
				title={cameraNum >= MAX_CCTV_NUM ? `最多只能新增${MAX_CCTV_NUM}個CCTV` : '新增CCTV'}
			>
				<ICON.MaterialSymbolsAdd /></button
			>
		{:else}
			<button
				class={`${pipeMode} variant-filled btn-icon bg-primary-500`}
				onclick={onLineModeHandler}
				title="新增線路"
			>
				<ICON.MaterialSymbolsAdd /></button
			>
		{/if}

		<button
			class="variant-filled btn-icon"
			onclick={viewer?.delAllCCTV}
			disabled={cameraNum === 0}
			title="重置全部CCTV"
		>
			<ICON.MaterialSymbolsRestore /></button
		>
		<ModePicker {viewerMode} onchange={onViewerModeChangeHandler} />

		{#if viewerMode === ViewerMode.PIPE}
			<lable class="lable">屋頂拉線</lable>
			<SlideToggle name="slider-label" size="sm" bind:checked={topLineMode} />
			{#if pipeMode !== PIPE_MODE.NONE}
				<button class="variant-filled btn-icon" onclick={viewer?.unDoAddLine} title="Undo">
					<ICON.MaterialSymbolsUndo /></button
				>
			{:else if selectPipeName}
				<button class="variant-filled btn-icon" onclick={() => viewer?.delPipe()} title="刪除Pipe">
					<ICON.MaterialSymbolsLightDeleteSharp /></button
				>
			{:else}
				<!-- else content here -->
			{/if}
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
		&.cctvAdd {
			background-color: rgb(0, 145, 255);
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
