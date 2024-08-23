import {
	Box3,
	BoxGeometry,
	ExtrudeGeometry,
	Group,
	Mesh,
	MeshBasicMaterial,
	MeshPhongMaterial,
	Object3D,
	PlaneGeometry,
	Shape,
	TextureLoader,
	Vector2,
	Vector3
} from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import { ADDITION, SUBTRACTION, Evaluator, Operation, OperationGroup } from 'three-bvh-csg'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js'
import { Svg } from '@svgdotjs/svg.js'
import _generateSkyBox from './generateSkyBox'
const exporter = new GLTFExporter()

/**
 * 將物件轉換為 GLB 格式
 * @param obj
 * @returns
 */
export function generateGLB(obj: Group): Promise<string> {
	return new Promise((resolve, reject) => {
		exporter.parse(
			obj,
			(gltf) => {
				if (gltf instanceof ArrayBuffer) {
					const blob = new Blob([gltf], { type: 'application/octet-stream' })
					resolve(URL.createObjectURL(blob))
				} else {
					// 處理其他類型的 result
					reject(new Error('Unexpected result type'))
				}
			},
			(error) => {
				reject(error)
			},
			{
				binary: true,
				forceIndices: true,
				onlyVisible: false,
				truncateDrawRange: false
			}
		)
	})
}

const DefaulColor = 0xcccccc

/**
 * 線條轉外筐
 * @param start - 起點
 * @param end - 終點
 * @param width - 寬度
 * @returns 外筐區塊
 */
export function createExtrudedLine(start: Vector2, end: Vector2, width: number) {
	const direction = new Vector2().subVectors(end, start).normalize()
	const normal = new Vector2(-direction.y, direction.x).multiplyScalar(width / 2)
	const shape = new Shape()
	shape.moveTo(start.x + normal.x, start.y + normal.y)
	shape.lineTo(end.x + normal.x, end.y + normal.y)
	shape.lineTo(end.x - normal.x, end.y - normal.y)
	shape.lineTo(start.x - normal.x, start.y - normal.y)
	shape.closePath()
	return shape
}

// 創建 SVG 加載器
const loader = new SVGLoader()
const evaluator = new Evaluator()
evaluator.attributes = ['position', 'normal']

/**
 * 將 SVG 轉換為 Group
 * @param svgPath SVG檔案路徑
 * @param options 選項
 * @param options.lineWidth 線段厚度
 * @param options.wallHeight 牆高
 * @param options.color 顏色
 * @returns Group
 */
