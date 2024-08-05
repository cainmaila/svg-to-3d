<script lang="ts">
	import * as THREE from 'three'
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
	import { createEventDispatcher, onDestroy, onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import { generateSkyBox, svgStringToURL, svgToGroupSync } from '$lib/threelib'
	import { CCTVCamera } from '$lib/threelib/cctvLib'
	import { depthMaterial } from '$lib/threelib/materialLib'
	import { fragmentShader$, vertexShader$, scalceSize$ } from '$lib/stores'
	import { generateGLB } from '$lib/threelib'
	import { SlideToggle } from '@skeletonlabs/skeleton'

	const dispatch = createEventDispatcher()
	const MODLE_READY = 'modelReady' //模型準備好
	//反應陰影的材質
	const oupPutMaterial = new THREE.MeshStandardMaterial({
		color: 0xaaaaaa,
		roughness: 0.5,
		metalness: 0.5
	})
	const cctvNum = 2 //CCTV數量

	export let data: {
		svgString: string
	}
	export let downloadGLB: string = ''
	let build: THREE.Group //建築物
	let { svgString } = data
	let selectCCTV: string = '' //選擇的cctv
	let cctvMode = '' //cctv模式 move

	// 設置場景、相機和渲染器
	const scene = new THREE.Scene()
	const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 100000)
	const renderer = new THREE.WebGLRenderer({ antialias: true })
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
	// 添加光源
	const ambientLight = new THREE.AmbientLight(0xffffff)
	scene.add(ambientLight)
	const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0)
	directionalLight.position.set(1, 0, 1)
	scene.add(directionalLight)
	const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820)
	hemisphereLight.position.set(0, 500, 0)
	scene.add(hemisphereLight)
	//建立一個CCTV
	function createCCTV(position: THREE.Vector3, lookAt: THREE.Vector3) {
		const cctv = new CCTVCamera({
			focalLength: 4, // 焦距
			sensorWidth: 4.8, // 传感器宽度
			sensorHeight: 3.6, // 传感器高度
			near: 5, // 近裁剪面
			far: 3000 // 远裁剪面
		})
		cctv.position.copy(position)
		cctv.lookAt(lookAt)
		scene.add(cctv)
		const cctvHelper = new THREE.CameraHelper(cctv)
		cctvHelper.visible = false
		scene.add(cctvHelper)
		return { cctv, cctvHelper }
	}
	// 添加CCTV1
	const { cctv: cctv1, cctvHelper: cctvHelper1 } = createCCTV(
		new THREE.Vector3(500, 300, -350),
		new THREE.Vector3(0, 100, 0)
	)
	// 添加CCTV2
	const { cctv: cctv2, cctvHelper: cctvHelper2 } = createCCTV(
		new THREE.Vector3(-500, 300, 500),
		new THREE.Vector3(0, -100, 100)
	)
	// // 添加CCTV3
	// const { cctv: cctv3, cctvHelper: cctvHelper3 } = createCCTV(
	// 	new THREE.Vector3(500, 300, -500),
	// 	new THREE.Vector3(0, -100, 100)
	// )
	// // 添加CCTV4
	// const { cctv: cctv4, cctvHelper: cctvHelper4 } = createCCTV(
	// 	new THREE.Vector3(-500, 300, 350),
	// 	new THREE.Vector3(0, -100, 0)
	// )
	const shadowCameras: THREE.PerspectiveCamera[] = []
	shadowCameras.push(cctv1)
	shadowCameras.push(cctv2)
	// shadowCameras.push(cctv3)
	// shadowCameras.push(cctv4)
	const cctvHelpers: THREE.CameraHelper[] = []
	cctvHelpers.push(cctvHelper1)
	cctvHelpers.push(cctvHelper2)
	// cctvHelpers.push(cctvHelper3)
	// cctvHelpers.push(cctvHelper4)
	//攝影機物件
	const cctvObjs: THREE.Mesh[] = shadowCameras.map((_, ind) => {
		const cctvObj = new THREE.Mesh(
			new THREE.BoxGeometry(10, 10, 20),
			new THREE.MeshBasicMaterial({ color: 0xff0000 })
		)
		cctvObj.name = `cctv${ind + 1}`
		scene.add(cctvObj)
		cctvObj.position.copy(shadowCameras[ind].position)
		cctvObj.quaternion.copy(shadowCameras[ind].quaternion)
		return cctvObj
	})
	//複製攝影機位置包含旋轉
	function moveCctv(ind: number) {
		cctvObjs[ind].position.copy(shadowCameras[ind].position)
		cctvObjs[ind].quaternion.copy(shadowCameras[ind].quaternion)
	}
	//選擇cctv
	$: {
		if (selectCCTV) {
			_clearSelectCCTV()
			const selectIndex = parseInt(selectCCTV.replace('cctv', '')) - 1
			cctvHelpers[selectIndex].visible = true
			selectCCTVSeting.focalLength = (shadowCameras[selectIndex] as CCTVCamera).focalLength
		} else {
			_clearSelectCCTV()
		}
	}

	function _clearSelectCCTV() {
		cctvHelpers.forEach((cctvHelper) => {
			cctvHelper.visible = false
		})
	}
	//點選畫面ray到cctvObj
	const raycaster = new THREE.Raycaster()
	const mouse = new THREE.Vector2()
	function onRayCCTV(event: MouseEvent) {
		mouse.x = (event.clientX / window.innerWidth) * 2 - 1
		mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
		raycaster.setFromCamera(mouse, camera)
		const intersects = raycaster.intersectObjects(cctvObjs)
		if (intersects.length > 0) {
			const obj = intersects[0].object
			selectCCTV = obj.name
		} else {
			//沒有選到cctv的情況下
			if (cctvMode === 'move') {
				//ray到topGrid的位置
				const intersectsTopGrid = raycaster.intersectObject(topMesh)
				if (intersectsTopGrid.length > 0) {
					const point = intersectsTopGrid[0].point
					if (selectCCTV) {
						const selectIndex = parseInt(selectCCTV.replace('cctv', '')) - 1
						shadowCameras[selectIndex].position.copy(point)
						moveCctv(selectIndex)
						cctvMode = 'lookat' //移動完畢
					}
				}
			} else if (cctvMode === 'lookat') {
				cctvMode = ''
			}
		}
	}
	function onMouseMoveHandler(event: MouseEvent) {
		if (cctvMode === 'lookat' && selectCCTV) {
			mouse.x = (event.clientX / window.innerWidth) * 2 - 1
			mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
			raycaster.setFromCamera(mouse, camera)
			const intersectsBuild = raycaster.intersectObject(build)
			if (intersectsBuild.length > 0) {
				const point = intersectsBuild[0].point
				const selectIndex = parseInt(selectCCTV.replace('cctv', '')) - 1
				shadowCameras[selectIndex].lookAt(point)
				moveCctv(selectIndex)
			}
		}
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
	const shadowMapSize = 2048
	const shadowMaps: THREE.WebGLRenderTarget[] = shadowCameras.map(() => {
		return new THREE.WebGLRenderTarget(shadowMapSize, shadowMapSize, {
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			format: THREE.RGBAFormat,
			type: THREE.FloatType, // 使用浮點數格式提高精度
			anisotropy: 16 // 啟用各向異性過濾
		})
	})
	//創建投影貼圖
	const projectionMaterial = new THREE.ShaderMaterial({
		uniforms: {
			cctvPositions: {
				value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]
			},
			cctvDirections: {
				value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]
			},
			cctvFOVs: { value: [0, 0, 0, 0] },
			cctvAspects: { value: [0, 0, 0, 0] },
			cctvNears: { value: [0, 0, 0, 0] },
			cctvFars: { value: [0, 0, 0, 0] },
			cctvCount: { value: cctvNum },
			ambientLightColor: { value: ambientLight.color },
			directionalLightColor: { value: directionalLight.color },
			directionalLightDirection: { value: new THREE.Vector3() },
			hemisphereLightSkyColor: { value: hemisphereLight.color },
			hemisphereLightGroundColor: { value: hemisphereLight.groundColor },
			hemisphereLightPosition: { value: hemisphereLight.position },
			shadowMaps1: { value: shadowMaps[0]?.texture || null },
			shadowMaps2: { value: shadowMaps[1]?.texture || null },
			shadowMaps3: { value: shadowMaps[2]?.texture || null },
			shadowMaps4: { value: shadowMaps[3]?.texture || null },
			shadowMatrices: {
				value: [new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4()]
			}
		},
		vertexShader: $vertexShader$,
		fragmentShader: $fragmentShader$
	})

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
		build.traverse((child) => {
			if (child instanceof THREE.Mesh) {
				child.material = projectionMaterial
			}
		})
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
					child.material = oupPutMaterial
				}
			})
			downloadGLB = await generateGLB(build)
			build.traverse((child) => {
				if (child instanceof THREE.Mesh) {
					child.material = projectionMaterial
				}
			})
		} catch (error) {
			alert('轉換匯出模型失敗')
		}
	}

	// 渲染循環
	function animate() {
		requestAnimationFrame(animate)
		for (let i = 0; i < cctvNum; i++) {
			// 更新CCTV位置
			projectionMaterial.uniforms.cctvPositions.value[i].copy(shadowCameras[i].position)
			shadowCameras[i].getWorldDirection(projectionMaterial.uniforms.cctvDirections.value[i])
			projectionMaterial.uniforms.cctvFOVs.value[i] = shadowCameras[i].fov
			projectionMaterial.uniforms.cctvAspects.value[i] = shadowCameras[i].aspect
			projectionMaterial.uniforms.cctvNears.value[i] = shadowCameras[i].near
			projectionMaterial.uniforms.cctvFars.value[i] = shadowCameras[i].far
		}
		// 更新平行光方向
		directionalLight.getWorldDirection(projectionMaterial.uniforms.directionalLightDirection.value)
		// 更新阴影矩阵
		for (let i = 0; i < cctvNum; i++) {
			const shadowCamera = shadowCameras[i]
			shadowCamera.updateMatrixWorld()
			// 计算并更新阴影矩阵
			const shadowMatrix = new THREE.Matrix4()
			shadowMatrix.multiplyMatrices(shadowCamera.projectionMatrix, shadowCamera.matrixWorldInverse)
			projectionMaterial.uniforms.shadowMatrices.value[i].copy(shadowMatrix)
		}
		renderShadowMaps() // 渲染阴影贴图

		controls.update()
		renderer.render(scene, camera)
	}
	animate()

	//render深度紋理
	function renderShadowMaps() {
		const initialClearColor = renderer.getClearColor(new THREE.Color())
		const initialClearAlpha = renderer.getClearAlpha()
		renderer.setClearColor(0xffffff, 1)
		scene.overrideMaterial = depthMaterial
		for (let i = 0; i < cctvNum; i++) {
			renderer.setRenderTarget(shadowMaps[i])
			renderer.render(scene, shadowCameras[i])
		}
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
		const cctv = shadowCameras.find((cctv) => cctv.name === cctvName)
		if (cctv) {
			selectCCTVSeting.focalLength = (cctv as CCTVCamera).focalLength
		}
	}
	//UI 改變焦距
	function changeCCTV_FocalLength(e: Event) {
		const target = e.target as HTMLInputElement
		const focalLength = parseFloat(target?.value) || 4
		const index = parseInt(selectCCTV.replace('cctv', '')) - 1
		;(shadowCameras[index] as CCTVCamera).focalLength = focalLength
		cctvHelpers[index].update()
	}

	function onClickClearCCTVHandler() {
		selectCCTV = ''
		cctvMode = ''
	}
</script>

<svelte:window on:resize|passive={onWindowResize} />
<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div id="Viewer" on:click={onRayCCTV} on:mousemove|preventDefault={onMouseMoveHandler}></div>

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
