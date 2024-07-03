<script lang="ts">
	import { Rect, Svg, SVG, Line, Path } from '@svgdotjs/svg.js'
	import { onMount } from 'svelte'

	//畫布大小
	const canvasWidth = 500
	const canvasHeight = 500
	const lineWidth = 5 //線條寬度

	let isDrawing = false //是否正在繪製
	let currentShape: any //當前正在繪製的形狀
	let currentTool = '' //當前選擇的工具
	let pathString = '' //自由繪製的路徑
	let selectedShape: any //選中的形狀
	let draw: Svg //SVG 畫布
	let svgContent: any //SVG 內容

	onMount(() => {
		draw = SVG().addTo('#drawing').size(canvasWidth, canvasHeight) //初始化SVG 畫布
	})

	//設置當前工具
	function setCurrentTool(tool: string) {
		currentTool = tool
		draw.off('click') //清除之前的事件監聽
		if (tool === 'select') {
			draw.on('click', selectShape)
		}
	}

	//開始繪製
	function startDrawing(event: MouseEvent) {
		const point = getMousePosition(event)
		isDrawing = true

		switch (currentTool) {
			case 'rect':
				currentShape = draw
					.rect()
					.move(point.x, point.y)
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
		}
	}

	//繪製中
	function drawing(event: MouseEvent) {
		if (!isDrawing) return

		const point = getMousePosition(event)

		switch (currentTool) {
			case 'rect':
				const width = point.x - currentShape.x()
				const height = point.y - currentShape.y()
				currentShape.size(Math.abs(width), Math.abs(height))
				if (width < 0) currentShape.x(point.x)
				if (height < 0) currentShape.y(point.y)
				break
			case 'line':
				currentShape.plot(currentShape.array()[0][0], currentShape.array()[0][1], point.x, point.y)
				break
			case 'freeDraw':
				pathString += ` L${point.x},${point.y}`
				currentShape.plot(pathString)
				break
		}
	}

	//結束繪製
	function endDrawing() {
		isDrawing = false
		currentShape = null
		svgContent = draw.svg()
	}

	//選擇形狀
	function selectShape(event: any) {
		const clickedElement = event.target
		if (selectedShape) {
			selectedShape.stroke({ color: 'white' })
		}
		if (
			clickedElement.instance.type === 'rect' ||
			clickedElement.instance.type === 'line' ||
			clickedElement.instance.type === 'path'
		) {
			selectedShape = clickedElement.instance
			selectedShape.stroke({ color: 'yellow' })
		} else {
			selectedShape = null
		}
	}

	//刪除選中的形狀
	function deleteSelected() {
		if (selectedShape) {
			selectedShape.remove()
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
</script>

<div class="toolbar">
	<button id="rectBtn" on:click={() => setCurrentTool('rect')}>矩形區域</button>
	<button id="lineBtn" on:click={() => setCurrentTool('line')}>直線</button>
	<button id="freeDrawBtn" on:click={() => setCurrentTool('freeDraw')}>自由繪製</button>
	<button id="selectBtn" on:click={() => setCurrentTool('select')}>選取</button>
	<button id="deleteBtn" on:click={deleteSelected}>刪除</button>
</div>
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
	id="drawing"
	on:mousedown={startDrawing}
	on:mousemove={drawing}
	on:mouseup={endDrawing}
	on:mouseleave={endDrawing}
></div>

<style lang="postcss">
	#drawing {
		border: 1px solid #ccc;
	}
	.toolbar button {
		margin: 5px;
	}
</style>
