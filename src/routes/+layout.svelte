<script lang="ts">
	import { dev } from '$app/environment'
	import { Toast, initializeStores } from '@skeletonlabs/skeleton'
	import '../app.css'
	import './app.postcss'

	//禁止右鍵菜單
	document.oncontextmenu = function () {
		return !dev
	}

	initializeStores()

	let { children } = $props()
</script>

<svelte:head>
	<title>場域設置 &amp; CCTV配置規劃</title>
</svelte:head>

{@render children?.()}
<Toast />
