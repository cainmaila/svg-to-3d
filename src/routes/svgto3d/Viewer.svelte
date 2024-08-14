<script lang="ts">
	import * as THREE from 'three'
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
	import { createEventDispatcher, onDestroy, onMount } from 'svelte'
	import { SlideToggle } from '@skeletonlabs/skeleton'
	import { debounce } from 'lodash-es'
	import { goto } from '$app/navigation'
	import { generateSkyBox, svgStringToURL, svgToGroupSync, generateGLB } from '$lib/threelib'
	import {
		CCTVCamera,
		createCCTV,
		createCCTVByMatrix,
		generateShadowMap
	} from '$lib/threelib/cctvLib'
	import { depthMaterial, generateProjectionMaterial } from '$lib/threelib/materialLib'
	import { scalceSize$ } from '$lib/stores'
	import ICON from '$lib/components/icon'

	const dispatch = createEventDispatcher()
	const MODLE_READY = 'modelReady' //模型準備好
	const CCTV_CHANGE = 'cctvChange' //CCTV改變
	const CCTV_DEL = 'cctvDel' //CCTV刪除
	//反應陰影的材質
	const oupPutMaterial = new THREE.MeshStandardMaterial({
		color: 0xaaaaaa,
		roughness: 0.5,
		metalness: 0.5
	})
	const oupPutBoxMaterial = new THREE.MeshStandardMaterial({
		color: 0x448844,
		roughness: 0.5,
		metalness: 0.5
	})
	export let MAX_CCTV_NUM = 4 //最大CCTV數量
	export let data: {
		svgString: string
	}
	export let downloadGLB: string = '' //下載的模型路徑
	export let cctvsSettings: [name: string, matrix: THREE.Matrix4][] //初始化的CCTV設定

	let cctvNum = cctvsSettings.length > MAX_CCTV_NUM ? MAX_CCTV_NUM : cctvsSettings.length //CCTV數量
	let build: THREE.Group //建築物
	let { svgString } = data //SVG字串
	let selectCCTV: string = '' //選擇的cctv
	let cctvMode = '' //cctv模式 add move lookat

	// 設置場景、相機和渲染器
	const scene = new THREE.Scene()
	const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 100000)
	const renderer = new THREE.WebGLRenderer({ antialias: true })
	renderer.setPixelRatio(window.devicePixelRatio)
	renderer.setSize(window.innerWidth, window.innerHeight)
	//加個頂部網格底座
	const top = new THREE.PlaneGeometry(10000, 10000, 100, 100)
	const topMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 })
	const topMesh = new THREE.Mesh(top, topMaterial)
	topMesh.rotation.x = -Math.PI / 2
	topMesh.position.y = 300
	topMesh.visible = false
	scene.add(topMesh)
	onMount(() => {
		document.getElementById('Viewer')?.appendChild(renderer.domElement)
	})
	// 添加軌道控制
	const controls = new OrbitControls(camera, renderer.domElement)
	controls.maxDistance = 10000 // 最大缩放距离
	const cctvs = cctvsSettings.map((cctvSetting) => {
		return createCCTVByMatrix(
			cctvSetting[0] /* name */,
			// @ts-ignore
			cctvSetting[1]?.matrix /* matrix */,
			//@ts-ignore
			cctvSetting[1]?.focalLength,
			/* Matri */ scene
		)
	})
	const shadowCameras: THREE.PerspectiveCamera[] = cctvs.map(({ cctv }) => cctv)
	const cctvHelpers: THREE.CameraHelper[] = cctvs.map(({ cctvHelper }) => cctvHelper)
	//攝影機物件
	const cctvObjs: THREE.Mesh[] = cctvs.map(_createCCTVObj)
	//創建CCTV Obj物件
	function _createCCTVObj({ cctv, name }: { cctv: THREE.PerspectiveCamera; name: string }) {
		const cctvObj = new THREE.Mesh(
			new THREE.BoxGeometry(10, 10, 20),
			new THREE.MeshBasicMaterial({ color: 0x880000 })
		)
		cctvObj.name = name
		scene.add(cctvObj)
		cctvObj.position.copy(cctv.position)
		cctvObj.quaternion.copy(cctv.quaternion)
		return cctvObj
	}
	//複製攝影機位置包含旋轉
	function moveCctv(name: string) {
		const cctvObj = _getCCTVObj(name)
		const shadowCamera = _getCCTVCamera(name)
		if (!cctvObj || !shadowCamera) return //找不到cctvObj或shadowCamera
		cctvObj.position.copy(shadowCamera.position)
		cctvObj.quaternion.copy(shadowCamera.quaternion)
		_getCCTVHelper(name)?.update()
		dispatch(CCTV_CHANGE, {
			name: cctvObj.name,
			matrix: cctvObj.matrix,
			focalLength: shadowCamera?.focalLength
		})
	}
	//選擇cctv
	$: {
		if (selectCCTV) {
			_clearSelectCCTV()
			const cctvHelper = _getCCTVHelper()
			if (cctvHelper) cctvHelper.visible = true
			const shadowCamera = _getCCTVCamera()
			if (shadowCamera) selectCCTVSeting.focalLength = (shadowCamera as CCTVCamera).focalLength
		} else {
			_clearSelectCCTV()
		}
	}
	//清除選擇的CCTV
	function _clearSelectCCTV() {
		cctvHelpers.forEach((cctvHelper) => {
			cctvHelper.visible = false
		})
	}
	//找到CCTV shadowCamera
	function _getCCTVCamera(_name?: string) {
		return shadowCameras.find((cctv) => {
			return cctv.name === `${_name || selectCCTV}_camera`
		}) as CCTVCamera | undefined
	}
	//找到CCTV Obj
	function _getCCTVObj(_name?: string) {
		return cctvObjs.find((cctvObj) => cctvObj.name === (_name || selectCCTV))
	}
	function _getCCTVHelper(_name?: string) {
		return cctvHelpers.find((cctvHelper) => {
			return cctvHelper.name === `${_name || selectCCTV}_helper`
		})
	}
	//點選畫面點選場域 or ray到cctvObj
	const raycaster = new THREE.Raycaster()
	const mouse = new THREE.Vector2()
	function onRayMe(event: MouseEvent) {
		mouse.x = (event.clientX / window.innerWidth) * 2 - 1
		mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
		raycaster.setFromCamera(mouse, camera)
		const shadowCamera = _getCCTVCamera()
		switch (cctvMode) {
			case 'add':
				selectCCTV = ''
				if (MAX_CCTV_NUM > cctvNum) {
					cctvMode = ''
				}
				const intersectsTopGrid = raycaster.intersectObject(topMesh) //ray到topGrid的位置
				if (intersectsTopGrid.length > 0) {
					const point = intersectsTopGrid[0].point
					let _n = 1
					while (_getCCTVObj(`cctv${_n}`)) {
						_n++
					}
					const { cctv, cctvHelper, name } = createCCTV(
						`cctv${_n}`,
						point,
						new THREE.Vector3(),
						scene
					)
					const cctvObj = _createCCTVObj({ cctv, name: `cctv${_n}` })
					shadowCameras.push(cctv)
					cctvObjs.push(cctvObj)
					cctvHelpers.push(cctvHelper)
					cctvNum++
					selectCCTV = name
					cctvMode = 'lookat' //移動完畢
				}
				break
			case 'move':
				if (shadowCamera) {
					const intersectsTopGrid = raycaster.intersectObject(topMesh) //ray到topGrid的位置
					if (intersectsTopGrid.length > 0) {
						const point = intersectsTopGrid[0].point
						shadowCamera.position.copy(point)
						moveCctv(selectCCTV)
						cctvMode = 'lookat' //移動完畢
					}
					break
				} else {
					cctvMode = ''
				}
			case 'lookat':
				if (shadowCamera) {
					const intersectsBuild = raycaster.intersectObject(build) //ray到building的位置
					if (intersectsBuild.length > 0) {
						const point = intersectsBuild[0].point
						shadowCamera.lookAt(point)
						moveCctv(selectCCTV)
						cctvMode = ''
					}
				} else {
					cctvMode = ''
				}
			default:
				const intersects = raycaster.intersectObjects(cctvObjs)
				if (intersects.length > 0) {
					const obj = intersects[0].object
					selectCCTV = obj.name
					cctvMode = '' //如果選到cctv就清除原來的cctvMode模式
				}
		}
	}
	//新增CCTV
	export function addCCTV() {
		cctvMode = 'add'
	}
	function onMouseMoveHandler(event: MouseEvent) {
		switch (cctvMode) {
			case 'lookat':
				if (selectCCTV) {
					mouse.x = (event.clientX / window.innerWidth) * 2 - 1
					mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
					raycaster.setFromCamera(mouse, camera)
					const intersectsBuild = raycaster.intersectObject(build)
					if (intersectsBuild.length > 0) {
						const point = intersectsBuild[0].point
						const shadowCamera = _getCCTVCamera()
						if (shadowCamera) shadowCamera.lookAt(point)
						moveCctv(selectCCTV)
					}
				}
				break
		}
		debounce(() => updataShadowMaps(), 100)()
	}
	//CCTV Info變動移動模式
	function onCCTVchangeMoveModeHandler(e: Event) {
		const target = e.target as HTMLInputElement
		const name = target.name
		switch (name) {
			case 'move':
				cctvMode = target.checked ? 'move' : ''
				break
			case 'lookat':
				cctvMode = target.checked ? 'lookat' : ''
				break
		}
	}
	//創建深度紋理
	const shadowMaps: THREE.WebGLRenderTarget[] = []
	for (let i = 0; i < MAX_CCTV_NUM; i++) {
		shadowMaps.push(generateShadowMap())
	}
	const projectionMaterial = generateProjectionMaterial({
		maxcctvnum: MAX_CCTV_NUM,
		cctvNum,
		color: new THREE.Color(0x888888),
		shadowMaps
	})
	const projectionBoxMaterial = generateProjectionMaterial({
		maxcctvnum: MAX_CCTV_NUM,
		cctvNum,
		color: new THREE.Color(0x448844),
		shadowMaps
	})
	$: {
		projectionMaterial.uniforms.cctvCount.value = cctvNum //更新CCTV數量
		projectionBoxMaterial.uniforms.cctvCount.value = cctvNum //更新CCTV數量
	}

	init()
	async function init() {
		try {
			const svg = svgStringToURL(svgString)
			build = await svgToGroupSync(svg, {
				lineWidth: 10, // 設置線段厚度和高度
				wallHeight: 300,
				doorHigh: 200,
				color: 0xcccccc,
				scale: $scalceSize$ // 縮放比例
			})
			dispatch(MODLE_READY) // 通知父組件已經準備好
		} catch (error: any) {
			alert(error.message || error)
			goto('/', {
				replaceState: true
			})
			return
		}

		scene.add(build)
		// 調整相機位置
		const box = new THREE.Box3().setFromObject(build)
		const center = box.getCenter(new THREE.Vector3())
		const size = box.getSize(new THREE.Vector3())
		const maxDim = Math.max(size.x * 0.5, size.y, size.z)

		camera.position.set(center.x, center.y + maxDim / 2, center.z + maxDim)
		camera.lookAt(center)
		controls.target.copy(center)
		controls.update()
		//設置可下載的glb
		try {
			// oupPutMaterial
			build.traverse((child) => {
				if (child instanceof THREE.Mesh) {
					if (child.name.includes('Box')) child.material = oupPutBoxMaterial
					else child.material = oupPutMaterial
				}
			})
			downloadGLB = await generateGLB(build)
			build.traverse((child) => {
				if (child instanceof THREE.Mesh) {
					if (child.name === 'BG') {
						return
					}
					// 設置材質
					if (child.name.includes('Box')) child.material = projectionBoxMaterial
					else child.material = projectionMaterial
				}
			})
			updataShadowMaps()
			animate()
		} catch (error) {
			alert('轉換匯出模型失敗')
		}
	}
	//
	// 渲染循環
	function animate() {
		requestAnimationFrame(animate)
		controls.update()
		renderer.render(scene, camera)
	}
	//更新CCTV投影貼圖
	function updataShadowMaps() {
		for (let i = 0; i < cctvNum; i++) {
			// 更新CCTV位置
			projectionMaterial.uniforms.cctvPositions.value[i].copy(shadowCameras[i].position)
			projectionBoxMaterial.uniforms.cctvPositions.value[i].copy(shadowCameras[i].position)
			shadowCameras[i].getWorldDirection(projectionMaterial.uniforms.cctvDirections.value[i])
			shadowCameras[i].getWorldDirection(projectionBoxMaterial.uniforms.cctvDirections.value[i])
			projectionMaterial.uniforms.cctvFOVs.value[i] = shadowCameras[i].fov
			projectionMaterial.uniforms.cctvAspects.value[i] = shadowCameras[i].aspect
			projectionMaterial.uniforms.cctvNears.value[i] = shadowCameras[i].near
			projectionMaterial.uniforms.cctvFars.value[i] = shadowCameras[i].far
			projectionBoxMaterial.uniforms.cctvFOVs.value[i] = shadowCameras[i].fov
			projectionBoxMaterial.uniforms.cctvAspects.value[i] = shadowCameras[i].aspect
			projectionBoxMaterial.uniforms.cctvNears.value[i] = shadowCameras[i].near
			projectionBoxMaterial.uniforms.cctvFars.value[i] = shadowCameras[i].far
		}
		// 更新阴影矩阵
		for (let i = 0; i < cctvNum; i++) {
			const shadowCamera = shadowCameras[i]
			shadowCamera.updateMatrixWorld()
			// 计算并更新阴影矩阵
			const shadowMatrix = new THREE.Matrix4()
			shadowMatrix.multiplyMatrices(shadowCamera.projectionMatrix, shadowCamera.matrixWorldInverse)
			projectionMaterial.uniforms.shadowMatrices.value[i].copy(shadowMatrix)
			projectionBoxMaterial.uniforms.shadowMatrices.value[i].copy(shadowMatrix)
		}
		renderShadowMaps() // 渲染阴影贴图
	}

	//render深度紋理
	function renderShadowMaps() {
		const initialClearColor = renderer.getClearColor(new THREE.Color())
		const initialClearAlpha = renderer.getClearAlpha()
		renderer.setClearColor(0xffffff, 1)
		const selectCCTVHelper = _getCCTVHelper()
		selectCCTVHelper && (selectCCTVHelper.visible = false) //避免選擇的CCTV干擾
		scene.overrideMaterial = depthMaterial
		for (let i = 0; i < cctvNum; i++) {
			renderer.setRenderTarget(shadowMaps[i])
			renderer.render(scene, shadowCameras[i])
		}
		selectCCTVHelper && (selectCCTVHelper.visible = true) //開啟選擇的CCTV
		scene.overrideMaterial = null
		renderer.setClearColor(initialClearColor, initialClearAlpha)
		renderer.setRenderTarget(null)
	}

	// 將天空盒添加到場景
	scene.add(generateSkyBox())

	// 監聽視窗大小變化
	export function onWindowResize() {
		camera.aspect = window.innerWidth / window.innerHeight
		camera.updateProjectionMatrix()
		renderer.setSize(window.innerWidth, window.innerHeight)
	}

	onDestroy(() => {
		renderer.domElement.remove()
		// transformControls.dispose()
	})

	//CCTV設定
	let selectCCTVSeting = {
		focalLength: 4
	}
	$: CCTV_ChangefocalLength(selectCCTV) //焦距改變
	//改變 UI的 焦距數值
	function CCTV_ChangefocalLength(cctvName: string) {
		const cctv = _getCCTVCamera(cctvName)
		if (cctv) {
			selectCCTVSeting.focalLength = (cctv as CCTVCamera).focalLength
		}
	}
	//UI 改變焦距
	function changeCCTV_FocalLength(e: Event) {
		const target = e.target as HTMLInputElement
		const focalLength = parseFloat(target?.value) || 4
		const shadowCamera = _getCCTVCamera()
		if (!shadowCamera) return
		;(shadowCamera as CCTVCamera).focalLength = focalLength
		selectCCTVSeting.focalLength = focalLength
		const cctvHelper = _getCCTVHelper()
		if (cctvHelper) cctvHelper.update()
		moveCctv(selectCCTV)
		debounce(() => updataShadowMaps(), 100)()
	}

	function onClickClearCCTVHandler() {
		selectCCTV = ''
		cctvMode = ''
	}
	//刪除CCTV
	function delCCTV(name?: string) {
		const cctvObj = _getCCTVObj(name)
		if (cctvObj) {
			const index = cctvObjs.indexOf(cctvObj)
			cctvObjs.splice(index, 1)
			shadowCameras.splice(index, 1)
			const cctvHelper = cctvHelpers.splice(index, 1)
			cctvHelper[0] && scene.remove(cctvHelper[0])
			scene.remove(cctvObj)
			cctvNum--
			selectCCTV = ''
			dispatch(CCTV_DEL, { name: cctvObj.name })
		}
	}
	//刪除全部CCTV(重置)
	export function delAllCCTV() {
		while (cctvObjs.length) {
			delCCTV(cctvObjs[0].name)
		}
	}
