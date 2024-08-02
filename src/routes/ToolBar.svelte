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
			<input
				class="radio"
				type="radio"
				id="view"
				name="drawtype"
				on:change={() => dispatchToolChange('view')}
				checked={tool === 'view'}
			/>
			<!-- svelte-ignore a11y-label-has-associated-control -->
			<label>檢視場景</label>
			<input
				class="radio"
				type="radio"
				id="rect"
				name="drawtype"
				on:change={() => dispatchToolChange('polygon')}
				checked={tool === 'rect'}
			/>
			<!-- svelte-ignore a11y-label-has-associated-control -->
			<label>矩形區域</label>
			<input
				class="radio"
				type="radio"
				id="line"
				name="drawtype"
				on:change={() => dispatchToolChange('line')}
				checked={tool === 'line'}
			/>
			<!-- svelte-ignore a11y-label-has-associated-control -->
			<label>直線</label>
			<input
				class="radio"
				type="radio"
				id="freeDraw"
				name="drawtype"
				on:change={() => dispatchToolChange('freeDraw')}
				checked={tool === 'freeDraw'}
			/>
			<!-- svelte-ignore a11y-label-has-associated-control -->
			<label>自由繪製</label>
			<input
				class="radio"
				type="radio"
				id="door"
				name="drawtype"
				on:change={() => dispatchToolChange('door')}
				checked={tool === 'door'}
			/>
			<!-- svelte-ignore a11y-label-has-associated-control -->
			<label>安裝門</label>
			<input
				class="radio"
				type="radio"
				id="scale"
				name="drawtype"
				on:change={() => dispatchToolChange('measurement')}
				checked={tool === 'scale'}
			/>
			<!-- svelte-ignore a11y-label-has-associated-control -->
			<label>比例尺</label>
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
			disabled={tool === 'putBox'}>放置設備2x2</button
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
