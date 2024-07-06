<script lang="ts">
	import { onMount } from 'svelte'
	import * as THREE from 'three'
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

	let viewerDom: HTMLDivElement
	// 設置場景、相機和渲染器
	const scene = new THREE.Scene()
	const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000)
	const renderer = new THREE.WebGLRenderer({ antialias: true })
	renderer.setSize(window.innerWidth, window.innerHeight)

	camera.position.set(0, 100, -100)

	// 添加軌道控制
	const controls = new OrbitControls(camera, renderer.domElement)

	//加個網格底座
	const grid = new THREE.GridHelper(1000, 100, 0x888888, 0x444444)
	scene.add(grid)

	const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
	directionalLight.position.set(1, 1, 1)
	scene.add(directionalLight)

	onMount(() => {
		viewerDom.appendChild(renderer.domElement)
	})

	// 渲染循環
	function animate() {
		requestAnimationFrame(animate)
		controls.update()
		renderer.render(scene, camera)
	}
	animate()
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
