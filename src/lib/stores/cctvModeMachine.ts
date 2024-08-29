import { CCTVMode, PIPE_MODE, ViewerMode } from '$lib/components/Viewer/viewerType'
import { setup, assign } from 'xstate'

type CCTVContext = {
    selectCCTV: string;
    selectPipe: string;
};

export const cctvModeMachine = setup({
    types: {
        context: {
        } as CCTVContext,
        events: {} as {
            type: ViewerMode | CCTVMode | PIPE_MODE | 'updateSelectCCTV' | 'clearSelectCCTV' | 'updateSelectPipe',
            selectCCTV?: string,
            selectPipe?: string
        },
    },
    actions: {
        //目前選擇的CCTV
        updateSelectCCTV: assign(({ context, event }) => ({
            selectCCTV: event.selectCCTV ?? context.selectCCTV
        })),
        clearSelectCCTV: assign(() => ({
            selectCCTV: ''
        })),
        updateSelectPipe: assign(({ context, event }) => ({
            selectPipe: event.selectPipe ?? context.selectPipe
        }))
    }
}).createMachine({
    id: 'cctvModeMachine',
    initial: ViewerMode.CCTV,  //cctv模式 add move lookat createLine addLine
    context: {
        selectCCTV: '',
        selectPipe: ''
    },
    on: {
        updateSelectCCTV: {
            actions: 'updateSelectCCTV'
        },
        clearSelectCCTV: {
            actions: 'clearSelectCCTV'
        },
        updateSelectPipe: {
            actions: 'updateSelectPipe'
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
            on: {
                [ViewerMode.PIPE]: {
                    target: ViewerMode.PIPE,
                    actions: 'clearSelectCCTV'
                }
            },
            states: {
                [CCTVMode.NONE]: {
                    target: CCTVMode.NONE,
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

        },
        [ViewerMode.PIPE]: {
            initial: PIPE_MODE.NONE,
            on: {
                [ViewerMode.CCTV]: {
                    target: ViewerMode.CCTV,
                    actions: ['updateSelectCCTV', {
                        type: 'updateSelectPipe',
                        params: {
                            selectPipe: ''
                        }
                    }],
                }
            },
            states: {
                [PIPE_MODE.NONE]: {
                    target: PIPE_MODE.NONE,
                    actions: 'updateSelectPipe',
                    on: {
                        [PIPE_MODE.CREATE]: {
                            target: PIPE_MODE.CREATE,
                            actions: {
                                type: 'updateSelectPipe',
                                params: {
                                    selectPipe: ''
                                }
                            },
                        },
                        [PIPE_MODE.ADD]: {
                            target: PIPE_MODE.ADD,
                            actions: 'updateSelectPipe',
                        }
                    }
                },
                [PIPE_MODE.CREATE]: {
                    target: PIPE_MODE.CREATE,
                    actions: {
                        type: 'updateSelectPipe',
                        params: {
                            selectPipe: ''
                        }
                    },
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
                    actions: 'updateSelectPipe',
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
