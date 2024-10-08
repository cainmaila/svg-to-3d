import {
	AmbientLight,
	Color,
	DirectionalLight,
	HemisphereLight,
	LineBasicMaterial,
	Matrix4,
	MeshStandardMaterial,
	ShaderMaterial,
	Vector3,
	WebGLRenderTarget
} from 'three'
import vertexShader from './shaders/poj/vertexShader.frag'
// import fragmentShader from '$lib/threelib/shaders/poj/fragmentShader.frag'
import { createShader } from './shaders/poj/fragmentShader'
/**
 * 一種使場景深度的材料。
 */
export const depthMaterial = new ShaderMaterial({
	vertexShader: `
	    void main() {
	        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	    }
	`,
	fragmentShader: `
	    void main() {
	        gl_FragColor = vec4(gl_FragCoord.z, 0.0, 0.0, 1.0);
	    }
	`
})

export const lightShaderMaterial = new ShaderMaterial({
	uniforms: {
		lightPosition: { value: new Vector3(0, 0, 0) },
		lightDirection: { value: new Vector3(0, 0, -1) },
		lightFov: { value: (45 * Math.PI) / 180 },
		aspectRatio: { value: 1.0 },
		maxDistance: { value: 1000 },
		sceneDepthTexture: { value: null }
	},
	vertexShader: `
		varying vec2 vUv;
		varying vec3 vPosition;

		void main() {
			vUv = uv;
			vPosition = position;
			gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
		}
	`,
	fragmentShader: `
		uniform vec3 lightPosition;
		uniform vec3 lightDirection;
		uniform float lightFov;
		uniform float aspectRatio;
		uniform float maxDistance;
		uniform sampler2D sceneDepthTexture;

		varying vec2 vUv;
		varying vec3 vPosition;

		void main() {
			vec3 lightToFrag = vPosition - lightPosition;
			float distance = length(lightToFrag);

			// 檢查是否在最大距離內
			if (distance > maxDistance) {
				discard;
			}

			// 計算光線方向與片段方向的夾角
			float cosAngle = dot(normalize(lightToFrag), normalize(lightDirection));
			float angle = acos(cosAngle);

			// 檢查是否在FOV內
			if (angle > lightFov * 0.5) {
				discard;
			}

			// 檢查是否被遮擋
			vec4 projectedCoords = projectMatrix * viewMatrix * vec4(vPosition, 1.0);
			projectedCoords.xy /= projectedCoords.w;
			projectedCoords.xy = projectedCoords.xy * 0.5 + 0.5;

			float sceneDepth = texture2D(sceneDepthTexture, projectedCoords.xy).r;
			if (projectedCoords.z > sceneDepth + 0.001) {
				discard;
			}

			// 計算衰減
			float attenuation = 1.0 - distance / maxDistance;

			gl_FragColor = vec4(1.0, 1.0, 1.0, attenuation);
		}
	`,
	transparent: true
})

// 添加光源
const ambientLight = new AmbientLight(0xffffff)
const directionalLight = new DirectionalLight(0xffffff, 1.0)
directionalLight.position.set(1, 0, 1)
const hemisphereLight = new HemisphereLight(0xffffbb, 0x080820)
hemisphereLight.position.set(0, 500, 0)
/**
 * 生成投影材料
 * @param param0 - 參數
 * @param param0.cctvNum - 監視器數量
 * @param param0.color - 顏色
 * @param param0.shadowMaps - 陰影貼圖
 * @returns 投影材料
 */
export function generateProjectionMaterial({
	maxcctvnum,
	cctvNum,
	color,
	shadowMaps
}: {
	maxcctvnum: number
	cctvNum: number
	color: Color
	shadowMaps: WebGLRenderTarget[]
}) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const uniforms: any = {
		cctvPositions: {
			value: Array.from({ length: maxcctvnum }, () => new Vector3())
		},
		cctvDirections: {
			value: Array.from({ length: maxcctvnum }, () => new Vector3())
		},
		cctvFOVs: { value: Array.from({ length: maxcctvnum }, () => 0) },
		cctvAspects: { value: Array.from({ length: maxcctvnum }, () => 0) },
		cctvNears: { value: Array.from({ length: maxcctvnum }, () => 0) },
		cctvFars: { value: Array.from({ length: maxcctvnum }, () => 0) },
		cctvCount: { value: cctvNum },
		ambientLightColor: { value: ambientLight.color },
		directionalLightColor: { value: directionalLight.color },
		directionalLightDirection: { value: new Vector3() },
		hemisphereLightSkyColor: { value: hemisphereLight.color },
		hemisphereLightGroundColor: { value: hemisphereLight.groundColor },
		hemisphereLightPosition: { value: hemisphereLight.position },
		shadowMatrices: {
			value: Array.from({ length: maxcctvnum }, () => new Matrix4())
		},
		baseColor: { value: color }
	}
	for (let i = 0; i < maxcctvnum; i++) {
		uniforms[`shadowMaps${i + 1}`] = { value: shadowMaps[i]?.texture || null }
	}
	const shaderMaterial = new ShaderMaterial({
		uniforms,
		vertexShader,
		// fragmentShader
		fragmentShader: createShader(maxcctvnum)
	})
	directionalLight.getWorldDirection(shaderMaterial.uniforms.directionalLightDirection.value)
	return shaderMaterial
}

//反應陰影的材質
export const oupPutMaterial = new MeshStandardMaterial({
	color: 0xaaaaaa,
	roughness: 0.5,
	metalness: 0.5
})
export const oupPutBoxMaterial = new MeshStandardMaterial({
	color: 0x448844,
	roughness: 0.5,
	metalness: 0.5
})
export const oupFloorBoxMaterial = new MeshStandardMaterial({
	color: 0xcccccc,
	roughness: 0.5,
	metalness: 0.5
})

//線材質
export const lineMaterial = new LineBasicMaterial({
	color: 0x00ff00,
	depthWrite: true
})
