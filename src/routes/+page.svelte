<script lang="ts">
	import SvgEditor from './SvgEditor.svelte'

	import '@svgdotjs/svg.draggable.js'
	import { goto } from '$app/navigation'

	let draw: SvgEditor

	//監聽Delete鍵，刪除選中的形狀
	function handleKeydown(event: KeyboardEvent) {
		event.key === 'Delete' || (event.key === 'Backspace' && draw.deleteSelected())
	}
</script>

<svelte:window on:keydown={handleKeydown} />
<main class="container">
	<div class="toolbar">
		<fieldset>
			<legend>繪製方式</legend>
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
		<button id="deleteBtn" on:click={draw.clear}>清除全部</button>
		<button id="generate" on:click={() => goto('/svgto3d')}>生成場域</button>
	</div>

	<SvgEditor bind:this={draw} />
	<code>選取物件(黃色標示)，按Delete可刪除</code>
</main>

<style lang="postcss">
	.toolbar button {
		margin: 5px;
	}
</style>
