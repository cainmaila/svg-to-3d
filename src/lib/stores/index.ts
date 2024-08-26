import type { User } from 'firebase/auth'
import { persisted } from 'svelte-persisted-store'
import { writable } from 'svelte/store'

export const user$ = writable<User>()

export const backgroundImg$ = persisted<{
	width: number
	height: number
	x: number
	y: number
	src: string
} | null>('backgroundImg', null)
export const svgString$ = persisted('svgString', '')
//比例尺 幾cm:每1px
export const scalceSize$ = persisted<number>('scalceSize', 1)
