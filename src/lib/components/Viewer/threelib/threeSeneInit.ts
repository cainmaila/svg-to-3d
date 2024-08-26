import { PerspectiveCamera, Scene, WebGLRenderer } from "three"
import { OrbitControls } from "three/examples/jsm/Addons.js"

export function threeSeneInit() {
    // 設置場景、相機和渲染器
    const scene = new Scene()
    const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 100000)
    const renderer = new WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    // 添加軌道控制
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.maxDistance = 10000 // 最大缩放距离

    return { scene, camera, renderer, controls }
}