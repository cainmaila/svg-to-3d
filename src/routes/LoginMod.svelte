<script lang="ts">
	import GoogleBtn from '$lib/components/btn/GoogleBtn/index.svelte'
	import { firebaseSDKInit } from '$lib/utils/firebaseSDK'
	import { signInWithPopup } from 'firebase/auth'
	import { getToastStore, type ToastSettings } from '@skeletonlabs/skeleton'

	interface Props {
		onstate?: (state: string) => void
	}

	let { onstate }: Props = $props()

	const toastStore = getToastStore()

	function userLoginAction() {
		onstate?.('logining')
		const { auth, provider } = firebaseSDKInit()
		signInWithPopup(auth, provider)
			.then(() => {
				onstate?.('success')
				//onAuthStateChanged will be triggered
			})
			.catch((error) => {
				onstate?.('error')
				// Handle Errors here.
				const errorCode = error?.code
				const errorMessage = error?.errorMessage
				const t: ToastSettings = {
					background: 'variant-filled-error',
					message: errorMessage
				}
				toastStore.trigger(t)
			})
	}
</script>

<div
	class="fixed left-0 right-0 top-0 z-50 flex h-dvh items-center justify-center backdrop-blur-xl"
>
	<div class="card p-10">
		<h1 class="h3">登入後，即可開始使用</h1>
		<GoogleBtn onclick={userLoginAction} />
	</div>
</div>
