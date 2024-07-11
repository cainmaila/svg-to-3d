import { ShaderMaterial } from "three"
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

