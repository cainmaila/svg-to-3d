<script lang="ts">
	import '@svgdotjs/svg.draggable.js'
	import { get } from 'svelte/store'
	import { goto } from '$app/navigation'
	import { svgString$, backgroundImg$, scalceSize$ } from '$lib/stores'

	import SvgEditor from '$lib/components/SvgEditor.svelte'
	import ToolBar from './ToolBar.svelte'

	let draw: SvgEditor
	let scalceModeOpen = false
	let scaleLengthSetting = 0 //比例尺的真實長度 m
	let measurementLength = 0 //比例尺的畫面長度 px
	let viewTool = 'view' //預設為檢視模式
	$: draw && loadSvg()

	//載入SVG
	function loadSvg() {
		draw.loadSvg(get(svgString$))
		const bg = get(backgroundImg$)
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
	//工具變動
	function onToolChangeHandler(e: CustomEvent) {
		draw.setCurrentTool(e.detail)
		viewTool = e.detail
	}
</script>

<svelte:window on:keydown={handleKeydown} />
<main>
	<ToolBar
		tool={viewTool}
		on:tool={onToolChangeHandler}
		on:loadBg={loadImage}
		on:clear={draw.clear}
		on:build={goto3d}
	/>
	<SvgEditor
		bind:this={draw}
		on:svg={(e) => {
			svgString$.set(e.detail)
		}}
		on:background={saveBackgroundToStore}
		on:measurement={onMeaurement}
		on:tool={(e) => {
			viewTool = e.detail
		}}
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
</style>
