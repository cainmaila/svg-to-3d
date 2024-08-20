<script lang="ts">
	import * as THREE from 'three'
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
	import { svgString$ } from '$lib/stores'
	import { get } from 'svelte/store'
	import { goto } from '$app/navigation'
	import { svgStringToURL, svgToGroupSync } from '$lib/components/Viewer/threelib'
	import { onMount } from 'svelte'

	let viewerDom: HTMLDivElement

	const svgString = get(svgString$) // 从 store 中获取 svg 字符串
	if (!svgString) {
		goto('/', {
			replaceState: true
		})
	}

	// 設置場景、相機和渲染器
	const scene = new THREE.Scene()
	const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 200, 400)
	const renderer = new THREE.WebGLRenderer({ logarithmicDepthBuffer: true })
	renderer.setSize(window.innerWidth, window.innerHeight)
	camera.position.set(0, 200, 200)
	scene.background = new THREE.Color(0x262626)

	// 添加軌道控制
	const controls = new OrbitControls(camera, renderer.domElement)

	// 添加光源
	// const ambientLight = new THREE.AmbientLight(0xffffff, 1)
	// scene.add(ambientLight)
	// const pointLight = new THREE.PointLight(0xffffff, 0.5)
	// pointLight.position.x = 2
	// pointLight.position.y = 3
	// pointLight.position.z = 4
	// scene.add(pointLight)

	onMount(() => {
		init(svgString)
	})

	async function init(svgString: string) {
		const svg = svgStringToURL(svgString)
		const building = await svgToGroupSync(svg, {
			lineWidth: 5, // 設置線段厚度和高度
			wallHeight: 100,
			doorHigh: 80,
			color: 0xcccccc
		})
		//@ts-ignore
		// building.material = new THREE.MeshDepthMaterial()
		// building.children.forEach((child: any) => {
		// 	child.material = new THREE.MeshDepthMaterial()
		// })
		scene.overrideMaterial = new THREE.MeshDepthMaterial()
		scene.add(building)
		// const geometry = new THREE.BoxGeometry()
		// const geometry = new THREE.TorusKnotGeometry(50, 20, 128, 64, 2, 3)
		// geometry.scale(100, 100, 100)
		// const material = new THREE.MeshDepthMaterial()
		// const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
		// material.wireframe = true
		// const cube = new THREE.Mesh(geometry, material)
		// scene.add(cube)
		onWindowResize()
		viewerDom.appendChild(renderer.domElement)
		animate()
	}

	function animate() {
		requestAnimationFrame(animate)

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
