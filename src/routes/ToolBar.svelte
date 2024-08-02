<script lang="ts">
	import '@svgdotjs/svg.draggable.js'
	import { createEventDispatcher } from 'svelte'
	import ICON from '$lib/components/icon'
	import ToolBtn from '$lib/components/btn/ToolBtn.svelte'
	const dispatch = createEventDispatcher()

	export let tool = 'view' //預設為檢視模式

	function dispatchToolChange(tool: string) {
		dispatch('tool', tool)
	}
</script>

<div class="toolbar">
	<div class="top">
		<fieldset class="card">
			<ToolBtn
				select={tool === 'view'}
				on:click={() => {
					dispatchToolChange('view')
				}}
			>
				檢視場景
			</ToolBtn>
			<ToolBtn
				select={tool === 'polygon'}
				on:click={() => {
					dispatchToolChange('polygon')
				}}
			>
				矩形區域
			</ToolBtn>
			<ToolBtn
				select={tool === 'line'}
				on:click={() => {
					dispatchToolChange('line')
				}}
			>
				直線
			</ToolBtn>
			<ToolBtn
				select={tool === 'freeDraw'}
				on:click={() => {
					dispatchToolChange('freeDraw')
				}}
			>
				自由繪製
			</ToolBtn>
			<ToolBtn
				select={tool === 'door'}
				on:click={() => {
					dispatchToolChange('door')
				}}
			>
				安裝門
			</ToolBtn>
			<ToolBtn
				select={tool === 'measurement'}
				on:click={() => {
					dispatchToolChange('measurement')
				}}
			>
				比例尺
			</ToolBtn>
			<div>
				<div class="variant-filled btn-group">
					<button id="loadimageBtn" on:click={() => dispatch('loadBg')} title="替換描繪底圖"
						><ICON.FluentMdl2ImageCrosshair /></button
					>
					<button id="deleteBtn" on:click={() => dispatch('clear')} title="清除所有描繪"
						><ICON.StreamlineNewFile /></button
					>
					<button id="generate" on:click={() => dispatch('build')} title="生成模型"
						><ICON.StreamlineAiGenerateVariationSpark /></button
					>
					<button id="download" on:click={() => dispatch('download')} title="下載設計圖"
						><ICON.FluentMdl2SaveTemplate /></button
					>
				</div>
				<button
					class="variant-filled-surface btn btn-sm"
					on:click={() => dispatchToolChange('putBox')}
					disabled={tool === 'putBox'}
					title="放置設備">2 x 2</button
				>
				<code class="code">放置設備前請先確定比例尺</code>
			</div>
		</fieldset>
	</div>
</div>

<style lang="postcss">
	fieldset {
		padding: 5px;
		margin: 5px;
		display: flex;
		flex-wrap: wrap;
		justify-content: space-around;
		gap: 10px;
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
	}
</style>
