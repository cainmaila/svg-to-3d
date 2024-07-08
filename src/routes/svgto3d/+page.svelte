<script lang="ts">
	import * as THREE from 'three'
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
	import { svgStringToURL, svgToGroupSync } from '$lib/threelib'
	import { svgString$ } from '$lib/stores'
	import { get } from 'svelte/store'
	import { onDestroy } from 'svelte'
	import { goto } from '$app/navigation'

	// 設置場景、相機和渲染器
	const scene = new THREE.Scene()
	const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
	const renderer = new THREE.WebGLRenderer({ antialias: true })
	renderer.setSize(window.innerWidth, window.innerHeight)
	renderer.shadowMap.enabled = true // 啟用陰影
	document.body.appendChild(renderer.domElement)

	// 添加軌道控制
	const controls = new OrbitControls(camera, renderer.domElement)

	const planeMaterial = new THREE.ShaderMaterial({
		uniforms: {
			spotLightPosition: { value: new THREE.Vector3() },
			spotLightDirection: { value: new THREE.Vector3() },
			spotLightAngle: { value: Math.cos(Math.PI / 6) }, // 聚光燈的角度
			spotLightColor: { value: new THREE.Color(0xff0000) }, // 聚光燈的顏色
			shadowMap: { value: null },
			lightMatrix: { value: new THREE.Matrix4() }
		},
		vertexShader: `
			varying vec3 vWorldPosition;
			varying vec4 vShadowCoord;
			uniform mat4 lightMatrix;
			void main() {
				vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
				vShadowCoord = lightMatrix * vec4(vWorldPosition, 1.0);
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}
		`,
		fragmentShader: `
			uniform vec3 spotLightPosition;
			uniform vec3 spotLightDirection;
			uniform float spotLightAngle;
			uniform vec3 spotLightColor;
			uniform sampler2D shadowMap;

			varying vec3 vWorldPosition;
			varying vec4 vShadowCoord;

			float unpackDepth(const in vec4 rgbaDepth) {
				const vec4 bitShift = vec4(
					1.0 / (256.0 * 256.0 * 256.0),
					1.0 / (256.0 * 256.0),
					1.0 / 256.0,
					1.0
				);
				return dot(rgbaDepth, bitShift);
			}

			void main() {
				vec3 lightToSurface = normalize(vWorldPosition - spotLightPosition);
				float angle = dot(lightToSurface, normalize(spotLightDirection));

				vec3 shadowCoord = vShadowCoord.xyz / vShadowCoord.w;
				shadowCoord = shadowCoord * 0.5 + 0.5;
				float shadowDepth = unpackDepth(texture2D(shadowMap, shadowCoord.xy));

				float surfaceDepth = shadowCoord.z;

				if (surfaceDepth > shadowDepth + 0.005) {
					gl_FragColor = vec4(0.2, 0.2, 0.2, 1.0); // 陰影區域
				} else {
					if (angle > spotLightAngle) {
						gl_FragColor = vec4(spotLightColor, 1.0);
					} else {
						gl_FragColor = vec4(0.2, 0.2, 0.2, 1.0); // 默認顏色
					}
				}
			}
		`,
		side: THREE.FrontSide
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
		let group
		try {
			const svg = svgStringToURL(svgString)
			group = await svgToGroupSync(svg, {
				lineWidth: 5, // 設置線段厚度和高度
				wallHeight: 100,
				doorHigh: 80,
				color: 0xcccccc
			})

			group.castShadow = true

			group.traverse((child) => {
				if (child instanceof THREE.Mesh) {
					child.material = planeMaterial
				}
			})
		} catch (error: any) {
			goto('', {
				replaceState: true
			})
			return
		}

		// //加個網格底座
		// const grid = new THREE.GridHelper(1000, 100, 0x888888, 0x444444)
		// // grid.position.y = -50
		// scene.add(grid)

		//group置中
		// group.position.y = -25
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

	// 創建聚光燈
	const spotLight = new THREE.SpotLight(0xffffff)
	spotLight.angle = Math.PI / 6 // 聚光燈的角度
	spotLight.position.set(300, 300, 100)
	spotLight.target.position.set(0, 0, 0)
	scene.add(spotLight)
	scene.add(spotLight.target)
	spotLight.castShadow = true

	// 創建SpotLightHelper
	const spotLightHelper = new THREE.SpotLightHelper(spotLight)
	scene.add(spotLightHelper)

	// 添加光源
	const ambientLight = new THREE.AmbientLight(0x000000)
	scene.add(ambientLight)

	const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
	directionalLight.position.set(1, 1, 1)
	scene.add(directionalLight)
	//更美的光源
	const light = new THREE.HemisphereLight(0xffffbb, 0x080820)
	scene.add(light)

	// 渲染循環
	function animate() {
		requestAnimationFrame(animate)

		controls.update()
		spotLightHelper.update()
		renderer.render(scene, camera)
	}
	animate()

	onDestroy(() => {
		renderer.domElement.remove()
	})
</script>
