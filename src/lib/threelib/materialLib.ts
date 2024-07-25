import { ShaderMaterial, Vector3 } from "three"
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
		lightFov: { value: 45 * Math.PI / 180 },
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
});