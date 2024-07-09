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
	let viewerDom: HTMLDivElement

	const svgString = get(svgString$) // 从 store 中获取 svg 字符串

	// 設置場景、相機和渲染器
	const scene = new THREE.Scene()
	const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000)
	const renderer = new THREE.WebGLRenderer({ antialias: true })
	renderer.setSize(window.innerWidth, window.innerHeight)
	camera.position.set(0, 100, 200)

	// 添加軌道控制
	const controls = new OrbitControls(camera, renderer.domElement)

	if (!svgString) {
		goto('/', {
			replaceState: true
		})
	}

	// 添加網格底座
	// const building = new THREE.GridHelper(1000, 100, 0x888888, 0x444444)
	// scene.add(building)

	// // 創建Box
	// const boxGeometry = new THREE.BoxGeometry(500, 5, 500)

	// 創建平面
	const planeMaterial = new THREE.ShaderMaterial({
		uniforms: {
			cctvPositions: { value: [new THREE.Vector3(), new THREE.Vector3()] },
			cctvDirections: { value: [new THREE.Vector3(), new THREE.Vector3()] },
			cctvFOVs: { value: [0, 0] },
			cctvAspects: { value: [0, 0] },
			cctvNears: { value: [0, 0] },
			cctvFars: { value: [0, 0] },
			cctvCount: { value: 2 }
		},
		vertexShader: $vertexShader$,
		fragmentShader: $fragmentShader$
	})

	// const plane = new THREE.Mesh(boxGeometry, planeMaterial)
	// plane.position.y = 0
	// scene.add(plane)

	// 相機參數
	const focalLength = 8
	const sensorWidth = 4.8
	const sensorHeight = 3.6
	const fovVerticalRadians = 2 * Math.atan(sensorHeight / (2 * focalLength))
	const fovVerticalDegrees = fovVerticalRadians * (180 / Math.PI)
	const aspect = sensorWidth / sensorHeight
	const near = 0.1
	const far = 1000

	const cctv = new THREE.PerspectiveCamera(fovVerticalDegrees, aspect, near, far)
	cctv.position.set(100, 200, -50)
	cctv.lookAt(0, 0, 0)
	scene.add(cctv)
	const cctvHelper = new THREE.CameraHelper(cctv)
	scene.add(cctvHelper)

	const cctv2 = new THREE.PerspectiveCamera(fovVerticalDegrees, aspect, near, far)
	cctv2.position.set(-100, 200, -50)
	cctv2.lookAt(50, 0, 0)
	scene.add(cctv2)
	const cctvHelper2 = new THREE.CameraHelper(cctv2)
	scene.add(cctvHelper2)

	// 创建 TransformControls
	const transformControls = new TransformControls(camera, renderer.domElement)
	transformControls.attach(cctv)
	scene.add(transformControls)

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

	// 添加光源
	const ambientLight = new THREE.AmbientLight(0x000000)
	scene.add(ambientLight)

	const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
	directionalLight.position.set(1, 1, 1)
	scene.add(directionalLight)
	//更美的光源
	const light = new THREE.HemisphereLight(0xffffbb, 0x080820)
	scene.add(light)

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
		//@ts-ignore
		building.material = planeMaterial
		scene.add(building)
	}

	function animate() {
		requestAnimationFrame(animate)
		planeMaterial.uniforms.cctvPositions.value[0].copy(cctv.position)
		planeMaterial.uniforms.cctvPositions.value[1].copy(cctv2.position)
		cctv.getWorldDirection(planeMaterial.uniforms.cctvDirections.value[0])
		cctv2.getWorldDirection(planeMaterial.uniforms.cctvDirections.value[1])
		planeMaterial.uniforms.cctvFOVs.value[0] = cctv.fov
		planeMaterial.uniforms.cctvFOVs.value[1] = cctv2.fov
		planeMaterial.uniforms.cctvAspects.value[0] = cctv.aspect
		planeMaterial.uniforms.cctvAspects.value[1] = cctv2.aspect
		planeMaterial.uniforms.cctvNears.value[0] = cctv.near
		planeMaterial.uniforms.cctvNears.value[1] = cctv2.near
		planeMaterial.uniforms.cctvFars.value[0] = cctv.far
		planeMaterial.uniforms.cctvFars.value[1] = cctv2.far
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
