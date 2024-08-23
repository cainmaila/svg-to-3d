import {
	BoxGeometry,
	CameraHelper,
	FloatType,
	LinearFilter,
	Matrix4,
	Mesh,
	MeshBasicMaterial,
	PerspectiveCamera,
	RGBAFormat,
	Scene,
	Vector3,
	WebGLRenderTarget
} from 'three'

type I_CCTV_SETTING = {
	focalLength: number
	sensorWidth: number
	sensorHeight: number
	near: number
	far: number
}

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

/**
 * 建立一個CCTV
 * @param name - 名稱
 * @param position - 位置
 * @param lookAt - 觀看位置
 * @param scene - 場景
 * @returns {cctv, cctvHelper, name}
 */
export function createCCTV(
	name: string,
	position: Vector3,
	lookAt: Vector3 = new Vector3(),
	scene?: Scene
) {
	const cctv = new CCTVCamera({
		focalLength: 4, // 焦距
		sensorWidth: 4.8, // 传感器宽度
		sensorHeight: 3.6, // 传感器高度
		near: 5, // 近裁剪面
		far: 3000 // 远裁剪面
	})
	cctv.name = name + '_camera'
	cctv.position.copy(position)
	cctv.lookAt(lookAt)
	scene?.add(cctv)
	const cctvHelper = new CameraHelper(cctv)
	cctvHelper.visible = false
	cctvHelper.name = name + '_helper'
	scene?.add(cctvHelper)
	return { cctv, cctvHelper, name }
}

/**
 * 建立一個CCTV給予名稱與matrix
 * @param name - 名稱
 * @param matrix - 矩陣
 * @param scene - 場景
 * @returns {cctv, cctvHelper, name}
 */
export function createCCTVByMatrix(
	name: string,
	matrix: Matrix4,
	focalLength: number = 4,
	scene?: Scene
) {
	const cctv = new CCTVCamera({
		focalLength, // 焦距
		sensorWidth: 4.8, // 传感器宽度
		sensorHeight: 3.6, // 传感器高度
		near: 5, // 近裁剪面
		far: 3000 // 远裁剪面
	})
	cctv.name = name + '_camera'
	cctv.matrix.copy(matrix)
	cctv.matrix.decompose(cctv.position, cctv.quaternion, cctv.scale)
	scene?.add(cctv)
	const cctvHelper = new CameraHelper(cctv)
	cctvHelper.visible = false
	cctvHelper.name = name + '_helper'
	scene?.add(cctvHelper)
	return { cctv, cctvHelper, name }
}

//創建深度紋理
const shadowMapSize = 2048
export function generateShadowMap() {
	return new WebGLRenderTarget(shadowMapSize, shadowMapSize, {
		minFilter: LinearFilter,
		magFilter: LinearFilter,
		format: RGBAFormat,
		type: FloatType, // 使用浮點數格式提高精度
		anisotropy: 16 // 啟用各向異性過濾
	})
}


/**
 * CCTV物件創建器
 * @param cctvs
 * @param scene
 * @returns
 */
export function cctvObjsFactory
	(cctvs: {
		cctv: PerspectiveCamera
		name: string
		color?: number
	}[], scene: Scene) {
	//攝影機物件
	const cctvObjs: Mesh[] = cctvs.map((cctvObj) => {
		const cctv = _createCCTVObj({
			cctv: cctvObj.cctv
		}) //創建CCTV Obj
		cctv.name = cctvObj.name
		scene.add(cctv)
		return cctv
	})
	//找到CCTV Obj
	function getCCTVObj(_name: string) {
		return cctvObjs.find((cctvObj) => cctvObj.name === (_name))
	}
	return { cctvObjs, getCCTVObj, createCCTVObj: _createCCTVObj }
}

/**
 * 建立一個CCTV
 * @param param0
 * @param param0.cctv - CCTV PerspectiveCamera
 * @param param0.color - 顏色
 * @returns cctvObj
 */
function _createCCTVObj({ cctv, color }: { cctv: PerspectiveCamera, color?: number }) {
	const cctvObj = new Mesh(
		new BoxGeometry(10, 10, 20),
		new MeshBasicMaterial({ color: color || 0x880000 })
	)
	cctvObj.position.copy(cctv.position)
	cctvObj.quaternion.copy(cctv.quaternion)
	return cctvObj
}