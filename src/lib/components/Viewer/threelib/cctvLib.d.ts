declare type T_CCTV_MAP = [
    name: string,
    {
        matrix: THREE.Matrix4
        focalLength?: number
    }
][]

declare type I_CCTV_SETTING = {
    focalLength: number
    sensorWidth: number
    sensorHeight: number
    near: number
    far: number
}
