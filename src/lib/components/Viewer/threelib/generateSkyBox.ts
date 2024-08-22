import { BackSide, Color, Mesh, ShaderMaterial, SphereGeometry } from 'three'

/**
 * 生成天空盒
 * @param param0 選項
 * @param param0.topColor 天空的淺藍色
 * @param param0.bottomColor 低處的白色
 * @returns
 */
export default function generateSkyBox(
	{
		topColor,
		bottomColor
	}: {
		topColor: number
		bottomColor: number
	} = {
		topColor: 0x87ceeb,
		bottomColor: 0x000000
	}
) {
	// 頂點着色器
	const vertexShader = `
        varying vec3 vWorldPosition;
        void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
        `
	// 片段着色器
	const fragmentShader = `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
        float h = normalize(vWorldPosition + offset).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
`
	// 自定義材質
	const uniforms = {
		topColor: { value: new Color(topColor) }, // 天空的淺藍色
		bottomColor: { value: new Color(bottomColor) }, // 低處的白色
		offset: { value: 33 },
		exponent: { value: 0.6 }
	}
	const skyMaterial = new ShaderMaterial({
		vertexShader: vertexShader,
		fragmentShader: fragmentShader,
		uniforms: uniforms,
		side: BackSide
	})
	// 创建天空盒几何体
	const skyGeometry = new SphereGeometry(100000, 32, 15)
	// 创建天空盒
	return new Mesh(skyGeometry, skyMaterial)
}
