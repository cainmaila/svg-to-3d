<script lang="ts">
	import Viewer from './Viewer.svelte'

	let nowGenerate = true //是否正在生成模型
	let downloadGLB: string = '' //下載的模型路徑
</script>

<Viewer bind:downloadGLB on:modelReady={() => (nowGenerate = false)} />
{#if nowGenerate}
	<div class="nowGenerate">模型生成中，請稍等...</div>
{/if}
{#if downloadGLB}
	<div id="UI">
		<a role="button" href={downloadGLB} download="area.glb">匯出模型</a>
	</div>
{/if}

<style lang="postcss">
	#UI {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 100;
		pointer-events: none;
		& a {
			margin: 10px;
			pointer-events: auto;
		}
	}
	.nowGenerate {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 100;
		background-color: rgba(0, 0, 0, 0.5);
		color: white;
		padding: 10px;
		border-radius: 5px;
	}
</style>
