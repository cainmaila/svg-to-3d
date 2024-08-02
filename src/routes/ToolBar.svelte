<script lang="ts">
	import '@svgdotjs/svg.draggable.js'
	import { createEventDispatcher } from 'svelte'
	import ICON from '$lib/components/icon'
	const dispatch = createEventDispatcher()

	export let tool = 'view' //預設為檢視模式

	function dispatchToolChange(tool: string) {
		dispatch('tool', tool)
	}
</script>

<div class="toolbar">
	<div class="top">
		<fieldset class="card">
			<button
				class="chip {tool === 'view' ? 'variant-filled' : 'variant-soft'}"
				on:click={() => {
					dispatchToolChange('view')
				}}
				on:keypress
			>
				{#if tool === 'view'}<ICON.TablerSelect />{/if}
				<span>檢視場景</span>
			</button>
			<button
				class="chip {tool === 'polygon' ? 'variant-filled' : 'variant-soft'}"
				on:click={() => {
					dispatchToolChange('polygon')
				}}
				on:keypress
			>
				{#if tool === 'polygon'}<ICON.TablerSelect />{/if}
				<span>矩形區域</span>
			</button>
			<button
				class="chip {tool === 'line' ? 'variant-filled' : 'variant-soft'}"
				on:click={() => {
					dispatchToolChange('line')
				}}
				on:keypress
			>
				{#if tool === 'line'}<ICON.TablerSelect />{/if}
				<span>直線</span>
			</button>
			<button
				class="chip {tool === 'freeDraw' ? 'variant-filled' : 'variant-soft'}"
				on:click={() => {
					dispatchToolChange('freeDraw')
				}}
				on:keypress
			>
				{#if tool === 'freeDraw'}<ICON.TablerSelect />{/if}
				<span>自由繪製</span>
			</button>
			<button
				class="chip {tool === 'door' ? 'variant-filled' : 'variant-soft'}"
				on:click={() => {
					dispatchToolChange('door')
				}}
				on:keypress
			>
				{#if tool === 'door'}<ICON.TablerSelect />{/if}
				<span>安裝門</span>
			</button>
			<button
				class="chip {tool === 'measurement' ? 'variant-filled' : 'variant-soft'}"
				on:click={() => {
					dispatchToolChange('measurement')
				}}
				on:keypress
			>
				{#if tool === 'measurement'}<ICON.TablerSelect />{/if}
				<span>比例尺</span>
			</button>
		</fieldset>
	</div>
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
</div>

<style lang="postcss">
	fieldset {
		padding: 5px;
		margin: 5px;
		display: flex;
		flex-wrap: wrap;
		justify-content: space-around;
		gap: 10px;
		& label {
			margin: 0 10px 0 0;
		}
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
		pointer-events: auto;
	}
</style>
