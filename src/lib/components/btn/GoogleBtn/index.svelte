<script lang="ts">
	import { createBubbler } from 'svelte/legacy'

	const bubble = createBubbler()
	import google from './googlesvg.svg'
</script>

<button onclick={bubble('click')}>
	<img src={google} alt="Google Login" />
</button>

<style>
	button {
		padding: 0;
		border: none;
	}
</style>
