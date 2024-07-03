<script lang="ts">
	import { Svg, SVG } from '@svgdotjs/svg.js'
	import { onMount } from 'svelte'

	let isDrawing = false
	let currentShape: any
	let currentTool = ''
	let pathString = ''
	let draw: Svg

	onMount(() => {
		draw = SVG().addTo('#drawing').size(500, 500)
	})

	function startDrawing(event: MouseEvent) {
		const point = getMousePosition(event)
		isDrawing = true

		switch (currentTool) {
			case 'rect':
				currentShape = draw
					.rect()
					.move(point.x, point.y)
					.fill('none')
					.stroke({ color: 'white', width: 2 })
				break
			case 'line':
				currentShape = draw
					.line(point.x, point.y, point.x, point.y)
					.stroke({ color: 'white', width: 2 })
				break
			case 'freeDraw':
				pathString = `M${point.x},${point.y}`
				currentShape = draw.path(pathString).fill('none').stroke({ color: 'white', width: 2 })
				break
		}
	}

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

	function endDrawing() {
		isDrawing = false
		currentShape = null
	}

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
	<button id="rectBtn" on:click={() => (currentTool = 'rect')}>矩形</button>
	<button id="lineBtn" on:click={() => (currentTool = 'line')}>直线</button>
	<button id="freeDrawBtn" on:click={() => (currentTool = 'freeDraw')}>自由绘制</button>
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
