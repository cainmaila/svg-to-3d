<script lang="ts">
	import '@svgdotjs/svg.draggable.js'
	import ICON from '$lib/components/icon'
	import ToolBtn from '$lib/components/btn/ToolBtn.svelte'

	interface Props {
		tool?: string //預設為檢視模式
		ontool?: (tool: string) => void
		onloadBg?: () => void
		onclear?: () => void
		onbuild?: () => void
		ondownload?: () => void
	}

	let { tool = 'view', ontool, onloadBg, onclear, onbuild, ondownload }: Props = $props()

	function dispatchToolChange(tool: string) {
		ontool?.(tool)
	}
</script>

<div class="toolbar">
	<div class="top">
		<fieldset class="card">
			<ToolBtn
				select={tool === 'view'}
				onclick={() => {
					dispatchToolChange('view')
				}}
			>
				檢視場景
			</ToolBtn>
			<ToolBtn
				select={tool === 'polygon'}
				onclick={() => {
					dispatchToolChange('polygon')
				}}
			>
				矩形區域
			</ToolBtn>
			<ToolBtn
				select={tool === 'line'}
				onclick={() => {
					dispatchToolChange('line')
				}}
			>
				直線
			</ToolBtn>
			<ToolBtn
				select={tool === 'freeDraw'}
				onclick={() => {
					dispatchToolChange('freeDraw')
				}}
			>
				自由繪製
			</ToolBtn>
			<ToolBtn
				select={tool === 'door'}
				onclick={() => {
					dispatchToolChange('door')
				}}
			>
				安裝門
			</ToolBtn>
			<ToolBtn
				select={tool === 'measurement'}
				onclick={() => {
					dispatchToolChange('measurement')
				}}
			>
				比例尺
			</ToolBtn>
			<div>
				<div class="variant-filled btn-group">
					<button id="loadimageBtn" onclick={() => onloadBg?.()} title="替換描繪底圖"
						><ICON.FluentMdl2ImageCrosshair /></button
					>
					<button id="deleteBtn" onclick={() => onclear?.()} title="清除所有描繪"
						><ICON.StreamlineNewFile /></button
					>
					<button id="generate" onclick={() => onbuild?.()} title="生成模型"
						><ICON.StreamlineAiGenerateVariationSpark /></button
					>
					<button id="download" onclick={() => ondownload?.()} title="下載設計圖"
						><ICON.FluentMdl2SaveTemplate /></button
					>
				</div>
				<button
					class="variant-filled-surface btn btn-sm text-xs"
					onclick={() => dispatchToolChange('putBox_2x1x1')}
					disabled={tool === 'putBox_2x1x1'}
					title="放置設備">2x1x1</button
				>
				<button
					class="variant-filled-surface btn btn-sm text-xs"
					onclick={() => dispatchToolChange('putBox_1x2x1')}
					disabled={tool === 'putBox_1x2x1'}
					title="放置設備">1x2x1</button
				>
				<button
					class="variant-filled-surface btn btn-sm text-xs"
					onclick={() => dispatchToolChange('putBox_1x1x2')}
					disabled={tool === 'putBox_1x1x2'}
					title="放置設備">1x1x2</button
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
		z-index: 10;
		display: inline-box;
		pointer-events: none;
		& .top {
			display: flex;
			justify-content: space-between;
			align-items: center;
			width: 100%;
		}
	}
	button {
		pointer-events: auto;
	}
</style>
