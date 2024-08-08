<script lang="ts">
	import * as THREE from 'three'

	let loading = true
	let loadingCount = 0
	const loader = new THREE.FileLoader()
	$: if (loadingCount === 1) {
		loading = false
	}
	init()
	async function init() {
		loadingCount++
	}
</script>

{#if loading}
	loading..
{:else}
	<slot />
{/if}
