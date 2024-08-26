<script lang="ts">
	import GoogleBtn from '$lib/components/btn/GoogleBtn/index.svelte'
	import { firebaseSDKInit } from '$lib/utils/firebaseSDK'
	import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'

	function userLoginAction() {
		const { auth, provider } = firebaseSDKInit()
		signInWithPopup(auth, provider)
			.then(() => {
				//onAuthStateChanged will be triggered
			})
			.catch((error) => {
				// Handle Errors here.
				const errorCode = error?.code
				const errorMessage = error?.errorMessage
				const email = error.customData.email
				const credential = GoogleAuthProvider.credentialFromError(error)
				console.log(errorCode, errorMessage, email, credential)
			})
	}
</script>

<div class="flex h-dvh items-center justify-center">
	<div class="card p-10">
		<h1 class="h3">登入後，即可開始使用</h1>
		<GoogleBtn on:click={userLoginAction} />
	</div>
</div>
