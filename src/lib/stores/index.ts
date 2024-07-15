import { persisted } from 'svelte-persisted-store'
import { writable } from 'svelte/store'

export const backgroundImg$ = persisted<{
    width: number,
    height: number,
    x: number,
    y: number,
    src: string
} | null>('backgroundImg', null)
export const svgString$ = persisted('svgString', '')
export const vertexShader$ = writable('')
export const fragmentShader$ = writable('')

//比例尺
export const scalceSize$ = persisted<number>('scalceSize', 1)