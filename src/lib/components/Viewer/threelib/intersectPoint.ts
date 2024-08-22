import { Plane, PlaneHelper, Scene, Vector3 } from "three"

/**
 * 線段與面的交點
 * @param pointA - 起點
 * @param normalA - 法向量
 * @param pointB - 終點
 * @param normalB - 法向量
 * @returns - 交點
 */
export function checkFaceIntersectPoint(
    pointA: Vector3,
    normalA: Vector3,
    pointB: Vector3,
    normalB: Vector3,
    scene?: Scene
): Vector3 | null {
    // 计算两个法向量的叉积
    const crossVector = new Vector3().crossVectors(normalA, normalB)
    // 如果叉积为 0 向量，则两个面平行且不相交
    if (crossVector.length() < 1e-6) return null
    // 计算平面 A 和 B 的方程
    const planeA = new Plane().setFromNormalAndCoplanarPoint(normalA, pointA)
    const planeB = new Plane().setFromNormalAndCoplanarPoint(normalB, pointB)
    const planeC = new Plane().setFromNormalAndCoplanarPoint(crossVector.normalize(), pointA)
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    scene && _showHelper(planeA, planeB, planeC, scene)
    //找出 planeA planeB planeC 的交點
    const normal1 = planeA.normal.clone()
    const normal2 = planeB.normal.clone()
    const normal3 = planeC.normal.clone()
    // 计算平面常数项
    const d1 = planeA.constant
    const d2 = planeB.constant
    const d3 = planeC.constant
    const cross1 = normal2.clone().cross(normal3)
    const cross2 = normal3.clone().cross(normal1)
    const cross3 = normal1.clone().cross(normal2)
    // 计算交点
    const denom = normal1.dot(normal2.cross(normal3))
    return new Vector3(
        (-d1 * cross1.x - d2 * cross2.x - d3 * cross3.x) / denom,
        (-d1 * cross1.y - d2 * cross2.y - d3 * cross3.y) / denom,
        (-d1 * cross1.z - d2 * cross2.z - d3 * cross3.z) / denom
    )
}

function _showHelper(planeA: Plane, planeB: Plane, planeC: Plane, scene: Scene) {
    const planeAHelper = new PlaneHelper(planeA, 10000, 0xff0000)
    scene.add(planeAHelper)
    const planeBHelper = new PlaneHelper(planeB, 10000, 0x00ff00)
    scene.add(planeBHelper)
    const planeCHelper = new PlaneHelper(planeC, 10000, 0x0000ff)
    scene.add(planeCHelper)
}