import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

// 大气辉光增强组件 - A1任务：更自然与近地渐变
// 
// 功能说明：
// - 主大气层：提供基础的大气辉光效果，支持昼夜对比、Fresnel边缘增强
// - 近地薄壳：在地表附近提供额外的薄壳渐变效果，增强近地大气感
// - offset参数：让大气辉光从地表向内偏移开始发光，用于填补高度贴图调整后的空隙
//   当高度贴图产生地形凸起时，此参数避免大气层与地形之间的视觉空隙
//   参数范围：0-0.02（0=从地表开始，0.001=默认偏移0.1%地球半径，0.02=最大偏移2%）
export function AtmosphereEffects({ 
  radius, 
  lightDirection, 
  intensity = 1.0,
  thickness = 0.05,
  color = [0.43, 0.65, 1.0],
  fresnelPower = 2.0,
  mainContrast = 0.5,
  mainSoftness = 0.5,
  nearShell = true,
  nearStrength = 1.0,
  nearThicknessFactor = 0.35,
  nearContrast = 0.6,
  nearSoftness = 0.5,
  useAlphaWeightedAdditive = false,
  // 实验参数：几何外缘软边与感知地板（默认关闭，保证现有观感不变）
  softBoundaryDelta = 0.0,      // 外半径软边比例（0=关，建议 0.005~0.01）
  perceptualFloor = 0.0,        // 线性域感知地板（0=关，建议 0.003~0.006）
  scaleHeight = 0.0,            // 指数型尺度高度（地球半径比例，0=关，建议 0.02~0.04）
  offset = 0.0,                 // 大气辉光起始偏移（0-0.02，默认0.001）
                                // 用于填补高度贴图调整后产生的空隙，让大气辉光从地表向内偏移开始发光
                                // 0=从地表开始，0.001=从地表向内0.1%地球半径开始，0.02=最大偏移2%
  visible = true,
  renderOrder = 5
}: {
  radius: number;
  lightDirection: THREE.Vector3;
  intensity?: number;
  thickness?: number;
  color?: [number, number, number];
  fresnelPower?: number;
  mainContrast?: number;
  mainSoftness?: number;
  nearShell?: boolean;
  nearStrength?: number;
  nearThicknessFactor?: number;
  nearContrast?: number;
  nearSoftness?: number;
  useAlphaWeightedAdditive?: boolean;
  softBoundaryDelta?: number;
  perceptualFloor?: number;
  scaleHeight?: number;
  offset?: number;
  visible?: boolean;
  renderOrder?: number;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  const nearShellRef = useRef<THREE.Mesh>(null!);

  // 主大气层材质
  const atmosphereMaterial = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      vertexShader: `
        uniform float thickness;
        uniform float earthRadius;
        uniform float offset;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPos;
        varying vec3 vViewDirection;
        varying float vFresnel;
        varying float vHeight;
        
        void main() {
          // 世界空间法线用于与世界空间光线计算
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewDirection = normalize(-mvPosition.xyz);
          
          // Fresnel计算：视角与法线的夹角（视空间）
          vec3 viewNormal = normalize(normalMatrix * normal);
          vFresnel = pow(1.0 - max(dot(viewNormal, vViewDirection), 0.0), 2.0);
          
          // 高度计算：从offset位置(0)到高空(1)的渐变，使用动态厚度
          // offset参数让大气辉光从地表向内偏移开始发光，用于填补高度贴图调整后的空隙
          float atmosphereRadius = earthRadius * (1.0 + thickness);
          float innerRadius = earthRadius * (1.0 - offset);
          float currentRadius = length((modelMatrix * vec4(position, 1.0)).xyz);
          vHeight = (currentRadius - innerRadius) / (atmosphereRadius - innerRadius);
          vHeight = clamp(vHeight, 0.0, 1.0); // offset位置=0，高空=1
          
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 lightDir;
        uniform float intensity;
        uniform vec3 color;
        uniform float thickness;
        uniform float fresnelPower;
        uniform float mainContrast;
        uniform float mainSoftness;
        uniform float earthRadius;
        uniform float softBoundaryDelta;
        uniform float perceptualFloor;
        uniform float scaleHeight;
        uniform float offset;

        varying vec3 vWorldNormal;
        varying vec3 vWorldPos;
        varying vec3 vViewDirection;
        varying float vFresnel;
        varying float vHeight;

        void main() {
          // 光照方向计算
          float ndl = max(dot(normalize(vWorldNormal), normalize(lightDir)), 0.0);
          
          // 基础大气颜色
          vec3 baseColor = color;
          
          // 昼夜对比（主层）：0=均匀，1=仅昼侧
          float day = smoothstep(0.0, 0.3, ndl);
          float dayNightFactor = mix(1.0 - mainContrast, 1.0, day);
          float baseIntensity = intensity * dayNightFactor;
          
          // 边缘效果：Fresnel边缘增强（可调）
          float edgeEffect = pow(vFresnel, 1.0 / max(0.1, fresnelPower));
          
          // 沿视线的近地高度（解析几何）：ray 到地心的最近距离 b
          // 使用offset调整内半径，让大气辉光从更内层开始计算光学路径
          float outerRadius = earthRadius * (1.0 + thickness);
          float innerRadius = earthRadius * (1.0 - offset);
          vec3 oc = cameraPosition; // 地心在(0,0,0)
          vec3 rd = normalize(vWorldPos - cameraPosition);
          float b = length(cross(oc, rd));
          // 近似光学路径长度（主层），用于更自然扩散
          float tO = sqrt(max(outerRadius*outerRadius - b*b, 0.0));
          float tI = sqrt(max(innerRadius*innerRadius - b*b, 0.0));
          float pathLen = max(tO - tI, 0.0);
          float pathMax = max(sqrt(max(outerRadius*outerRadius - innerRadius*innerRadius, 0.0)), 1e-5);
          float optical = clamp(pathLen / pathMax, 0.0, 1.0);
          float sMain = clamp(mainSoftness / 3.0, 0.0, 1.0);
          float expoMain = mix(1.2, 0.35, sMain);
          float heightEffect = pow(optical, expoMain);

          // 光学域软阈值：仅在夜侧抑制“几乎不穿过大气”的残留（消除夜半球淡雾）
          float eps = 0.02; // 很小的阈值，不影响可见区
          float wOpt = smoothstep(eps, eps * 3.0, optical);
          float wNight = mix(wOpt, 1.0, day); // 夜侧用软阈值，昼侧保持 1

          // 几何外缘软边：在 b 接近 outerRadius 的极窄带内把贡献平滑拉向 0（默认关闭）
          float sd = softBoundaryDelta;
          float sb = 1.0;
          if (sd > 0.0) {
            float edge0 = outerRadius * (1.0 - sd);
            float edge1 = outerRadius;
            sb = 1.0 - smoothstep(edge0, edge1, b);
          }

          // 最终强度（基于 Fresnel 与路径长度）
          float finalIntensity = baseIntensity * edgeEffect * heightEffect * wNight * sb;

          // 指数尺度高度：对"最近高度"做指数衰减，快速压低高空尾巴（默认关闭）
          if (scaleHeight > 0.0) {
            float Hrad = max(scaleHeight * earthRadius, 1e-5);
            float hClose = max(b - innerRadius, 0.0);
            float wScale = exp(-hClose / Hrad);
            // 在外半径附近再给一个很小的物理域软带，避免边界小残留
            float edgeSoft = Hrad * 2.0;
            float wEdge = smoothstep(0.0, edgeSoft, outerRadius - b);
            finalIntensity *= (wScale * wEdge);
          }

          // 感知地板：极小强度在输出前平滑压到 0，避免“灰尾”（默认关闭）
          if (perceptualFloor > 0.0) {
            float T = perceptualFloor;           // 线性域阈值
            float pf = smoothstep(T, T * 2.0, finalIntensity);
            finalIntensity *= pf;
          }

          // 颜色：基础蓝色
          vec3 finalColor = baseColor * finalIntensity;

          // 极小屏幕噪声抖动，减少条带（在暗弱渐变区尤为明显）
          float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898,78.233))) * 43758.5453);
          finalColor *= 1.0 + (n - 0.5) * 0.004; // 保持极小幅度

          // 透明度：保持与强度一致的权重
          float alpha = clamp(finalIntensity * 0.8, 0.0, 1.0);

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      uniforms: {
        lightDir: { value: lightDirection },
        intensity: { value: intensity },
        color: { value: new THREE.Color(color[0], color[1], color[2]) },
        thickness: { value: thickness },
        fresnelPower: { value: fresnelPower },
        mainContrast: { value: mainContrast },
        mainSoftness: { value: mainSoftness },
        earthRadius: { value: radius },
        softBoundaryDelta: { value: softBoundaryDelta },
        perceptualFloor: { value: perceptualFloor },
        scaleHeight: { value: scaleHeight },
        offset: { value: offset }
      },
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
    });
    if (useAlphaWeightedAdditive) {
      mat.blending = THREE.CustomBlending;
      mat.blendEquation = THREE.AddEquation;
      mat.blendSrc = THREE.SrcAlphaFactor; // 颜色乘以 alpha 再相加
      mat.blendDst = THREE.OneFactor;
    } else {
      mat.blending = THREE.AdditiveBlending;
    }
    return mat;
  }, [lightDirection, intensity, color, thickness, fresnelPower, mainContrast, mainSoftness, useAlphaWeightedAdditive]);

  // 近地薄壳材质
  const nearShellMaterial = useMemo(() => {
    if (!nearShell) return null;
    
    const mat = new THREE.ShaderMaterial({
      vertexShader: `
        uniform float thickness;
        uniform float nearFactor;
        uniform float earthRadius;
        uniform float offset;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPos;
        varying vec3 vViewDirection;
        varying float vFresnel;
        varying float vHeight;
        
        void main() {
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewDirection = normalize(-mvPosition.xyz);
          
          // 高度计算：从offset位置(0)到高空(1)的渐变，使用动态厚度
          // 近地薄壳同样使用offset参数，确保与主大气层一致
          float atmosphereRadius = earthRadius * (1.0 + thickness * nearFactor);
          float innerRadius = earthRadius * (1.0 - offset);
          float currentRadius = length((modelMatrix * vec4(position, 1.0)).xyz);
          vHeight = (currentRadius - innerRadius) / (atmosphereRadius - innerRadius);
          vHeight = clamp(vHeight, 0.0, 1.0); // offset位置=0，高空=1
          
          // Fresnel计算（视空间）
          vec3 viewNormal = normalize(normalMatrix * normal);
          vFresnel = pow(1.0 - max(dot(viewNormal, vViewDirection), 0.0), 2.0);
          
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 lightDir;
        uniform float intensity;
        uniform vec3 color;
        uniform float thickness;
        uniform float nearFactor;
        uniform float nearStrength;
        uniform float fresnelPower;
        uniform float nearContrast;
        uniform float earthRadius;
        uniform float nearSoftness;
        uniform float softBoundaryDelta;
        uniform float perceptualFloor;
        uniform float scaleHeight;
        uniform float offset;
        
        varying vec3 vWorldNormal;
        varying vec3 vWorldPos;
        varying vec3 vViewDirection;
        varying float vFresnel;
        varying float vHeight;
        
        void main() {
          // 光照方向计算
          float ndl = max(dot(normalize(vWorldNormal), normalize(lightDir)), 0.0);
          
          // 昼夜对比（0=均匀，1=仅昼侧），在光照项基础上保留夜侧底亮
          float day = smoothstep(0.0, 0.3, ndl);
          float dayNightFactor = mix(1.0 - nearContrast, 1.0, day);
          
          // 近地薄壳：使用视线最近高度，集中在offset位置
          // 与主大气层使用相同的offset参数，确保视觉一致性
          float outerRadius = earthRadius * (1.0 + thickness * nearFactor);
          float innerRadius = earthRadius * (1.0 - offset);
          vec3 oc = cameraPosition;
          vec3 rd = normalize(vWorldPos - cameraPosition);
          float b = length(cross(oc, rd));
          float heightT = clamp((b - innerRadius) / max(outerRadius - innerRadius, 1e-5), 0.0, 1.0);
          float s = clamp(nearSoftness / 3.0, 0.0, 1.0);
          // 使用近似光学路径长度获得更自然的扩散
          float Ro = earthRadius * (1.0 + thickness * nearFactor);
          float tO2 = sqrt(max(Ro*Ro - b*b, 0.0));
          float tI2 = sqrt(max(innerRadius*innerRadius - b*b, 0.0));
          float pathN = max(tO2 - tI2, 0.0);
          float pathMaxN = max(sqrt(max(Ro*Ro - innerRadius*innerRadius, 0.0)), 1e-5);
          float opticalN = clamp(pathN / pathMaxN, 0.0, 1.0);
          float expo = mix(1.2, 0.35, s); // s越大越柔
          float heightEffect = pow(opticalN, expo);

          // 边缘效果
          float edgeEffect = pow(vFresnel, 1.0 / max(0.1, fresnelPower));

          // 光学域软阈值（仅夜侧生效），去掉夜半球的极弱尾巴
          float epsN = 0.02;
          float wOptN = smoothstep(epsN, epsN * 3.0, opticalN);
          float wNightN = mix(wOptN, 1.0, day);

          // 几何外缘软边（默认关闭）
          float sdN = softBoundaryDelta;
          float sbN = 1.0;
          if (sdN > 0.0) {
            float edge0N = Ro * (1.0 - sdN);
            float edge1N = Ro;
            sbN = 1.0 - smoothstep(edge0N, edge1N, b);
          }

          // 最终强度
          float finalIntensity = intensity * nearStrength * heightEffect * dayNightFactor * edgeEffect * wNightN * sbN;

          // 指数尺度高度（近壳同样使用），确保两层一致收尾
          if (scaleHeight > 0.0) {
            float Hrad = max(scaleHeight * earthRadius, 1e-5);
            float hClose = max(b - innerRadius, 0.0);
            float wScale = exp(-hClose / Hrad);
            float edgeSoft = Hrad * 2.0;
            float wEdge = smoothstep(0.0, edgeSoft, Ro - b);
            finalIntensity *= (wScale * wEdge);
          }

          // 感知地板（默认关闭）
          if (perceptualFloor > 0.0) {
            float T = perceptualFloor;
            float pf = smoothstep(T, T * 2.0, finalIntensity);
            finalIntensity *= pf;
          }

          // 颜色：地表增强
          vec3 finalColor = color * finalIntensity * 2.0;

          // 轻微抖动降低条带
          float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898,78.233))) * 43758.5453);
          finalColor *= 1.0 + (n - 0.5) * 0.004;

          // 透明度
          float alpha = clamp(finalIntensity * 0.75, 0.0, 1.0);

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      uniforms: {
        lightDir: { value: lightDirection },
        intensity: { value: intensity },
        color: { value: new THREE.Color(color[0], color[1], color[2]) },
        thickness: { value: thickness },
        nearFactor: { value: nearThicknessFactor },
        nearStrength: { value: nearStrength },
        fresnelPower: { value: fresnelPower },
        nearContrast: { value: nearContrast },
        nearSoftness: { value: nearSoftness },
        earthRadius: { value: radius },
        softBoundaryDelta: { value: softBoundaryDelta },
        perceptualFloor: { value: perceptualFloor },
        scaleHeight: { value: scaleHeight },
        offset: { value: offset }
      },
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
    });
    if (useAlphaWeightedAdditive) {
      mat.blending = THREE.CustomBlending;
      mat.blendEquation = THREE.AddEquation;
      mat.blendSrc = THREE.SrcAlphaFactor;
      mat.blendDst = THREE.OneFactor;
    } else {
      mat.blending = THREE.AdditiveBlending;
    }
    return mat;
  }, [lightDirection, intensity, color, thickness, nearShell, radius, nearThicknessFactor, nearStrength, fresnelPower, nearContrast, nearSoftness, useAlphaWeightedAdditive]);

  // 更新uniforms
  useFrame(() => {
    if (atmosphereMaterial.uniforms.lightDir) {
      atmosphereMaterial.uniforms.lightDir.value.copy(lightDirection);
    }
    if (atmosphereMaterial.uniforms.intensity) {
      atmosphereMaterial.uniforms.intensity.value = intensity;
    }
    if (atmosphereMaterial.uniforms.color) {
      atmosphereMaterial.uniforms.color.value.setRGB(color[0], color[1], color[2]);
    }
    if (atmosphereMaterial.uniforms.thickness) {
      atmosphereMaterial.uniforms.thickness.value = thickness;
    }
    if (atmosphereMaterial.uniforms.fresnelPower) {
      atmosphereMaterial.uniforms.fresnelPower.value = fresnelPower;
    }
    if (atmosphereMaterial.uniforms.mainContrast) {
      atmosphereMaterial.uniforms.mainContrast.value = mainContrast;
    }
    if (atmosphereMaterial.uniforms.mainSoftness) {
      atmosphereMaterial.uniforms.mainSoftness.value = mainSoftness;
    }
    if (atmosphereMaterial.uniforms.earthRadius) {
      atmosphereMaterial.uniforms.earthRadius.value = radius;
    }
    if (atmosphereMaterial.uniforms.softBoundaryDelta) {
      atmosphereMaterial.uniforms.softBoundaryDelta.value = softBoundaryDelta ?? 0.0;
    }
    if (atmosphereMaterial.uniforms.perceptualFloor) {
      atmosphereMaterial.uniforms.perceptualFloor.value = perceptualFloor ?? 0.0;
    }
    if (atmosphereMaterial.uniforms.scaleHeight) {
      atmosphereMaterial.uniforms.scaleHeight.value = scaleHeight ?? 0.0;
    }
    if (atmosphereMaterial.uniforms.offset) {
      atmosphereMaterial.uniforms.offset.value = offset ?? 0.0;
    }
    
    if (nearShellMaterial?.uniforms.lightDir) {
      nearShellMaterial.uniforms.lightDir.value.copy(lightDirection);
    }
    if (nearShellMaterial?.uniforms.intensity) {
      nearShellMaterial.uniforms.intensity.value = intensity;
    }
    if (nearShellMaterial?.uniforms.color) {
      nearShellMaterial.uniforms.color.value.setRGB(color[0], color[1], color[2]);
    }
    if (nearShellMaterial?.uniforms.thickness) {
      nearShellMaterial.uniforms.thickness.value = thickness;
    }
    if (nearShellMaterial?.uniforms.nearFactor) {
      nearShellMaterial.uniforms.nearFactor.value = nearThicknessFactor;
    }
    if (nearShellMaterial?.uniforms.nearStrength) {
      nearShellMaterial.uniforms.nearStrength.value = nearStrength;
    }
    if (nearShellMaterial?.uniforms.fresnelPower) {
      nearShellMaterial.uniforms.fresnelPower.value = fresnelPower;
    }
    if (nearShellMaterial?.uniforms.nearContrast) {
      nearShellMaterial.uniforms.nearContrast.value = nearContrast;
    }
    if (nearShellMaterial?.uniforms.nearSoftness) {
      nearShellMaterial.uniforms.nearSoftness.value = nearSoftness;
    }
    if (nearShellMaterial?.uniforms.earthRadius) {
      nearShellMaterial.uniforms.earthRadius.value = radius;
    }
    if (nearShellMaterial?.uniforms.softBoundaryDelta) {
      nearShellMaterial.uniforms.softBoundaryDelta.value = softBoundaryDelta ?? 0.0;
    }
    if (nearShellMaterial?.uniforms.perceptualFloor) {
      nearShellMaterial.uniforms.perceptualFloor.value = perceptualFloor ?? 0.0;
    }
    if (nearShellMaterial?.uniforms.scaleHeight) {
      nearShellMaterial.uniforms.scaleHeight.value = scaleHeight ?? 0.0;
    }
    if (nearShellMaterial?.uniforms.offset) {
      nearShellMaterial.uniforms.offset.value = offset ?? 0.0;
    }
  });

  if (!visible) return null;

  return (
    <>
      {/* 主大气层 */}
      <mesh ref={ref} renderOrder={renderOrder}>
        <sphereGeometry args={[radius * (1.0 + thickness), 64, 64]} />
        <primitive object={atmosphereMaterial} attach="material" />
      </mesh>
      
      {/* 近地薄壳 */}
      {nearShell && nearShellMaterial && (
        <mesh ref={nearShellRef} renderOrder={renderOrder + 1}>
          <sphereGeometry args={[radius * (1.0 + thickness * Math.max(0.0, nearThicknessFactor)), 64, 64]} />
          <primitive object={nearShellMaterial} attach="material" />
        </mesh>
      )}
    </>
  );
}

