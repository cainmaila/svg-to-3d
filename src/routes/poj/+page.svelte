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
	camera.position.set(0, 100, 200)

	// 添加軌道控制
	const controls = new OrbitControls(camera, renderer.domElement)

	// 添加網格底座
	const grid = new THREE.GridHelper(1000, 100, 0x888888, 0x444444)
	scene.add(grid)

	// 創建平面
	const planeGeometry = new THREE.PlaneGeometry(500, 500, 32, 32)
	const planeMaterial = new THREE.ShaderMaterial({
		uniforms: {
			cctvPosition: { value: new THREE.Vector3() },
			cctvDirection: { value: new THREE.Vector3() },
			cctvFOV: { value: 0 },
			cctvAspect: { value: 0 },
			cctvNear: { value: 0 },
			cctvFar: { value: 0 }
		},
		vertexShader: `
            varying vec3 vWorldPosition;
            void main() {
            vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
		fragmentShader: `
            uniform vec3 cctvPosition;
            uniform vec3 cctvDirection;
            uniform float cctvFOV;
            uniform float cctvAspect;
            uniform float cctvNear;
            uniform float cctvFar;
            varying vec3 vWorldPosition;

            void main() {
            vec3 toFragment = vWorldPosition - cctvPosition;

            // 計算在 CCTV 視錐體內的距離
            float distance = dot(toFragment, normalize(cctvDirection));

            // 檢查是否在近平面和遠平面之間
            if (distance < cctvNear || distance > cctvFar) {
                gl_FragColor = vec4(0.2, 0.2, 0.2, 1.0);
                return;
            }

            // 計算在 CCTV 視錐體截面上的位置
            vec3 projection = cctvPosition + normalize(cctvDirection) * distance;
            vec3 toProjection = vWorldPosition - projection;

            // 計算視錐體在該距離的半寬和半高
            float halfHeight = tan(radians(cctvFOV) * 0.5) * distance;
            float halfWidth = halfHeight * cctvAspect;

            // 檢查是否在視錐體內
            vec3 cctvRight = normalize(cross(cctvDirection, vec3(0.0, 1.0, 0.0)));
            vec3 cctvUp = normalize(cross(cctvRight, cctvDirection));

            float x = dot(toProjection, cctvRight);
            float y = dot(toProjection, cctvUp);

            if (abs(x) <= halfWidth && abs(y) <= halfHeight) {
                gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
            } else {
                gl_FragColor = vec4(0.2, 0.2, 0.2, 1.0);
            }
            }
        `,
		side: THREE.DoubleSide
	})

	const plane = new THREE.Mesh(planeGeometry, planeMaterial)
	plane.rotation.x = -Math.PI / 2
	plane.position.y = 0
	scene.add(plane)

	// 創建 CCTV 攝像機
	const cctv = new THREE.PerspectiveCamera(60, 1, 1, 500)
	cctv.position.set(100, 100, -5)
	cctv.lookAt(0, 0, 0)
	scene.add(cctv)

	// 添加 CCTV 攝像機輔助對象
	const cctvHelper = new THREE.CameraHelper(cctv)
	scene.add(cctvHelper)

	// 添加環境光和平行光
	scene.add(new THREE.AmbientLight(0x404040))
	const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
	directionalLight.position.set(1, 1, 1)
	scene.add(directionalLight)

	onMount(() => {
		viewerDom.appendChild(renderer.domElement)
		animate()
	})

	// 渲染循環
	function animate() {
		requestAnimationFrame(animate)

		// 更新著色器 uniforms
		planeMaterial.uniforms.cctvPosition.value.copy(cctv.position)
		cctv.getWorldDirection(planeMaterial.uniforms.cctvDirection.value)
		planeMaterial.uniforms.cctvFOV.value = cctv.fov
		planeMaterial.uniforms.cctvAspect.value = cctv.aspect
		planeMaterial.uniforms.cctvNear.value = cctv.near
		planeMaterial.uniforms.cctvFar.value = cctv.far

		controls.update()
		renderer.render(scene, camera)
	}

	// 處理窗口大小變化
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
