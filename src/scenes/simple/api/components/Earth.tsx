import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';

// 共享的 1x1 纹理占位，避免 WebGL 报错（无图像数据）
const SOLID = (() => {
  const make = (r: number, g: number, b: number, linear = false) => {
    const data = new Uint8Array([r, g, b, 255]);
    const tex = new THREE.DataTexture(data, 1, 1);
    tex.colorSpace = linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  };
  return {
    white: make(255, 255, 255),
    black: make(0, 0, 0),
    neutralNormal: make(128, 128, 255, true), // 线性空间
    zeroLinear: make(0, 0, 0, true),
  } as const;
})();

// 地球组件 - 完整移植earthDNMaterial着色器，移除分层渲染
export function Earth({ 
  position, 
  size, 
  lightDirection, 
  tiltDeg, 
  yawDeg,
  segments = 144,
  useTextures,
  lightColor,
  sunIntensity,
  terminatorSoftness,
  nightIntensity,
  shininess,
  specStrength,
  broadStrength,
  specFresnelK = 1.8,
  // 法线贴图控制
  useNormalMap = true,
  normalMapStrength = 0.8,
  normalFlipY = true,
  normalFlipX = false,
  // 高度置换控制（相对地球半径比例）
  displacementScaleRel = 0.0,
  displacementMid = 0.5,
  displacementContrast = 1.0,
  // 新增：地球材质色温和亮度控制
  earthLightTempK = 5600,
  earthLightIntensity = 1.0,
  nightFalloff = 1.6,
  dayAmbient = 0.02,
  dayDiffuseMax = 1.0,
  dayDiffuseGamma = 1.0,
  terminatorLift = 0.01,
  terminatorTint = [1.0, 0.85, 0.75, 0.1],
  nightEarthMapIntensity = 0.3,
  nightEarthMapHue = 200,
  nightEarthMapSaturation = 1.0,
  nightEarthMapLightness = 1.0,
  nightHemisphereBrightness = 1.0,
  dayEarthMapHue = 200,
  dayEarthMapSaturation = 0.30,
  dayEarthMapLightness = 0.30,
  nightGlowBlur = 0.015,
  nightGlowOpacity = 0.60,
  // 大气弧光参数
  rimStrength = 1.46,
  rimWidth = 0.50,
  rimHeight = 0.01,
  rimRadius = 0.005,
  haloWidth = 0.01,
  // 阴影与云影
  receiveShadows = false,
  cloudShadowMap,
  cloudShadowStrength = 0.4,
  enableCloudShadow = false,
  cloudUvOffset = new THREE.Vector2(0, 0),
  // DEM地形参数
  demNormalStrength = 3.0,
  demNormalWeight = 0.05,
  // Debug参数
  debugMode = 0,
  // 地形阴影(AO)参数
  aoHeightThreshold = 0.02,
  aoDistanceAttenuation = 2.0,
  aoMaxOcclusion = 0.3,
  aoSmoothFactor = 0.5,
  // 地形投影(方向性)参数
  enableDirectionalShadow = true,
  directionalShadowStrength = 1.0,
  directionalShadowSoftness = 0.5,
  directionalShadowSharpness = 2.0,
  directionalShadowContrast = 1.5,
  // 纹理参数 - 从父组件传入
  earthMap,
  earthNight,
  earthNormal,
  earthSpecular,
  earthDisplacement,
}: {
  position: [number, number, number];
  size: number;
  lightDirection: THREE.Vector3;
  tiltDeg: number;
  yawDeg: number;
  segments?: number;
  useTextures: boolean;
  lightColor: THREE.Color;
  sunIntensity: number;
  terminatorSoftness: number;
  nightIntensity: number;
  shininess: number;
  specStrength: number;
  broadStrength: number;
  specFresnelK?: number;
  // 法线贴图控制
  useNormalMap?: boolean;
  normalMapStrength?: number;
  normalFlipY?: boolean;
  normalFlipX?: boolean;
  // 高度置换控制
  displacementScaleRel?: number;
  displacementMid?: number;
  displacementContrast?: number;
  // 新增：地球材质色温和亮度控制
  earthLightTempK?: number;
  earthLightIntensity?: number;
  nightFalloff?: number;
  dayAmbient?: number;
  dayDiffuseMax?: number;
  dayDiffuseGamma?: number;
  terminatorLift?: number;
  terminatorTint?: [number, number, number, number];
  nightEarthMapIntensity?: number;
  nightEarthMapHue?: number;
  nightEarthMapSaturation?: number;
  nightEarthMapLightness?: number;
  nightHemisphereBrightness?: number;
  dayEarthMapHue?: number;
  dayEarthMapSaturation?: number;
  dayEarthMapLightness?: number;
  nightGlowBlur?: number;
  nightGlowOpacity?: number;
  // 大气弧光参数
  rimStrength?: number;
  rimWidth?: number;
  rimHeight?: number;
  rimRadius?: number;
  haloWidth?: number;
  // 阴影与云影
  receiveShadows?: boolean;
  cloudShadowMap?: THREE.Texture | null | undefined;
  cloudShadowStrength?: number;
  enableCloudShadow?: boolean;
  cloudUvOffset?: THREE.Vector2;
  // DEM地形参数
  demNormalStrength?: number;
  demNormalWeight?: number;
  // Debug参数
  debugMode?: number;
  // 地形投影(AO)参数
  aoHeightThreshold?: number;
  aoDistanceAttenuation?: number;
  aoMaxOcclusion?: number;
  aoSmoothFactor?: number;
  // 地形投影(方向性)参数
  enableDirectionalShadow?: boolean;
  directionalShadowStrength?: number;
  directionalShadowSoftness?: number;
  directionalShadowSharpness?: number;
  directionalShadowContrast?: number;
  // 纹理参数
  earthMap?: THREE.Texture;
  earthNight?: THREE.Texture;
  earthNormal?: THREE.Texture;
  earthSpecular?: THREE.Texture;
  earthDisplacement?: THREE.Texture;
}) {
  // 纹理从父组件传入，不再在这里加载

  // Earth Day/Night 混合着色器 - 完整移植自原Scene.tsx
  const earthDNMaterial = useMemo(() => {
    if (!earthMap) return null;
    
    const hasNight = !!earthNight;
    const hasSpec = !!earthSpecular;
    // 法线贴图需在线性空间
    if (earthNormal) {
      try { (earthNormal as any).colorSpace = THREE.NoColorSpace; (earthNormal as any).needsUpdate = true; } catch {}
    }
    const hasNormal = false; // 禁用传统法线贴图，只使用DEM
    const hasDisp = !!earthDisplacement && (displacementScaleRel ?? 0) !== 0;
    if (earthDisplacement) {
      try { (earthDisplacement as any).colorSpace = THREE.NoColorSpace; (earthDisplacement as any).needsUpdate = true; } catch {}
    }
    
    const material = new THREE.ShaderMaterial({
      lights: true,
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib[ 'lights' ],
        {
        dayMap: { value: earthMap ?? SOLID.white },
        nightMap: { value: earthNight ?? SOLID.black },
        specMap: { value: earthSpecular ?? SOLID.black },
        normalMap: { value: hasNormal ? earthNormal : SOLID.neutralNormal },
        displacementMap: { value: hasDisp ? earthDisplacement : SOLID.zeroLinear },
        lightDir: { value: lightDirection.clone() },
        lightColor: { value: lightColor.clone() },
        sunI: { value: sunIntensity },
        dayDiffuseMax: { value: dayDiffuseMax },
        dayDiffuseGamma: { value: dayDiffuseGamma },
        ambient: { value: dayAmbient },
        nightBoost: { value: nightIntensity },
        edge: { value: terminatorSoftness },
        lift: { value: terminatorLift },
        terminatorTint: { value: new THREE.Vector4(...terminatorTint) },
        nightEarthMapIntensity: { value: nightEarthMapIntensity },
        nightEarthMapHue: { value: nightEarthMapHue },
        nightEarthMapSaturation: { value: nightEarthMapSaturation },
        nightEarthMapLightness: { value: nightEarthMapLightness },
        nightHemisphereBrightness: { value: nightHemisphereBrightness },
        nightGlowBlur: { value: nightGlowBlur },
        nightGlowOpacity: { value: nightGlowOpacity },
        hasNight: { value: hasNight ? 1 : 0 },
        hasSpec: { value: hasSpec ? 1 : 0 },
        hasNormal: { value: hasNormal ? 1 : 0 },
        hasDisp: { value: hasDisp ? 1 : 0 },
        specStrength: { value: specStrength },
        shininess: { value: shininess },
        broadStrength: { value: broadStrength },
        broadShiny: { value: 24.0 }, // 固定值
        specFresnelK: { value: specFresnelK },
        nightGamma: { value: 1.1 }, // 固定值
        nightFalloff: { value: nightFalloff },
        normalStrength: { value: normalMapStrength ?? 0.8 },
        normalFlip: { value: new THREE.Vector2(normalFlipX ? -1 : 1, normalFlipY ? -1 : 1) },
        dispScale: { value: (displacementScaleRel ?? 0) * size },
        dispMid: { value: displacementMid ?? 0.5 },
        dispContrast: { value: displacementContrast ?? 1.0 },
        earthRadius: { value: size },
        // 大气弧光参数
        rimStrength: { value: rimStrength },
        rimWidth: { value: rimWidth },
        rimHeight: { value: rimHeight },
        rimRadius: { value: rimRadius },
        haloWidth: { value: haloWidth },
        // 阴影与云影
        enableShadow: { value: receiveShadows ? 1 : 0 },
        cloudShadowMap: { value: cloudShadowMap ?? SOLID.white },
        cloudShadowStrength: { value: cloudShadowStrength ?? 0.4 },
        enableCloudShadow: { value: enableCloudShadow ? 1 : 0 },
        // cloudUvOffset: { value: cloudUvOffset ?? new THREE.Vector2(0, 0) }, // 不再使用UV偏移方式
        // DEM地形参数 - 只要有高度贴图就启用DEM法线计算
        enableDEMNormal: { value: earthDisplacement ? 1 : 0 },
        demNormalStrength: { value: demNormalStrength },
        demNormalWeight: { value: demNormalWeight },
        enableSelfShadow: { value: (earthDisplacement && receiveShadows) ? 1 : 0 },
        // Debug参数
        debugMode: { value: debugMode },
        // 地形阴影(AO)参数
        aoHeightThreshold: { value: aoHeightThreshold },
        aoDistanceAttenuation: { value: aoDistanceAttenuation },
        aoMaxOcclusion: { value: aoMaxOcclusion },
        aoSmoothFactor: { value: aoSmoothFactor },
        // 地形投影(方向性)参数
        enableDirectionalShadow: { value: enableDirectionalShadow ? 1 : 0 },
        directionalShadowStrength: { value: directionalShadowStrength },
        directionalShadowSoftness: { value: directionalShadowSoftness },
        directionalShadowSharpness: { value: directionalShadowSharpness },
        directionalShadowContrast: { value: directionalShadowContrast },
        }
      ]),
      vertexShader: `
        #include <common>
        varying vec2 vUv; 
        varying vec3 vNormalW; 
        varying vec3 vViewW;
        varying vec3 vWorldPos;
        varying vec3 vViewPosition; // required by lights system
        uniform sampler2D displacementMap;
        uniform int hasDisp;
        uniform float dispScale;
        uniform float dispMid;
        uniform float dispContrast;
        
        void main(){
          vUv = uv;
          vec3 pos = position;
          vec3 nObj = normal;
          float h = 0.5; // 默认高度值
          if (hasDisp == 1 && dispScale != 0.0) {
            h = texture2D(displacementMap, vUv).r;
            // 更保守的高度调整：减少对比度的影响
            float adjustedH = h;
            if (dispContrast != 1.0) {
              // 使用更平滑的曲线，避免极值
              float contrastFactor = min(dispContrast, 3.0); // 限制最大对比度
              adjustedH = clamp((h - dispMid) * contrastFactor + dispMid, 0.0, 1.0);
              // 添加平滑过渡，避免硬边界
              adjustedH = smoothstep(0.0, 1.0, adjustedH);
            }
            // 使用调整后的高度计算位移，但减去中点避免整体偏移
            float d = (adjustedH - 0.5) * dispScale;
            pos += nObj * d;
          }
          vNormalW = normalize(mat3(modelMatrix) * nObj);
          // 手动展开 worldpos/shadowmap 链路，避免 include 带来的重定义问题
          vec3 transformed = pos;
          vec3 transformedNormal = normalize( normalMatrix * nObj );
          vec4 worldPosition = modelMatrix * vec4( transformed, 1.0 );
          vWorldPos = worldPosition.xyz;
          vViewW = normalize(cameraPosition - vWorldPos);
          vec4 mvPosition = viewMatrix * worldPosition;
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        #include <common>
        #include <lights_pars_begin>
        
        // DEM法线计算 - Sobel边缘检测
        vec3 calculateDEMNormal(vec2 uv, sampler2D heightMap, float strength) {
          vec2 texelSize = vec2(1.0 / 8192.0, 1.0 / 4096.0); // 假设8K贴图
          
          // Sobel算子
          float h00 = texture2D(heightMap, uv + texelSize * vec2(-1.0, -1.0)).r;
          float h10 = texture2D(heightMap, uv + texelSize * vec2( 0.0, -1.0)).r;
          float h20 = texture2D(heightMap, uv + texelSize * vec2( 1.0, -1.0)).r;
          float h01 = texture2D(heightMap, uv + texelSize * vec2(-1.0,  0.0)).r;
          float h21 = texture2D(heightMap, uv + texelSize * vec2( 1.0,  0.0)).r;
          float h02 = texture2D(heightMap, uv + texelSize * vec2(-1.0,  1.0)).r;
          float h12 = texture2D(heightMap, uv + texelSize * vec2( 0.0,  1.0)).r;
          float h22 = texture2D(heightMap, uv + texelSize * vec2( 1.0,  1.0)).r;
          
          // 计算梯度
          float dx = (h20 - h00) + 2.0 * (h21 - h01) + (h22 - h02);
          float dy = (h02 - h00) + 2.0 * (h12 - h10) + (h22 - h20);
          
          // 降低梯度对比度，避免过度敏感
          dx = sign(dx) * pow(abs(dx), 1.2); // 降低幂次，减少对比度
          dy = sign(dy) * pow(abs(dy), 1.2);
          
          // 转换为法线 (Y-up坐标系)，降低强度
          vec3 normal = normalize(vec3(-dx * strength * 0.5, 1.0, -dy * strength * 0.5)); // 降低强度系数
          return normal;
        }
        
        // 地形阴影(AO)计算 - 环境光遮蔽，基于高度差
        float calculateAO(vec2 uv, sampler2D heightMap, int steps, float stepDistance, float heightThreshold, float distanceAttenuation, float maxOcclusion, float smoothFactor) {
          if (steps <= 0) return 1.0;
          
          // 使用8个方向进行采样，计算平均高度差
          vec2 directions[8];
          directions[0] = vec2(1.0, 0.0);
          directions[1] = vec2(0.7071, 0.7071);
          directions[2] = vec2(0.0, 1.0);
          directions[3] = vec2(-0.7071, 0.7071);
          directions[4] = vec2(-1.0, 0.0);
          directions[5] = vec2(-0.7071, -0.7071);
          directions[6] = vec2(0.0, -1.0);
          directions[7] = vec2(0.7071, -0.7071);
          
          float currentHeight = texture2D(heightMap, uv).r;
          float totalOcclusion = 0.0;
          float validSamples = 0.0;
          
          // 对每个方向计算AO
          for (int dir = 0; dir < 8; dir++) {
            float dirOcclusion = 0.0;
            float maxHeightDiff = 0.0;
            
            for (int i = 1; i <= steps; i++) {
              if (i > steps) break;
              
              vec2 sampleUV = uv + directions[dir] * stepDistance * float(i);
              float sampleHeight = texture2D(heightMap, sampleUV).r;
              
              // 计算高度差
              float heightDiff = sampleHeight - currentHeight;
              maxHeightDiff = max(maxHeightDiff, heightDiff);
              
              if (heightDiff > heightThreshold) {
                // 距离衰减 - 使用更强的衰减
                float distanceFactor = pow(1.0 - (float(i) / float(steps)), distanceAttenuation);
                // 遮挡强度 - 增强效果
                float occlusion = clamp(heightDiff * distanceFactor * maxOcclusion * 8.0, 0.0, maxOcclusion);
                
                // 平滑处理 - 更锐利的过渡
                occlusion *= smoothstep(heightThreshold, heightThreshold * 1.5, heightDiff);
                
                dirOcclusion += occlusion;
              }
            }
            
            // 如果该方向有明显的地势升高，增加额外的遮挡
            if (maxHeightDiff > heightThreshold * 2.0) {
              dirOcclusion += maxHeightDiff * maxOcclusion * 2.0;
            }
            
            totalOcclusion += dirOcclusion;
            validSamples += 1.0;
          }
          
          // 计算平均AO并应用平滑因子
          float avgOcclusion = totalOcclusion / max(validSamples, 1.0);
          float ao = 1.0 - smoothstep(0.0, smoothFactor, avgOcclusion);
          return max(ao, 0.15); // 确保最小亮度
        }
        
        // 地形投影(方向性)计算 - 基于光照方向
        float calculateDirectionalShadow(vec2 uv, vec3 lightDir, vec3 normal, sampler2D heightMap, int steps, float stepDistance, float softness, float sharpness, float contrast) {
          if (steps <= 0) return 1.0;
          
          float currentHeight = texture2D(heightMap, uv).r;
          float shadow = 1.0;
          float maxBlockage = 0.0;
          
          // 计算光照在UV空间的投影方向
          // 考虑光照的仰角，投影会更长
          float lightElevation = asin(lightDir.y); // 光照仰角
          float projectionLength = 1.0 / max(abs(cos(lightElevation)), 0.1); // 投影长度修正
          vec2 lightDirUV = normalize(lightDir.xz) * stepDistance * projectionLength;
          
          // 沿光照方向采样，检查是否有遮挡
          for (int i = 1; i <= steps; i++) {
            if (i > steps) break;
            
            vec2 sampleUV = uv + lightDirUV * float(i);
            float sampleHeight = texture2D(heightMap, sampleUV).r;
            
            // 计算光线在采样点应该达到的高度（考虑光照角度）
            float rayHeight = currentHeight + float(i) * stepDistance * tan(lightElevation) * 2.0;
            
            // 如果地形高于光线高度，产生阴影
            if (sampleHeight > rayHeight) {
              float heightDiff = sampleHeight - rayHeight;
              float distanceFactor = 1.0 - (float(i) / float(steps)); // 距离衰减
              
              // 使用锐利度参数增强边缘对比
              float edgeSharpness = pow(heightDiff, sharpness);
              float blockage = edgeSharpness * distanceFactor * softness * 15.0; // 增强阴影强度
              
              maxBlockage = max(maxBlockage, blockage);
            }
          }
          
          // 应用法线方向权重 - 背光面阴影更强
          float normalFactor = max(0.0, dot(normal, lightDir));
          float shadowFactor = 1.0 - smoothstep(0.0, 1.0, normalFactor); // 背光面更暗
          
          // 应用对比度参数
          shadow = 1.0 - clamp(maxBlockage * shadowFactor, 0.0, 0.8); // 限制最大阴影强度
          shadow = pow(shadow, 1.0 / contrast); // 应用对比度：值越小对比度越强
          
          return max(shadow, 0.15); // 确保最小亮度
        }
        
        uniform sampler2D dayMap; 
        uniform sampler2D nightMap; 
        uniform sampler2D specMap; 
        uniform sampler2D normalMap;
        uniform sampler2D displacementMap;
        uniform int hasDisp;
        uniform float dispScale;
        uniform float dispMid;
        uniform float dispContrast;
        uniform int enableShadow;
        uniform sampler2D cloudShadowMap;
        uniform float cloudShadowStrength;
        uniform int enableCloudShadow;
        // uniform vec2 cloudUvOffset; // 不再使用UV偏移方式
        // DEM地形参数
        uniform int enableDEMNormal;
        uniform float demNormalStrength;
        uniform float demNormalWeight;
        uniform int enableSelfShadow;
        uniform int debugMode;
        // 地形阴影(AO)参数
        uniform float aoHeightThreshold;
        uniform float aoDistanceAttenuation;
        uniform float aoMaxOcclusion;
        uniform float aoSmoothFactor;
        // 地形投影(方向性)参数
        uniform int enableDirectionalShadow;
        uniform float directionalShadowStrength;
        uniform float directionalShadowSoftness;
        uniform float directionalShadowSharpness;
        uniform float directionalShadowContrast;
        uniform vec3 lightDir; 
        uniform vec3 lightColor; 
        uniform float sunI;
        uniform float dayDiffuseMax;
        uniform float dayDiffuseGamma;
        uniform float ambient; 
        uniform float nightBoost; 
        uniform float edge; 
        uniform float lift; 
        uniform vec4 terminatorTint;
        uniform float nightEarthMapIntensity;
        uniform float nightEarthMapHue;
        uniform float nightEarthMapSaturation;
        uniform float nightEarthMapLightness;
        uniform float nightHemisphereBrightness;
        uniform float nightGlowBlur;
        uniform float nightGlowOpacity;
        uniform float nightFalloff; 
        uniform int hasNight;
        
        // HSL to RGB conversion
        vec3 hslToRgb(float h, float s, float l) {
          h = h / 360.0;
          float c = (1.0 - abs(2.0 * l - 1.0)) * s;
          float x = c * (1.0 - abs(mod(h * 6.0, 2.0) - 1.0));
          float m = l - c / 2.0;
          vec3 rgb;
          if (h < 1.0/6.0) rgb = vec3(c, x, 0.0);
          else if (h < 2.0/6.0) rgb = vec3(x, c, 0.0);
          else if (h < 3.0/6.0) rgb = vec3(0.0, c, x);
          else if (h < 4.0/6.0) rgb = vec3(0.0, x, c);
          else if (h < 5.0/6.0) rgb = vec3(x, 0.0, c);
          else rgb = vec3(c, 0.0, x);
          return rgb + m;
        }
        
        // 高质量高斯模糊采样 - 自适应核大小
        vec3 sampleNightGlow(sampler2D nightMap, vec2 uv, float blur) {
          if (blur <= 0.0) return texture2D(nightMap, uv).rgb;
          
          vec3 color = vec3(0.0);
          float totalWeight = 0.0;
          
          // 根据模糊强度动态选择核大小
          if (blur < 0.003) {
            // 小模糊：3x3核
            float weights3x3[9];
            weights3x3[0] = 0.0625; weights3x3[1] = 0.125; weights3x3[2] = 0.0625;
            weights3x3[3] = 0.125;  weights3x3[4] = 0.25;  weights3x3[5] = 0.125;
            weights3x3[6] = 0.0625; weights3x3[7] = 0.125; weights3x3[8] = 0.0625;
            
            float scale3 = blur * 0.1;
            for (int i = 0; i < 9; i++) {
              int x = i / 3 - 1;
              int y = i % 3 - 1;
              vec2 offset = vec2(float(x), float(y)) * scale3;
              color += texture2D(nightMap, uv + offset).rgb * weights3x3[i];
              totalWeight += weights3x3[i];
            }
          } else if (blur < 0.008) {
            // 中等模糊：5x5核
            float weights5x5[25];
            weights5x5[0] = 0.003765; weights5x5[1] = 0.015019; weights5x5[2] = 0.023792; weights5x5[3] = 0.015019; weights5x5[4] = 0.003765;
            weights5x5[5] = 0.015019; weights5x5[6] = 0.059912; weights5x5[7] = 0.094907; weights5x5[8] = 0.059912; weights5x5[9] = 0.015019;
            weights5x5[10] = 0.023792; weights5x5[11] = 0.094907; weights5x5[12] = 0.150342; weights5x5[13] = 0.094907; weights5x5[14] = 0.023792;
            weights5x5[15] = 0.015019; weights5x5[16] = 0.059912; weights5x5[17] = 0.094907; weights5x5[18] = 0.059912; weights5x5[19] = 0.015019;
            weights5x5[20] = 0.003765; weights5x5[21] = 0.015019; weights5x5[22] = 0.023792; weights5x5[23] = 0.015019; weights5x5[24] = 0.003765;
            
            float scale5 = blur * 0.05;
            for (int i = 0; i < 25; i++) {
              int x = i / 5 - 2;
              int y = i % 5 - 2;
              vec2 offset = vec2(float(x), float(y)) * scale5;
              color += texture2D(nightMap, uv + offset).rgb * weights5x5[i];
              totalWeight += weights5x5[i];
            }
          } else {
            // 大模糊：7x7核 (σ = 1.5)
            float weights7x7[49];
            // 7x7高斯权重 (σ = 1.5)
            weights7x7[0] = 0.000843; weights7x7[1] = 0.003898; weights7x7[2] = 0.009949; weights7x7[3] = 0.013690; weights7x7[4] = 0.009949; weights7x7[5] = 0.003898; weights7x7[6] = 0.000843;
            weights7x7[7] = 0.003898; weights7x7[8] = 0.018016; weights7x7[9] = 0.045991; weights7x7[10] = 0.063242; weights7x7[11] = 0.045991; weights7x7[12] = 0.018016; weights7x7[13] = 0.003898;
            weights7x7[14] = 0.009949; weights7x7[15] = 0.045991; weights7x7[16] = 0.117380; weights7x7[17] = 0.161509; weights7x7[18] = 0.117380; weights7x7[19] = 0.045991; weights7x7[20] = 0.009949;
            weights7x7[21] = 0.013690; weights7x7[22] = 0.063242; weights7x7[23] = 0.161509; weights7x7[24] = 0.222242; weights7x7[25] = 0.161509; weights7x7[26] = 0.063242; weights7x7[27] = 0.013690;
            weights7x7[28] = 0.009949; weights7x7[29] = 0.045991; weights7x7[30] = 0.117380; weights7x7[31] = 0.161509; weights7x7[32] = 0.117380; weights7x7[33] = 0.045991; weights7x7[34] = 0.009949;
            weights7x7[35] = 0.003898; weights7x7[36] = 0.018016; weights7x7[37] = 0.045991; weights7x7[38] = 0.063242; weights7x7[39] = 0.045991; weights7x7[40] = 0.018016; weights7x7[41] = 0.003898;
            weights7x7[42] = 0.000843; weights7x7[43] = 0.003898; weights7x7[44] = 0.009949; weights7x7[45] = 0.013690; weights7x7[46] = 0.009949; weights7x7[47] = 0.003898; weights7x7[48] = 0.000843;
            
            float scale7 = blur * 0.03;
            for (int i = 0; i < 49; i++) {
              int x = i / 7 - 3;
              int y = i % 7 - 3;
              vec2 offset = vec2(float(x), float(y)) * scale7;
              color += texture2D(nightMap, uv + offset).rgb * weights7x7[i];
              totalWeight += weights7x7[i];
            }
          }
          
          return color / totalWeight;
        } 
        uniform int hasSpec; 
        uniform int hasNormal;
        uniform float specStrength; 
        uniform float shininess; 
        uniform float broadStrength; 
        uniform float broadShiny;
        uniform float specFresnelK; 
        uniform float nightGamma;
        uniform float normalStrength;
        uniform vec2 normalFlip; // xy = (-1 or 1)
        // 大气弧光参数
        uniform float rimStrength;
        uniform float rimWidth;
        uniform float rimHeight;
        uniform float rimRadius;
        uniform float haloWidth;
        
        varying vec2 vUv; 
        varying vec3 vNormalW; 
        varying vec3 vViewW;
        varying vec3 vWorldPos;
        
        void main(){
          // 基础法线
          vec3 n = normalize(vNormalW);
          // 传统法线贴图已禁用，只使用DEM法线
          if (false) { // 永远不执行传统法线贴图逻辑
            // 使用世界空间位置导数构建切线
            vec3 dp1 = dFdx(vWorldPos);
            vec3 dp2 = dFdy(vWorldPos);
            vec2 duv1 = dFdx(vUv);
            vec2 duv2 = dFdy(vUv);
            vec3 t = normalize(dp1 * duv2.y - dp2 * duv1.y);
            vec3 b = normalize(cross(n, t));
            mat3 tbn = mat3(t, b, n);
            vec3 nm = texture2D(normalMap, vUv).xyz * 2.0 - 1.0;
            nm.xy *= normalFlip; // 处理贴图坐标系差异
            vec3 nMapped = normalize(tbn * nm);
            n = normalize(mix(n, nMapped, clamp(normalStrength, 0.0, 2.0)));
          }
          
          // DEM法线计算 - 基于高度贴图的地形法线
          if (enableDEMNormal == 1) {
            vec3 demNormal = calculateDEMNormal(vUv, displacementMap, demNormalStrength);
            // 将DEM法线从切线空间转换到世界空间
            vec3 dp1 = dFdx(vWorldPos);
            vec3 dp2 = dFdy(vWorldPos);
            vec2 duv1 = dFdx(vUv);
            vec2 duv2 = dFdy(vUv);
            vec3 t = normalize(dp1 * duv2.y - dp2 * duv1.y);
            vec3 b = normalize(cross(n, t));
            mat3 tbn = mat3(t, b, n);
            vec3 demNormalWorld = normalize(tbn * demNormal);
            
            // 混合DEM法线与现有法线
            n = normalize(mix(n, demNormalWorld, demNormalWeight));
          }
          float ndl = dot(n, normalize(lightDir));
          float noise = fract(sin(dot(vUv, vec2(12.9898,78.233))) * 43758.5453);
          float ndl_d = ndl + (noise - 0.5) * edge * 0.25;
          float f = smoothstep(-edge, edge, ndl_d);
          float dayW = f;
          
          vec3 dayTex = texture2D(dayMap, vUv).rgb;
          // 修复：当太阳在背后时（ndl < 0），日面应该完全黑暗
          float dayLight = max(ndl, 0.0); // 只有面向太阳的面才有光照
          float shadowMask = 1.0;
          // 暂时禁用WebGL阴影系统，使用DEM自阴影替代
          // if (enableShadow == 1) {
          //   shadowMask = 0.8; // 简单的全局阴影减弱
          // }
          
          // 地形阴影系统：AO + 方向性投影（独立工作）
          float aoShadow = 1.0;
          float directionalShadow = 1.0;
          
          // 地形阴影(AO) - 环境遮蔽，独立计算
          if (enableSelfShadow == 1) {
            aoShadow = calculateAO(vUv, displacementMap, 16, 0.1, aoHeightThreshold, aoDistanceAttenuation, aoMaxOcclusion, aoSmoothFactor);
            aoShadow = mix(1.0, aoShadow, 2.0);
          }
          
          // 地形投影(方向性) - 基于光照方向，独立计算
          if (enableDirectionalShadow == 1) {
            directionalShadow = calculateDirectionalShadow(vUv, lightDir, n, displacementMap, 16, 0.1, directionalShadowSoftness, directionalShadowSharpness, directionalShadowContrast);
            directionalShadow = mix(1.0, directionalShadow, directionalShadowStrength);
          }
          
          // 组合阴影效果：相乘模式，两种阴影可以同时存在
          float terrainShadow = aoShadow * directionalShadow;
          float cloudShadow = 1.0;
          if (enableCloudShadow == 1) {
            // 使用UV坐标计算云层阴影，避免复杂的世界坐标转换
            vec2 cloudUv = vUv;
            float cloudDark = texture2D(cloudShadowMap, cloudUv).r; // 近似云量
            cloudShadow = 1.0 - cloudShadowStrength * cloudDark;
          }
          float lightFactor = dayLight * sunI * shadowMask * cloudShadow * terrainShadow;
          // A方案：日面漫反射顶亮控制
          if (dayDiffuseGamma != 1.0) {
            lightFactor = pow(max(lightFactor, 0.0), max(dayDiffuseGamma, 0.0001));
          }
          if (dayDiffuseMax > 0.0) {
            lightFactor = min(lightFactor, dayDiffuseMax);
          }
          vec3 dayCol = dayTex * (lightFactor + ambient) * lightColor * dayW;
          
          // 终止线软化 + 夜景随距离衰减
          float nightW = pow(1.0 - f, nightFalloff);
          float rim = 1.0 - smoothstep(0.0, edge*1.5, abs(ndl));
          
          vec3 nightCol = vec3(0.0);
          vec3 nightGlowCol = vec3(0.0);
          if (hasNight == 1) {
            vec3 nightTex = texture2D(nightMap, vUv).rgb;
            nightTex = pow(nightTex, vec3(nightGamma));
            // 夜景只在夜面显示
            nightCol = nightTex * nightW * nightBoost;
            
            // 夜景发光层：高斯模糊的夜景贴图
            if (nightGlowBlur > 0.0 && nightGlowOpacity > 0.0) {
              vec3 nightGlowTex = sampleNightGlow(nightMap, vUv, nightGlowBlur);
              nightGlowTex = pow(nightGlowTex, vec3(nightGamma));
              // 发光层使用更宽的权重，创造柔光效果
              float nightGlowW = pow(1.0 - f, max(nightFalloff * 0.3, 0.2));
              nightGlowCol = nightGlowTex * nightGlowW * nightBoost * nightGlowOpacity;
            }
            
            // 应用夜半球整体明度控制
            nightCol *= nightHemisphereBrightness;
            nightGlowCol *= nightHemisphereBrightness;
          }
          
          // 月光下地球贴图叠加：在夜半球叠加正常地球贴图，降低亮度
          vec3 nightEarthCol = vec3(0.0);
          if (nightEarthMapIntensity > 0.0) {
            vec3 dayTex = texture2D(dayMap, vUv).rgb;
            // 使用HSL调整，模拟月光效果
            vec3 moonTint = hslToRgb(nightEarthMapHue, nightEarthMapSaturation, nightEarthMapLightness);
            // 使用更宽的夜半球权重，确保月光效果可见
            float nightEarthW = pow(1.0 - f, max(nightFalloff * 0.5, 0.3));
            nightEarthCol = dayTex * nightEarthMapIntensity * moonTint * nightEarthW;
            // 应用夜半球整体明度控制
            nightEarthCol *= nightHemisphereBrightness;
          }
          
          // 日侧高光（仅日面，受specMap影响）
          vec3 specCol = vec3(0.0);
          if (dayLight > 0.0 && hasSpec == 1) {
            vec3 L = normalize(lightDir);
            vec3 V = normalize(vViewW);
            vec3 R = reflect(-L, n);
            float s1 = pow(max(dot(R, V), 0.0), shininess);
            float s2 = pow(max(dot(R, V), 0.0), broadShiny);
            float mask = texture2D(specMap, vUv).r; // 取红通道当mask
            float specLight = sunI * shadowMask * cloudShadow;
            
            // 菲涅尔效果：高光随观察角增强
            float fresnel = 1.0;
            if (specFresnelK > 0.0) {
              float NdotV = max(dot(n, V), 0.0);
              fresnel = pow(1.0 - NdotV, specFresnelK);
            }
            
            specCol = lightColor * (s1 * specStrength + s2 * broadStrength) * mask * specLight * fresnel;
          }
          
          // 在终止线附近做少量亮度提拉，便于手动调节"太暗"情况
          vec3 liftCol = vec3(lift) * rim;
          
          // 终止线暖色调效果
          vec3 tintCol = vec3(0.0);
          if (terminatorTint.a > 0.0) {
            float tintZone = 1.0 - smoothstep(0.0, edge * 2.0, abs(ndl));
            vec3 warmTint = terminatorTint.rgb * terminatorTint.a;
            tintCol = warmTint * tintZone;
          }
          
          // 大气弧光效果 - 优化渐变
          float fresnel = 1.0 - max(dot(n, normalize(vViewW)), 0.0);
          
          // 多层渐变效果：内层锐利，外层柔和
          float innerRim = pow(fresnel, max(rimWidth * 1.5, 0.8));
          float outerRim = pow(fresnel, max(rimWidth * 0.8, 0.3));
          
          // 组合渐变：内层更亮，外层更柔和
          float rimEffect = (innerRim * 0.7 + outerRim * 0.3) * rimStrength;
          
          // 根据光照方向调整弧光强度（昼侧更亮，夜侧更柔和）
          float dayNightRim = 0.15 + 0.85 * max(ndl, 0.0);
          rimEffect *= dayNightRim;
          
          // 渐变颜色：从边缘的亮蓝到中心的深蓝
          vec3 innerColor = vec3(0.3, 0.7, 1.0);  // 亮蓝色
          vec3 outerColor = vec3(0.1, 0.3, 0.6);  // 深蓝色
          vec3 rimColor = mix(outerColor, innerColor, innerRim) * rimEffect;
          
          vec3 finalColor = dayCol + nightCol + nightGlowCol + nightEarthCol + liftCol + specCol + rimColor + tintCol;
          
          // Debug模式：显示高度信息
          if (debugMode == 1) {
            float currentHeight = texture2D(displacementMap, vUv).r;
            gl_FragColor = vec4(vec3(currentHeight), 1.0); // 纯高度信息
          } else if (debugMode == 2) {
            float currentHeight = texture2D(displacementMap, vUv).r;
            // 显示调整后的高度（使用与vertex shader相同的逻辑）
            float adjustedHeight = currentHeight;
            if (dispContrast != 1.0) {
              float contrastFactor = min(dispContrast, 3.0);
              adjustedHeight = clamp((currentHeight - dispMid) * contrastFactor + dispMid, 0.0, 1.0);
              adjustedHeight = smoothstep(0.0, 1.0, adjustedHeight);
            }
            gl_FragColor = vec4(vec3(adjustedHeight), 1.0);
          } else if (debugMode == 3) {
            // 显示地形阴影(AO)强度
            float shadowStrength = 1.0;
            if (enableSelfShadow == 1) {
              float ao = calculateAO(vUv, displacementMap, 16, 0.1, aoHeightThreshold, aoDistanceAttenuation, aoMaxOcclusion, aoSmoothFactor);
              shadowStrength = ao;
            }
            gl_FragColor = vec4(vec3(1.0 - shadowStrength), 1.0); // AO阴影强度（黑色表示强阴影）
          } else if (debugMode == 4) {
            // 显示地形投影(方向性)强度
            float shadowStrength = 1.0;
            if (enableDirectionalShadow == 1) {
              float directionalShadow = calculateDirectionalShadow(vUv, lightDir, n, displacementMap, 16, 0.1, directionalShadowSoftness, directionalShadowSharpness, directionalShadowContrast);
              shadowStrength = directionalShadow;
            }
            gl_FragColor = vec4(vec3(1.0 - shadowStrength), 1.0); // 方向性投影强度（黑色表示强投影）
          } else {
            gl_FragColor = vec4(finalColor, 1.0);
          }
        }
      `,
      // 在 WebGL1 下启用导数扩展；WebGL2 不需要
      extensions: { derivatives: true },
      transparent: false,
      depthWrite: true,
      depthTest: true,
      blending: THREE.NoBlending,
    });
    
    // 移除分层渲染逻辑
    // if (material && material.layers) {
    //   material.layers.set(1);
    // }
    material.needsUpdate = true;
    
    return material;
  }, [
    earthMap, 
    earthNight, 
    earthSpecular, 
    earthNormal,
    earthDisplacement,
    lightDirection, 
    lightColor, 
    sunIntensity, 
    terminatorSoftness, 
    nightIntensity, 
    dayAmbient, 
    terminatorLift, 
    specStrength, 
    shininess, 
    broadStrength, 
    nightFalloff,
    useNormalMap,
    normalMapStrength,
    normalFlipX,
    normalFlipY,
    displacementScaleRel,
    displacementMid,
    displacementContrast,
    size
  ]);

  // 修复：始终使用自定义着色器以保留弧光效果，即使接收阴影时
  // 移除了 standardShadowMaterial 回退逻辑
  const useCustomShaderForShadows = true; // 强制使用自定义着色器支持弧光

  // 自定义阴影深度材质：在阴影深度通道复用置换顶点逻辑
  const depthMaterial = useMemo(() => {
    const mat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    (mat as any).defines = (mat as any).defines || {};
    (mat as any).defines.USE_UV = '';
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.displacementMap = { value: earthDisplacement ?? SOLID.zeroLinear };
      shader.uniforms.dispScale = { value: (displacementScaleRel ?? 0) * size };
      shader.uniforms.dispMid = { value: displacementMid ?? 0.5 };
      shader.uniforms.dispContrast = { value: displacementContrast ?? 1.0 };
      shader.uniforms.hasDisp = { value: (earthDisplacement && (displacementScaleRel ?? 0) !== 0) ? 1 : 0 };
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <uv_pars_vertex>',
          '#include <uv_pars_vertex>\nuniform sampler2D displacementMap;\nuniform float dispScale;\nuniform float dispMid;\nuniform float dispContrast;\nuniform int hasDisp;'
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>\n#ifdef USE_UV\n  if (hasDisp == 1 && dispScale != 0.0) {\n    float h = texture2D(displacementMap, vUv).r;\n    float adjustedH = h;\n    if (dispContrast != 1.0) {\n      float contrastFactor = min(dispContrast, 3.0);\n      adjustedH = clamp((h - dispMid) * contrastFactor + dispMid, 0.0, 1.0);\n      adjustedH = smoothstep(0.0, 1.0, adjustedH);\n    }\n    float d = (adjustedH - 0.5) * dispScale;\n    transformed += normal * d;\n  }\n#endif`
        );
    };
    return mat;
  }, [earthDisplacement, displacementScaleRel, displacementMid, displacementContrast, size]);

  // 更新着色器uniforms
  useEffect(() => {
    if (earthDNMaterial) {
      try {
        if (earthDNMaterial.uniforms.lightDir?.value) {
          (earthDNMaterial.uniforms.lightDir.value as THREE.Vector3).copy(lightDirection);
        }
        if (earthDNMaterial.uniforms.sunI) {
          earthDNMaterial.uniforms.sunI.value = sunIntensity;
        }
        if (earthDNMaterial.uniforms.lightColor?.value) {
          earthDNMaterial.uniforms.lightColor.value.copy(lightColor);
        }
        // 更新大气弧光参数
        if (earthDNMaterial.uniforms.rimStrength) {
          earthDNMaterial.uniforms.rimStrength.value = rimStrength;
        }
        if (earthDNMaterial.uniforms.rimWidth) {
          earthDNMaterial.uniforms.rimWidth.value = rimWidth;
        }
        if (earthDNMaterial.uniforms.rimHeight) {
          earthDNMaterial.uniforms.rimHeight.value = rimHeight;
        }
        if (earthDNMaterial.uniforms.rimRadius) {
          earthDNMaterial.uniforms.rimRadius.value = rimRadius;
        }
        if (earthDNMaterial.uniforms.haloWidth) {
          earthDNMaterial.uniforms.haloWidth.value = haloWidth;
        }
        // 法线贴图相关
        if (earthDNMaterial.uniforms.normalStrength) {
          earthDNMaterial.uniforms.normalStrength.value = normalMapStrength ?? 0.8;
        }
        if (earthDNMaterial.uniforms.hasNormal) {
          earthDNMaterial.uniforms.hasNormal.value = 0; // 禁用传统法线贴图
        }
        if (earthDNMaterial.uniforms.normalMap && earthNormal) {
          earthDNMaterial.uniforms.normalMap.value = earthNormal;
        }
        if (earthDNMaterial.uniforms.normalFlip) {
          earthDNMaterial.uniforms.normalFlip.value.set(normalFlipX ? -1 : 1, normalFlipY ? -1 : 1);
        }
        // 置换相关
        if (earthDNMaterial.uniforms.displacementMap && earthDisplacement) {
          earthDNMaterial.uniforms.displacementMap.value = earthDisplacement;
        }
        if (earthDNMaterial.uniforms.dispScale) {
          earthDNMaterial.uniforms.dispScale.value = (displacementScaleRel ?? 0) * size;
        }
        if (earthDNMaterial.uniforms.dispMid) {
          earthDNMaterial.uniforms.dispMid.value = displacementMid ?? 0.5;
        }
        if (earthDNMaterial.uniforms.dispContrast) {
          earthDNMaterial.uniforms.dispContrast.value = displacementContrast ?? 1.0;
        }
        if (earthDNMaterial.uniforms.hasDisp) {
          earthDNMaterial.uniforms.hasDisp.value = (earthDisplacement && (displacementScaleRel ?? 0) !== 0) ? 1 : 0;
        }
        if ((earthDNMaterial.uniforms as any).enableShadow !== undefined) {
          (earthDNMaterial.uniforms as any).enableShadow.value = receiveShadows ? 1 : 0;
        }
        if ((earthDNMaterial.uniforms as any).enableShadow !== undefined) {
          (earthDNMaterial.uniforms as any).enableShadow.value = receiveShadows ? 1 : 0;
        }
        if ((earthDNMaterial.uniforms as any).cloudShadowMap && cloudShadowMap) {
          (earthDNMaterial.uniforms as any).cloudShadowMap.value = cloudShadowMap;
        }
        if ((earthDNMaterial.uniforms as any).cloudShadowStrength) {
          (earthDNMaterial.uniforms as any).cloudShadowStrength.value = cloudShadowStrength ?? 0.4;
        }
        if ((earthDNMaterial.uniforms as any).enableCloudShadow !== undefined) {
          (earthDNMaterial.uniforms as any).enableCloudShadow.value = enableCloudShadow ? 1 : 0;
        }
        // if ((earthDNMaterial.uniforms as any).cloudUvOffset !== undefined) {
        //   (earthDNMaterial.uniforms as any).cloudUvOffset.value = cloudUvOffset ?? new THREE.Vector2(0, 0);
        // }
        // DEM地形参数更新
        if ((earthDNMaterial.uniforms as any).enableDEMNormal !== undefined) {
          (earthDNMaterial.uniforms as any).enableDEMNormal.value = earthDisplacement ? 1 : 0;
        }
        if ((earthDNMaterial.uniforms as any).demNormalStrength !== undefined) {
          (earthDNMaterial.uniforms as any).demNormalStrength.value = demNormalStrength ?? 3.0;
        }
        if ((earthDNMaterial.uniforms as any).demNormalWeight !== undefined) {
          (earthDNMaterial.uniforms as any).demNormalWeight.value = demNormalWeight ?? 0.05;
        }
        if ((earthDNMaterial.uniforms as any).enableSelfShadow !== undefined) {
          (earthDNMaterial.uniforms as any).enableSelfShadow.value = ((earthDisplacement && (displacementScaleRel ?? 0) !== 0) && receiveShadows) ? 1 : 0;
        }
        if ((earthDNMaterial.uniforms as any).debugMode !== undefined) {
          (earthDNMaterial.uniforms as any).debugMode.value = debugMode ?? 0;
        }
        // 更新地形阴影(AO)参数
        if ((earthDNMaterial.uniforms as any).aoHeightThreshold !== undefined) {
          (earthDNMaterial.uniforms as any).aoHeightThreshold.value = aoHeightThreshold ?? 0.02;
        }
        if ((earthDNMaterial.uniforms as any).aoDistanceAttenuation !== undefined) {
          (earthDNMaterial.uniforms as any).aoDistanceAttenuation.value = aoDistanceAttenuation ?? 2.0;
        }
        if ((earthDNMaterial.uniforms as any).aoMaxOcclusion !== undefined) {
          (earthDNMaterial.uniforms as any).aoMaxOcclusion.value = aoMaxOcclusion ?? 0.3;
        }
        if ((earthDNMaterial.uniforms as any).aoSmoothFactor !== undefined) {
          (earthDNMaterial.uniforms as any).aoSmoothFactor.value = aoSmoothFactor ?? 0.5;
        }
        // 更新地形投影(方向性)参数
        if ((earthDNMaterial.uniforms as any).enableDirectionalShadow !== undefined) {
          (earthDNMaterial.uniforms as any).enableDirectionalShadow.value = enableDirectionalShadow ? 1 : 0;
        }
        if ((earthDNMaterial.uniforms as any).directionalShadowStrength !== undefined) {
          (earthDNMaterial.uniforms as any).directionalShadowStrength.value = directionalShadowStrength ?? 1.0;
        }
        if ((earthDNMaterial.uniforms as any).directionalShadowSoftness !== undefined) {
          (earthDNMaterial.uniforms as any).directionalShadowSoftness.value = directionalShadowSoftness ?? 0.5;
        }
        if ((earthDNMaterial.uniforms as any).directionalShadowSharpness !== undefined) {
          (earthDNMaterial.uniforms as any).directionalShadowSharpness.value = directionalShadowSharpness ?? 2.0;
        }
        if ((earthDNMaterial.uniforms as any).directionalShadowContrast !== undefined) {
          (earthDNMaterial.uniforms as any).directionalShadowContrast.value = directionalShadowContrast ?? 1.5;
        }
        // 月光地球贴图参数更新
        if (earthDNMaterial.uniforms.nightEarthMapIntensity) {
          earthDNMaterial.uniforms.nightEarthMapIntensity.value = nightEarthMapIntensity;
        }
        if (earthDNMaterial.uniforms.nightEarthMapHue) {
          earthDNMaterial.uniforms.nightEarthMapHue.value = nightEarthMapHue;
        }
        if (earthDNMaterial.uniforms.nightEarthMapSaturation) {
          earthDNMaterial.uniforms.nightEarthMapSaturation.value = nightEarthMapSaturation;
        }
        if (earthDNMaterial.uniforms.nightEarthMapLightness) {
          earthDNMaterial.uniforms.nightEarthMapLightness.value = nightEarthMapLightness;
        }
        if (earthDNMaterial.uniforms.nightHemisphereBrightness) {
          earthDNMaterial.uniforms.nightHemisphereBrightness.value = nightHemisphereBrightness;
        }
        if (earthDNMaterial.uniforms.nightGlowBlur) {
          earthDNMaterial.uniforms.nightGlowBlur.value = nightGlowBlur;
        }
        if (earthDNMaterial.uniforms.nightGlowOpacity) {
          earthDNMaterial.uniforms.nightGlowOpacity.value = nightGlowOpacity;
        }
      } catch (error) {
        console.error('[SimpleEarth] Error updating uniforms:', error);
      }
    }
  }, [earthDNMaterial, lightDirection, sunIntensity, lightColor, rimStrength, rimWidth, rimHeight, rimRadius, haloWidth, useNormalMap, normalMapStrength, normalFlipX, normalFlipY, earthNormal, earthDisplacement, displacementScaleRel, displacementMid, displacementContrast, size, receiveShadows, cloudShadowMap, cloudShadowStrength, enableCloudShadow, demNormalStrength, demNormalWeight, debugMode, aoHeightThreshold, aoDistanceAttenuation, aoMaxOcclusion, aoSmoothFactor, enableDirectionalShadow, directionalShadowStrength, directionalShadowSoftness, directionalShadowSharpness, directionalShadowContrast, nightEarthMapIntensity, nightEarthMapHue, nightEarthMapSaturation, nightEarthMapLightness, nightGlowBlur, nightGlowOpacity]);

  // 调试信息
  useEffect(() => {
    if (new URLSearchParams(location.search).get('debug') === '1') {
      console.log('[SimpleEarth]', {
        position,
        size,
        lightDirection: lightDirection.toArray(),
        useTextures,
        hasDayMap: !!earthMap,
        hasNightMap: !!earthNight,
        hasSpecMap: !!earthSpecular,
        hasDisplacement: !!earthDisplacement,
        demParams: {
          demNormalStrength,
          demNormalWeight,
        },
        mode: 'single-render-system'
      });
    }
  }, [position, size, lightDirection, useTextures, earthMap, earthNight, earthSpecular, earthDisplacement, demNormalStrength, demNormalWeight]);

  return (
    <group 
      position={position}
      rotation={[0, THREE.MathUtils.degToRad(yawDeg), 0]}
      // 🔧 关键修复：应用yawDeg参数控制地球自转，确保沿地轴（Y轴）旋转
    >
      {/* 地球核心 */}
      <mesh castShadow={receiveShadows} receiveShadow={receiveShadows}
        // 为阴影接收附加自定义深度材质（支持高度置换）
        customDepthMaterial={receiveShadows ? depthMaterial : undefined}
      >
        <sphereGeometry args={[size, segments, segments]} />
        {earthDNMaterial ? (
          <primitive object={earthDNMaterial} attach="material" />
        ) : (
          <meshPhongMaterial color={new THREE.Color('#9fb3c8')} shininess={6} specular={new THREE.Color('#2a2a2a')} />
        )}
      </mesh>
      
      {/* 位置标记 - 地球表面上方的小点 */}
      <mesh position={[0, size * 1.02, 0]}>
        <sphereGeometry args={[0.012, 16, 16]} />
        <meshStandardMaterial 
          color={new THREE.Color('#0d0d0d')} 
          emissive={new THREE.Color('#151515')} 
          emissiveIntensity={0.6}
        />
      </mesh>
    </group>
  );
}
