/**
import { NODE } from '../../../../.svelte-kit/ambient.d';
 * View事件
 */
export enum ViewerEvent {
	MODLE_READY = 'modelReady', //模型準備好
	CCTV_CHANGE = 'cctvChange', //CCTV改變
	CCTV_DEL = 'cctvDel', //CCTV刪除
	MODE_CHANGE = 'modeChange' //模式改變
}

/**
 * CCTV模式 (Viewer狀態模式)
 */
export enum CCTVMode {
	NONE = 'none', //無狀態
	ADD = 'add', //新增CCTV
	MOVE = 'move', //移動CCTV
	LOOKAT = 'lookat', //CCTV看的方向
	PIPE_MODE = 'pipeMode', //管線模式
	// CREATELINE = 'createLine', //創建線段
	// ADDLINE = 'addLine', //添加線段點
}

/**
 * 管線模式
 */
export enum PIPE_MODE {
	CREATE = 'pipeModeCreate', //創建線段
	ADD = 'pipeModeAdd', //添加線段點
	// EDN = 'pipeModeEnd' //添加結束
}