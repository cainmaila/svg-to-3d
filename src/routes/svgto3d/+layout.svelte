<script lang="ts">
	import { goto } from '$app/navigation'
	import * as THREE from 'three'

	interface Props {
		data: {
			svgString: string
		}
		children?: import('svelte').Snippet
	}

	let { data, children }: Props = $props()
	const { svgString } = data
	if (!svgString) {
		goto('/', {
			replaceState: true
		})
	}

	let loading = $state(true)
	let loadingCount = $state(0)
	const loader = new THREE.FileLoader()
	$effect(() => {
		if (loadingCount === 1) {
			loading = false
		}
	})
	init()
	async function init() {
		loadingCount++
	}
</script>

{#if loading}
	loading..
{:else}
	{@render children?.()}
{/if}
