<script lang="ts">
	import * as THREE from 'three'
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
	import { createEventDispatcher, onDestroy, onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import { generateSkyBox, svgStringToURL, svgToGroupSync } from '$lib/threelib'
	import { convertCctvToCamera } from '$lib/threelib/cctvLib'
	import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'
	import { depthMaterial } from '$lib/threelib/materialLib'
	import { fragmentShader$, vertexShader$, scalceSize$ } from '$lib/stores'
	import { generateGLB } from '$lib/threelib'

	const dispatch = createEventDispatcher()
	const MODLE_READY = 'modelReady' //模型準備好

	// const oupPutMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 })
	//反應陰影的材質
	const oupPutMaterial = new THREE.MeshStandardMaterial({
		color: 0xaaaaaa,
		roughness: 0.5,
		metalness: 0.5
	})

	export let data: {
		svgString: string
	}
	export let downloadGLB: string = ''
	let { svgString } = data

	let selectCCTV: string = ''

	// 設置場景、相機和渲染器
	const scene = new THREE.Scene()
	const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 100000)
	const renderer = new THREE.WebGLRenderer({ antialias: true })
	renderer.setSize(window.innerWidth, window.innerHeight)

	onMount(() => {
		document.getElementById('Viewer')?.appendChild(renderer.domElement)
	})

	// 添加軌道控制
	const controls = new OrbitControls(camera, renderer.domElement)
	controls.maxDistance = 10000 // 最大缩放距离
	// 添加光源
	const ambientLight = new THREE.AmbientLight(0xffffff)
	// scene.add(ambientLight)
	const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0)
	directionalLight.position.set(1, 0, 1)
	// scene.add(directionalLight)
	const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820)
	// scene.add(hemisphereLight)
	// 添加CCTV1
	const cctv1 = convertCctvToCamera({
		focalLength: 8, // 焦距
		sensorWidth: 4.8, // 传感器宽度
		sensorHeight: 3.6, // 传感器高度
		near: 5, // 近裁剪面
		far: 3000 // 远裁剪面
	})
	cctv1.position.set(500, 300, -350)
	cctv1.lookAt(0, 100, 0)
	scene.add(cctv1)
	const cctvHelper1 = new THREE.CameraHelper(cctv1)
	scene.add(cctvHelper1)
	cctvHelper1.visible = false
	// 添加CCTV2
	const cctv2 = convertCctvToCamera({
		focalLength: 8, // 焦距
		sensorWidth: 4.8, // 传感器宽度
		sensorHeight: 3.6, // 传感器高度
		near: 5, // 近裁剪面
		far: 3000 // 远裁剪面
	})
	cctv2.position.set(-500, 300, 500)
	cctv2.lookAt(0, -100, 100)
	scene.add(cctv2)
	const cctvHelper2 = new THREE.CameraHelper(cctv2)
	scene.add(cctvHelper2)
	cctvHelper2.visible = false
	const shadowCameras: THREE.PerspectiveCamera[] = []
	shadowCameras.push(cctv1)
	shadowCameras.push(cctv2)
	// 创建 TransformControls
	const transformControls = new TransformControls(camera, renderer.domElement)
	scene.add(transformControls)
	// 禁用 OrbitControls 当 TransformControls 被激活时
	transformControls.addEventListener('dragging-changed', function (event) {
		controls.enabled = !event.value
	})
	//攝影機物件
	const cctvObjs = [
		new THREE.Mesh(
			new THREE.BoxGeometry(10, 10, 20),
			new THREE.MeshBasicMaterial({ color: 0xff0000 })
		),
		new THREE.Mesh(
			new THREE.BoxGeometry(10, 10, 20),
			new THREE.MeshBasicMaterial({ color: 0xff0000 })
		)
	]
	cctvObjs.forEach((cctvObj, ind) => {
		cctvObj.name = `cctv${ind + 1}`
		scene.add(cctvObj)
		moveCctv(ind)
	})
	//複製攝影機位置包含旋轉
	function moveCctv(ind: number) {
		cctvObjs[ind].position.copy(shadowCameras[ind].position)
		cctvObjs[ind].quaternion.copy(shadowCameras[ind].quaternion)
	}
	transformControls.addEventListener('objectChange', () => {
		const selectIndex = selectCCTV === 'cctv1' ? 0 : 1
		moveCctv(selectIndex)
	})
	//選擇cctv
	$: {
		switch (selectCCTV) {
			case 'cctv1':
				_clearSelectCCTV()
				transformControls.attach(cctv1)
				cctvHelper1.visible = true
				break
			case 'cctv2':
				_clearSelectCCTV()
				transformControls.attach(cctv2)
				cctvHelper2.visible = true
				break
			default:
				_clearSelectCCTV()
		}
	}
	function _clearSelectCCTV() {
		cctvHelper1.visible = false
		cctvHelper2.visible = false
		transformControls.detach()
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
			selectCCTV = ''
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
			cctvPositions: { value: [new THREE.Vector3(), new THREE.Vector3()] },
			cctvDirections: { value: [new THREE.Vector3(), new THREE.Vector3()] },
			cctvFOVs: { value: [0, 0] },
			cctvAspects: { value: [0, 0] },
			cctvNears: { value: [0, 0] },
			cctvFars: { value: [0, 0] },
			cctvCount: { value: 2 },
			ambientLightColor: { value: ambientLight.color },
			directionalLightColor: { value: directionalLight.color },
			directionalLightDirection: { value: new THREE.Vector3() },
			hemisphereLightSkyColor: { value: hemisphereLight.color },
			hemisphereLightGroundColor: { value: hemisphereLight.groundColor },
			shadowMaps1: { value: shadowMaps[0].texture },
			shadowMaps2: { value: shadowMaps[1].texture },
			shadowMatrices: { value: [new THREE.Matrix4(), new THREE.Matrix4()] }
		},
		vertexShader: $vertexShader$,
		fragmentShader: $fragmentShader$
	})

	init()
	async function init() {
		let build
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
			console.log(error)
			// alert(error.message || error)
			// goto('/', {
			// 	replaceState: true
			// })
			return
		}

		// //加個網格底座
		// const grid = new THREE.GridHelper(10000, 500, 0x888888, 0x444444)
		// grid.position.y = -5
		// scene.add(grid)

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
		const maxDim = Math.max(size.x, size.y, size.z)

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

		projectionMaterial.uniforms.cctvPositions.value[0].copy(cctv1.position)
		cctv1.getWorldDirection(projectionMaterial.uniforms.cctvDirections.value[0])
		projectionMaterial.uniforms.cctvFOVs.value[0] = cctv1.fov
		projectionMaterial.uniforms.cctvAspects.value[0] = cctv1.aspect
		projectionMaterial.uniforms.cctvNears.value[0] = cctv1.near
		projectionMaterial.uniforms.cctvFars.value[0] = cctv1.far

		projectionMaterial.uniforms.cctvPositions.value[1].copy(cctv2.position)
		cctv2.getWorldDirection(projectionMaterial.uniforms.cctvDirections.value[1])
		projectionMaterial.uniforms.cctvFOVs.value[1] = cctv2.fov
		projectionMaterial.uniforms.cctvAspects.value[1] = cctv2.aspect
		projectionMaterial.uniforms.cctvNears.value[1] = cctv2.near
		projectionMaterial.uniforms.cctvFars.value[1] = cctv2.far

		// 更新平行光方向
		directionalLight.getWorldDirection(projectionMaterial.uniforms.directionalLightDirection.value)
		// 更新阴影矩阵
		for (let i = 0; i < 2; i++) {
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
		for (let i = 0; i < 2; i++) {
			renderer.setRenderTarget(shadowMaps[i])
			renderer.render(scene, shadowCameras[i])
		}
		scene.overrideMaterial = null
		renderer.setClearColor(initialClearColor, initialClearAlpha)
		renderer.setRenderTarget(null)
	}

	// 设置 TransformControls 模式为 "translate"（平移），"rotate"（旋转），或 "scale"（缩放）
	transformControls.setMode('translate')
	// 添加键盘事件来切换模式
	function transformControlsChange(event: KeyboardEvent) {
		switch (event.key) {
			case 't': // 平移
				transformControls.setMode('translate')
				break
			case 'r': // 旋转
				transformControls.setMode('rotate')
				break
			case 's': // 缩放
				transformControls.setMode('scale')
				break
		}
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
		transformControls.dispose()
	})
</script>

<svelte:window
	on:resize|passive={onWindowResize}
	on:keydown={transformControlsChange}
	on:click={onRayCCTV}
/>
<div id="Viewer"></div>

<style lang="postcss">
	#Viewer {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 1;
	}
</style>
