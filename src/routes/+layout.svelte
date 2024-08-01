<script>
	import '../app.css'
	import './app.postcss'
	import { dev } from '$app/environment'
	//禁止右鍵菜單
	document.oncontextmenu = function () {
		return !dev
	}
</script>

<svelte:head>
	<title>場域設置 &amp; CCTV配置規劃</title>
</svelte:head>
<slot></slot>
