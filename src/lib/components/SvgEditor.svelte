<script lang="ts">
	import { Svg, SVG } from '@svgdotjs/svg.js'
	import '@svgdotjs/svg.draggable.js'
	import '@svgdotjs/svg.panzoom.js'
	import { onMount } from 'svelte'
	import { loadSvgElementToDraw } from '$lib/svgLib'
	import { createEventDispatcher } from 'svelte'

	const dispatch = createEventDispatcher()
	//on:svg svgString變化

	export let currentTool = 'view' //當前選擇的工具

	//畫布大小
	const canvasWidth = window.innerWidth
	const canvasHeight = window.innerHeight
	const lineWidth = 5 //線條寬度

	let isDrawing = false //是否正在繪製
	let currentShape: any //當前正在繪製的形狀
	let pathString = '' //自由繪製的路徑
	let selectedShape: any //選中的形狀
	let draw: Svg //SVG 畫布
	let controlPoints: any[] = [] //控制點
	let svgString //SVG 字串

	onMount(() => {
		draw = SVG()
			.addTo('#drawing')
			.size(canvasWidth, canvasHeight)
			.viewbox(`0 0 ${canvasWidth} ${canvasHeight}`)
			.panZoom({ zoomMin: 0.5, zoomMax: 2 }) //初始化SVG 畫布
		loadImg('/back3.png')
	})

	//載入SVG
	export function loadSvg(_svgString: string) {
		svgString = _svgString
		// 創建一個臨時的div來解析SVG內容
		const tempDiv = document.createElement('div')
		tempDiv.innerHTML = svgString
		// 獲取SVG元素
		const svgElement = tempDiv.querySelector('svg')
		if (!svgElement) {
			return
		}
		// 將SVG元素的內容添加到繪圖區域
		loadSvgElementToDraw(draw, svgElement, {
			lineWidth
		})
	}

	//刪除選中的形狀
	export function deleteSelected() {
		if (selectedShape) {
			removeControlPoints() // 除舊的控制點
			selectedShape.remove()
			selectedShape = null
		}
	}

	//清除所有形狀
	export function clear() {
		draw.clear()
		svgString = ''
		loadImg('/back3.png')
	}

	//設置當前工具
	export function setCurrentTool(tool: string) {
		currentTool = tool
		draw.off('click') //清除之前的事件監聽
		if (tool === 'select') {
			draw.on('click', selectShape)
		}
		draw.panZoom(tool === 'view' ? { zoomMin: 0.8, zoomMax: 1.5 } : false)
	}
	//清除選擇
	export function clearSelect() {
		removeControlPoints()
		if (selectedShape) {
			switch (selectedShape.data('type')) {
				case 'door':
					selectedShape.stroke({ color: '#00ff00' })
					break
				default:
					selectedShape.stroke({ color: 'white' })
			}
			selectedShape = null
		}
		svgString = draw.svg()
		dispatch('svg', svgString)
	}

	// 創建控制點
	function createControlPoint(x: number, y: number, index: number) {
		const controlPoint = draw.circle(10).fill('blue').center(x, y).attr('cursor', 'pointer')
		controlPoint.draggable()
		controlPoint.on('dragmove', (event: any) => {
			event.preventDefault()
			const { handler, box } = event.detail
			const { x, y } = box
			handler.move(x, y)
			updateShape(x + 5, y + 5, index) // +5 是因為控制點的半徑是5
		})
		controlPoints.push(controlPoint)
	}
	// 更新 updateShape 函數
	function updateShape(newX: number, newY: number, index: number) {
		if (selectedShape.type === 'polygon') {
			const points = selectedShape.array()
			points[index] = [newX, newY]
			selectedShape.plot(points)
		} else if (selectedShape.type === 'line') {
			const line = selectedShape.array()
			line[index] = [newX, newY]
			selectedShape.plot(line)
		} else if (selectedShape.type === 'path') {
			const pathArray = selectedShape.array()
			pathArray[index][1] = newX
			pathArray[index][2] = newY
			selectedShape.plot(pathArray)
		}
	}

	// 添加控制點
	function addControlPoints(shape: any) {
		removeControlPoints() // 先移除舊的控制點
		if (shape.type === 'polygon') {
			const points = shape.array()
			points.forEach((point: any, index: number) => createControlPoint(point[0], point[1], index))
		} else if (shape.type === 'line') {
			const line = shape.array()
			createControlPoint(line[0][0], line[0][1], 0) // 起點
			createControlPoint(line[1][0], line[1][1], 1) // 終點
		} else if (shape.type === 'path') {
			// 對於路徑，我們可以添加每個路徑點的控制點
			const pathArray = shape.array()
			pathArray.forEach((segment: any, index: number) => {
				if (segment[0] !== 'M') {
					// 忽略移動命令
					createControlPoint(segment[1], segment[2], index)
				}
			})
		}
	}
	// 移除控制點
	function removeControlPoints() {
		controlPoints.forEach((point) => point.remove())
		controlPoints = []
	}

	//選取形狀
	function onSelect() {
		draw.off('click')
		draw.on('click', selectShape)
	}

	//開始繪製
	function startDrawing(event: MouseEvent) {
		const point = getMousePosition(event)
		isDrawing = true

		switch (currentTool) {
			case 'polygon':
				currentShape = draw
					.polygon()
					.plot([
						[point.x, point.y],
						[point.x, point.y],
						[point.x, point.y],
						[point.x, point.y]
					])
					.fill('none')
					.stroke({ color: 'white', width: lineWidth })
				break
			case 'line':
				currentShape = draw
					.line(point.x, point.y, point.x, point.y)
					.stroke({ color: 'white', width: lineWidth })
				break
			case 'freeDraw':
				pathString = `M${point.x},${point.y}`
				currentShape = draw
					.path(pathString)
					.fill('none')
					.stroke({ color: 'white', width: lineWidth })
				break
			case 'door':
				currentShape = draw
					.line(point.x, point.y, point.x, point.y)
					.stroke({ color: '#00ff00', width: lineWidth * 2 })
				break
		}
	}

	//繪製中
	function drawing(event: MouseEvent) {
		if (!isDrawing) return

		const point = getMousePosition(event)

		switch (currentTool) {
			case 'polygon':
				currentShape.plot([
					[currentShape.array()[0][0], currentShape.array()[0][1]],
					[point.x, currentShape.array()[0][1]],
					[point.x, point.y],
					[currentShape.array()[0][0], point.y]
				])
				break
			case 'line':
				currentShape.plot(currentShape.array()[0][0], currentShape.array()[0][1], point.x, point.y)
				break
			case 'freeDraw':
				pathString += ` L${point.x},${point.y}`
				currentShape.plot(pathString)
				break
			case 'door':
				currentShape
					.plot(currentShape.array()[0][0], currentShape.array()[0][1], point.x, point.y)
					.data('type', 'door', true)
				break
		}
	}

	//結束繪製
	function endDrawing() {
		isDrawing = false
		currentShape = null
		svgString = draw.svg()
		dispatch('svg', svgString)
	}

	//選擇形狀
	function selectShape(event: any) {
		const clickedElement = event.target
		clearSelect()
		if (
			clickedElement.instance.type === 'polygon' ||
			clickedElement.instance.type === 'rect' ||
			clickedElement.instance.type === 'line' ||
			clickedElement.instance.type === 'path'
		) {
			selectedShape = clickedElement.instance
			selectedShape.stroke({ color: 'yellow' })
			addControlPoints(selectedShape)
		} else {
			selectedShape = null
		}
	}

	//獲取滑鼠位置
	function getMousePosition(event: MouseEvent) {
		const CTM = draw.node.getScreenCTM()
		if (!CTM) return { x: 0, y: 0 }
		return {
			x: (event.clientX - CTM.e) / CTM.a,
			y: (event.clientY - CTM.f) / CTM.d
		}
	}

	async function loadImg(path: string) {
		const img = new Image()
		img.onload = function (e) {
			// 調整繪圖區域大小以匹配圖片
			// draw.size(img.width, img.height)
			// 創建一個新的圖片元素並設置為背景
			const background = draw.image(path)
			//縮到畫布大小
			background.size(canvasWidth * 0.8, canvasHeight * 0.8)
			//置中
			background.center(canvasWidth / 2, canvasHeight / 2)
			background.back() // 將圖片移到最底層

			// 可選：調整圖片透明度，使其更容易描繪
			background.opacity(0.3)
		}
		img.src = path
	}
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
	id="drawing"
	on:click={onSelect}
	on:mousedown={startDrawing}
	on:mousemove={drawing}
	on:mouseup={endDrawing}
	on:mouseleave={endDrawing}
></div>

<style lang="postcss">
	#drawing {
		position: relative;
		height: 100dvh;
		box-sizing: border-box;
		user-select: none;
		-webkit-user-drag: none;
		& svg {
			position: absolute;
			left: 0;
			top: 0;
		}
	}
</style>
