<script lang="ts">
	import { fragmentShader$, vertexShader$ } from '$lib/stores'
	import * as THREE from 'three'

	let loading = true
	let loadingCount = 0
	const loader = new THREE.FileLoader()
	$: if (loadingCount === 2) {
		loading = false
	}
	init()
	async function init() {
		loader.load('poj/vertexShader.frag', (data) => {
			vertexShader$.set(data as string)
			loadingCount++
		})
		loader.load('poj/fragmentShader.frag', (data) => {
			fragmentShader$.set(data as string)
			loadingCount++
		})
	}
</script>

{#if loading}
	loading..
{:else}
	<slot />
{/if}
