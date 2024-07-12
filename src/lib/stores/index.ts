import { persisted } from 'svelte-persisted-store'
import { writable } from 'svelte/store'

export const backgroundImg$ = persisted('backgroundImg', '/back3.png')
export const svgString$ = persisted('svgString', '')
export const vertexShader$ = writable('')
export const fragmentShader$ = writable('')