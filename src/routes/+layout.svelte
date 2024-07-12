<script lang="ts">
	import './app.css'
	//禁止右鍵菜單
	document.oncontextmenu = function () {
		return false
	}
</script>

<svelte:head>
	<title>場域設置 & CCTV配置規劃</title>
</svelte:head>
<slot />