// 大气辉光控制台命令
export function setupAtmosphereConsoleCommands(
  setComposition: (updater: (prev: any) => any) => void,
  composition: any
) {
  // 大气辉光控制台命令
  (window as any).setAtmosphereIntensity = (intensity: number) => { 
    try { 
      setComposition((prev: any) => ({ ...prev, atmoIntensity: intensity })); 
      console.log('[Atmosphere] Intensity set to', intensity); 
    } catch {} 
  };

  // 实验：启用/关闭 Alpha 加权加法混合（默认 false）
  (window as any).setAtmosphereBlendUseAlpha = (enabled: boolean) => {
    try {
      setComposition((prev: any) => ({ ...prev, atmoBlendUseAlpha: enabled }));
      console.log('[Atmosphere] Blend use alpha =', enabled);
    } catch {}
  };

  // 实验：尺度高度（0=关闭，建议 0.02~0.04）
  (window as any).setAtmosphereScaleHeight = (h: number) => {
    try {
      setComposition((prev: any) => ({ ...prev, atmoScaleHeight: h }));
      console.log('[Atmosphere] Scale height =', h);
    } catch {}
  };
  
  (window as any).setAtmosphereThickness = (thickness: number) => { 
    try { 
      setComposition((prev: any) => ({ ...prev, atmoThickness: thickness })); 
      console.log('[Atmosphere] Thickness set to', thickness); 
    } catch {} 
  };
  
  (window as any).setAtmosphereColor = (r: number, g: number, b: number) => { 
    try { 
      setComposition((prev: any) => ({ ...prev, atmoColor: [r, g, b] })); 
      console.log('[Atmosphere] Color set to', r, g, b); 
    } catch {} 
  };
  
  (window as any).setAtmosphereFresnelPower = (power: number) => { 
    try { 
      setComposition((prev: any) => ({ ...prev, atmoFresnelPower: power })); 
      console.log('[Atmosphere] Fresnel power set to', power); 
    } catch {} 
  };

  (window as any).setAtmosphereContrast = (c: number) => {
    try {
      setComposition((prev: any) => ({ ...prev, atmoContrast: c }));
      console.log('[Atmosphere] Main contrast =', c);
    } catch {}
  };

  // 实验：几何外缘软边（0=关闭，建议 0.005~0.01）
  (window as any).setAtmosphereSoftBoundary = (delta: number) => {
    try {
      setComposition((prev: any) => ({ ...prev, atmoSoftBoundary: delta }));
      console.log('[Atmosphere] Soft boundary delta =', delta);
    } catch {}
  };

  // 实验：感知地板（线性域阈值，0=关闭，建议 0.003~0.006）
  (window as any).setAtmospherePerceptualFloor = (t: number) => {
    try {
      setComposition((prev: any) => ({ ...prev, atmoPerceptualFloor: t }));
      console.log('[Atmosphere] Perceptual floor =', t);
    } catch {}
  };
  
  (window as any).setAtmosphereNearShell = (enabled: boolean) => { 
    try { 
      setComposition((prev: any) => ({ ...prev, atmoNearShell: enabled })); 
      console.log('[Atmosphere] Near shell', enabled ? 'enabled' : 'disabled'); 
    } catch {} 
  };

  (window as any).setNearShellStrength = (v: number) => {
    try {
      setComposition((prev: any) => ({ ...prev, atmoNearStrength: v }));
      console.log('[Atmosphere] Near shell strength =', v);
    } catch {}
  };

  (window as any).setNearShellThicknessFactor = (f: number) => {
    try {
      setComposition((prev: any) => ({ ...prev, atmoNearThickness: f }));
      console.log('[Atmosphere] Near shell thickness factor =', f);
    } catch {}
  };

  (window as any).setNearShellContrast = (c: number) => {
    try {
      setComposition((prev: any) => ({ ...prev, atmoNearContrast: c }));
      console.log('[Atmosphere] Near shell contrast =', c);
    } catch {}
  };
  
  (window as any).getAtmosphereSettings = () => { 
    try { 
      return {
        enableAtmosphere: composition.enableAtmosphere,
        atmoIntensity: composition.atmoIntensity,
        atmoThickness: composition.atmoThickness,
        atmoColor: composition.atmoColor,
        atmoFresnelPower: composition.atmoFresnelPower,
        atmoSoftness: composition.atmoSoftness,
        atmoContrast: composition.atmoContrast,
        atmoNearShell: composition.atmoNearShell,
        atmoNearStrength: composition.atmoNearStrength,
        atmoNearThickness: composition.atmoNearThickness,
        atmoNearContrast: composition.atmoNearContrast,
        atmoNearSoftness: composition.atmoNearSoftness,
        atmoSoftBoundary: composition.atmoSoftBoundary,
        atmoPerceptualFloor: composition.atmoPerceptualFloor
      }; 
    } catch { return null; } 
  };
}
