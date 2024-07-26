<script lang="ts">
	import './app.css'
	import { dev } from '$app/environment'
	//禁止右鍵菜單
	document.oncontextmenu = function () {
		return !dev
	}
</script>

<svelte:head>
	<title>場域設置 & CCTV配置規劃</title>
</svelte:head>
<slot />
