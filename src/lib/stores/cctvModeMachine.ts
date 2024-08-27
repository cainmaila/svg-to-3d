import { CCTVMode, PIPE_MODE } from '$lib/components/Viewer/viewerType'
import { setup, assign, raise } from 'xstate'

type CCTVContext = {
    selectCCTV: string;
};

export const cctvModeMachine = setup({
    types: {
        context: {
        } as CCTVContext,
        events: {} as {
            type: CCTVMode | PIPE_MODE | 'updateSelectCCTV',
            selectCCTV?: string
        },
    },
    actions: {
        //目前選擇的CCTV
        updateSelectCCTV: assign(({ context, event }) => ({
            selectCCTV: event.selectCCTV ?? context.selectCCTV
        }))
    }
}).createMachine({
    id: 'cctvModeMachine',
    initial: CCTVMode.NONE,  //cctv模式 add move lookat createLine addLine
    context: {
        selectCCTV: ''
    },
    on: {
        updateSelectCCTV: {
            actions: 'updateSelectCCTV'
        },
        '*': {
            actions: (state) => {
                console.error('未定義的狀態', state)
            }
        }
    },
    states: {
        [CCTVMode.NONE]: {
            on: {
                [CCTVMode.NONE]: {
                    target: CCTVMode.NONE,
                    actions: 'updateSelectCCTV'
                },
                [CCTVMode.ADD]: {
                    target: CCTVMode.ADD,
                    actions: assign({
                        selectCCTV: ''
                    })
                },
                [CCTVMode.MOVE]: {
                    target: CCTVMode.MOVE
                },
                [CCTVMode.LOOKAT]: {
                    target: CCTVMode.LOOKAT
                },
                // [CCTVMode.PIPE_MODE]: {
                //     target: CCTVMode.PIPE_MODE,
                //     actions: 'updateSelectCCTV'
                // }
            }
        },
        [CCTVMode.ADD]: {
            on: {
                [CCTVMode.NONE]: {
                    target: CCTVMode.NONE,
                    actions: 'updateSelectCCTV'
                },
                [CCTVMode.LOOKAT]: {
                    target: CCTVMode.LOOKAT,
                    actions: 'updateSelectCCTV'
                },
                [CCTVMode.MOVE]: {
                    target: CCTVMode.MOVE
                },
                [CCTVMode.PIPE_MODE]: {
                    target: CCTVMode.PIPE_MODE,
                    actions: 'updateSelectCCTV'
                }
            }
        },
        [CCTVMode.MOVE]: {
            on: {
                [CCTVMode.NONE]: {
                    target: CCTVMode.NONE
                },
                [CCTVMode.LOOKAT]: {
                    target: CCTVMode.LOOKAT,
                },
                [CCTVMode.PIPE_MODE]: {
                    target: CCTVMode.PIPE_MODE,
                    actions: 'updateSelectCCTV'
                }
            }
        },
        [CCTVMode.LOOKAT]: {
            on: {
                [CCTVMode.NONE]: {
                    target: CCTVMode.NONE
                },
                [CCTVMode.ADD]: {
                    target: CCTVMode.ADD
                },
                [CCTVMode.MOVE]: {
                    target: CCTVMode.MOVE
                },
                [CCTVMode.PIPE_MODE]: {
                    target: CCTVMode.PIPE_MODE,
                    actions: 'updateSelectCCTV'
                }
            },
        },
        [CCTVMode.PIPE_MODE]: {
            initial: PIPE_MODE.CREATE,
            states: {
                [PIPE_MODE.CREATE]: {
                    on: {
                        [PIPE_MODE.ADD]: {
                            target: [PIPE_MODE.ADD],
                            actions: 'updateSelectCCTV'
                        },
                        [CCTVMode.NONE]: {
                            target: `#cctvModeMachine.${CCTVMode.NONE}`,
                            actions: 'updateSelectCCTV'
                        },
                    },
                },
                [PIPE_MODE.ADD]: {
                    on: {
                        [PIPE_MODE.CREATE]: {
                            target: [PIPE_MODE.CREATE],
                            actions: 'updateSelectCCTV'
                        },
                        [CCTVMode.NONE]: {
                            target: `#cctvModeMachine.${CCTVMode.NONE}`,
                            actions: 'updateSelectCCTV'
                        },
                    }
                },
            },

        },
    },
})
