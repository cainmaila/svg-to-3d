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
import { CCTVCamera } from './cctvCamera'

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
	(cctvsSettings: T_CCTV_MAP, scene: Scene) {
	//攝影機定義
	const cctvs = cctvsSettings.map((cctvSetting) => {
		return createCCTVByMatrix(
			cctvSetting[0] /* name */,
			cctvSetting[1].matrix /* matrix */,
			cctvSetting[1].focalLength,
				/* Matri */ scene
		)
	})
	const shadowCameras: CCTVCamera[] = cctvs.map(({ cctv }) => cctv)
	const cctvHelpers: CameraHelper[] = cctvs.map(({ cctvHelper }) => cctvHelper)
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
	//找到CCTV shadowCamera
	function getCCTVCamera(_name: string) {
		return shadowCameras.find((cctv) => {
			return cctv.name === `${_name}_camera`
		}) as CCTVCamera | undefined
	}
	return { shadowCameras, getCCTVCamera, cctvHelpers, cctvObjs, getCCTVObj, createCCTVObj: _createCCTVObj }
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