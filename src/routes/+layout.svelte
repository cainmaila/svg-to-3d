<script lang="ts">
	import { dev } from '$app/environment'
	import { user$ } from '$lib/stores'
	import { firebaseSDKInit } from '$lib/utils/firebaseSDK'
	import {
		Toast,
		getToastStore,
		initializeStores,
		type ToastSettings
	} from '@skeletonlabs/skeleton'
	import { Jumper } from 'svelte-loading-spinners'
	import LoginMod from './LoginMod.svelte'
	import '../app.css'
	import './app.postcss'
	//禁止右鍵菜單
	document.oncontextmenu = function () {
		return !dev
	}

	initializeStores()
	const toastStore = getToastStore()

	export let data
	const { API_KEY } = data

	let loginStatus = dev ? 2 : 0 //登入狀態 0:未登入 1:登入中 -1:未登入 2:登入成功
	const firebaseConfig = {
		apiKey: API_KEY,
		authDomain: 'dt-group-cain.firebaseapp.com',
		databaseURL: 'https://dt-group-cain-default-rtdb.asia-southeast1.firebasedatabase.app',
		projectId: 'dt-group-cain',
		storageBucket: 'dt-group-cain.appspot.com',
		messagingSenderId: '725128890347',
		appId: '1:725128890347:web:04a1cbc5fa043f52dabbae',
		measurementId: 'G-QFW3PMDDN2'
	}

	const { auth } = firebaseSDKInit(firebaseConfig)

	auth.onAuthStateChanged(async (_user) => {
		if (_user) {
			user$.set(_user)
			const mail = _user.email || ''
			if (validateEmail(mail)) {
				loginStatus = 2
			} else {
				loginStatus = -1
				const t: ToastSettings = {
					background: 'variant-filled-error',
					message: '未授權得使用者，如授權用請聯繫管理員'
				}
				toastStore.trigger(t)
			}
		} else {
			loginStatus = -1
		}
	})

	//正則輸入的mail 網域是否是 @dgiots.com
	function validateEmail(mail: string) {
		const domainRegex = /^[a-zA-Z0-9._%+-]+@dgiots\.com$/
		//並符合以下陣列中的一個
		const mailRegex = ['cainmaila@gmail.com']
		return domainRegex.test(mail) || mailRegex.includes(mail)
	}

	function onLoginModStateHandler(e: CustomEvent) {
		switch (e.detail) {
			case 'logining':
				loginStatus = 1
				break
			case 'success':
				// loginStatus = 2
				break
			case 'error':
				loginStatus = -1
				break
		}
	}
</script>

<svelte:head>
	<title>場域設置 &amp; CCTV配置規劃</title>
</svelte:head>

{#if loginStatus === 0 || loginStatus === 1}
	<div class="fixed left-0 right-0 top-0 z-50 flex h-dvh items-center justify-center">
		<Jumper size="60" color="#ffffff" unit="px" duration="1s" />
	</div>
{:else if loginStatus === -1}
	<LoginMod on:state={onLoginModStateHandler} />
{:else}
	<slot></slot>
{/if}
<Toast />
