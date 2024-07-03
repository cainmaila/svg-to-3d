<script lang="ts">
	import { Svg, SVG } from '@svgdotjs/svg.js'
	import { onMount } from 'svelte'
	import { svgString$ } from '$lib/stores'
	import { goto } from '$app/navigation'
	import { get } from 'svelte/store'

	//畫布大小
	const canvasWidth = 800
	const canvasHeight = 500
	const lineWidth = 5 //線條寬度

	let isDrawing = false //是否正在繪製
	let currentShape: any //當前正在繪製的形狀
	let currentTool = '' //當前選擇的工具
	let pathString = '' //自由繪製的路徑
	let selectedShape: any //選中的形狀
	let draw: Svg //SVG 畫布

	onMount(() => {
		draw = SVG().addTo('#drawing').size(canvasWidth, canvasHeight) //初始化SVG 畫布
		loadImg('/back.png')

		// 創建一個臨時的div來解析SVG內容
		const tempDiv = document.createElement('div')
		tempDiv.innerHTML = get(svgString$)
		// 獲取SVG元素
		const svgElement = tempDiv.querySelector('svg')
		if (!svgElement) {
			return
		}
		// 將SVG元素的內容添加到繪圖區域
		const svgChildren = Array.from(svgElement.children)
		svgChildren.forEach((child: any) => {
			if (child.tagName.toLowerCase() === 'rect') {
				draw
					.rect(child.width.baseVal.value, child.height.baseVal.value)
					.move(child.x.baseVal.value, child.y.baseVal.value)
					.attr(getAttributes(child))
			} else if (child.tagName.toLowerCase() === 'line') {
				draw
					.line(
						child.x1.baseVal.value,
						child.y1.baseVal.value,
						child.x2.baseVal.value,
						child.y2.baseVal.value
					)
					.attr(getAttributes(child))
			} else if (child.tagName.toLowerCase() === 'path') {
				draw.path(child.getAttribute('d')).attr(getAttributes(child))
			}
		})
	})

	// 輔助函數：獲取元素的屬性
	function getAttributes(element: any) {
		const attrs = {}
		for (let attr of element.attributes) {
			if (
				attr.name !== 'width' &&
				attr.name !== 'height' &&
				attr.name !== 'x' &&
				attr.name !== 'y'
			) {
				// 排除一些不需要的屬性
				//@ts-ignore
				attrs[attr.name] = attr.value
			}
		}
		return attrs
	}

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
		svgString$.set(draw.svg())
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

	//清除所有形狀
	function clear() {
		draw.clear()
		svgString$.set('')
	}

	async function loadImg(path: string) {
		const img = new Image()
		img.onload = function (e) {
			// 調整繪圖區域大小以匹配圖片
			// draw.size(img.width, img.height)
			// 創建一個新的圖片元素並設置為背景
			const background = draw.image(path)
			//縮到畫布大小
			background.size(canvasWidth, canvasHeight)
			background.back() // 將圖片移到最底層

			// 可選：調整圖片透明度，使其更容易描繪
			background.opacity(0.3)
		}
		img.src = path
	}
</script>

<div class="toolbar">
	<fieldset>
		<legend>繪製方式</legend>
		<input type="radio" id="select" name="drawtype" on:change={() => setCurrentTool('select')} />
		<!-- svelte-ignore a11y-label-has-associated-control -->
		<label>選取</label>
		<input type="radio" id="rect" name="drawtype" on:change={() => setCurrentTool('rect')} />
		<!-- svelte-ignore a11y-label-has-associated-control -->
		<label>矩形區域</label>
		<input type="radio" id="line" name="drawtype" on:change={() => setCurrentTool('line')} />
		<!-- svelte-ignore a11y-label-has-associated-control -->
		<label>直線</label>
		<input
			type="radio"
			id="freeDraw"
			name="drawtype"
			on:change={() => setCurrentTool('freeDraw')}
		/>
		<!-- svelte-ignore a11y-label-has-associated-control -->
		<label>自由繪製</label>
	</fieldset>
	<button id="deleteBtn" on:click={clear}>清除全部</button>
	<button id="deleteBtn" on:click={deleteSelected}>刪除選取</button>
	<button id="generate" on:click={() => goto('/svgto3d')}>生成場域</button>
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
		width: 800px;
		height: 500px;
	}
	.toolbar button {
		margin: 5px;
	}
</style>