export function svgToGroupSync(
	svgPath: string,
	{ lineWidth = 10, wallHeight = 300, doorHigh = 200, color = DefaulColor, scale = 1 }
) {
	return new Promise<Group>((resolve, reject) => {
		const group = new Group()
		const material = new MeshPhongMaterial({
			color
		})
		loader.load(
			svgPath,
			function (data) {
				const paths = data.paths
				let doorbrush: Operation
				const doorallMesh = new OperationGroup()
				const allMesh = new OperationGroup()
				let brush: Operation
				let firstBrush: Operation

				// 獲取 SVG 的邊界框
				const svgBounds = new Box3()
				let count = 0
				// 獲取所有路徑的邊界框, 並計算縮放比例
				paths.forEach((path) => {
					count++
					path.subPaths.forEach((subPath) => {
						subPath.getPoints().forEach((point) => {
							svgBounds.expandByPoint(new Vector3(point.x * scale, point.y * scale, 0))
						})
					})
				})
				if (count === 0) throw new Error('SVG 沒有路徑')
				const svgHeight = svgBounds.max.y - svgBounds.min.y
				count = 0
				paths.forEach((path) => {
					const points = path.subPaths[0].getPoints().map(
						(point) => new Vector2((point.x) * scale, svgHeight - (point.y) * scale) // 翻轉 Y 坐標
					)
					if (points.length < 2) return // 忽略不完整的路徑
					//計算points長度
					const length = points.reduce((acc, point, index) => {
						if (index === 0) return acc
						return acc + point.distanceTo(points[index - 1])
					}, 0)
					if (length < 10) return // 忽略太短的路徑
					switch (path.userData?.node?.getAttribute('data-type')) {
						case 'box': //繪製一個BoxGeometry
							{
								count++
								const shape = new Shape()
								shape.moveTo(points[0].x, points[0].y)
								shape.lineTo(points[1].x, points[1].y)
								shape.lineTo(points[2].x, points[2].y)
								shape.lineTo(points[3].x, points[3].y)
								shape.lineTo(points[0].x, points[0].y)
								const geometry = new ExtrudeGeometry(shape, {
									depth: path.userData?.node?.getAttribute('data-size')
										? path.userData?.node?.getAttribute('data-size') * 100
										: 100,
									bevelEnabled: false
								})
								const mesh = new Mesh(geometry, material)
								mesh.name = `Box_${path.userData?.node?.getAttribute('data-tagname')}_${count}`
								group.add(mesh)
							}
							break
						case 'door':
							{
								for (let i = 0; i < points.length - 1; i++) {
									const start = points[i]
									const end = points[i + 1]
									const shape = createExtrudedLine(start, end, lineWidth * 3)
									const geometry = new ExtrudeGeometry(shape, {
										depth: doorHigh,
										bevelEnabled: false
									})
									doorbrush = new Operation(geometry)
									// eslint-disable-next-line @typescript-eslint/ban-ts-comment
									//@ts-expect-error
									doorbrush.operation = SUBTRACTION
									doorallMesh.add(doorbrush)
								}
							}
							break
						default: {
							for (let i = 0; i < points.length - 1; i++) {
								const start = points[i]
								const end = points[i + 1]
								const shape = createExtrudedLine(start, end, lineWidth)
								const geometry = new ExtrudeGeometry(shape, {
									depth: wallHeight,
									bevelEnabled: false
								})

								if (firstBrush) {
									brush = new Operation(geometry)
									// eslint-disable-next-line @typescript-eslint/ban-ts-comment
									//@ts-expect-error
									brush.operation = ADDITION
									allMesh.add(brush)
								} else {
									firstBrush = new Operation(geometry)
									// eslint-disable-next-line @typescript-eslint/ban-ts-comment
									//@ts-expect-error
									firstBrush.operation = ADDITION
								}
							}
						}
					}
				})
				const base = createBaseForObject(allMesh)
				base.name = 'Floor'
				group.add(base)
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				//@ts-expect-error
				if (firstBrush && allMesh) {
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					//@ts-expect-error
					firstBrush.operation = ADDITION
					firstBrush.add(allMesh)
					firstBrush.add(doorallMesh)
					const building = evaluator.evaluateHierarchy(firstBrush)
					building.material = material
					building.material = material
					building.name = 'Background'
					group.add(building)
				}


				group.traverse((child) => {
					if (child instanceof Mesh) {
						child.geometry = BufferGeometryUtils.mergeVertices(child.geometry)
						child.material = material
					}
				})
				// 將 group 旋轉以使其在 XZ 平面上
				group.rotation.x = -Math.PI / 2
				group.position.set(0, 0, 0)
				// 根據Box移到中心
				const box = new Box3().setFromObject(group)
				const center = box.getCenter(new Vector3())
				group.position.x -= center.x
				group.position.z -= center.z
				const box3 = new Box3().setFromObject(group)
				console.log(box3)
				// 更新世界矩陣
				group.updateMatrixWorld(true)
				const svg = new Svg(data.xml as unknown as SVGSVGElement)
				svg.children().forEach(async (child) => {
					switch (child.type) {
						case 'path':
							break
						case 'rect':
							break
						case 'image':
							//利用以上數據建立一個theejs平面
							{
								const href = child.attr('xlink:href')
								const w = child.width() as number * scale
								const h = child.height() as number * scale
								const x = child.attr('x') as number * scale
								const y = child.attr('y') as number * scale
								const geometry = new PlaneGeometry(w, h)
								const textureLoader = new TextureLoader()
								textureLoader.load(href, (texture) => {
									//透明材質
									const material = new MeshBasicMaterial({
										map: texture,
									})
									const mesh = new Mesh(geometry, material)
									mesh.name = 'BG'
									mesh.position.x = x + w / 2
									mesh.position.y = svgHeight - (y + h / 2)
									mesh.position.z = 1
									group.add(mesh)
								})
							}
							break
					}
				})
				resolve(group)
			},
			undefined,
			function (error) {
				reject(error)
			}
		)
	})
}

/**
 * 創建底座
 * @param object - 物件
 * @param thickness - 厚度
 * @returns
 */
function createBaseForObject(object: Object3D, thickness: number = 5.0) {
	// 創建一個 Box3 來計算物件的邊界框
	const boundingBox = new Box3().setFromObject(object)

	// 計算邊界框的尺寸
	const size = boundingBox.getSize(new Vector3())
	const center = boundingBox.getCenter(new Vector3())

	// 創建底座的幾何體
	const baseGeometry = new BoxGeometry(size.x, size.y, thickness)
	// 設置底座的位置，使其位於物件的下方
	baseGeometry.translate(center.x, center.y, boundingBox.min.z - thickness / 2)
	// 創建底座的材質
	const baseMaterial = new MeshBasicMaterial({ color: DefaulColor })
	// 創建底座的網格
	const base = new Mesh(baseGeometry, baseMaterial)
	return base
}
/**
 * 將 SVG 字串轉換為 URL
 * @param svgString
 * @returns
 */
export function svgStringToURL(svgString: string) {
	// const svg = new DOMParser().parseFromString(svgdata, 'image/svg+xml')
	return URL.createObjectURL(new Blob([svgString], { type: 'image/svg+xml' }))
}

/**
 * 生成天空盒
 * @param param0 選項
 * @param param0.topColor 天空的淺藍色
 * @param param0.bottomColor 低處的白色
 * @returns
 */
export const generateSkyBox = _generateSkyBox
