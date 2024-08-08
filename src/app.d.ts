// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces

/// <reference types="vite-plugin-glsl/ext" />

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

declare module '@svgdotjs/svg.js' {
	interface Element {
		draggable(enable?: boolean): this
	}
}
