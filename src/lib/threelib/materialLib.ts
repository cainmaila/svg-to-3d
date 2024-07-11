export class MeshDepthMaterial extends Material {
    constructor(parameters?: MeshDepthMaterialParameters);
    readonly isMeshDepthMaterial: true;
    type: string;
    map: Texture | null;
    alphaMap: Texture | null;
    depthPacking: DepthPackingStrategies;
    displacementMap: Texture | null;
    displacementScale: number;
    displacementBias: number;
    wireframe: boolean;
    wireframeLinewidth: number;
}