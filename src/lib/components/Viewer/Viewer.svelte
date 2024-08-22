<script lang="ts">
	import * as THREE from 'three'
	import { OrbitControls } from 'three/examples/jsm/Addons.js'
	import { createEventDispatcher, onDestroy, onMount } from 'svelte'
	import { SlideToggle } from '@skeletonlabs/skeleton'
	import { debounce } from 'lodash-es'
	import { goto } from '$app/navigation'
	import { scalceSize$ } from '$lib/stores'
	import ICON from '$lib/components/icon'
	import { generateSkyBox, svgStringToURL, svgToGroupSync, generateGLB } from './threelib'
	import { CCTVCamera, createCCTV, createCCTVByMatrix, generateShadowMap } from './threelib/cctvLib'
	import {
		depthMaterial,
		generateProjectionMaterial,
		oupFloorBoxMaterial,
		oupPutBoxMaterial,
		oupPutMaterial
	} from './threelib/materialLib'
	import { ViewerEvent, CCTVMode } from './viewerType'
	const dispatch = createEventDispatcher()
	export let MAX_CCTV_NUM = 20 //最大CCTV數量
	export let data: {
		svgString: string
	}
	export let downloadGLB: string = '' //下載的模型路徑
	export let cctvsSettings: [name: string, matrix: THREE.Matrix4][] //初始化的CCTV設定
	export let bgImageDisable: boolean = false //底圖是否顯示
	export let topLineMode = true //屋頂拉線模式

	let cctvNum = cctvsSettings.length > MAX_CCTV_NUM ? MAX_CCTV_NUM : cctvsSettings.length //CCTV數量
	let build: THREE.Group //建築物
	let { svgString } = data //SVG字串
	let selectCCTV: string = '' //選擇的cctv
	let cctvMode: CCTVMode = CCTVMode.NONE //cctv模式 add move lookat createLine addLine
	let bgImageObj: THREE.Mesh //底圖物件

	$: bgImageObj && (bgImageObj.visible = bgImageDisable)
	$: dispatch(ViewerEvent.MODE_CHANGE, cctvMode) //通知父組件模式改變

	// 設置場景、相機和渲染器
	const scene = new THREE.Scene()
	const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 100000)
	const renderer = new THREE.WebGLRenderer({ antialias: true })
	renderer.setPixelRatio(window.devicePixelRatio)
	renderer.setSize(window.innerWidth, window.innerHeight)
	//加個頂部網格底座
	const top = new THREE.PlaneGeometry(10000, 10000, 100, 100)
	const topMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 })
	const topMesh = new THREE.Mesh(top, topMaterial)
	topMesh.rotation.x = -Math.PI / 2
	topMesh.position.y = 300
	topMesh.visible = false
	scene.add(topMesh)
	onMount(() => {
		document.getElementById('Viewer')?.appendChild(renderer.domElement)
	})
	// 添加軌道控制
	const controls = new OrbitControls(camera, renderer.domElement)
	controls.maxDistance = 10000 // 最大缩放距离
	const cctvs = cctvsSettings.map((cctvSetting) => {
		return createCCTVByMatrix(
			cctvSetting[0] /* name */,
			// @ts-ignore
			cctvSetting[1]?.matrix /* matrix */,
			//@ts-ignore
			cctvSetting[1]?.focalLength,
			/* Matri */ scene
		)
	})
	const shadowCameras: THREE.PerspectiveCamera[] = cctvs.map(({ cctv }) => cctv)
	const cctvHelpers: THREE.CameraHelper[] = cctvs.map(({ cctvHelper }) => cctvHelper)
	//攝影機物件
	const cctvObjs: THREE.Mesh[] = cctvs.map(_createCCTVObj)
	//創建CCTV Obj物件
	function _createCCTVObj({ cctv, name }: { cctv: THREE.PerspectiveCamera; name: string }) {
		const cctvObj = new THREE.Mesh(
			new THREE.BoxGeometry(10, 10, 20),
			new THREE.MeshBasicMaterial({ color: 0x880000 })
		)
		cctvObj.name = name
		scene.add(cctvObj)
		cctvObj.position.copy(cctv.position)
		cctvObj.quaternion.copy(cctv.quaternion)
		return cctvObj
	}
	//複製攝影機位置包含旋轉
	function moveCctv(name: string) {
		const cctvObj = _getCCTVObj(name)
		const shadowCamera = _getCCTVCamera(name)
		if (!cctvObj || !shadowCamera) return //找不到cctvObj或shadowCamera
		cctvObj.position.copy(shadowCamera.position)
		cctvObj.quaternion.copy(shadowCamera.quaternion)
		_getCCTVHelper(name)?.update()
		dispatch(ViewerEvent.CCTV_CHANGE, {
			name: cctvObj.name,
			matrix: cctvObj.matrix,
			focalLength: shadowCamera?.focalLength
		})
	}
	//選擇cctv
	$: {
		if (selectCCTV) {
			_clearSelectCCTV()
			const cctvHelper = _getCCTVHelper()
			if (cctvHelper) cctvHelper.visible = true
			const shadowCamera = _getCCTVCamera()
			if (shadowCamera) selectCCTVSeting.focalLength = (shadowCamera as CCTVCamera).focalLength
		} else {
			_clearSelectCCTV()
		}
	}
	//清除選擇的CCTV
	function _clearSelectCCTV() {
		cctvHelpers.forEach((cctvHelper) => {
			cctvHelper.visible = false
		})
	}
	//找到CCTV shadowCamera
	function _getCCTVCamera(_name?: string) {
		return shadowCameras.find((cctv) => {
			return cctv.name === `${_name || selectCCTV}_camera`
		}) as CCTVCamera | undefined
	}
	//找到CCTV Obj
	function _getCCTVObj(_name?: string) {
		return cctvObjs.find((cctvObj) => cctvObj.name === (_name || selectCCTV))
	}
	function _getCCTVHelper(_name?: string) {
		return cctvHelpers.find((cctvHelper) => {
			return cctvHelper.name === `${_name || selectCCTV}_helper`
		})
	}

	/* 繪製線邏輯 */
	let points: THREE.Vector3[] = [] //目前繪製的線段點
	let lineMap = new Map() //線段紀錄
	$: switch (true) {
		case points.length === 1: //第一個點
			createLineEnd()
			cctvMode = CCTVMode.ADDLINE
			break
		case points.length > 1: //繪製線
			createLine(points)
			break
	}
	//傳入陣列點創建線
	function createLine(points: THREE.Vector3[]) {
		const geometry = new THREE.BufferGeometry().setFromPoints(points)
		const line = new THREE.Line(
			geometry,
			new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 3 })
		)
		scene.add(line)
	}
	//創建線完成(第一個點)
	function createLineEnd() {
		lineMap.set(new Date().getTime(), points)
		lineMap = lineMap
	}
	//檢查兩個法線的面是否相交，如果相交則給我 pointA-> 該點 -> pointB 該點應該在面相交線上，如果沒有相交則返回null
	function checkFaceIntersectPoint(
		pointA: THREE.Vector3,
		normalA: THREE.Vector3,
		pointB: THREE.Vector3,
		normalB: THREE.Vector3
	): THREE.Vector3 | null {
		// 计算两个法向量的叉积
		const crossVector = new THREE.Vector3().crossVectors(normalA, normalB)
		// 如果叉积为 0 向量，则两个面平行且不相交
		if (crossVector.length() < 1e-6) return null
		// 计算两个平面的交线方向向量
		const direction = crossVector.normalize()
		// 计算平面 A 和 B 的方程
		const planeA = new THREE.Plane().setFromNormalAndCoplanarPoint(normalA, pointA)
		const planeB = new THREE.Plane().setFromNormalAndCoplanarPoint(normalB, pointB)
		console.log(normalA.toArray(), normalB.toArray())
		console.log(planeA.constant, planeB.constant, pointA)
		// //將planeA加入場景
		const planeAHelper = new THREE.PlaneHelper(planeA, 1000, 0xff0000)
		scene.add(planeAHelper)
		//將planeB加入場景
		const planeBHelper = new THREE.PlaneHelper(planeB, 1000, 0x00ff00)
		scene.add(planeBHelper)

		normalA.applyEuler(new THREE.Euler(Math.PI / 2, 0, 0))
		normalB.applyEuler(new THREE.Euler(Math.PI / 2, 0, 0))
		// normalA.applyEuler(new THREE.Euler(-Math.PI, 0, Math.PI))
		// normalB.applyEuler(new THREE.Euler(-Math.PI, 0, Math.PI))
		// 使用crossVectors計算直線的方向向量
		const dirVector = new THREE.Vector3()
		dirVector.crossVectors(normalA, normalB)
		if (dirVector.length() === 0) {
			console.warn('The two planes are parallel and do not intersect.')
			return null
		}
		const n1 = normalA
		const d1 = -planeA.constant
		const n2 = normalB
		const d2 = -planeB.constant
		// 任取一點滿足兩個平面方程式,作為直線上一點
		const point1 = new THREE.Vector3()
		point1
			.copy(n1)
			.multiplyScalar(d2)
			.add(n2.multiplyScalar(d1))
			.divideScalar(dirVector.length() * dirVector.length())
		//取得直線上另一點
		const point2 = point1.clone().add(dirVector.clone().multiplyScalar(1000))
		// 將點投影到直線上,得到最近點
		const vd = pointA.clone().sub(point1)
		const projection = dirVector
			.clone()
			.multiplyScalar(vd.dot(dirVector) / dirVector.dot(dirVector))
		const neerPo = point1.clone().add(projection)

		// return null

		// 創建線段幾何體
		const geometry = new THREE.BufferGeometry().setFromPoints([point1, point2])
		// 創建線段物件
		const material = new THREE.LineBasicMaterial({ color: 0xff00ff, linewidth: 5 })
		const line2 = new THREE.Line(geometry, material)
		// line2.applyEuler(new THREE.Euler(-Math.PI / 2, 0, 0))
		// line2.applyMatrix4(new THREE.Matrix4())
		scene.add(line2)

		return neerPo

		// return { x: 34.406398544182526, y: 172.66823976650184, z: 258.80565022471103 }

		// const direction3 = new THREE.Vector3()
		// direction3.crossVectors(planeA.normal, planeB.normal).normalize()
		// const point = new THREE.Vector3()
		// const d1 = planeA.constant
		// const d2 = planeB.constant
		// point.set(
		// 	(d1 * planeB.normal.x - d2 * planeA.normal.x) / direction.x,
		// 	(d1 * planeB.normal.y - d2 * planeA.normal.y) / direction.y,
		// 	(d1 * planeB.normal.z - d2 * planeA.normal.z) / direction.z
		// )

		// return point

		//法線轉90度
		const normalA2 = normalA.clone().applyEuler(new THREE.Euler(0, Math.PI / 2, Math.PI / 2))
		const poA = new THREE.Vector3()
		poA.copy(pointA).add(normalA2.multiplyScalar(1000))
		const poB = new THREE.Vector3()
		poB.copy(pointB).add(normalA2.negate())
		// .applyEuler(new THREE.Euler(-Math.PI / 2, 0, 0))
		const line = new THREE.Line3(poA, poB)
		createLine([poA, poB])
		console.log(poA, poB)
		// const hitPoint = new THREE.Vector3()
		// planeB.intersectLine(line, hitPoint)
		// point
		// 	.copy(direction)
		// 	.multiplyScalar(1000)
		// 	.add(planeB.normal)
		// 	.multiplyScalar(1 / planeB.normal.lengthSq())

		return null
		//計算兩個面相交的交线
		// const directionLengthSquared = direction.lengthSq()
		// const constantA = planeA.constant
		// const constantB = planeB.constant
		// const scalar =
		// 	(constantB * planeA.normal.dot(planeA.normal) -
		// 		constantA * planeB.normal.dot(planeB.normal)) /
		// 	directionLengthSquared
		// const point = new THREE.Vector3()
		// 	.copy(planeA.normal)
		// 	.multiplyScalar(scalar)
		// 	.add(planeB.normal.multiplyScalar(constantA / planeB.normal.lengthSq()))
		// const point = new THREE.Vector3()
		// point.copy(planeA.normal).multiplyScalar(constantA)
		// point.addScaledVector(planeB.normal, constantB)

		// // 计算相交线上的一点
		// const intersectionPoint = point.divideScalar(plane1.normal.dot(direction))

		// return point

		// 计算从 pointA 到交线的向量
		// const toIntersection = new THREE.Vector3()
		// planeB.projectPoint(pointA, toIntersection)
		// console.log(toIntersection)
		// // // toIntersection.sub(pointA)
		// return toIntersection

		// // 计算交点
		// const intersectionPoint = new THREE.Vector3().addVectors(pointA, toIntersection)

		// // 验证交点是否在两个平面上
		// if (
		// 	Math.abs(planeA.distanceToPoint(intersectionPoint)) < 1e-6 &&
		// 	Math.abs(planeB.distanceToPoint(intersectionPoint)) < 1e-6
		// ) {
		// 	return intersectionPoint
		// }

		// 如果计算出错，返回 null（这种情况理论上不应该发生）
		// return null
	}
	//點選畫面點選場域 or ray到cctvObj
	const raycaster = new THREE.Raycaster()
	const mouse = new THREE.Vector2()
	let normalA: THREE.Vector3 | undefined
	//點選畫面點選場域
	function onRayMe(event: MouseEvent) {
		mouse.x = (event.clientX / window.innerWidth) * 2 - 1
		mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
		raycaster.setFromCamera(mouse, camera)
		const shadowCamera = _getCCTVCamera()
		switch (cctvMode) {
			case CCTVMode.CREATELINE: //創建線
				{
					const mesh = topLineMode ? topMesh : build
					const intersectsTopGrid = raycaster.intersectObject(mesh) //ray到topGrid的位置
					const selectPoint = intersectsTopGrid[0]?.point
					if (!selectPoint) return
					//取得法線的面
					const face = intersectsTopGrid[0]?.face as THREE.Face
					normalA = face.normal.clone().applyEuler(new THREE.Euler(-Math.PI / 2, 0, 0))
					topLineMode && (selectPoint.y = 300) //屋頂模式創建線時 y = 300
					const poMesh = new THREE.Mesh(
						new THREE.SphereGeometry(5, 2, 2),
						new THREE.MeshBasicMaterial({
							color: 0x00ffff
						})
					)
					poMesh.position.copy(selectPoint)
					scene.add(poMesh)
					points.push(selectPoint)
					points = points
				}
				break
			case CCTVMode.ADDLINE: //添加線
				{
					const mesh = topLineMode ? topMesh : build
					const intersectsTopGrid = raycaster.intersectObject(mesh) //ray到topGrid的位置i
					if (intersectsTopGrid.length === 0) return
					//取得法線的面
					const normalB = intersectsTopGrid[0]?.face?.normal
						.clone()
						.applyEuler(new THREE.Euler(-Math.PI / 2, 0, 0))
					const selectPoint = intersectsTopGrid[0].point
					const po = checkFaceIntersectPoint(points[0], normalA!, selectPoint, normalB!)
					console.log('po', po)
					if (po) {
						const poMesh2 = new THREE.Mesh(
							new THREE.SphereGeometry(5, 2, 2),
							new THREE.MeshBasicMaterial({
								color: 0xff0000
							})
						)
						poMesh2.position.copy(po)
						scene.add(poMesh2)
						points.push(po)
					}
					if (!selectPoint) return
					const poMesh = new THREE.Mesh(
						new THREE.SphereGeometry(5, 2, 2),
						new THREE.MeshBasicMaterial({
							color: 0x00ffff
						})
					)
					poMesh.position.copy(selectPoint)
					scene.add(poMesh)
					topLineMode && (selectPoint.y = 300)
					points.push(selectPoint)
					points = points
				}
				break
			case CCTVMode.ADD: //添加CCTV
				selectCCTV = ''
				if (MAX_CCTV_NUM > cctvNum) {
					cctvMode = CCTVMode.NONE
				}
				const intersectsTopGrid = raycaster.intersectObject(topMesh) //ray到topGrid的位置
				if (intersectsTopGrid.length > 0) {
					const point = intersectsTopGrid[0].point
					let _n = 1
					while (_getCCTVObj(`cctv${_n}`)) {
						_n++
					}
					const { cctv, cctvHelper, name } = createCCTV(
						`cctv${_n}`,
						point,
						new THREE.Vector3(),
						scene
					)
					const cctvObj = _createCCTVObj({ cctv, name: `cctv${_n}` })
					shadowCameras.push(cctv)
					cctvObjs.push(cctvObj)
					cctvHelpers.push(cctvHelper)
					cctvNum++
					selectCCTV = name
					cctvMode = CCTVMode.LOOKAT //移動完畢
				}
				break
			case 'move':
				if (shadowCamera) {
					const intersectsTopGrid = raycaster.intersectObject(topMesh) //ray到topGrid的位置
					if (intersectsTopGrid.length > 0) {
						const point = intersectsTopGrid[0].point
						shadowCamera.position.copy(point)
						moveCctv(selectCCTV)
						cctvMode = CCTVMode.LOOKAT //移動完畢
					}
					break
				} else {
					cctvMode = CCTVMode.NONE
				}
			case 'lookat':
				if (shadowCamera) {
					const intersectsBuild = raycaster.intersectObject(build) //ray到building的位置
					if (intersectsBuild.length > 0) {
						const point = intersectsBuild[0].point
						shadowCamera.lookAt(point)
						moveCctv(selectCCTV)
						cctvMode = CCTVMode.NONE
					}
				} else {
					cctvMode = CCTVMode.NONE
				}
			default:
				const intersects = raycaster.intersectObjects(cctvObjs)
				if (intersects.length > 0) {
					const obj = intersects[0].object
					selectCCTV = obj.name
					cctvMode = CCTVMode.NONE //如果選到cctv就清除原來的cctvMode模式
				}
		}
	}

	let _downPos: THREE.Vector2 //鼠標按下的位置
	let _downTime = 0 //鼠標按下的時間
	function _onMouseDownHandler(event: MouseEvent) {
		_downPos = new THREE.Vector2(event.clientX, event.clientY)
		_downTime = Date.now()
	}
	function _onMouseUpHandler(event: MouseEvent) {
		const _delayTime = Date.now() - _downTime
		if (_delayTime > 200) return //按下時間小於200ms就不處理
		if (_downPos.distanceTo(new THREE.Vector2(event.clientX, event.clientY)) > 10) return //距離超過10px就不處理
		onRayMe(event)
	}

	function onMouseMoveHandler(event: MouseEvent) {
		switch (cctvMode) {
			case CCTVMode.CREATELINE: //創建線
				break
			case CCTVMode.ADDLINE: //添加線
				break
			case CCTVMode.LOOKAT:
				if (selectCCTV) {
					mouse.x = (event.clientX / window.innerWidth) * 2 - 1
					mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
					raycaster.setFromCamera(mouse, camera)
					const intersectsBuild = raycaster.intersectObject(build)
					if (intersectsBuild.length > 0) {
						const point = intersectsBuild[0].point
						const shadowCamera = _getCCTVCamera()
						if (shadowCamera) shadowCamera.lookAt(point)
						moveCctv(selectCCTV)
					}
				}
				break
		}
		debounce(() => updataShadowMaps(), 100)()
	}
	//CCTV Info變動移動模式
	function onCCTVchangeMoveModeHandler(e: Event) {
		const target = e.target as HTMLInputElement
		const name = target.name
		switch (name) {
			case CCTVMode.CREATELINE: //創建線
				break
			case CCTVMode.ADDLINE: //添加線
				break
			case CCTVMode.MOVE:
				cctvMode = target.checked ? CCTVMode.MOVE : CCTVMode.NONE
				break
			case CCTVMode.LOOKAT:
				cctvMode = target.checked ? CCTVMode.LOOKAT : CCTVMode.NONE
				break
		}
	}
	//創建深度紋理
	const shadowMaps: THREE.WebGLRenderTarget[] = []
	for (let i = 0; i < MAX_CCTV_NUM; i++) {
		shadowMaps.push(generateShadowMap())
	}
	const projectionMaterial = generateProjectionMaterial({
		maxcctvnum: MAX_CCTV_NUM,
		cctvNum,
		color: new THREE.Color(0x888888),
		shadowMaps
	})
	const projectionBoxMaterial = generateProjectionMaterial({
		maxcctvnum: MAX_CCTV_NUM,
		cctvNum,
		color: new THREE.Color(0x448844),
		shadowMaps
	})
	const projectionFloorMaterial = generateProjectionMaterial({
		maxcctvnum: MAX_CCTV_NUM,
		cctvNum,
		color: new THREE.Color(0xcccccc),
		shadowMaps
	})
	$: {
		projectionMaterial.uniforms.cctvCount.value = cctvNum //更新CCTV數量
		projectionBoxMaterial.uniforms.cctvCount.value = cctvNum //更新CCTV數量
		projectionFloorMaterial.uniforms.cctvCount.value = cctvNum //更新CCTV數量
	}

	init()
	async function init() {
		try {
			const svg = svgStringToURL(svgString)
			build = await svgToGroupSync(svg, {
				lineWidth: 10, // 設置線段厚度和高度
				wallHeight: 300,
				doorHigh: 200,
				color: 0xcccccc,
				scale: $scalceSize$ // 縮放比例
			})
			dispatch(ViewerEvent.MODLE_READY) // 通知父組件已經準備好
		} catch (error: any) {
			alert(error.message || error)
			goto('/', {
				replaceState: true
			})
			return
		}

		scene.add(build)
		// 調整相機位置
		const box = new THREE.Box3().setFromObject(build)
		const center = box.getCenter(new THREE.Vector3())
		const size = box.getSize(new THREE.Vector3())
		const maxDim = Math.max(size.x * 0.5, size.y, size.z)

		camera.position.set(center.x, center.y + maxDim / 2, center.z + maxDim)
		camera.lookAt(center)
		controls.target.copy(center)
		controls.update()
		//設置可下載的glb
		try {
			// oupPutMaterial
			build.traverse((child) => {
				if (child instanceof THREE.Mesh) {
					if (child.name.includes('Box')) child.material = oupPutBoxMaterial
					else if (child.name.includes('Floor')) child.material = oupFloorBoxMaterial
					else child.material = oupPutMaterial
				}
			})
			downloadGLB = await generateGLB(build)
			build.traverse((child) => {
				if (child instanceof THREE.Mesh) {
					if (child.name === 'BG') {
						bgImageObj = child
						child.visible = bgImageDisable
						return
					}
					if (child.name === 'Floor') {
						child.material = projectionFloorMaterial
						return
					}
					// 設置材質
					if (child.name.includes('Box')) child.material = projectionBoxMaterial
					else child.material = projectionMaterial
				}
			})
			updataShadowMaps()
			animate()
		} catch (error) {
			alert('轉換匯出模型失敗')
		}
	}
	//
	// 渲染循環
	function animate() {
		requestAnimationFrame(animate)
		controls.update()
		renderer.render(scene, camera)
	}
	//更新CCTV投影貼圖
	function updataShadowMaps() {
		for (let i = 0; i < cctvNum; i++) {
			// 更新CCTV位置
			projectionMaterial.uniforms.cctvPositions.value[i].copy(shadowCameras[i].position)
			projectionBoxMaterial.uniforms.cctvPositions.value[i].copy(shadowCameras[i].position)
			projectionFloorMaterial.uniforms.cctvPositions.value[i].copy(shadowCameras[i].position)

			shadowCameras[i].getWorldDirection(projectionMaterial.uniforms.cctvDirections.value[i])
			shadowCameras[i].getWorldDirection(projectionBoxMaterial.uniforms.cctvDirections.value[i])
			shadowCameras[i].getWorldDirection(projectionFloorMaterial.uniforms.cctvDirections.value[i])

			projectionMaterial.uniforms.cctvFOVs.value[i] = shadowCameras[i].fov
			projectionMaterial.uniforms.cctvAspects.value[i] = shadowCameras[i].aspect
			projectionMaterial.uniforms.cctvNears.value[i] = shadowCameras[i].near
			projectionMaterial.uniforms.cctvFars.value[i] = shadowCameras[i].far

			projectionBoxMaterial.uniforms.cctvFOVs.value[i] = shadowCameras[i].fov
			projectionBoxMaterial.uniforms.cctvAspects.value[i] = shadowCameras[i].aspect
			projectionBoxMaterial.uniforms.cctvNears.value[i] = shadowCameras[i].near
			projectionBoxMaterial.uniforms.cctvFars.value[i] = shadowCameras[i].far

			projectionFloorMaterial.uniforms.cctvFOVs.value[i] = shadowCameras[i].fov
			projectionFloorMaterial.uniforms.cctvAspects.value[i] = shadowCameras[i].aspect
			projectionFloorMaterial.uniforms.cctvNears.value[i] = shadowCameras[i].near
			projectionFloorMaterial.uniforms.cctvFars.value[i] = shadowCameras[i].far
		}
		// 更新阴影矩阵
		for (let i = 0; i < cctvNum; i++) {
			const shadowCamera = shadowCameras[i]
			shadowCamera.updateMatrixWorld()
			// 计算并更新阴影矩阵
			const shadowMatrix = new THREE.Matrix4()
			shadowMatrix.multiplyMatrices(shadowCamera.projectionMatrix, shadowCamera.matrixWorldInverse)
			projectionMaterial.uniforms.shadowMatrices.value[i].copy(shadowMatrix)
			projectionBoxMaterial.uniforms.shadowMatrices.value[i].copy(shadowMatrix)
			projectionFloorMaterial.uniforms.shadowMatrices.value[i].copy(shadowMatrix)
		}
		renderShadowMaps() // 渲染阴影贴图
	}

	//render深度紋理
	function renderShadowMaps() {
		const initialClearColor = renderer.getClearColor(new THREE.Color())
		const initialClearAlpha = renderer.getClearAlpha()
		renderer.setClearColor(0xffffff, 1)
		const selectCCTVHelper = _getCCTVHelper()
		selectCCTVHelper && (selectCCTVHelper.visible = false) //避免選擇的CCTV干擾
		scene.overrideMaterial = depthMaterial
		for (let i = 0; i < cctvNum; i++) {
			renderer.setRenderTarget(shadowMaps[i])
			renderer.render(scene, shadowCameras[i])
		}
		selectCCTVHelper && (selectCCTVHelper.visible = true) //開啟選擇的CCTV
		scene.overrideMaterial = null
		renderer.setClearColor(initialClearColor, initialClearAlpha)
		renderer.setRenderTarget(null)
	}

	// 將天空盒添加到場景
	scene.add(generateSkyBox())

	onDestroy(() => {
		renderer.domElement.remove()
		// transformControls.dispose()
	})

	//CCTV設定
	let selectCCTVSeting = {
		focalLength: 4
	}
	$: CCTV_ChangefocalLength(selectCCTV) //焦距改變
	//改變 UI的 焦距數值
	function CCTV_ChangefocalLength(cctvName: string) {
		const cctv = _getCCTVCamera(cctvName)
		if (cctv) {
			selectCCTVSeting.focalLength = (cctv as CCTVCamera).focalLength
		}
	}
	//UI 改變焦距
	function changeCCTV_FocalLength(e: Event) {
		const target = e.target as HTMLInputElement
		const focalLength = parseFloat(target?.value) || 4
		const shadowCamera = _getCCTVCamera()
		if (!shadowCamera) return
		;(shadowCamera as CCTVCamera).focalLength = focalLength
		selectCCTVSeting.focalLength = focalLength
		const cctvHelper = _getCCTVHelper()
		if (cctvHelper) cctvHelper.update()
		moveCctv(selectCCTV)
		debounce(() => updataShadowMaps(), 100)()
	}

	function onClickClearCCTVHandler() {
		selectCCTV = ''
		cctvMode = CCTVMode.NONE
	}
	//刪除CCTV
	function delCCTV(name?: string) {
		const cctvObj = _getCCTVObj(name)
		if (cctvObj) {
			const index = cctvObjs.indexOf(cctvObj)
			cctvObjs.splice(index, 1)
			shadowCameras.splice(index, 1)
			const cctvHelper = cctvHelpers.splice(index, 1)
			cctvHelper[0] && scene.remove(cctvHelper[0])
			scene.remove(cctvObj)
			cctvNum--
			selectCCTV = ''
			dispatch(ViewerEvent.CCTV_DEL, { name: cctvObj.name })
		}
	}
	// 監聽視窗大小變化
	export function onWindowResize() {
		camera.aspect = window.innerWidth / window.innerHeight
		camera.updateProjectionMatrix()
		renderer.setSize(window.innerWidth, window.innerHeight)
	}
	//新增CCTV
	export function addCCTV() {
		cctvMode = CCTVMode.ADD
	}
	//刪除全部CCTV(重置)
	export function delAllCCTV() {
		while (cctvObjs.length) {
			delCCTV(cctvObjs[0].name)
		}
	}
	//新增線路
	export function createLines() {
		selectCCTV = ''
		cctvMode = CCTVMode.CREATELINE
	}
	//清除CCTV模式
	export function clearCCTVMode() {
		selectCCTV = ''
		cctvMode = CCTVMode.NONE
	}
