<script lang="ts">
	import '@svgdotjs/svg.draggable.js'
	import { goto } from '$app/navigation'
	import { get } from 'svelte/store'
	import { svgString$, backgroundImg$ } from '$lib/stores'

	import SvgEditor from '$lib/components/SvgEditor.svelte'

	let draw: SvgEditor
	$: draw && loadSvg()

	function loadSvg() {
		draw.loadSvg(get(svgString$))
		const bg = get(backgroundImg$)
		//@ts-ignore
		bg ? draw.settingBackground(bg) : draw.loadImg('/demo.png')
	}

	//監聽Delete鍵，刪除選中的形狀
	function handleKeydown(event: KeyboardEvent) {
		;(event.key === 'Delete' || event.key === 'Backspace') && draw.deleteSelected()
	}

	function goto3d() {
		draw.clearSelect()
		goto('/svgto3d')
	}
	//開啟一張圖片
	function loadImage() {
		const input = document.createElement('input')
		input.type = 'file'
		input.accept = 'image/*'
		input.onchange = (e) => {
			//@ts-ignore
			const file = (e.target as HTMLInputElement).files[0]
			const reader = new FileReader()
			reader.onload = (e) => {
				//@ts-ignore
				draw.loadImg(e.target.result as string)
			}
			reader.readAsDataURL(file)
		}
		input.click()
	}

	//將背景圖片存入store
	function saveBackgroundToStore(e: CustomEvent) {
		backgroundImg$.set(e.detail)
	}
</script>

<svelte:window on:keydown={handleKeydown} />
<main>
	<div class="toolbar">
		<fieldset>
			<legend>繪製方式</legend>
			<input
				type="radio"
				id="view"
				name="drawtype"
				on:change={() => draw.setCurrentTool('view')}
				checked
			/>
			<!-- svelte-ignore a11y-label-has-associated-control -->
			<label>檢視場景</label>
			<input
				type="radio"
				id="rect"
				name="drawtype"
				on:change={() => draw.setCurrentTool('polygon')}
			/>
			<!-- svelte-ignore a11y-label-has-associated-control -->
			<label>矩形區域</label>
			<input type="radio" id="line" name="drawtype" on:change={() => draw.setCurrentTool('line')} />
			<!-- svelte-ignore a11y-label-has-associated-control -->
			<label>直線</label>
			<input
				type="radio"
				id="freeDraw"
				name="drawtype"
				on:change={() => draw.setCurrentTool('freeDraw')}
			/>
			<!-- svelte-ignore a11y-label-has-associated-control -->
			<label>自由繪製</label>
			<input type="radio" id="door" name="drawtype" on:change={() => draw.setCurrentTool('door')} />
			<!-- svelte-ignore a11y-label-has-associated-control -->
			<label>安裝門</label>
		</fieldset>
		<div class="button">
			<button id="loadimageBtn" on:click={loadImage}>載入圖</button>
			<button id="deleteBtn" on:click={draw.clear}>清除全部</button>
			<button id="generate" on:click={goto3d}>生成場域</button>
		</div>
	</div>

	<SvgEditor
		bind:this={draw}
		on:svg={(e) => {
			svgString$.set(e.detail)
		}}
		on:background={saveBackgroundToStore}
	/>
	<code>選取物件(黃色標示)，按Delete可刪除</code>
</main>

<style lang="postcss">
	.toolbar {
		font-size: smaller;
		position: absolute;
		top: 0;
		height: 50px;
		z-index: 100;
		display: inline-box;
		pointer-events: none;
		& .button {
			display: flex;
		}
		& input {
			pointer-events: auto;
		}
	}
	.toolbar button {
		font-size: smaller;
		margin: 5px;
		pointer-events: auto;
	}
	code {
		position: absolute;
		bottom: 0;
		left: 0;
		z-index: 100;
		pointer-events: none;
	}
</style>
