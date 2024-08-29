import { CCTVMode, PIPE_MODE, ViewerMode } from '$lib/components/Viewer/viewerType'
import { setup, assign } from 'xstate'

type CCTVContext = {
    selectCCTV: string;
    selectPipe: string;
    lineMap: Map<string, { x: number, y: number, z: number }[]>
};

export const cctvModeMachine = setup({
    types: {
        context: {
        } as CCTVContext,
        // events: {} as {
        //     type: ViewerMode | CCTVMode | PIPE_MODE | 'updateSelectCCTV' | 'clearSelectCCTV' | 'updateSelectPipe',
        //     selectCCTV?: string,
        //     selectPipe?: string,
        // },
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
        })),
        addPipe: assign(({ context, event }) => {
            if (!event.poName) return {}
            const { lineMap } = context
            lineMap.set(event.poName, event.points)
            return { lineMap }
        }),
        delPipe: assign(({ context, event }) => {
            if (!event.poName) return {}
            const { lineMap } = context
            lineMap.delete(event.poName)
            return { lineMap }
        }),
        // updatePipeMap: assign(({ context }) => ({
        //     selectPipe: context.selectPipe
        // }))
    }
}).createMachine({
    id: 'cctvModeMachine',
    initial: ViewerMode.CCTV,  //cctv模式 add move lookat createLine addLine
    context: {
        selectCCTV: '',
        selectPipe: '',
        lineMap: new Map()
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
        addPipe: {
            actions: 'addPipe'
        },
        delPipe: {
            actions: 'delPipe'
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
                    actions: ['clearSelectCCTV']
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
                    actions: ['updateSelectCCTV', assign({ selectPipe: '' })],
                },
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
                    actions: ['addPipe', {
                        type: 'updateSelectPipe',
                        params: {
                            selectPipe: ''
                        }
                    }],
                    on: {
                        [PIPE_MODE.NONE]: {
                            target: PIPE_MODE.NONE,
                            actions: ['addPipe', {
                                type: 'updateSelectPipe',
                                params: {
                                    selectPipe: ''
                                }
                            }],
                        },
                        [PIPE_MODE.ADD]: {
                            target: PIPE_MODE.ADD,
                            actions: 'addPipe',
                        }
                    }
                },
                [PIPE_MODE.ADD]: {
                    target: PIPE_MODE.ADD,
                    on: {
                        [PIPE_MODE.NONE]: {
                            target: PIPE_MODE.NONE,
                            actions: {
                                type: 'updateSelectPipe',
                                params: {
                                    selectPipe: ''
                                }
                            }
                        },
                        [PIPE_MODE.CREATE]: {
                            target: PIPE_MODE.CREATE,
                        }
                    }
                }
            }
        }
    },
})