</script>

<svelte:window on:resize|passive={onWindowResize} />
<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div id="Viewer" on:click={onRayMe} on:mousemove|preventDefault={onMouseMoveHandler}></div>

<div id="CCTV_Info">
	{#if selectCCTV}
		<div class="flex items-center justify-between">
			<p class="h4">{selectCCTV}</p>
			<button type="button" class="variant-filled btn btn-sm" on:click={onClickClearCCTVHandler}
				>Clear</button
			>
		</div>
		<label class="label" for="length">焦距 {selectCCTVSeting.focalLength} mm</label>
		<input
			class="input"
			type="range"
			min="2.8"
			max="6.0"
			step="0.1"
			value={selectCCTVSeting.focalLength}
			on:input={changeCCTV_FocalLength}
		/>
		<div>
			<SlideToggle
				name="move"
				checked={cctvMode === 'move'}
				on:change={onCCTVchangeMoveModeHandler}
				active="bg-primary-500"
				size="sm">移動位置</SlideToggle
			>
			<SlideToggle
				name="lookat"
				checked={cctvMode === 'lookat'}
				on:change={onCCTVchangeMoveModeHandler}
				active="bg-primary-500"
				size="sm">拍攝方向</SlideToggle
			>
			<button class="variant-filled btn-icon btn-sm scale-75 text-2xl" on:click={() => delCCTV()}>
				<ICON.MaterialSymbolsLightDeleteSharp />
			</button>
		</div>
	{/if}
</div>

<style lang="postcss">
	#Viewer {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 1;
	}
	#CCTV_Info {
		position: absolute;
		top: 10px;
		right: 10px;
		z-index: 100;
		min-width: 100px;
		min-height: 50px;
		padding: 10px;
		background-color: rgba(0, 0, 0, 0.5);
		border-radius: 10px;
		font-size: small;
	}
</style>
