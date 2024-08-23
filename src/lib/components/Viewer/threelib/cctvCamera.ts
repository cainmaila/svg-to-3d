import { PerspectiveCamera } from "three"

const ANGLE = 180 / Math.PI // 弧度轉角度
export class CCTVCamera extends PerspectiveCamera {
    private _focalLength: number = 8 // 焦距
    private _sensorWidth: number = 4.8 // 感光元件寬度
    private _sensorHeight: number = 3.6 // 感光元件高度
    constructor(cctvSetting: I_CCTV_SETTING) {
        const { focalLength, sensorWidth, sensorHeight, near, far } = cctvSetting
        const fovVerticalRadians = 2 * Math.atan(sensorHeight / (2 * focalLength)) // 垂直視角
        const fovVerticalDegrees = fovVerticalRadians * ANGLE // 垂直視角
        const aspect = sensorWidth / sensorHeight // 寬高比
        super(fovVerticalDegrees, aspect, near, far)
        this._focalLength = focalLength
        this._sensorWidth = sensorWidth
        this._sensorHeight = sensorHeight
    }
    /**
     * 焦距
     * @memberof CCTVCamera
     */
    get focalLength() {
        return this._focalLength
    }
    /**
     * 焦距
     * @memberof CCTVCamera
     */
    set focalLength(value: number) {
        this._focalLength = value
        this._updateProjection()
    }
    /**
     * 感光元件寬度
     * @memberof CCTVCamera
     */
    get sensorWidth() {
        return this._sensorWidth
    }
    /**
     * 感光元件寬度
     * @memberof CCTVCamera
     */
    set sensorWidth(value: number) {
        this._sensorWidth = value
        this._updateProjection()
    }
    /**
     * 感光元件高度
     * @memberof CCTVCamera
     */
    get sensorHeight() {
        return this._sensorHeight
    }
    /**
     * 感光元件高度
     * @memberof CCTVCamera
     */
    set sensorHeight(value: number) {
        this._sensorHeight = value
        this._updateProjection()
    }
    /**
     * 重新設定CCTV設定
     * @param cctvSetting
     * @param cctvSetting.focalLength 焦距
     * @param cctvSetting.sensorWidth 感光元件寬度
     * @param cctvSetting.sensorHeight 感光元件高度
     * @param cctvSetting.near 近端
     * @param cctvSetting.far 遠端
     * @memberof CCTVCamera
     */
    setting(cctvSetting: I_CCTV_SETTING) {
        const { focalLength, sensorWidth, sensorHeight, near, far } = cctvSetting
        this._focalLength = focalLength
        this._sensorWidth = sensorWidth
        this._sensorHeight = sensorHeight
        this.near = near
        this.far = far
        this._updateProjection()
    }
    private _updateProjection() {
        const fovVerticalRadians = 2 * Math.atan(this._sensorHeight / (2 * this._focalLength)) // 垂直視角
        const fovVerticalDegrees = fovVerticalRadians * ANGLE // 垂直視角
        this.fov = fovVerticalDegrees
        this.updateProjectionMatrix()
    }
}