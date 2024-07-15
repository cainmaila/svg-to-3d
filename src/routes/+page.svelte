<script lang="ts">
	import '@svgdotjs/svg.draggable.js'
	import { goto } from '$app/navigation'
	import { get } from 'svelte/store'
	import { svgString$, backgroundImg$, scalceSize$ } from '$lib/stores'

	import SvgEditor from '$lib/components/SvgEditor.svelte'

	let draw: SvgEditor
	$: draw && loadSvg()
	let scalceModeOpen = false
	let scaleLengthSetting = 0 //比例尺的真實長度 m
	let measurementLength = 0 //比例尺的畫面長度 px

	//載入SVG
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
	//前往3D頁面
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
	//比例尺變動
	function onMeaurement(e: CustomEvent) {
		if (e.detail === 0) return //避掉不需要的點擊事件
		if (scaleLengthSetting === 0) {
			//@ts-ignore
			scaleLengthSetting = (e.detail / 100).toFixed(2) * 1
		}
		measurementLength = e.detail
		scalceModeOpen = true
	}
	//設定比例尺
	function settingScale() {
		$scalceSize$ = (scaleLengthSetting * 100) / measurementLength
		scalceModeOpen = false
	}
</script>

<svelte:window on:keydown={handleKeydown} />
<main>
	<div class="toolbar">
		<div class="top">
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
				<input
					type="radio"
					id="line"
					name="drawtype"
					on:change={() => draw.setCurrentTool('line')}
				/>
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
				<input
					type="radio"
					id="door"
					name="drawtype"
					on:change={() => draw.setCurrentTool('door')}
				/>
				<!-- svelte-ignore a11y-label-has-associated-control -->
				<label>安裝門</label>
				<input
					type="radio"
					id="scale"
					name="drawtype"
					on:change={() => draw.setCurrentTool('measurement')}
				/>
				<!-- svelte-ignore a11y-label-has-associated-control -->
				<label>比例尺</label>
			</fieldset>
		</div>
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
		on:measurement={onMeaurement}
		scaleBase={$scalceSize$}
	/>
	<code id="mamo">選取物件(黃色標示)，按Delete可刪除</code>
	<dialog open={scalceModeOpen}>
		<article id="settingDistance">
			<form on:submit={settingScale}>
				<label for="scale">比例尺設定 </label>
				<input type="number" bind:value={scaleLengthSetting} step="0.01" />公尺
				<button type="submit">設定</button>
			</form>
		</article>
	</dialog>
</main>

<style lang="postcss">
	#settingDistance {
		display: flex;
		align-items: center;
		justify-content: center;
		& input {
			width: 150px;
			margin: 0 10px;
		}
	}
	#mamo {
		position: absolute;
		bottom: 0;
		left: 0;
		z-index: 100;
		pointer-events: none;
	}
	.toolbar {
		font-size: smaller;
		position: absolute;
		top: 0;
		left: 10px;
		right: 10px;
		height: 50px;
		z-index: 100;
		display: inline-box;
		pointer-events: none;
		& .top {
			display: flex;
			justify-content: space-between;
			align-items: center;
			width: 100%;
		}
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
</style>
