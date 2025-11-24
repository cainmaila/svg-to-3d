# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a CCTV placement planning application that converts 2D SVG floor plans into interactive 3D scenes for planning CCTV camera positions. Users draw on 2D floor plans and visualize them in 3D with Three.js.

**Important**: This project may not be used for commercial purposes without permission.

## Build Commands

**Critical**: This project uses `pnpm`, not `npm`. Always use `pnpm` for all package management.

- **Development**: `pnpm dev`
- **Build**: `pnpm build`
- **Preview**: `pnpm preview`
- **Type checking**: `pnpm check` (or `pnpm check:watch` for watch mode)
- **Linting**: `pnpm lint`
- **Format code**: `pnpm format`

## Tech Stack

- **Framework**: SvelteKit (Svelte 5 with runes syntax)
- **3D Graphics**: Three.js with three-bvh-csg for CSG operations
- **2D Drawing**: SVG.js with draggable and panzoom plugins
- **UI**: Skeleton UI library with Tailwind CSS
- **State**: XState 5 with @xstate/svelte for complex state machines
- **Storage**: svelte-persisted-store for localStorage persistence
- **Deployment**: Vercel (adapter-vercel with Node.js 20.x runtime)
- **Shaders**: vite-plugin-glsl for GLSL shader imports

## Architecture

### Route Structure

- `/` - Main SVG editor page for drawing floor plans
- `/svgto3d` - 3D viewer for CCTV placement planning
- `/model` - Model management page (using Cesium)
- `/login` - Authentication page
- `/twport` - Additional port/map view

### Core Components

**SVG Editor** (`src/lib/components/SvgEditor/`)

- Main 2D drawing interface using SVG.js
- Handles drawing tools, scale setting, and floor plan manipulation
- Exports SVG data to stores for 3D conversion

**Viewer** (`src/lib/components/Viewer/`)

- Three.js-based 3D scene renderer
- Located at `src/lib/components/Viewer/Viewer.svelte`
- Supports multiple modes: CCTV placement, pipe visualization, and roof line drawing
- Three.js utilities in `src/lib/components/Viewer/threelib/`:
  - `threeSeneInit.ts` - Scene initialization
  - `cctvLib.ts` - CCTV camera helpers
  - `materialLib.ts` - Material definitions
  - Custom shaders in `shaders/` subdirectory

**Cesium Integration** (`src/cesium-core/`)

- Separate Cesium-based map viewer for advanced geospatial features
- Uses `CesiumCoreView.svelte` as main component
- Includes markers, models, primitives, heatmaps, and time-based controls
- Comprehensive tutorials in `src/cesium-core/tutorial/`

### State Management

**Stores** (`src/lib/stores/`)

- `appState.svelte.ts` - Global app mode and state (uses Svelte 5 runes)
- `modelsStore.svelte.ts` - 3D model data with localStorage persistence
- `markersStore.svelte.ts` - Marker data with localStorage persistence
- `cameraState.svelte.ts` - Camera position and settings
- `notificationStore.svelte.ts` - Toast notifications

All stores use Svelte 5's `$state` runes and follow the pattern of creating factory functions (`createModelsStore`, `createMarkersStore`).

### Data Flow

1. User draws on SVG canvas in main route (`/`)
2. SVG string stored in `svgString$` store
3. Scale measurements stored in `scalceSize$` store
4. Navigate to `/svgto3d` to render 3D scene
5. CCTV positions persisted to localStorage as JSON
6. Models and markers managed through dedicated stores with CRUD operations

## Code Style Notes

- **Svelte 5 Syntax**: Uses runes (`$state`, `$derived`, `$effect`) instead of legacy reactive declarations
- **TypeScript**: Strict mode enabled with null checks
- **Component Props**: Use `interface Props` with `let { prop }: Props = $props()` pattern
- **Event Handling**: Modern Svelte 5 callback props pattern, not legacy `on:` directives
- **CSS**: PostCSS with Tailwind, nested selectors allowed
- **Formatting**: Prettier with Svelte and Tailwind plugins

## Key Files

- `svelte.config.js` - SvelteKit config with Vercel adapter and Svelte Inspector enabled
- `vite.config.ts` - Vite config with GLSL plugin for shader imports
- `tsconfig.json` - Strict TypeScript configuration
- `.env` - Environment variables (gitignored)

## Development Notes

- Svelte Inspector is enabled for debugging (click to jump to component source)
- The project uses Firebase 12 for authentication/storage
- CCTV settings are stored in localStorage under the key `'cctvs'`
- Models and markers each have their own localStorage keys defined in `STORAGE_KEY` constants
- The codebase includes extensive validation utilities in `src/lib/validation/`