</script>

<svelte:window on:resize|passive={onWindowResize} />
<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
	id="Viewer"
	on:mousedown|stopPropagation={_onMouseDownHandler}
	on:mouseup|stopPropagation={_onMouseUpHandler}
	on:mousemove|preventDefault={onMouseMoveHandler}
></div>
<!-- <div id="Viewer" on:click={onRayMe} on:mousemove|preventDefault={onMouseMoveHandler}></div> -->

<div id="CCTV_Info">
	{#if selectCCTV}
		<div class="flex items-center justify-between">
			<p class="h4">{selectCCTV}</p>
			<button type="button" class="variant-filled btn btn-sm" on:click={onClickClearCCTVHandler}
				>Clear</button
			>
		</div>
		<label class="label" for="length">焦距 {selectCCTVSeting.focalLength} mm</label>
		<input
			class="input"
			type="range"
			min="2.8"
			max="6.0"
			step="0.1"
			value={selectCCTVSeting.focalLength}
			on:input={changeCCTV_FocalLength}
		/>
		<div>
			<SlideToggle
				name="move"
				checked={cctvMode === CCTVMode.MOVE}
				on:change={onCCTVchangeMoveModeHandler}
				active="bg-primary-500"
				size="sm">移動位置</SlideToggle
			>
			<SlideToggle
				name="lookat"
				checked={cctvMode === CCTVMode.LOOKAT}
				on:change={onCCTVchangeMoveModeHandler}
				active="bg-primary-500"
				size="sm">拍攝方向</SlideToggle
			>
			<button class="variant-filled btn-icon btn-sm scale-75 text-2xl" on:click={() => delCCTV()}>
				<ICON.MaterialSymbolsLightDeleteSharp />
			</button>
		</div>
	{/if}
</div>

<style lang="postcss">
	#Viewer {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 1;
	}
	#CCTV_Info {
		position: absolute;
		top: 10px;
		right: 10px;
		z-index: 100;
		min-width: 100px;
		min-height: 50px;
		padding: 10px;
		background-color: rgba(0, 0, 0, 0.5);
		border-radius: 10px;
		font-size: small;
	}
</style>
