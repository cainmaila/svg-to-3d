import { CCTVMode } from '$lib/components/Viewer/viewerType'
import { setup, assign } from 'xstate'

type CCTVContext = {
    selectCCTV: string;
};
export const cctvModeMachine = setup({
    types: {
        context: {
        } as CCTVContext,
        events: {} as {
            type: CCTVMode | 'updateSelectCCTV',
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
                [CCTVMode.CREATELINE]: {
                    target: CCTVMode.CREATELINE
                },
                [CCTVMode.ADDLINE]: {
                    target: CCTVMode.ADDLINE
                },
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
                [CCTVMode.CREATELINE]: {
                    target: CCTVMode.CREATELINE
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
                [CCTVMode.CREATELINE]: {
                    target: CCTVMode.CREATELINE
                },
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
                [CCTVMode.CREATELINE]: {
                    target: CCTVMode.CREATELINE
                }
            }
        },
        [CCTVMode.CREATELINE]: {
            on: {
                [CCTVMode.NONE]: {
                    target: CCTVMode.NONE
                }, [CCTVMode.ADD]: {
                    target: CCTVMode.ADD
                },
                [CCTVMode.MOVE]: {
                    target: CCTVMode.MOVE
                },
                [CCTVMode.LOOKAT]: {
                    target: CCTVMode.LOOKAT
                },
                [CCTVMode.ADDLINE]: {
                    target: CCTVMode.ADDLINE
                }
            }
        },
        [CCTVMode.ADDLINE]: {
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
                [CCTVMode.LOOKAT]: {
                    target: CCTVMode.LOOKAT
                },
                [CCTVMode.CREATELINE]: {
                    target: CCTVMode.CREATELINE
                },
                [CCTVMode.ADDLINE]: {
                    target: CCTVMode.ADDLINE
                }
            }
        }
    }
})
