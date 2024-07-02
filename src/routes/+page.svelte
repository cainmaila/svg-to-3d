<script lang="ts">
	import * as THREE from 'three'
	import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
	import { createExtrudedLine, svgToGroupSync } from '$lib/threelib'

	// 設置場景、相機和渲染器
	const scene = new THREE.Scene()
	const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
	const renderer = new THREE.WebGLRenderer({ antialias: true })
	renderer.setSize(window.innerWidth, window.innerHeight)
	document.body.appendChild(renderer.domElement)

	// 添加軌道控制
	const controls = new OrbitControls(camera, renderer.domElement)

	init()
	async function init() {
		const group = await svgToGroupSync('/sss.svg', {
			lineWidth: 5, // 設置線段厚度和高度
			wallHeight: 50,
			color: 0xcccccc
		})
		scene.add(group)
		// 調整相機位置
		const box = new THREE.Box3().setFromObject(group)
		const center = box.getCenter(new THREE.Vector3())
		const size = box.getSize(new THREE.Vector3())
		const maxDim = Math.max(size.x, size.y, size.z)

		camera.position.set(center.x, center.y + maxDim / 2, center.z + maxDim)
		camera.lookAt(center)
		controls.target.copy(center)
		controls.update()
	}

	// 添加光源
	const ambientLight = new THREE.AmbientLight(0x404040)
	scene.add(ambientLight)

	const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
	directionalLight.position.set(1, 1, 1)
	scene.add(directionalLight)

	// 渲染循環
	function animate() {
		requestAnimationFrame(animate)
		controls.update()
		renderer.render(scene, camera)
	}
	animate()
</script>
