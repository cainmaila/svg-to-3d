/**
import { NODE } from '../../../../.svelte-kit/ambient.d';
 * View事件
 */
export enum ViewerEvent {
	MODLE_READY = 'modelReady', //模型準備好
	CCTV_CHANGE = 'cctvChange', //CCTV改變
	CCTV_DEL = 'cctvDel', //CCTV刪除
	MODE_CHANGE = 'modeChange', //模式改變
	PIPE_MAP_UPDATE = 'pipeMapUpdate', //管線地圖更新
}

export enum ViewerMode {
	CCTV = 'cctv', //CCTV模式
	PIPE = 'pipe', //管線模式
}

/**
 * CCTV模式 (Viewer狀態模式)
 */
export enum CCTVMode {
	NONE = 'cctvNone', //無狀態
	ADD = 'cctvAdd', //新增CCTV
	MOVE = 'cctvMove', //移動CCTV
	LOOKAT = 'cctvLookat', //CCTV看的方向
}

/**
 * 管線模式
 */
export enum PIPE_MODE {
	NONE = 'pipeModNone', //無狀態
	CREATE = 'pipeModeCreate', //創建線段
	ADD = 'pipeModeAdd', //添加線段點
}