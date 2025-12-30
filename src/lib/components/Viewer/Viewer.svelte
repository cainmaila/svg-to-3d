<script lang="ts">
	import { debounce } from 'lodash-es'
	import * as THREE from 'three'
	import { onDestroy, onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import { scalceSize$ } from '$lib/stores'
	import { generateSkyBox, svgStringToURL, svgToGroupSync, generateGLB } from './threelib'
	import {
		createCCTV,
		cctvObjsFactory,
		generateShadowMap,
		type T_CCTV_MAP
	} from './threelib/cctvLib'
	import { threeSeneInit } from './threelib/threeSeneInit'
	import {
		depthMaterial,
		generateProjectionMaterial,
		lineMaterial,
		oupFloorBoxMaterial,
		oupPutBoxMaterial,
		oupPutMaterial
	} from './threelib/materialLib'
	import { ViewerEvent, CCTVMode, PIPE_MODE, ViewerMode } from './viewerType'
	import { checkFaceIntersectPoint, getLineLength } from './threelib/intersectPoint'
	import { CCTVCamera } from './threelib/cctvCamera'
	import { useMachine } from '@xstate/svelte'
	import { cctvModeMachine } from '$lib/stores/cctvModeMachine'
	import CCTVInfo from './CCTVInfo.svelte'

	interface Props {
		MAX_CCTV_NUM?: number //最大CCTV數量
		data: {
			svgString: string
		}
		downloadGLB?: string //下載的模型路徑
		cctvsSettings: T_CCTV_MAP //初始化的CCTV設定
		bgImageDisable?: boolean //底圖是否顯示
		topLineMode?: boolean //屋頂拉線模式
		onmodelReady?: () => void
		oncctvChange?: (data: { name: string; matrix: THREE.Matrix4; focalLength: number }) => void
		oncctvDel?: (data: { name: string }) => void
		onmodeChange?: (data: { viewerMode: string; pipeMode: string; cctvMode: string }) => void
		onpipeMapUpdate?: (pipeInfos: Array<{ name: string; length: number }>) => void
		onselectedPipe?: (pipeName: string) => void
	}

	let {
		MAX_CCTV_NUM = 20,
		data,
		downloadGLB = $bindable(''),
		cctvsSettings,
		bgImageDisable = $bindable(false),
		topLineMode = $bindable(true),
		onmodelReady,
		oncctvChange,
		oncctvDel,
		onmodeChange,
		onpipeMapUpdate,
		onselectedPipe
	}: Props = $props()

	const TARGET_LINE_POINT_END = '_PO' //繪製點的的顯示模型結尾名稱
	const { svgString } = data //

	let build: THREE.Group //建築物
	let bgImageObj: THREE.Mesh | undefined = $state() //底圖物件

	const { snapshot, send } = useMachine(cctvModeMachine) //cctv模式狀態機 //通知父組件模式改變

	// 設置場景、相機和渲染器
	const { scene, camera, renderer, controls } = threeSeneInit()
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
		// 添加被動事件監聽器以提高性能
		window.addEventListener('resize', onWindowResize, { passive: true })
	})

	const {
		shadowCameras,
		getCCTVCamera,
		cctvHelpers,
		getCCTVHelper,
		cctvObjs,
		getCCTVObj,
		createCCTVObj
	} = cctvObjsFactory(cctvsSettings, scene) //攝影機物件 創建CCTV Obj

	// cctvNum 需要手動維護，因為 shadowCameras 是普通陣列不是 $state
	// $derived 無法追蹤普通陣列的 push/pop 操作
	let cctvNum = $state(shadowCameras.length)

	//複製攝影機位置包含旋轉
	function moveCctv(name: string) {
		const cctvObj = getCCTVObj(name)
		const shadowCamera = getCCTVCamera(name)
		if (!cctvObj || !shadowCamera) return //找不到cctvObj或shadowCamera
		cctvObj.position.copy(shadowCamera.position)
		cctvObj.quaternion.copy(shadowCamera.quaternion)
		getCCTVHelper(name)?.update()
		oncctvChange?.({
			name: cctvObj.name,
			matrix: cctvObj.matrix,
			focalLength: shadowCamera?.focalLength
		})
	}
	//清除選擇的CCTV
	function _clearSelectCCTV() {
		cctvHelpers.forEach((cctvHelper) => {
			cctvHelper.visible = false
		})
	}

	/* 繪製線邏輯 */
	let points: THREE.Vector3[] = $state([]) //目前繪製的線段點
	const normalArray: (THREE.Vector3 | null)[] = [] //法向量的陣列，undo畫線用錄

	let targetLine: THREE.Line | null = null //目標線段
	function selectLineHandler(name: string) {
		if (targetLine) {
			targetLine.material = lineMaterial
		}
		targetLine = scene.getObjectByName(name) as THREE.Line
		onselectedPipe?.(targetLine?.name || '')
		if (!targetLine) return
		targetLine.material = new THREE.LineBasicMaterial({
			color: 0xffff00,
			depthWrite: true,
			depthTest: false
		})
	}
	//生成一個資訊陣列
	function dispatchLineMap(map: Map<string, THREE.Vector3[]>) {
		const pipeInfos: {
			name: string
			length: number
		}[] = []
		map.forEach((pos, key) => {
			pipeInfos.push({
				name: key,
				length: getLineLength(pos)
			})
		})
		onpipeMapUpdate?.(pipeInfos)
	}
	//傳入陣列點創建線
	function createLine(points: THREE.Vector3[]) {
		if (!selectPipe) return
		const targetLine = scene.getObjectByName(selectPipe) as THREE.Line
		if (targetLine) {
			targetLine.geometry = new THREE.BufferGeometry().setFromPoints(points)
		} else {
			const geometry = new THREE.BufferGeometry().setFromPoints(points)
			const line = new THREE.Line(geometry, lineMaterial)
			line.name = selectPipe
			scene.add(line)
		}
	}
	//創建線完成(第一個點)
	function createLineEnd() {
		const lineName = 'Line_' + new Date().getTime()
		send({
			type: PIPE_MODE.ADD,
			poName: lineName,
			points
		})
		return lineName
	}
	//點選畫面點選場域 or ray到cctvObj
	const raycaster = new THREE.Raycaster()
	const mouse = new THREE.Vector2()
	//點選畫面點選場域
	function onRayMe(event: MouseEvent) {
		mouse.x = (event.clientX / window.innerWidth) * 2 - 1
		mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
		raycaster.setFromCamera(mouse, camera)
		const shadowCamera = getCCTVCamera(selectCCTV)
		if (viewerMode === ViewerMode.PIPE) {
			switch (pipeMode) {
				case PIPE_MODE.NONE:
					break
				case PIPE_MODE.CREATE:
				case PIPE_MODE.ADD:
					onPipeMoveHandler()
					break
			}
		}
		switch (cctvMode) {
			case CCTVMode.ADD: //添加CCTV
				// if (MAX_CCTV_NUM > cctvNum) {
				// 	send({
				// 		type: CCTVMode.NONE,
				// 		selectCCTV: ''
				// 	})
				// }
				const intersectsTopGrid = raycaster.intersectObject(topMesh) //ray到topGrid的位置
				if (intersectsTopGrid.length > 0) {
					const point = intersectsTopGrid[0].point
					let _n = 1
					while (getCCTVObj(`cctv${_n}`)) {
						_n++
					}
					const { cctv, cctvHelper, name } = createCCTV(
						`cctv${_n}`,
						point,
						new THREE.Vector3(),
						scene
					)
					const cctvObj = createCCTVObj({ cctv })
					cctvObj.name = `cctv${_n}`
					scene.add(cctvObj)
					shadowCameras.push(cctv)
					cctvObjs.push(cctvObj)
					cctvHelpers.push(cctvHelper)
					cctvNum++ // 手動更新 cctvNum
					send({
						type: CCTVMode.LOOKAT,
						selectCCTV: name
					}) //移動完畢
				}
				break
			case CCTVMode.MOVE:
				if (shadowCamera) {
					const intersectsTopGrid = raycaster.intersectObject(topMesh) //ray到topGrid的位置
					if (intersectsTopGrid.length > 0) {
						const point = intersectsTopGrid[0].point
						shadowCamera.position.copy(point)
						moveCctv(selectCCTV)
						send({ type: CCTVMode.LOOKAT }) //移動完畢
					}
					break
				} else {
					send({ type: CCTVMode.NONE })
				}
			case CCTVMode.LOOKAT:
				if (shadowCamera) {
					const intersectsBuild = raycaster.intersectObject(build) //ray到building的位置
					if (intersectsBuild.length > 0) {
						const point = intersectsBuild[0].point
						shadowCamera.lookAt(point)
						moveCctv(selectCCTV)
						send({ type: CCTVMode.NONE })
					}
				} else {
					send({ type: CCTVMode.NONE })
				}
			default:
				const intersects = raycaster.intersectObjects(cctvObjs)
				if (intersects.length > 0) {
					const obj = intersects[0].object
					switch (true) {
						case $snapshot.matches(ViewerMode.CCTV):
							send({ type: 'updateSelectCCTV', selectCCTV: obj.name }) //選到cctv就清除原來的cctvMode模式
							break
						case $snapshot.matches(ViewerMode.PIPE):
							send({ type: ViewerMode.CCTV, selectCCTV: obj.name }) //選到cctv就清除原來的cctvMode模式
							break
					}
				}
		}
	}

	function onPipeMoveHandler() {
		switch (pipeMode) {
			case PIPE_MODE.CREATE:
				{
					const mesh = topLineMode ? topMesh : build
					const intersectsTopGrid = raycaster.intersectObject(mesh) //ray到topGrid的位置
					const selectPoint = intersectsTopGrid[0]?.point
					if (!selectPoint) return
					//取得法線的面
					const face = intersectsTopGrid[0]?.face as THREE.Face
					const normalA = face.normal.clone().applyEuler(new THREE.Euler(-Math.PI / 2, 0, 0))
					topLineMode && (selectPoint.y = 300) //屋頂模式創建線時 y = 300
					const poMesh = new THREE.Mesh(
						new THREE.SphereGeometry(5, 2, 2),
						new THREE.MeshBasicMaterial({
							color: 0xff0000
						})
					)
					poMesh.position.copy(selectPoint)
					scene.add(poMesh)
					points.push(selectPoint)
					normalArray.push(normalA)
					const _selectPipe = createLineEnd()
					send({ type: 'updateSelectPipe', selectPipe: _selectPipe })
					poMesh.name = _selectPipe + TARGET_LINE_POINT_END
				}
				break
			case PIPE_MODE.ADD:
				{
					const mesh = topLineMode ? topMesh : build
					const intersectsTopGrid = raycaster.intersectObject(mesh) //ray到topGrid的位置i
					if (intersectsTopGrid.length === 0) return
					//取得法線的面
					const normalB = intersectsTopGrid[0]?.face?.normal
						.clone()
						.applyEuler(new THREE.Euler(-Math.PI / 2, 0, 0))
					const selectPoint = intersectsTopGrid[0].point
					if (!selectPoint) return
					const explainPo = checkFaceIntersectPoint(
						points[points.length - 1].clone(),
						normalArray[normalArray.length - 1]!.clone(),
						selectPoint.clone(),
						normalB!
						// scene
					)
					if (explainPo) {
						points.push(explainPo)
						normalArray.push(null)
					}
					topLineMode && (selectPoint.y = 300)
					normalArray.push(normalB!)
					points.push(selectPoint)
					points = points
				}
				break
			default:
		}
	}

	let _downPos: THREE.Vector2 //鼠標按下的位置
	let _downTime = 0 //鼠標按下的時間
	function _onMouseDownHandler(event: Event) {
		event.stopPropagation()
		const mouseEvent = event as MouseEvent
		_downPos = new THREE.Vector2(mouseEvent.clientX, mouseEvent.clientY)
		_downTime = Date.now()
	}
	function _onMouseUpHandler(event: Event) {
		event.stopPropagation()
		const mouseEvent = event as MouseEvent
		const _delayTime = Date.now() - _downTime
		if (_delayTime > 200) return //按下時間小於200ms就不處理
		if (_downPos.distanceTo(new THREE.Vector2(mouseEvent.clientX, mouseEvent.clientY)) > 10) return //距離超過10px就不處理
		onRayMe(mouseEvent)
	}

	function onMouseMoveHandler(event: Event) {
		event.preventDefault()
		const mouseEvent = event as MouseEvent
		switch (cctvMode) {
			// case CCTVMode.CREATELINE: //創建線
			// 	break
			// case CCTVMode.ADDLINE: //添加線
			// 	break
			case CCTVMode.LOOKAT:
				if (selectCCTV) {
					mouse.x = (mouseEvent.clientX / window.innerWidth) * 2 - 1
					mouse.y = -(mouseEvent.clientY / window.innerHeight) * 2 + 1
					raycaster.setFromCamera(mouse, camera)
					const intersectsBuild = raycaster.intersectObject(build)
					if (intersectsBuild.length > 0) {
						const point = intersectsBuild[0].point
						const shadowCamera = getCCTVCamera(selectCCTV)
						if (shadowCamera) shadowCamera.lookAt(point)
						moveCctv(selectCCTV)
					}
				}
				break
		}
		debounce(() => updataShadowMaps(), 100)()
	}
	//CCTV Info變動移動模式
	function onCCTVchangeMoveModeHandler(data: { moveMode: string; checked: boolean }) {
		const { moveMode, checked } = data
		switch (moveMode) {
			case CCTVMode.MOVE:
				send({ type: checked ? CCTVMode.MOVE : CCTVMode.NONE })
				break
			case CCTVMode.LOOKAT:
				send({ type: checked ? CCTVMode.LOOKAT : CCTVMode.NONE })
				break
		}
	}
	//創建深度紋理
	const shadowMaps: THREE.WebGLRenderTarget[] = []
	for (let i = 0; i < MAX_CCTV_NUM; i++) {
		shadowMaps.push(generateShadowMap())
	}
	const projectionMaterial = $state(
		generateProjectionMaterial({
			maxcctvnum: MAX_CCTV_NUM,
			cctvNum: cctvsSettings.length > MAX_CCTV_NUM ? MAX_CCTV_NUM : cctvsSettings.length,
			color: new THREE.Color(0x888888),
			shadowMaps
		})
	)
	const projectionBoxMaterial = $state(
		generateProjectionMaterial({
			maxcctvnum: MAX_CCTV_NUM,
			cctvNum: cctvsSettings.length > MAX_CCTV_NUM ? MAX_CCTV_NUM : cctvsSettings.length,
			color: new THREE.Color(0x448844),
			shadowMaps
		})
	)
	const projectionFloorMaterial = $state(
		generateProjectionMaterial({
			maxcctvnum: MAX_CCTV_NUM,
			cctvNum: cctvsSettings.length > MAX_CCTV_NUM ? MAX_CCTV_NUM : cctvsSettings.length,
			color: new THREE.Color(0xcccccc),
			shadowMaps
		})
	)

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
			onmodelReady?.() // 通知父組件已經準備好
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
						child.visible = !bgImageDisable
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
		const selectCCTVHelper = getCCTVHelper(selectCCTV)
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
		window.removeEventListener('resize', onWindowResize)
	})
	//CCTV設定
	let selectCCTVSeting = $state({
		focalLength: 4
	}) //焦距改變
	//改變 UI的 焦距數值
	function CCTV_ChangefocalLength(cctvName: string) {
		const cctv = getCCTVCamera(cctvName)
		if (cctv) {
			selectCCTVSeting.focalLength = (cctv as CCTVCamera).focalLength
		}
	}
	//UI 改變焦距
	function changeCCTV_FocalLength(focalLength: string | number) {
		const parsedFocalLength =
			typeof focalLength === 'string' ? parseFloat(focalLength) || 4 : focalLength
		const shadowCamera = getCCTVCamera(selectCCTV)
		if (!shadowCamera) return
		;(shadowCamera as CCTVCamera).focalLength = parsedFocalLength
		selectCCTVSeting.focalLength = parsedFocalLength
		const cctvHelper = getCCTVHelper(selectCCTV)
		if (cctvHelper) cctvHelper.update()
		moveCctv(selectCCTV)
		debounce(() => updataShadowMaps(), 100)()
	}
	//清除CCTV
	function onClickClearCCTVHandler() {
		send({ type: 'updateSelectCCTV', selectCCTV: '' })
	}
	//刪除CCTV
	function delCCTV(name?: string) {
		const cctvObj = getCCTVObj(name || selectCCTV)
		if (cctvObj) {
			const index = cctvObjs.indexOf(cctvObj)
			cctvObjs.splice(index, 1)
			shadowCameras.splice(index, 1)
			const cctvHelper = cctvHelpers.splice(index, 1)
			cctvHelper[0] && scene.remove(cctvHelper[0])
			scene.remove(cctvObj)
			cctvNum-- // 手動更新 cctvNum
			send({ type: 'updateSelectCCTV', selectCCTV: '' })
			oncctvDel?.({ name: cctvObj.name })
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
		send({ type: CCTVMode.ADD, selectCCTV: '' })
	}
	//刪除全部CCTV(重置)
	export function delAllCCTV() {
		while (cctvObjs.length) {
			delCCTV(cctvObjs[0].name)
		}
	}
	//新增線路
	export function createLines() {
		points = [] // 清空點陣列
		normalArray.length = 0 // 清空法向量陣列
		selectLine('') //清除選擇的線
		send({ type: PIPE_MODE.CREATE })
	}
	//清除CCTV模式
	export function addLineEnd() {
		const currentPipeMode = pipeMode // 在狀態改變前捕獲當前模式
		send({ type: PIPE_MODE.NONE, selectPipe: '' })
		switch (currentPipeMode) {
			case PIPE_MODE.ADD:
				if (points.length === 1) {
					unDoAddLine()
				} else {
					points = []
				}
				break
		}
	}
	//畫線undo
	export function unDoAddLine() {
		if (points.length === 0) return
		if (points.length === 1) {
			//剛創建重新開始
			points = []
			normalArray.length = 0
			delPipe(selectPipe)
			send({ type: PIPE_MODE.CREATE })
		} else if (points.length > 1) {
			//移除上一個點
			normalArray.pop()
			points.pop()
			points = points
		}
	}
	//切換模式
	export function setViewerMode(mode: ViewerMode) {
		if (pipeMode === PIPE_MODE.ADD || pipeMode === PIPE_MODE.CREATE) {
			addLineEnd()
			updataShadowMaps()
		}
		// 只在需要切換模式時才發送事件
		if (viewerMode !== mode) {
			send({ type: mode })
		}
	}
	//選擇線路
	export function selectLine(line: string) {
		const pipe = lineMap.get(line)
		switch (true) {
			case pipeMode === PIPE_MODE.NONE:
				send({ type: 'updateSelectPipe', selectPipe: line || '' })
				return line || ''
			case !!pipe:
				points = pipe as THREE.Vector3[]
				send({ type: PIPE_MODE.NONE, selectPipe: line })
				return line
			default:
				points = []
				normalArray.length = 0
				send({ type: PIPE_MODE.NONE, selectPipe: '' })
				return ''
		}
	}
	//刪除線路
	export function delPipe(name?: string) {
		name = name || selectPipe
		const targetLine = scene.getObjectByName(selectPipe)
		targetLine && scene.remove(targetLine)
		const pointMesh = scene.getObjectByName(name + TARGET_LINE_POINT_END)
		pointMesh && scene.remove(pointMesh)
		send({ type: 'delPipe', poName: name })
	}
	$effect(() => {
		if (snapshot) {
			const { value, context } = $snapshot
			console.debug('cctvModeMachine', value, context.selectCCTV)
		}
	})
	let viewerMode = $derived($snapshot.matches(ViewerMode.CCTV) ? ViewerMode.CCTV : ViewerMode.PIPE) //選擇的cctv
	let cctvMode = $derived(
		$snapshot.matches(ViewerMode.CCTV) ? ($snapshot.value as { cctv: string })[ViewerMode.CCTV] : ''
	) //cctv模式 add move lookat createLine addLine
	let selectCCTV = $derived($snapshot.context.selectCCTV) //cctv模式 add move lookat createLine addLine
	let pipeMode = $derived(
		$snapshot.matches(ViewerMode.PIPE) //線路模式
			? ($snapshot.value as { pipe: string })[ViewerMode.PIPE]
			: ''
	) //選擇的cctv
	let selectPipe = $derived($snapshot.context.selectPipe) //選取的pipe
	let lineMap = $derived($snapshot.context.lineMap) //線段紀錄
	$effect(() => {
		if (bgImageObj) bgImageObj.visible = !bgImageDisable
	})
	$effect(() => {
		onmodeChange?.({ viewerMode, pipeMode, cctvMode })
	})
	//選擇cctv
	$effect(() => {
		if (selectCCTV) {
			_clearSelectCCTV()
			const cctvHelper = getCCTVHelper(selectCCTV)
			if (cctvHelper) cctvHelper.visible = true
			const shadowCamera = getCCTVCamera(selectCCTV)
			if (shadowCamera) selectCCTVSeting.focalLength = (shadowCamera as CCTVCamera).focalLength
		} else {
			_clearSelectCCTV()
		}
	})
	$effect(() => {
		if (points.length > 0) {
			//繪製線
			createLine(points)
		}
	})
	$effect(() => {
		selectLineHandler(selectPipe)
	})
	//更新線段紀錄
	$effect(() => {
		dispatchLineMap(lineMap)
	})
	$effect(() => {
		projectionMaterial.uniforms.cctvCount.value = cctvNum //更新CCTV數量
		projectionBoxMaterial.uniforms.cctvCount.value = cctvNum //更新CCTV數量
		projectionFloorMaterial.uniforms.cctvCount.value = cctvNum //更新CCTV數量
	})
	$effect(() => {
		CCTV_ChangefocalLength(selectCCTV)
	})
</script>

<div
	id="Viewer"
	role="presentation"
	onmousedown={_onMouseDownHandler}
	onmouseup={_onMouseUpHandler}
	onmousemove={onMouseMoveHandler}
></div>
<!-- <div id="Viewer" on:click={onRayMe} on:mousemove|preventDefault={onMouseMoveHandler}></div> -->
<CCTVInfo
	{selectCCTV}
	{cctvMode}
	{selectCCTVSeting}
	onclear={onClickClearCCTVHandler}
	ondel={() => delCCTV()}
	onmoveMode={onCCTVchangeMoveModeHandler}
	onfocalLength={changeCCTV_FocalLength}
/>
