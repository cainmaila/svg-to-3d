import { CCTVMode, PIPE_MODE, ViewerMode } from '$lib/components/Viewer/viewerType'
import { setup, assign } from 'xstate'

type CCTVContext = {
    selectCCTV: string;
};

export const cctvModeMachine = setup({
    types: {
        context: {
        } as CCTVContext,
        events: {} as {
            type: ViewerMode | CCTVMode | PIPE_MODE | 'updateSelectCCTV',
            selectCCTV?: string
        },
    },
    actions: {
        //目前選擇的CCTV
        updateSelectCCTV: assign(({ context, event }) => ({
            selectCCTV: event.selectCCTV ?? context.selectCCTV
        })),
        clearSelectCCTV: assign(() => ({
            selectCCTV: ''
        }))
    }
}).createMachine({
    id: 'cctvModeMachine',
    initial: ViewerMode.CCTV,  //cctv模式 add move lookat createLine addLine
    context: {
        selectCCTV: ''
    },
    on: {
        updateSelectCCTV: {
            actions: 'updateSelectCCTV'
        },
        clearSelectCCTV: {
            actions: 'clearSelectCCTV'
        },
        '*': {
            actions: (state) => {
                console.error('未定義的狀態', state)
            }
        }
    },
    states: {
        [ViewerMode.CCTV]: {
            initial: CCTVMode.NONE,
            states: {
                [CCTVMode.NONE]: {
                    target: CCTVMode.NONE,
                    actions: 'updateSelectCCTV',
                    on: {
                        [CCTVMode.ADD]: {
                            target: CCTVMode.ADD,
                            actions: 'updateSelectCCTV',
                        },
                        [CCTVMode.MOVE]: {
                            target: CCTVMode.MOVE,
                            actions: 'updateSelectCCTV',
                        },
                        [CCTVMode.LOOKAT]: {
                            target: CCTVMode.LOOKAT,
                            actions: 'updateSelectCCTV',
                        }
                    }
                },
                [CCTVMode.ADD]: {
                    target: CCTVMode.ADD,
                    actions: 'updateSelectCCTV',
                    on: {
                        [CCTVMode.NONE]: {
                            target: CCTVMode.NONE,
                            actions: 'updateSelectCCTV',
                        },
                        [CCTVMode.MOVE]: {
                            target: CCTVMode.MOVE,
                            actions: 'updateSelectCCTV',
                        },
                        [CCTVMode.LOOKAT]: {
                            target: CCTVMode.LOOKAT,
                            actions: 'updateSelectCCTV',
                        }
                    }
                },
                [CCTVMode.MOVE]: {
                    target: CCTVMode.MOVE,
                    actions: 'updateSelectCCTV',
                    on: {
                        [CCTVMode.NONE]: {
                            target: CCTVMode.NONE,
                            actions: 'updateSelectCCTV',
                        },
                        [CCTVMode.ADD]: {
                            target: CCTVMode.ADD,
                            actions: 'updateSelectCCTV',
                        },
                        [CCTVMode.LOOKAT]: {
                            target: CCTVMode.LOOKAT,
                            actions: 'updateSelectCCTV',
                        }
                    }
                },
                [CCTVMode.LOOKAT]: {
                    target: CCTVMode.LOOKAT,
                    actions: 'updateSelectCCTV',
                    on: {
                        [CCTVMode.NONE]: {
                            target: CCTVMode.NONE,
                            actions: 'updateSelectCCTV',
                        },
                        [CCTVMode.ADD]: {
                            target: CCTVMode.ADD,
                            actions: 'updateSelectCCTV',
                        },
                        [CCTVMode.MOVE]: {
                            target: CCTVMode.MOVE,
                            actions: 'updateSelectCCTV',
                        }
                    }
                }
            },
            on: {
                [ViewerMode.PIPE]: {
                    target: ViewerMode.PIPE,
                    actions: 'clearSelectCCTV'
                }
            }
        },
        [ViewerMode.PIPE]: {
            initial: PIPE_MODE.NONE,
            on: {
                [ViewerMode.CCTV]: {
                    target: ViewerMode.CCTV,
                    actions: 'updateSelectCCTV'
                }
            },
            states: {
                [PIPE_MODE.NONE]: {
                    target: PIPE_MODE.NONE,
                    on: {
                        [PIPE_MODE.CREATE]: {
                            target: PIPE_MODE.CREATE
                        },
                        [PIPE_MODE.ADD]: {
                            target: PIPE_MODE.ADD
                        }
                    }
                },
                [PIPE_MODE.CREATE]: {
                    target: PIPE_MODE.CREATE,
                    on: {
                        [PIPE_MODE.NONE]: {
                            target: PIPE_MODE.NONE
                        },
                        [PIPE_MODE.ADD]: {
                            target: PIPE_MODE.ADD
                        }
                    }
                },
                [PIPE_MODE.ADD]: {
                    target: PIPE_MODE.ADD,
                    on: {
                        [PIPE_MODE.NONE]: {
                            target: PIPE_MODE.NONE
                        },
                        [PIPE_MODE.CREATE]: {
                            target: PIPE_MODE.CREATE
                        }
                    }
                }
            }
        }
    },
})
