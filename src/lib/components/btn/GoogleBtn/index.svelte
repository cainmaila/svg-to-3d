<script lang="ts">
	import google from './googlesvg.svg'

	interface Props {
		onclick?: (event: MouseEvent) => void
	}

	let { onclick }: Props = $props()
</script>

<button {onclick}>
	<img src={google} alt="Google Login" />
</button>

<style>
	button {
		padding: 0;
		border: none;
	}
</style>
