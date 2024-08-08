import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'
import { purgeCss } from 'vite-plugin-tailwind-purgecss'
import glsl from 'vite-plugin-glsl'

export default defineConfig({
	plugins: [sveltekit(), purgeCss(), glsl()],
})
