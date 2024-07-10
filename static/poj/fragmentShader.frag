uniform vec3 cctvPositions[1];
uniform vec3 cctvDirections[1];
uniform float cctvFOVs[1];
uniform float cctvAspects[1];
uniform float cctvNears[1];
uniform float cctvFars[1];
uniform int cctvCount;
uniform vec3 ambientLightColor;
uniform vec3 directionalLightColor;
uniform vec3 directionalLightDirection;
uniform vec3 hemisphereLightSkyColor;
uniform vec3 hemisphereLightGroundColor;
uniform sampler2D shadowMaps[1];
uniform mat4 shadowMatrices[1];

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
    float bias = 0.005;
    return currentDepth - bias > closestDepth;
}

void main() {
    if(!gl_FrontFacing) {
        discard;
    }

    bool inAnyView = false;
    int viewCount = 0;

    for(int i = 0; i < cctvCount; i++) {
        vec3 toFragment = vWorldPosition - cctvPositions[i];
        float distance = dot(toFragment, normalize(cctvDirections[i]));

        if(dot(vNormal, normalize(cctvDirections[i])) > 0.0) {
            continue;
        }

        if(isInCCTVView(cctvPositions[i], cctvDirections[i], cctvFOVs[i], cctvAspects[i], cctvNears[i], cctvFars[i])) {
            viewCount++;
            inAnyView = true;
        }
    }
    // 计算阴影
    // vec4 fragPosLightSpace = shadowMatrices[0] * vec4(vWorldPosition, 1.0);
    // bool shadow = getShadow(fragPosLightSpace, shadowMaps[0]);
    // for(int i = 0; i < cctvCount; i++) {
    //     shadow = getShadow(cctvPositions[i], shadowMaps[i]);
    // }

     // 环境光
    vec3 ambientColor = ambientLightColor;
     // 平行光
    float directionalIntensity = max(dot(vNormal, normalize(directionalLightDirection)), 0.0);
    vec3 directionalColor = directionalLightColor * directionalIntensity;
    // 半球光
    float hemiIntensity = 0.5 + 0.5 * dot(vNormal, vec3(0.0, 1.0, 0.0));
    vec3 hemiColor = mix(hemisphereLightGroundColor, hemisphereLightSkyColor, hemiIntensity);

     // 合并所有光照
    vec3 finalColor = ambientColor + directionalColor + hemiColor;
    if(viewCount == 2) {
        gl_FragColor = vec4(finalColor * vec3(1.0, 0.0, 0.0), 1.0); // 红色
    } else if(viewCount == 1) {
        // if(!shadow) {
        gl_FragColor = vec4(finalColor * vec3(1.0, 1.0, 0.0), 1.0); // 黄色
        // } else {
        //     gl_FragColor = vec4(finalColor * vec3(0.2, 0.2, 0.2), 1.0); // 默认颜
        // }
    } else {
        gl_FragColor = vec4(finalColor * vec3(0.2, 0.2, 0.2), 1.0); // 默认颜色
    }
}