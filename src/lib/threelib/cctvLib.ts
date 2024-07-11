import { PerspectiveCamera } from "three"

type I_CCTV_SETTING = {
    focalLength: number
    sensorWidth: number
    sensorHeight: number
    near: number
    far: number
}

const ANGLE = 180 / Math.PI // 弧度轉角度

/**
 * 將CCTV設定轉換成Camera
 * @param cctvSetting CCTV設定
 * @param cctvSetting.focalLength 焦距
 * @param cctvSetting.sensorWidth 感光元件寬度
 * @param cctvSetting.sensorHeight 感光元件高度
 * @param cctvSetting.near 近端
 * @param cctvSetting.far 遠端
 * @returns PerspectiveCamera
 */
export function convertCctvToCamera(cctvSetting: I_CCTV_SETTING): PerspectiveCamera {
    const {
        focalLength,
        sensorWidth,
        sensorHeight,
        near,
        far
    } = cctvSetting
    const fovVerticalRadians = 2 * Math.atan(sensorHeight / (2 * focalLength)) // 垂直視角
    const fovVerticalDegrees = fovVerticalRadians * ANGLE // 垂直視角
    const aspect = sensorWidth / sensorHeight // 寬高比
    return new PerspectiveCamera(fovVerticalDegrees, aspect, near, far)
}