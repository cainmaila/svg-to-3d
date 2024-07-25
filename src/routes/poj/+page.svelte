<script lang="ts">
	import { onMount } from 'svelte'
	import * as THREE from 'three'
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
	import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'
	import { get } from 'svelte/store'
	import { svgString$ } from '$lib/stores'
	import { goto } from '$app/navigation'
	import { svgStringToURL, svgToGroupSync } from '$lib/threelib'
	import { fragmentShader$, vertexShader$ } from '$lib/stores'
	import { depthMaterial } from '$lib/threelib/materialLib'
	import { convertCctvToCamera } from '$lib/threelib/cctvLib'
	let viewerDom: HTMLDivElement

	const svgString = get(svgString$) // 从 store 中获取 svg 字符串

	// 設置場景、相機和渲染器
	const scene = new THREE.Scene()
	const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 5000)
	const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true })
	renderer.setSize(window.innerWidth, window.innerHeight)
	camera.position.set(0, 200, 200)

	// 添加軌道控制
	const controls = new OrbitControls(camera, renderer.domElement)

	if (!svgString) {
		goto('/', {
			replaceState: true
		})
	}

	// 添加光源
	const ambientLight = new THREE.AmbientLight(0xffffff)
	scene.add(ambientLight)

	const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0)
	directionalLight.position.set(1, 0, 1)
	scene.add(directionalLight)
	//更美的光源
	const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820)
	scene.add(hemisphereLight)

	const cctv = convertCctvToCamera({
		focalLength: 8, // 焦距
		sensorWidth: 4.8, // 传感器宽度
		sensorHeight: 3.6, // 传感器高度
		near: 50, // 近裁剪面
		far: 1000 // 远裁剪面
	})
	cctv.position.set(250, 100, -50)
	cctv.lookAt(0, 0, 0)
	scene.add(cctv)
	const cctvHelper = new THREE.CameraHelper(cctv)
	scene.add(cctvHelper)

	// 创建 TransformControls
	const transformControls = new TransformControls(camera, renderer.domElement)
	transformControls.attach(cctv)
	scene.add(transformControls)

	//創建深度紋理
	const shadowMapSize = 2048
	const shadowCameras: THREE.PerspectiveCamera[] = []
	const shadowMaps: THREE.WebGLRenderTarget[] = []
	shadowCameras.push(cctv)

	//render深度紋理
	function renderShadowMaps() {
		const initialClearColor = renderer.getClearColor(new THREE.Color())
		const initialClearAlpha = renderer.getClearAlpha()
		renderer.setClearColor(0xffffff, 1)
		scene.overrideMaterial = depthMaterial
		for (let i = 0; i < 1; i++) {
			renderer.setRenderTarget(shadowMaps[i])
			renderer.render(scene, shadowCameras[i])
		}
		scene.overrideMaterial = null
		renderer.setClearColor(initialClearColor, initialClearAlpha)
		renderer.setRenderTarget(null)
	}

	const shadowMap = new THREE.WebGLRenderTarget(shadowMapSize, shadowMapSize, {
		minFilter: THREE.LinearFilter,
		magFilter: THREE.LinearFilter,
		format: THREE.RGBAFormat
	})
	shadowMaps.push(shadowMap)

	// 創建平面
	const planeMaterial = new THREE.ShaderMaterial({
		uniforms: {
			cctvPositions: { value: [new THREE.Vector3(), new THREE.Vector3()] },
			cctvDirections: { value: [new THREE.Vector3(), new THREE.Vector3()] },
			cctvFOVs: { value: [0, 0] },
			cctvAspects: { value: [0, 0] },
			cctvNears: { value: [0, 0] },
			cctvFars: { value: [0, 0] },
			cctvCount: { value: 1 },
			ambientLightColor: { value: ambientLight.color },
			directionalLightColor: { value: directionalLight.color },
			directionalLightDirection: { value: new THREE.Vector3() },
			hemisphereLightSkyColor: { value: hemisphereLight.color },
			hemisphereLightGroundColor: { value: hemisphereLight.groundColor },
			shadowMaps1: { value: shadowMaps[0].texture },
			shadowMatrices: { value: [new THREE.Matrix4(), new THREE.Matrix4()] }
		},
		vertexShader: $vertexShader$,
		fragmentShader: $fragmentShader$
	})

	// 设置 TransformControls 模式为 "translate"（平移），"rotate"（旋转），或 "scale"（缩放）
	transformControls.setMode('translate')

	// 添加键盘事件来切换模式
	window.addEventListener('keydown', function (event) {
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
	})

	// 禁用 OrbitControls 当 TransformControls 被激活时
	transformControls.addEventListener('mouseDown', function () {
		controls.enabled = false
	})

	transformControls.addEventListener('mouseUp', function () {
		controls.enabled = true
	})

	onMount(() => {
		viewerDom.appendChild(renderer.domElement)
		animate()
	})

	init(svgString)
	async function init(svgString: string) {
		const svg = svgStringToURL(svgString)
		const building = await svgToGroupSync(svg, {
			lineWidth: 5, // 設置線段厚度和高度
			wallHeight: 100,
			doorHigh: 80,
			color: 0xcccccc
		})
		building.castShadow = true // 投射陰影
		building.receiveShadow = true // 接收陰影
		//@ts-ignore
		building.material = planeMaterial
		scene.add(building)
	}

	function animate() {
		requestAnimationFrame(animate)
		planeMaterial.uniforms.cctvPositions.value[0].copy(cctv.position)
		cctv.getWorldDirection(planeMaterial.uniforms.cctvDirections.value[0])
		planeMaterial.uniforms.cctvFOVs.value[0] = cctv.fov
		planeMaterial.uniforms.cctvAspects.value[0] = cctv.aspect
		planeMaterial.uniforms.cctvNears.value[0] = cctv.near
		planeMaterial.uniforms.cctvFars.value[0] = cctv.far
		// 更新平行光方向
		directionalLight.getWorldDirection(planeMaterial.uniforms.directionalLightDirection.value)
		// 更新阴影矩阵
		for (let i = 0; i < 1; i++) {
			const shadowCamera = shadowCameras[i]
			shadowCamera.updateMatrixWorld()
			// 计算并更新阴影矩阵
			const shadowMatrix = new THREE.Matrix4()
			shadowMatrix.multiplyMatrices(shadowCamera.projectionMatrix, shadowCamera.matrixWorldInverse)
			planeMaterial.uniforms.shadowMatrices.value[i].copy(shadowMatrix)
		}
		renderShadowMaps() // 渲染阴影贴图
		controls.update()
		renderer.render(scene, camera)
	}

	function onWindowResize() {
		camera.aspect = window.innerWidth / window.innerHeight
		camera.updateProjectionMatrix()
		renderer.setSize(window.innerWidth, window.innerHeight)
	}

	window.addEventListener('resize', onWindowResize, false)
</script>

<div id="Viewer" bind:this={viewerDom}></div>

<style lang="postcss">
	#Viewer {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 100vh;
	}
</style>
