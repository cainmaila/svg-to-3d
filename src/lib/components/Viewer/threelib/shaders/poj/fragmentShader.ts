/* 動態生成Shader */

export function createShader(num: number = 4) {
    return `
    precision highp float;
uniform vec3 cctvPositions[${num}];
uniform vec3 cctvDirections[${num}];
uniform float cctvFOVs[${num}];
uniform float cctvAspects[${num}];
uniform float cctvNears[${num}];
uniform float cctvFars[${num}];
uniform int cctvCount;
uniform vec3 ambientLightColor;
uniform vec3 directionalLightColor;
uniform vec3 directionalLightDirection;
uniform vec3 hemisphereLightSkyColor;
uniform vec3 hemisphereLightGroundColor;
uniform vec3 hemisphereLightPosition;
${Array.from({ length: num }).map((_, i) => `uniform sampler2D shadowMaps${i + 1};`).join('\n')}
uniform mat4 shadowMatrices[${num}];
uniform vec3 baseColor;

varying vec3 vWorldPosition;
varying vec3 vNormal;

bool isInCCTVView(vec3 cctvPosition, vec3 cctvDirection, float cctvFOV, float cctvAspect, float cctvNear, float cctvFar) {
    vec3 toFragment = vWorldPosition - cctvPosition;
    float distance = dot(toFragment, normalize(cctvDirection));
    if(distance < cctvNear || distance > cctvFar) {
        return false;
    }
    vec3 projection = cctvPosition + normalize(cctvDirection) * distance;
    vec3 toProjection = vWorldPosition - projection;
    float halfHeight = tan(radians(cctvFOV) * 0.5) * distance;
    float halfWidth = halfHeight * cctvAspect;
    vec3 cctvRight = normalize(cross(cctvDirection, vec3(0.0, 1.0, 0.0)));
    vec3 cctvUp = normalize(cross(cctvRight, cctvDirection));
    float x = dot(toProjection, cctvRight);
    float y = dot(toProjection, cctvUp);
    return (abs(x) <= halfWidth && abs(y) <= halfHeight);
}
bool getShadow(vec4 fragPosLightSpace, sampler2D shadowMap) {
  // 执行透视除法
    vec3 projCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;
  // 将值转换到 [0,1] 范围
    projCoords = projCoords * 0.5 + 0.5;
  // 获取最近的深度值
    float closestDepth = texture2D(shadowMap, projCoords.xy).r;
  // 获取当前片段的深度
    float currentDepth = projCoords.z;

  // 检查当前片段是否在阴影中
    float bias = 0.00001;
    return currentDepth - bias > closestDepth;
}

void main() {
    if(!gl_FrontFacing) {
        discard;
    }
    bool inAnyView = false;
    int viewCount = 0;

    for(int i = 0; i < cctvCount; i++) {
        vec3 toCCTV = normalize(cctvPositions[i] - vWorldPosition);
        if(dot(vNormal, toCCTV) < 0.0) { // 面背向CCTV
            // viewCount = 2;
            continue;
        }

        if(isInCCTVView(cctvPositions[i], cctvDirections[i], cctvFOVs[i], cctvAspects[i], cctvNears[i], cctvFars[i])) {
             // 计算阴影
            vec4 fragPosLightSpace = shadowMatrices[i] * vec4(vWorldPosition, 1.0);
            bool shadow;
            switch(i) {  //sampler2D 不支持数组索引，所以只能写死 QQ
                ${Array.from({ length: num }).map((_, i) => `case ${i}:
                    shadow = getShadow(fragPosLightSpace, shadowMaps${i + 1});
                    break;`).join('\n')}
            }
            if(shadow)
                continue;
            viewCount++;
            inAnyView = true;
        }
    }

     // 环境光
    vec3 ambientColor = ambientLightColor;
     // 平行光
    float directionalIntensity = max(dot(vNormal, normalize(directionalLightDirection)), 0.0);
    vec3 directionalColor = directionalLightColor * directionalIntensity;
    //計算半球光的影響
    vec3 hemiColor = mix(hemisphereLightGroundColor, hemisphereLightSkyColor, dot(vNormal, normalize(hemisphereLightPosition - vWorldPosition)));

    //合併半球光以外的光照
    vec3 lite = ambientColor + directionalColor + hemiColor * .05;
     // 合并所有光照
    vec3 finalColor = ambientColor + directionalColor + hemiColor;
    if(viewCount >= 2) {
        gl_FragColor = vec4(lite * vec3(0.5, 0.0, 0.0), 1.0); // 红色
    } else if(viewCount == 1) {
        gl_FragColor = vec4(lite * vec3(0.5, 0.5, 0.0), 1.0); // 黄色
    } else {
        // gl_FragColor = vec4(finalColor * vec3(0.2, 0.2, 0.2), 1.0); // 默认颜色
        gl_FragColor = vec4(finalColor * baseColor, 1.0); // 默认颜色
    }
}
    `
}