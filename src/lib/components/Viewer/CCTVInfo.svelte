<script lang="ts">
	import { SlideToggle } from '@skeletonlabs/skeleton'
	import { createEventDispatcher } from 'svelte'
	import { CCTVMode } from './viewerType'
	import ICON from '$lib/components/icon'
	const dispatchEvent = createEventDispatcher()
	export let selectCCTV: string
	export let selectCCTVSeting: {
		focalLength: number
	}
	export let cctvMode: string | undefined
	function onChangeCCTVFocalLength(e: any) {
		dispatchEvent('focalLength', Number((e.target as HTMLInputElement).value))
	}
	function onCCTVchangeMoveModeHandler(e: Event) {
		dispatchEvent('moveMode', {
			moveMode: (e.target as HTMLInputElement).name,
			checked: (e.target as HTMLInputElement).checked
		})
	}
</script>

<div id="CCTV_Info">
	{#if selectCCTV}
		<div class="flex items-center justify-between">
			<p class="h4">{selectCCTV}</p>
			<button
				type="button"
				class="variant-filled btn btn-sm"
				on:click={() => dispatchEvent('clear')}>Clear</button
			>
		</div>
		<label class="label" for="length">焦距 {selectCCTVSeting.focalLength} mm</label>
		<input
			class="input"
			type="range"
			min="2.8"
			max="6.0"
			step="0.1"
			value={selectCCTVSeting.focalLength}
			on:input={onChangeCCTVFocalLength}
		/>
		<div>
			<SlideToggle
				name={CCTVMode.MOVE}
				checked={cctvMode === CCTVMode.MOVE}
				on:change={onCCTVchangeMoveModeHandler}
				active="bg-primary-500"
				size="sm">移動位置</SlideToggle
			>
			<SlideToggle
				name={CCTVMode.LOOKAT}
				checked={cctvMode === CCTVMode.LOOKAT}
				on:change={onCCTVchangeMoveModeHandler}
				active="bg-primary-500"
				size="sm">拍攝方向</SlideToggle
			>
			<button
				class="variant-filled btn-icon btn-sm scale-75 text-2xl"
				on:click={() => dispatchEvent('del')}
			>
				<ICON.MaterialSymbolsLightDeleteSharp />
			</button>
		</div>
	{/if}
</div>

<style lang="postcss">
	#CCTV_Info {
		position: absolute;
		top: 10px;
		right: 10px;
		z-index: 100;
		min-width: 100px;
		min-height: 50px;
		padding: 10px;
		background-color: rgba(0, 0, 0, 0.5);
		border-radius: 10px;
		font-size: small;
	}
</style>
