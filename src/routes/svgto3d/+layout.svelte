<script lang="ts">
	import { goto } from '$app/navigation'
	import * as THREE from 'three'

	export let data: {
		svgString: string
	}
	const { svgString } = data
	if (!svgString) {
		goto('/', {
			replaceState: true
		})
	}

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
