import { svgString$ } from "$lib/stores"
import { get } from "svelte/store"



export async function load() {
    const svgString = get(svgString$)
    const data = { svgString }
    return data;
}
