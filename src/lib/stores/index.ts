import { persisted } from 'svelte-persisted-store'

export const backgroundImg$ = persisted<{
    width: number,
    height: number,
    x: number,
    y: number,
    src: string
} | null>('backgroundImg', null)
export const svgString$ = persisted('svgString', '')
//比例尺 幾cm:每1px
export const scalceSize$ = persisted<number>('scalceSize', 1)