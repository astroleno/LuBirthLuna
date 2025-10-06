import React, { useMemo } from 'react';
import * as THREE from 'three';

// POM（视差遮挡映射）云层渲染器
export function POMCloudRenderer({ 
  radius, 
  texture, 
  position, 
  lightDir, 
  lightColor, 
  strength = 0.4, 
  sunI = 1.0, 
  cloudGamma = 1.0, 
  cloudBlack = 0.4, 
  cloudWhite = 0.85, 
  cloudContrast = 1.2,
  // POM参数
  pomSteps = 12,
  heightScale = 0.0005,
  // 混合参数
  blendMode = "additive",
  opacity = 0.4
}: {
  radius: number;
  texture: THREE.Texture | null;
  position: [number, number, number];
  lightDir?: THREE.Vector3;
  lightColor?: THREE.Color;
  strength?: number;
  sunI?: number;
  cloudGamma?: number;
  cloudBlack?: number;
  cloudWhite?: number;
  cloudContrast?: number;
  // POM参数
  pomSteps?: number;
  heightScale?: number;
  // 混合参数
  blendMode?: "additive" | "alpha" | "multiply";
  opacity?: number;
}) {
  
  // POM云层材质
  const pomMaterial = useMemo(() => {
    if (!texture) return null;
    try {
      const material = new THREE.ShaderMaterial({
        uniforms: {
          map: { value: texture },
          displacementMap: { value: texture }, // 使用同一张贴图作为高度图
          lightDir: { value: lightDir || new THREE.Vector3(0, 0, 1) },
          lightColor: { value: lightColor || new THREE.Color(1, 1, 1) },
          strength: { value: strength },
          sunI: { value: sunI },
          cloudGamma: { value: cloudGamma },
          cloudBlack: { value: cloudBlack },
          cloudWhite: { value: cloudWhite },
          cloudContrast: { value: cloudContrast },
          // POM参数
          pomSteps: { value: pomSteps },
          heightScale: { value: heightScale },
          // 混合参数
          opacity: { value: opacity }
        },
        vertexShader: `
          uniform float heightScale;
          uniform sampler2D displacementMap;
          varying vec2 vUv; 
          varying vec3 vNormalW;
          varying vec3 vPosition;
          varying vec3 vViewPosition;
          varying vec3 vViewDir;
          
          void main(){ 
            vUv = uv; 
            
            // 计算视角方向（用于POM）
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vViewPosition = mvPosition.xyz;
            vViewDir = normalize(-mvPosition.xyz);
            
            vNormalW = normalize(mat3(modelMatrix) * normal); 
            vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * mvPosition; 
          }
        `,
        fragmentShader: `
          uniform sampler2D map;
          uniform sampler2D displacementMap;
          uniform vec3 lightDir; 
          uniform vec3 lightColor; 
          uniform float strength; 
          uniform float sunI;
          uniform float cloudGamma;
          uniform float cloudBlack;
          uniform float cloudWhite;
          uniform float cloudContrast;
          uniform int pomSteps;
          uniform float heightScale;
          uniform float opacity;
          varying vec2 vUv; 
          varying vec3 vNormalW;
          varying vec3 vPosition;
          varying vec3 vViewPosition;
          varying vec3 vViewDir;
          
          // POM视差遮挡映射函数
          vec2 parallaxMapping(vec2 texCoords, vec3 viewDir) {
            // 将视角方向转换到切线空间
            vec3 viewDirTS = normalize(viewDir);
            
            // 计算步长
            float numLayers = float(pomSteps);
            float layerDepth = 1.0 / numLayers;
            float currentLayerDepth = 0.0;
            
            // 计算每层的UV偏移
            vec2 P = viewDirTS.xy / viewDirTS.z * heightScale;
            vec2 deltaTexCoords = P / numLayers;
            
            // 获取初始深度
            float currentDepthMapValue = texture2D(displacementMap, texCoords).r;
            
            // 步进搜索
            while(currentLayerDepth < currentDepthMapValue) {
              texCoords -= deltaTexCoords;
              currentDepthMapValue = texture2D(displacementMap, texCoords).r;
              currentLayerDepth += layerDepth;
            }
            
            // 获取前一步的纹理坐标
            vec2 prevTexCoords = texCoords + deltaTexCoords;
            
            // 获取前一步的深度
            float afterDepth = currentDepthMapValue - currentLayerDepth;
            float beforeDepth = texture2D(displacementMap, prevTexCoords).r - currentLayerDepth + layerDepth;
            
            // 线性插值
            float weight = afterDepth / (afterDepth - beforeDepth);
            texCoords = mix(texCoords, prevTexCoords, weight);
            
            return texCoords;
          }
          
          void main(){ 
            // 应用POM
            vec2 pomUV = parallaxMapping(vUv, vViewDir);
            
            // 检查UV是否在有效范围内
            if (pomUV.x < 0.0 || pomUV.x > 1.0 || pomUV.y < 0.0 || pomUV.y > 1.0) {
              discard;
            }
            
            float ndl = max(dot(normalize(vNormalW), normalize(lightDir)), 0.0);
            vec3 src = texture2D(map, pomUV).rgb;
            
            // Levels: black/white points + gamma + contrast
            float d = dot(src, vec3(0.299,0.587,0.114));
            float bw = max(0.0001, cloudWhite - cloudBlack);
            d = clamp((d - cloudBlack) / bw, 0.0, 1.0);
            d = pow(d, cloudGamma);
            d = clamp((d - 0.5) * cloudContrast + 0.5, 0.0, 1.0);
            
            // 轻量光照近似：wrap光照 + 终止线柔化
            float wrap = 0.25;
            float ndlWrapped = clamp((ndl + wrap) / (1.0 + wrap), 0.0, 1.0);
            
            // 终止线柔化：在晨昏线附近增加暖色调
            float terminatorSoftness = 0.15;
            float terminatorZone = smoothstep(-terminatorSoftness, terminatorSoftness, ndl);
            vec3 warmTint = vec3(1.0, 0.85, 0.75);
            float tintStrength = (1.0 - terminatorZone) * 0.08;
            
            // 背光银边效果
            float silverRim = 0.0;
            if (ndl > 0.0) {
              vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0));
              vec3 halfVector = normalize(normalize(lightDir) + viewDir);
              float rimFactor = 1.0 - max(dot(normalize(vNormalW), viewDir), 0.0);
              silverRim = pow(rimFactor, 2.0) * 0.12 * ndl;
            }
            
            // 最终光照计算
            float dayW = smoothstep(0.0, 0.35, ndlWrapped);
            float l = pow(dayW, 0.8) * (0.7 + 0.3*sunI) + silverRim;
            
            vec3 c = pow(src, vec3(cloudGamma));
            c = clamp((c - vec3(cloudBlack)) / bw, 0.0, 1.0);
            c = clamp((c - 0.5) * cloudContrast + 0.5, 0.0, 1.0);
            
            // 应用暖色调偏移
            c = mix(c, c * warmTint, tintStrength);
            
            vec3 col = mix(c, vec3(1.0), 0.40) * l * lightColor;
            float a = clamp(dayW * strength * d * opacity, 0.0, 1.0);
            
            gl_FragColor = vec4(col, a);
          }
        `,
        transparent: true,
        depthTest: true,
        depthWrite: false,
        blending: blendMode === "additive" ? THREE.AdditiveBlending : 
                 blendMode === "multiply" ? THREE.MultiplyBlending : 
                 THREE.NormalBlending
      });
      
      return material;
    } catch (error) {
      console.error('[POMCloudRenderer] Material creation failed:', error);
      return null;
    }
  }, [texture, lightDir, lightColor, strength, sunI, cloudGamma, cloudBlack, cloudWhite, cloudContrast, pomSteps, heightScale, opacity, blendMode]);

  if (!pomMaterial) {
    return null;
  }

  return (
    <mesh position={position}>
      <sphereGeometry args={[radius, 64, 32]} />
      <primitive object={pomMaterial} />
    </mesh>
  );
}
