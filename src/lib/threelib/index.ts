import { Box3, ExtrudeGeometry, Group, MeshPhongMaterial, Shape, Vector2, Vector3 } from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import { ADDITION, SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg'

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
    {
        lineWidth = 5, // 設置線段厚度和高度
        wallHeight = 100,
        doorHigh = 50,
        color = 0xcccccc
    }
) {
    return new Promise<Group>((resolve, rehect) => {
        let building: Brush | null = null
        let doors: Brush | null = null
        const group = new Group()
        loader.load(
            svgPath,
            function (data) {
                const paths = data.paths
                let doorbrush: Brush | null = null
                let doorallMesh: Brush | null = null
                let allMesh: Brush | null = null
                let brush: Brush | null = null
                paths.forEach((path) => {
                    switch (path.userData?.node?.getAttribute('data-type')) {
                        case 'door':
                            {
                                const points = path.subPaths[0].getPoints()
                                const evaluator = new Evaluator()
                                for (let i = 0; i < points.length - 1; i++) {
                                    const start = points[i]
                                    const end = points[i + 1]
                                    const shape = createExtrudedLine(start, end, lineWidth * 2)
                                    const geometry = new ExtrudeGeometry(shape, {
                                        depth: doorHigh,
                                        bevelEnabled: false
                                    })
                                    doorbrush = new Brush(geometry)
                                    if (doorallMesh) {
                                        doorallMesh = evaluator.evaluate(doorallMesh, doorbrush, ADDITION)
                                    } else {
                                        doorallMesh = doorbrush
                                    }
                                }
                                doors = doorallMesh
                            }
                            break
                        default: {
                            const evaluator = new Evaluator()
                            const points = path.subPaths[0].getPoints()
                            for (let i = 0; i < points.length - 1; i++) {
                                const start = points[i]
                                const end = points[i + 1]
                                const shape = createExtrudedLine(start, end, lineWidth)
                                const geometry = new ExtrudeGeometry(shape, {
                                    depth: wallHeight,
                                    bevelEnabled: false
                                })
                                brush = new Brush(geometry)
                                if (allMesh) {
                                    allMesh = evaluator.evaluate(allMesh, brush, ADDITION)
                                } else {
                                    allMesh = brush
                                }
                            }
                            building = allMesh
                        }
                    }
                })
                if (building) {
                    const evaluator = new Evaluator()
                    if (doors) building = evaluator.evaluate(building, doors, SUBTRACTION)
                    building.material = new MeshPhongMaterial({
                        color
                    })
                    group.add(building)
                }
                //把groupr y軸旋轉90度
                group.rotation.x = -Math.PI / 2

                //根據Box移到中心
                const box = new Box3().setFromObject(group)
                const center = box.getCenter(new Vector3())
                group.position.x = -center.x
                group.position.z = -center.z

                resolve(group)
            },
            undefined,
            function (error) {
                rehect(error)
            }
        )
    })
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
