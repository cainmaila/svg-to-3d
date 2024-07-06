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

	//創建Box
	const boxGeometry = new THREE.BoxGeometry(500, 5, 500)

	// 創建平面
	// const planeGeometry = new THREE.PlaneGeometry(500, 500, 32, 32)
	const planeMaterial = new THREE.ShaderMaterial({
		uniforms: {
			cctvPositions: { value: [new THREE.Vector3(), new THREE.Vector3()] },
			cctvDirections: { value: [new THREE.Vector3(), new THREE.Vector3()] },
			cctvFOVs: { value: [0, 0] },
			cctvAspects: { value: [0, 0] },
			cctvNears: { value: [0, 0] },
			cctvFars: { value: [0, 0] },
			cctvCount: { value: 2 } // 可以根據需要調整
		},
		vertexShader: `
            varying vec3 vWorldPosition;
            void main() {
            vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
		fragmentShader: `
            uniform vec3 cctvPositions[2];
            uniform vec3 cctvDirections[2];
            uniform float cctvFOVs[2];
            uniform float cctvAspects[2];
            uniform float cctvNears[2];
            uniform float cctvFars[2];
            uniform int cctvCount;

            varying vec3 vWorldPosition;

            bool isInCCTVView(vec3 cctvPosition, vec3 cctvDirection, float cctvFOV, float cctvAspect, float cctvNear, float cctvFar) {
                vec3 toFragment = vWorldPosition - cctvPosition;

                // 計算在 CCTV 視錐體內的距離
                float distance = dot(toFragment, normalize(cctvDirection));

                // 檢查是否在近平面和遠平面之間
                if (distance < cctvNear || distance > cctvFar) {
                    return false;
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

                return (abs(x) <= halfWidth && abs(y) <= halfHeight);
            }

            void main() {
                bool inAnyView = false;
                bool inAllViews = true;
                int viewCount = 0;

                for (int i = 0; i < 2; i++) {
                    if (i >= cctvCount) break;
                    bool inThisView = isInCCTVView(cctvPositions[i], cctvDirections[i], cctvFOVs[i], cctvAspects[i], cctvNears[i], cctvFars[i]);
                    inAnyView = inAnyView || inThisView;
                    inAllViews = inAllViews && inThisView;
                    if (inThisView) viewCount++;
                }

                if (inAllViews) {
                    // 在所有 CCTV 的視野內
                    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
                } else if (inAnyView) {
                    // 在至少一個 CCTV 的視野內，但不是所有
                    gl_FragColor = vec4(1.0, 0.5, 0.0, 1.0);
                } else {
                    // 不在任何 CCTV 的視野內
                    gl_FragColor = vec4(0.2, 0.2, 0.2, 1.0);
                }

                // 可選：使用不同的顏色來表示在不同數量的 CCTV 視野內
                // gl_FragColor = vec4(float(viewCount) / float(cctvCount), 0.0, 0.0, 1.0);
            }
        `
		// side: THREE.DoubleSide
	})

	// const plane = new THREE.Mesh(planeGeometry, planeMaterial)
	const plane = new THREE.Mesh(boxGeometry, planeMaterial)
	// plane.rotation.x = -Math.PI / 2
	plane.position.y = 0
	scene.add(plane)

	// 相機參數
	const focalLength = 8 // mm
	const sensorWidth = 4.8 // mm
	const sensorHeight = 3.6 // mm
	// 計算垂直視角
	const fovVerticalRadians = 2 * Math.atan(sensorHeight / (2 * focalLength))
	const fovVerticalDegrees = fovVerticalRadians * (180 / Math.PI)
	const aspect = sensorWidth / sensorHeight
	// 創建 CCTV 攝像機
	const near = 0.1
	const far = 1000
	const cctv = new THREE.PerspectiveCamera(fovVerticalDegrees, aspect, near, far)
	cctv.position.set(100, 200, -50)
	cctv.lookAt(0, 0, 0)
	scene.add(cctv)
	// 添加 CCTV 攝像機輔助對象
	const cctvHelper = new THREE.CameraHelper(cctv)
	scene.add(cctvHelper)

	// 相機參數
	const focalLength2 = 8 // mm
	const sensorWidth2 = 4.8 // mm
	const sensorHeight2 = 3.6 // mm2
	// 計算垂直視角
	const fovVerticalRadians2 = 2 * Math.atan(sensorHeight2 / (2 * focalLength2))
	const fovVerticalDegrees2 = fovVerticalRadians2 * (180 / Math.PI)
	const aspect2 = sensorWidth2 / sensorHeight2
	// 創建 CCTV 攝像機
	const near2 = 0.1
	const far2 = 1000
	const cctv2 = new THREE.PerspectiveCamera(fovVerticalDegrees2, aspect2, near2, far2)
	cctv2.position.set(-100, 200, -50)
	cctv2.lookAt(50, 0, 0)
	scene.add(cctv2)
	// 添加 CCTV 攝像機輔助對象
	const cctvHelper2 = new THREE.CameraHelper(cctv2)
	scene.add(cctvHelper2)

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
