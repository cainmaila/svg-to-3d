import { BackSide, Box3, BoxGeometry, Color, ExtrudeGeometry, Group, Mesh, MeshBasicMaterial, MeshPhongMaterial, Object3D, ShaderMaterial, Shape, SphereGeometry, Vector2, Vector3 } from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import { ADDITION, SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg'
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
const exporter = new GLTFExporter();

/**
 * 將物件轉換為 GLB 格式
 * @param obj
 * @returns
 */
export function generateGLB(obj: Group): Promise<string> {
    return new Promise((resolve, reject) => {
        exporter.parse(obj, (gltf) => {
            if (gltf instanceof ArrayBuffer) {
                const blob = new Blob([gltf], { type: 'application/octet-stream' });
                resolve(URL.createObjectURL(blob));
            } else {
                // 處理其他類型的 result
                reject(new Error('Unexpected result type'));
            }
        }, error => {
            reject(error)
        }, { binary: true });
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
        lineWidth = 10,
        wallHeight = 300,
        doorHigh = 200,
        color = DefaulColor,
        scale = 1
    }
) {
    return new Promise<Group>((resolve, reject) => {
        let building: Brush | null = null
        let doors: Brush | null = null
        const group = new Group()
        const material = new MeshPhongMaterial({
            color
        })
        loader.load(
            svgPath,
            function (data) {
                const paths = data.paths
                let doorbrush: Brush | null = null
                let doorallMesh: Brush | null = null
                let allMesh: Brush | null = null
                let brush: Brush | null = null

                // 獲取 SVG 的邊界框
                const svgBounds = new Box3()
                let count = 0
                paths.forEach(path => {
                    count++
                    path.subPaths.forEach(subPath => {
                        subPath.getPoints().forEach(point => {
                            svgBounds.expandByPoint(new Vector3(point.x * scale, point.y * scale, 0))
                        })
                    })
                })
                if (count === 0) throw new Error('SVG 沒有路徑')
                const svgHeight = svgBounds.max.y * scale - svgBounds.min.y * scale

                paths.forEach((path) => {
                    const points = path.subPaths[0].getPoints().map(point =>
                        new Vector2(point.x * scale, svgHeight - point.y * scale)  // 翻轉 Y 坐標
                    )

                    switch (path.userData?.node?.getAttribute('data-type')) {
                        case 'door':
                            {
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
                    building.material = material
                    group.add(building)
                }

                // 將 group 旋轉以使其在 XZ 平面上
                group.rotation.x = -Math.PI / 2

                // 根據Box移到中心
                const box = new Box3().setFromObject(group)
                const center = box.getCenter(new Vector3())
                group.position.x = -center.x
                group.position.z = -center.z

                const base = createBaseForObject(group)

                const evaluator = new Evaluator()
                const baseBrush = new Brush(base.geometry)
                const allMesh2 = evaluator.evaluate(building as Brush, baseBrush, ADDITION)
                allMesh2.material = material

                // 更新世界矩陣
                allMesh2.updateMatrixWorld(true)

                resolve(allMesh2 as unknown as Group)
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
    const boundingBox = new Box3().setFromObject(object);

    // 計算邊界框的尺寸
    const size = boundingBox.getSize(new Vector3());
    const center = boundingBox.getCenter(new Vector3());

    // 創建底座的幾何體
    const baseGeometry = new BoxGeometry(size.x, thickness, size.z);

    // 創建底座的材質
    const baseMaterial = new MeshBasicMaterial({ color: DefaulColor });

    // 創建底座的網格
    const base = new Mesh(baseGeometry, baseMaterial);

    // 設置底座的位置，使其位於物件的下方
    base.position.set(center.x, boundingBox.min.y - thickness / 2, center.z);

    return base;
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
export function generateSkyBox({
    topColor,
    bottomColor
}: {
    topColor: number,
    bottomColor: number
} = {
        topColor: 0x87ceeb,
        bottomColor: 0x000000
    }) {
    // 頂點着色器
    const vertexShader = `
        varying vec3 vWorldPosition;
        void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
        `
    // 片段着色器
    const fragmentShader = `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
        float h = normalize(vWorldPosition + offset).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
`
    // 自定義材質
    const uniforms = {
        topColor: { value: new Color(topColor) }, // 天空的淺藍色
        bottomColor: { value: new Color(bottomColor) }, // 低處的白色
        offset: { value: 33 },
        exponent: { value: 0.6 }
    }
    const skyMaterial = new ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        uniforms: uniforms,
        side: BackSide
    })
    // 创建天空盒几何体
    const skyGeometry = new SphereGeometry(100000, 32, 15)
    // 创建天空盒
    return new Mesh(skyGeometry, skyMaterial)
}

