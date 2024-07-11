<script lang="ts">
	import * as THREE from 'three'
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
	import { get } from 'svelte/store'
	import { onDestroy } from 'svelte'
	import { goto } from '$app/navigation'
	import { svgStringToURL, svgToGroupSync } from '$lib/threelib'
	import { svgString$ } from '$lib/stores'
	import { convertCctvToCamera } from '$lib/threelib/cctvLib'
	import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'
	import { depthMaterial } from '$lib/threelib/materialLib'
	import { fragmentShader$, vertexShader$ } from '$lib/stores'

	// 設置場景、相機和渲染器
	const scene = new THREE.Scene()
	const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000)
	const renderer = new THREE.WebGLRenderer({ antialias: true })
	renderer.setSize(window.innerWidth, window.innerHeight)
	document.body.appendChild(renderer.domElement)
	// 添加軌道控制
	const controls = new OrbitControls(camera, renderer.domElement)
	controls.maxDistance = 1000 // 最大缩放距离
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
		near: 50, // 近裁剪面
		far: 1000 // 远裁剪面
	})
	cctv1.position.set(250, 100, -50)
	cctv1.lookAt(0, 0, 0)
	scene.add(cctv1)
	const cctvHelper1 = new THREE.CameraHelper(cctv1)
	scene.add(cctvHelper1)
	// 添加CCTV2
	const cctv2 = convertCctvToCamera({
		focalLength: 8, // 焦距
		sensorWidth: 4.8, // 传感器宽度
		sensorHeight: 3.6, // 传感器高度
		near: 50, // 近裁剪面
		far: 1000 // 远裁剪面
	})
	cctv2.position.set(-250, 100, 0)
	cctv2.lookAt(0, 0, 0)
	scene.add(cctv2)
	const cctvHelper2 = new THREE.CameraHelper(cctv2)
	scene.add(cctvHelper2)

	// 创建 TransformControls
	const transformControls = new TransformControls(camera, renderer.domElement)
	transformControls.attach(cctv1)
	scene.add(transformControls)
	//創建深度紋理
	const shadowMapSize = 2048
	const shadowCameras: THREE.PerspectiveCamera[] = []
	const shadowMaps: THREE.WebGLRenderTarget[] = []
	shadowCameras.push(cctv1)
	const shadowMap = new THREE.WebGLRenderTarget(shadowMapSize, shadowMapSize, {
		minFilter: THREE.LinearFilter,
		magFilter: THREE.LinearFilter,
		format: THREE.RGBAFormat
	})
	shadowMaps.push(shadowMap)
	shadowCameras.push(cctv2)
	const shadowMap2 = new THREE.WebGLRenderTarget(shadowMapSize, shadowMapSize, {
		minFilter: THREE.LinearFilter,
		magFilter: THREE.LinearFilter,
		format: THREE.RGBAFormat
	})
	shadowMaps.push(shadowMap2)
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
		const svgString = get(svgString$)
		if (!svgString) {
			goto('/', {
				replaceState: true
			})
			return
		}
		let build
		try {
			const svg = svgStringToURL(svgString)
			build = await svgToGroupSync(svg, {
				lineWidth: 5, // 設置線段厚度和高度
				wallHeight: 100,
				doorHigh: 80,
				color: 0xcccccc
			})
		} catch (error: any) {
			goto('', {
				replaceState: true
			})
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
	window.addEventListener('keydown', transformControlsChange)

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

	// 禁用 OrbitControls 当 TransformControls 被激活时
	transformControls.addEventListener('mouseDown', function () {
		controls.enabled = false
	})
	transformControls.addEventListener('mouseUp', function () {
		controls.enabled = true
	})

	// 頂點着色器
	const vertexShader = `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

	// 片段着色器
	const fragmentShader = `
  uniform vec3 topColor;
  uniform vec3 bottomColor;
  uniform float offset;
  uniform float exponent;
  varying vec3 vWorldPosition;
  void main() {
    float h = normalize(vWorldPosition + offset).y;
    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
  }
`

	// 自定義材質
	const uniforms = {
		topColor: { value: new THREE.Color(0x87ceeb) }, // 天空的淺藍色
		bottomColor: { value: new THREE.Color(0x000000) }, // 低處的白色
		offset: { value: 33 },
		exponent: { value: 0.6 }
	}

	const skyMaterial = new THREE.ShaderMaterial({
		vertexShader: vertexShader,
		fragmentShader: fragmentShader,
		uniforms: uniforms,
		side: THREE.BackSide
	})

	// 创建天空盒几何体
	const skyGeometry = new THREE.SphereGeometry(1000, 32, 15)

	// 创建天空盒
	const skyBox = new THREE.Mesh(skyGeometry, skyMaterial)

	// 將天空盒添加到場景
	scene.add(skyBox)

	function onWindowResize() {
		camera.aspect = window.innerWidth / window.innerHeight
		camera.updateProjectionMatrix()
		renderer.setSize(window.innerWidth, window.innerHeight)
	}
	window.addEventListener('resize', onWindowResize, false)

	onDestroy(() => {
		renderer.domElement.remove()
		window.removeEventListener('keydown', transformControlsChange)
		transformControls.dispose()
		window.removeEventListener('resize', onWindowResize)
	})
</script>
