<script lang="ts">
	import '@svgdotjs/svg.draggable.js'
	import { createEventDispatcher } from 'svelte'
	const dispatch = createEventDispatcher()

	export let tool = 'view' //預設為檢視模式

	function dispatchToolChange(tool: string) {
		dispatch('tool', tool)
	}
</script>

<div class="toolbar">
	<div class="top">
		<fieldset>
			<legend>繪製方式</legend>
			<input
				type="radio"
				id="view"
				name="drawtype"
				on:change={() => dispatchToolChange('view')}
				checked={tool === 'view'}
			/>
			<!-- svelte-ignore a11y-label-has-associated-control -->
			<label>檢視場景</label>
			<input
				type="radio"
				id="rect"
				name="drawtype"
				on:change={() => dispatchToolChange('polygon')}
				checked={tool === 'rect'}
			/>
			<!-- svelte-ignore a11y-label-has-associated-control -->
			<label>矩形區域</label>
			<input
				type="radio"
				id="line"
				name="drawtype"
				on:change={() => dispatchToolChange('line')}
				checked={tool === 'line'}
			/>
			<!-- svelte-ignore a11y-label-has-associated-control -->
			<label>直線</label>
			<input
				type="radio"
				id="freeDraw"
				name="drawtype"
				on:change={() => dispatchToolChange('freeDraw')}
				checked={tool === 'freeDraw'}
			/>
			<!-- svelte-ignore a11y-label-has-associated-control -->
			<label>自由繪製</label>
			<input
				type="radio"
				id="door"
				name="drawtype"
				on:change={() => dispatchToolChange('door')}
				checked={tool === 'door'}
			/>
			<!-- svelte-ignore a11y-label-has-associated-control -->
			<label>安裝門</label>
			<input
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
	<div class="button">
		<button id="loadimageBtn" on:click={() => dispatch('loadBg')}>載入圖</button>
		<button id="deleteBtn" on:click={() => dispatch('clear')}>清除全部</button>
		<button id="generate" on:click={() => dispatch('build')}>生成場域</button>
		<button
			class="secondary"
			on:click={() => dispatchToolChange('putBox')}
			disabled={tool === 'putBox'}>放置設備2x2</button
		>
		<span>放置設備前請先確定比例尺</span>
	</div>
</div>

<style lang="postcss">
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
