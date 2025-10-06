import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { calculateMoonPhase } from '../../utils/moonPhaseCalculator';
import { getMoonPhase } from '../moonPhase';
import { computeEphemeris } from '../../../../astro/ephemeris';
import { getScreenAnchoredPosition } from '../../utils/positionUtils';

// 🌙 固定月球相机系统 - 完全独立于主场景
const FIXED_MOON_CAMERA = {
  position: new THREE.Vector3(0, 0, 3),    // 固定观察距离
  target: new THREE.Vector3(0, 0, 0),      // 总是看向月球中心  
  up: new THREE.Vector3(0, 1, 0)           // 固定上方向
};

// 创建固定的视图矩阵（组件外部，避免重复计算）
const FIXED_MOON_VIEW_MATRIX = new THREE.Matrix4().lookAt(
  FIXED_MOON_CAMERA.position,
  FIXED_MOON_CAMERA.target,
  FIXED_MOON_CAMERA.up
);

// 🌙 计算UV旋转矩阵（实现潮汐锁定）
function calculateUVRotation(moonYawDeg: number, lonDeg: number, latDeg: number): THREE.Matrix3 {
  // 将潮汐锁定参数转换为UV旋转
  // 主要使用经度旋转，绕UV中心点(0.5, 0.5)旋转
  const rotationRad = THREE.MathUtils.degToRad(lonDeg);
  
  // 标准的2D旋转矩阵（绕中心点旋转）
  const cos = Math.cos(rotationRad);
  const sin = Math.sin(rotationRad);
  
  // 正确的UV旋转矩阵：绕中心点(0.5, 0.5)旋转
  // 变换链：T(0.5,0.5) * R(θ) * T(-0.5,-0.5)
  const matrix = new THREE.Matrix3().set(
    cos, -sin, 0.5 * (1 - cos) + 0.5 * sin,
    sin,  cos, 0.5 * (1 - cos) - 0.5 * sin,
    0,    0,   1
  );
  
  // 调试输出
  if (new URLSearchParams(location.search).get('debug') === '1') {
    console.log('[UV Rotation Matrix Fixed]', {
      lonDeg,
      rotationRad: rotationRad * 180 / Math.PI,
      cos: cos.toFixed(3),
      sin: sin.toFixed(3),
      matrix: matrix.elements.map(x => x.toFixed(3))
    });
  }
  
  return matrix;
}

// 全局测试函数
(window as any).testMoonPhaseFormula = (angleDeg: number, R: THREE.Vector3, F: THREE.Vector3) => {
  const angleRad = (angleDeg * Math.PI) / 180;
  const testS = new THREE.Vector3()
    .add(R.clone().multiplyScalar(-Math.sin(angleRad)))
    .add(F.clone().multiplyScalar(-Math.cos(angleRad)))
    .normalize();
  
  console.log(`测试角度 ${angleDeg}°:`, {
    angleRad: angleRad.toFixed(3),
    sin: Math.sin(angleRad).toFixed(3),
    cos: Math.cos(angleRad).toFixed(3),
    neg_sin: (-Math.sin(angleRad)).toFixed(3),
    neg_cos: (-Math.cos(angleRad)).toFixed(3),
    sunDirection: testS.toArray(),
    lightingSide: testS.x > 0.3 ? '右侧' : testS.x < -0.3 ? '左侧' : testS.z > 0.3 ? '前方' : testS.z < -0.3 ? '后方' : '其他方向'
  });
  
  return testS;
};

// 月球组件 - 支持潮汐锁定和Uniform照明
export function Moon({ 
  position, 
  radius, 
  lightDirection, 
  useTextures,
  lightColor,
  sunIntensity,
  // 月球光照强度极值控制
  moonLightMinRatio = 0.3,
  moonLightMaxRatio = 0.6,
  tiltDeg = 0,
  yawDeg = 0,
  latDeg = 0,
  lonDeg = 0,
  moonYawDeg = 0,
  name = 'moonMesh',
  // earthPosition,           // 移除地球位置参数，让月球朝向相机实现真正的潮汐锁定
  sunDirWorldForShading,   // 真实太阳方向向量，用于Uniform照明
  enableTidalLock = false, // 是否启用潮汐锁定
  enableUniformShading = false, // 是否启用Uniform照明
  currentDate = '',          // 当前日期时间，用于月球自转计算
  observerLat,             // 观察者纬度
  observerLon,              // 观察者经度
  useCameraLockedPhase = false, // 是否使用相机锁定月相
  renderLayer = 0,          // 渲染图层
  customCameraForTideLock,
  customCameraForPhase,
  // 外观增强参数
  terminatorSoftness = 0.06,
  moonTintH = 0,
  moonTintS = 0.75,
  moonTintL = 0.5,
  moonTintStrength = 0,
  moonShadingGamma = 0.6,
  moonSurgeStrength = 0.15,
  moonSurgeSigmaDeg = 18,
  moonDisplacementScale = 0.02,
  moonNormalScale = 0.2,
  normalFlipY = true,
  normalFlipX = false,
  terminatorRadius = 0.02,
  phaseCoupleStrength = 0.0,
  nightLift = 0.02,
  // 🌙 屏幕锚定参数
  enableScreenAnchor = false,
  screenX = 0.5,
  screenY = 0.75,
  anchorDistance = 14,
  // 纹理参数 - 从父组件传入
  moonMap = undefined,
  moonNormalMap = undefined,
  moonDisplacementMap = undefined,
}: {
  position: [number, number, number];
  radius: number;
  lightDirection: THREE.Vector3;
  useTextures: boolean;
  lightColor: THREE.Color;
  sunIntensity: number;
  // 月球光照强度极值控制
  moonLightMinRatio?: number;
  moonLightMaxRatio?: number;
  tiltDeg?: number;
  yawDeg?: number;
  latDeg?: number;
  lonDeg?: number;
  moonYawDeg?: number;
  name?: string;
  // earthPosition?: [number, number, number]; // 移除地球位置参数
  sunDirWorldForShading?: THREE.Vector3; // 真实太阳方向
  enableTidalLock?: boolean; // 潮汐锁定开关
  enableUniformShading?: boolean; // Uniform照明开关
  currentDate?: string; // 当前日期时间
  observerLat?: number; // 观察者纬度
  observerLon?: number; // 观察者经度
  useCameraLockedPhase?: boolean;
  renderLayer?: number;
  customCameraForTideLock?: THREE.Camera;
  customCameraForPhase?: THREE.Camera;
  terminatorSoftness?: number;
  moonTintH?: number;
  moonTintS?: number;
  moonTintL?: number;
  moonTintStrength?: number;
  moonShadingGamma?: number;
  moonSurgeStrength?: number;
  moonSurgeSigmaDeg?: number;
  moonDisplacementScale?: number;
  moonNormalScale?: number;
  normalFlipY?: boolean;
  normalFlipX?: boolean;
  terminatorRadius?: number;
  phaseCoupleStrength?: number;
  displacementMid?: number;      // 位移中点（通常0.5，决定正负起伏平衡）
  nightLift?: number;            // 夜面抬升（0-0.2），避免新月过亮
  // 🌙 屏幕锚定参数
  enableScreenAnchor?: boolean;  // 是否启用屏幕锚定
  screenX?: number;              // 屏幕X位置 (0-1)
  screenY?: number;              // 屏幕Y位置 (0-1)
  anchorDistance?: number;       // 锚定距离
  // 纹理参数
  moonMap?: THREE.Texture;
  moonNormalMap?: THREE.Texture;
  moonDisplacementMap?: THREE.Texture;
}) {
  const meshRef = React.useRef<THREE.Mesh>(null!);
  const { camera } = useThree();
  const tideCam = customCameraForTideLock || camera;
  const phaseCam = customCameraForPhase || camera;
  // 纹理从父组件传入，不再在这里加载
  
  // [🔧 彻底修复] 使用真实太阳和月球向量，不再依赖 Elongation 拼接
  const sunDirectionInfo = useMemo(() => {
    try {
      if (currentDate && observerLat !== undefined && observerLon !== undefined) {
        // 获取真实的太阳和月球向量
        const phaseInfo = getMoonPhase(currentDate, observerLat, observerLon);
        
        // 直接使用真实的太阳方向向量
        const realSunDir = phaseInfo.sunDirection.clone();
        
        // 使用预计算的位置角
        const positionAngleDeg = phaseInfo.positionAngle * 180 / Math.PI;
        
        // 基于黄经差的月相判断（适用于固定月球系统）
        let lightingSide: string;
        const phaseLonDeg = ((phaseInfo.positionAngle + Math.PI) * 180 / Math.PI) % 360;
        if (phaseLonDeg < 45 || phaseLonDeg > 315) lightingSide = '前方（朔月）';
        else if (phaseLonDeg >= 45 && phaseLonDeg < 135) lightingSide = '右侧（上弦）';
        else if (phaseLonDeg >= 135 && phaseLonDeg < 225) lightingSide = '后方（满月）';
        else lightingSide = '左侧（下弦）';

        console.log('[Moon Phase] 固定月球系统计算:', {
          currentDate,
          observerLat,
          observerLon,
          gamma_deg: (phaseInfo.phaseAngleRad * 180 / Math.PI).toFixed(1) + '°',
          renderSunDirection: realSunDir.toArray().map(x => x.toFixed(3)),
          illumination: phaseInfo.illumination.toFixed(3),
          positionAngle: positionAngleDeg.toFixed(1) + '°',
          phaseLonDeg: phaseLonDeg.toFixed(1) + '°',
          lightingSideForFixedMoon: lightingSide
        });
        
        // 计算基于月相的动态光照强度比例
        const fullness = 0.5 + 0.5 * Math.cos(phaseInfo.phaseAngleRad);
        const moonIntensityRatio = moonLightMinRatio + (moonLightMaxRatio - moonLightMinRatio) * fullness;

        return {
          sunDirection: realSunDir,
          illumination: phaseInfo.illumination,
          positionAngle: phaseInfo.positionAngle,
          moonDirection: phaseInfo.moonDirection,
          moonIntensityRatio
        };
      } else {
        console.warn('[Moon Phase] 参数缺失:', {
          currentDate,
          observerLat,
          observerLon
        });
        return null;
      }
    } catch (err) {
      console.error('[Moon Phase] 计算失败:', err);
      return null;
    }
  }, [currentDate, observerLat, observerLon, moonLightMinRatio, moonLightMaxRatio]);

  // 本地月相信息仅用于 UI 日志（不驱动渲染向量）
  const moonPhaseResult = useMemo(() => {
    try {
      if (currentDate && observerLat !== undefined && observerLon !== undefined) {
        return calculateMoonPhase(new Date(currentDate), observerLat, observerLon);
      }
    } catch {}
    return null;
  }, [currentDate, observerLat, observerLon]);

  // [🔧 彻底修复] 直接使用真实太阳方向向量
  const sdirWorld: THREE.Vector3 | undefined = useMemo(() => {
    if (!sunDirectionInfo) {
      console.log('[Moon Phase] 跳过太阳方向计算:', {
        reason: '太阳方向信息为空'
      });
      return undefined;
    }
    
    // 直接使用真实的太阳方向向量
    const S = sunDirectionInfo.sunDirection.clone().normalize();
    const positionAngleDeg = (sunDirectionInfo.positionAngle || 0) * 180 / Math.PI;
    
    // 基于黄经差的月相判断（固定月球系统）
    let accurateLightingSide: string;
    const phaseLonDeg = ((sunDirectionInfo.positionAngle || 0) + Math.PI) * 180 / Math.PI % 360;
    if (phaseLonDeg < 45 || phaseLonDeg > 315) accurateLightingSide = '前方（朔月）';
    else if (phaseLonDeg >= 45 && phaseLonDeg < 135) accurateLightingSide = '右侧（上弦）';
    else if (phaseLonDeg >= 135 && phaseLonDeg < 225) accurateLightingSide = '后方（满月）';
    else accurateLightingSide = '左侧（下弦）';

    console.log('[Moon Phase] 真实向量太阳方向计算完成:', {
      currentDate,
      observerLat,
      observerLon,
      sunDirection: S.toArray().map(x => x.toFixed(3)),
      positionAngle: positionAngleDeg.toFixed(1) + '°',
      lightingSideFromRealVector: accurateLightingSide,
      isNormalized: (S.length() - 1 < 1e-6)
    });

    // 将调试信息输出到全局变量，方便在控制台查看
    (window as any).moonPhaseDebug = {
      sunDirection: S.toArray().map(x => x.toFixed(3)),
      positionAngle: positionAngleDeg.toFixed(1) + '°',
      lightingSideFromRealVector: accurateLightingSide,
      timestamp: new Date().toISOString(),
      source: 'real_vectors_from_astronomy_engine'
    };
    
    // 输出太阳方向信息
    console.log('=== 真实向量太阳方向信息 ===');
    console.log('太阳方向:', S.toArray().map(x => x.toFixed(3)));
    console.log('位置角:', positionAngleDeg.toFixed(1) + '°');
    console.log('光照侧（基于真实向量）:', accurateLightingSide);
    
    return S;
  }, [sunDirectionInfo, currentDate, observerLat, observerLon]);
  
  // 辅助函数：根据相位角判断期望的光照方向（基于elongation）
  function getExpectedLightingForPhase(angleRad: number): string {
    const angle = angleRad * 180 / Math.PI;
    if (angle < 45) return '前方（新月）';
    else if (angle < 135) return '右侧（上弦月）';
    else if (angle < 225) return '后方（满月）';
    else if (angle < 315) return '左侧（下弦月）';
    else return '前方（新月）';
  }
  
    
  // 从 HSL 计算色调
  const tintColor = useMemo(() => {
    const c = new THREE.Color();
    c.setHSL((((moonTintH % 360) + 360) % 360) / 360, Math.max(0, Math.min(1, moonTintS)), Math.max(0, Math.min(1, moonTintL)));
    return c;
  }, [moonTintH, moonTintS, moonTintL]);

  // 月球材质 - 支持Uniform照明
  const moonMaterial = useMemo(() => {
    // 如果没有纹理，使用更明显的默认材质
    if (!moonMap) {
      return new THREE.MeshPhongMaterial({
        color: new THREE.Color('#e8e8e8'), // 使用更自然的月球颜色
        shininess: 5,
        specular: new THREE.Color('#ffffff'),
        emissive: new THREE.Color('#333333'), // 添加一些自发光
        emissiveIntensity: 0.05
      });
    }
    
    if (enableUniformShading && (sdirWorld || sunDirWorldForShading)) {
      // 创建支持Uniform照明的自定义着色器材质
      const dispScale = Math.max(0, moonDisplacementScale) * 0.05; // 线性映射，响应更灵敏
      
      // 🔍 调试：确认使用自定义Shader
      if (new URLSearchParams(location.search).get('debug') === '1') {
        console.log('[Moon Material] Using custom ShaderMaterial with UV rotation');
      }
      
      return new THREE.ShaderMaterial({
        uniforms: {
          moonMap: { value: moonMap },
          displacementMap: { value: moonDisplacementMap },
          // 🌙 新增：固定的月球视图矩阵
          moonViewMatrix: { value: FIXED_MOON_VIEW_MATRIX },
          // 🌙 新增：UV旋转角度（简化传递）
          uvRotationAngle: { value: THREE.MathUtils.degToRad(lonDeg || 0) },
          // 选择相机锁定或真实几何月相
          sunDirWorldForShading: { value: (useCameraLockedPhase ? (sdirWorld ?? sunDirWorldForShading) : (sunDirWorldForShading ?? sdirWorld)) },
          lightColor: { value: lightColor },
          sunIntensity: { value: sunIntensity },
          moonIntensityRatio: { value: 1.0 }, // 将在useEffect中动态更新
          nightLift: { value: nightLift },
          displacementScale: { value: dispScale },
          displacementBias: { value: 0 },
          normalMap: { value: moonNormalMap ?? null },
          normalScale: { value: moonNormalScale },
          normalFlipY: { value: normalFlipY ? 1.0 : 0.0 },
          normalFlipX: { value: normalFlipX ? 1.0 : 0.0 },
          hasNormalMap: { value: moonNormalMap ? 1.0 : 0.0 },
          terminatorSoftness: { value: terminatorSoftness },
          terminatorRadius: { value: terminatorRadius },
          shadingGamma: { value: moonShadingGamma },
          tintColor: { value: tintColor },
          tintStrength: { value: moonTintStrength },
            phaseAngleRad: { value: 0 }, // 不再使用相位角，改为基于真实太阳方向
          phaseCoupleStrength: { value: phaseCoupleStrength },
          surgeStrength: { value: moonSurgeStrength },
          surgeSigmaRad: { value: (moonSurgeSigmaDeg * Math.PI) / 180 }
        },
        extensions: { clipCullDistance: true, multiDraw: false },
        vertexShader: `
          varying vec2 vUv;
          varying vec2 vUvRotated;
          varying vec3 vNormal;
          varying vec3 vPosition;
          varying vec3 vViewPosition;
          uniform sampler2D displacementMap;
          uniform float displacementScale;
          uniform float displacementBias;
          uniform float phaseAngleRad;
          uniform float phaseCoupleStrength;
          uniform float displacementMid;
          uniform float uvRotationAngle;
          
          void main() {
            vUv = uv;
            
            // 🌙 放弃UV旋转，直接使用原始UV（无拉伸）
            vUvRotated = uv;
            vNormal = normalize(normalMatrix * normal);
            // 顶点位移（沿法线）
            float disp = 0.0;
            if (displacementScale != 0.0) {
              float fullness = 0.5 + 0.5 * cos(phaseAngleRad);
              float couple = 1.0 + phaseCoupleStrength * 0.5 * fullness;
              float dscale = displacementScale * couple;
              float h = texture2D(displacementMap, vUvRotated).r - displacementMid;
              disp = h * dscale + displacementBias;
            }
            vec3 displaced = position + normal * disp;
            vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
            vViewPosition = mvPosition.xyz;
            vPosition = (modelMatrix * vec4(displaced, 1.0)).xyz;
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          #ifdef GL_OES_standard_derivatives
          #extension GL_OES_standard_derivatives : enable
          #endif
          uniform sampler2D moonMap;
          uniform sampler2D displacementMap;
          uniform sampler2D normalMap;
          uniform mat4 moonViewMatrix;
          uniform vec3 sunDirWorldForShading;
          uniform vec3 lightColor;
          uniform float sunIntensity;
          uniform float moonIntensityRatio;
          uniform float nightLift;
          uniform float displacementScale;
          uniform float displacementBias;
          uniform float normalScale;
          uniform float normalFlipY;
          uniform float normalFlipX;
          uniform float hasNormalMap;
          uniform float terminatorSoftness;
          uniform float terminatorRadius;
          uniform float shadingGamma;
          uniform vec3 tintColor;
          uniform float tintStrength;
          uniform float phaseAngleRad;
          uniform float phaseCoupleStrength;
          uniform float surgeStrength;
          uniform float surgeSigmaRad;
          
          varying vec2 vUv;
          varying vec2 vUvRotated;
          varying vec3 vNormal;
          varying vec3 vPosition;
          varying vec3 vViewPosition;

          vec3 perturbNormal2Arb( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
            vec3 q0 = dFdx( eye_pos );
            vec3 q1 = dFdy( eye_pos );
            vec2 st0 = dFdx( uv );
            vec2 st1 = dFdy( uv );
            vec3 S = normalize( q0 * st1.t - q1 * st0.t );
            vec3 T = normalize( -q0 * st1.s + q1 * st0.s );
            vec3 N = normalize( surf_norm );
            vec3 mapN = texture2D( normalMap, uv ).xyz * 2.0 - 1.0;
            if (normalFlipY > 0.5) mapN.y = -mapN.y;
            if (normalFlipX > 0.5) mapN.x = -mapN.x;
            float fullness = 0.5 + 0.5 * cos(phaseAngleRad);
            float couple = 1.0 + phaseCoupleStrength * 0.5 * fullness;
            float ns = normalScale * couple;
            mapN.xy *= ns;
            mat3 tsn = mat3( S, T, N );
            return normalize( tsn * mapN );
          }
          
          void main() {
            // 🌙 基础纹理颜色（使用旋转后的UV实现潮汐锁定）
            vec3 moonColor = texture2D(moonMap, vUvRotated).rgb;
            
            // 计算朗伯漫反射
            vec3 normal = normalize(vNormal);
            if (normalScale != 0.0 && hasNormalMap > 0.5) {
              normal = perturbNormal2Arb( vViewPosition, normal, vUvRotated );
            }
            // 🌙 使用固定的月球视图矩阵，不依赖主场景相机
            vec3 lightDir = normalize( (moonViewMatrix * vec4(sunDirWorldForShading, 0.0)).xyz );
            float ndl = max(dot(normal, lightDir), 0.0);
            ndl = pow(ndl, max(0.001, shadingGamma));
            
            // 晨昏线过渡（软半径叠加）
            float edge = clamp(terminatorSoftness + terminatorRadius, 0.0, 0.5);
            float terminator = smoothstep(0.0 - edge, 0.0 + edge, ndl);
            
            // 增强暗部细节，提高对比度
            float shadowEnhancement = 1.0 - terminator;
            vec3 enhancedColor = mix(moonColor * 0.3, moonColor * 1.5, terminator);
            
            // Opposition surge（满月增强）
            float a = clamp(phaseAngleRad, 0.0, 3.14159265);
            float surge = 1.0 + surgeStrength * exp(-pow(a / max(1e-4, surgeSigmaRad), 2.0));
            // 相位耦合亮度：允许小幅影响整体亮度（可选，默认 phaseCoupleStrength=0 即无影响）
            float fullness = 0.5 + 0.5 * cos(phaseAngleRad);
            float coupleL = mix(1.0, fullness, clamp(phaseCoupleStrength, 0.0, 1.0));
            vec3 litColor = enhancedColor * lightColor * sunIntensity * moonIntensityRatio * (ndl * 1.2 + 0.1) * surge * coupleL;
            
            // 确保暗部足够暗，亮部足够亮
            vec3 finalColor = mix(litColor, enhancedColor * 0.15, shadowEnhancement * 0.8);
            // 暗面提亮控制：根据夜面比例(1-ndl)线性抬升到 nightLift
            float darkRatio = clamp(1.0 - ndl, 0.0, 1.0);
            finalColor += moonColor * nightLift * darkRatio;
            // 色调混合
            finalColor = mix(finalColor, finalColor * tintColor, clamp(tintStrength, 0.0, 1.0));
            
            // 最终调整，确保整体可见性
            finalColor = max(finalColor, moonColor * 0.08);
            
            gl_FragColor = vec4(finalColor, 1.0);
          }
        `
      });
    }
    
    // 使用标准材质（非Uniform照明模式）
    const dispScaleStd = Math.max(0, moonDisplacementScale) * 0.05;
    return new THREE.MeshStandardMaterial({
      map: moonMap,
      displacementMap: moonDisplacementMap,
      displacementScale: dispScaleStd,
      displacementBias: 0,
      normalMap: moonNormalMap ?? undefined,
      normalScale: new THREE.Vector2(moonNormalScale, moonNormalScale),
      roughness: 0.9,
      metalness: 0.0,
      envMapIntensity: 0,
      lightMapIntensity: 0,
      aoMapIntensity: 0,
      emissive: new THREE.Color('#222222'),
      emissiveIntensity: 0.02,
      // 🌙 深度控制：即使屏幕锚定也写入深度，避免文本/其他对象穿透
      depthTest: true,
      depthWrite: true
    });
  }, [moonMap, moonDisplacementMap, enableUniformShading, sdirWorld, sunDirWorldForShading, lightColor, sunIntensity, terminatorSoftness, moonShadingGamma, tintColor, moonTintStrength, sunDirectionInfo, moonSurgeStrength, moonSurgeSigmaDeg, moonDisplacementScale, moonNormalScale, enableScreenAnchor, lonDeg, nightLift]);

  // 🌙 每帧更新屏幕锚定位置
  useFrame(() => {
    if (!meshRef.current) return;
    
    // 屏幕锚定逻辑
    if (enableScreenAnchor) {
      try {
        const newPosition = getScreenAnchoredPosition(screenX, screenY, anchorDistance, camera);
        meshRef.current.position.copy(newPosition);
        
        // 🌙 方案B：几何旋转潮汐锁定（放弃UV旋转）
        if (enableTidalLock) {
          // 先面向相机
          meshRef.current.lookAt(camera.position);
          
          // 再应用潮汐锁定偏移
          const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), THREE.MathUtils.degToRad(moonYawDeg || 0));
          const qLon = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(lonDeg || 0));
          const qLat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(latDeg || 0));
          
          // 组合潮汐锁定偏移
          const qOffset = new THREE.Quaternion().multiply(qYaw).multiply(qLon).multiply(qLat);
          
          // 应用到当前旋转
          meshRef.current.quaternion.multiply(qOffset);
          
          // 调试信息已移除，避免控制台刷屏
        }
      } catch (error) {
        console.error('[MoonScreenAnchor] Update failed:', error);
      }
    } else if (enableTidalLock) {
      // 🌙 传统模式潮汐锁定（合并到主useFrame中，避免执行顺序冲突）
      try {
        const moon = meshRef.current;
        const moonPos = new THREE.Vector3(position[0], position[1], position[2]);
        let targetDir: THREE.Vector3;
        
        // 移除 earthPosition 依赖，始终朝向相机实现真正的潮汐锁定
        const camPos = new THREE.Vector3();
        tideCam.getWorldPosition(camPos);
        targetDir = camPos.sub(moonPos).normalize();
        
        // 基础对齐：将局部+Z旋到 targetDir
        const qBase = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), targetDir);
        // 潮汐锁定修正：水平转角作为主要潮汐锁定面，然后微调经纬度
        const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), THREE.MathUtils.degToRad(moonYawDeg || 0));
        const qLon = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(lonDeg || 0));
        const qLat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(latDeg || 0));
        const qFinal = qBase.clone().multiply(qYaw).multiply(qLon).multiply(qLat);
        moon.quaternion.copy(qFinal);
      } catch (error) {
        console.error('[Traditional Tidal Lock] Update failed:', error);
      }
    }
    
    // Uniform 照明方向更新
    if (enableUniformShading) {
      const mat = (meshRef.current.material as any) as THREE.ShaderMaterial;
      if (mat && mat instanceof THREE.ShaderMaterial && mat.uniforms && mat.uniforms.sunDirWorldForShading) {
        try {
          if (useCameraLockedPhase && sunDirectionInfo) {
            // [🔧 关键修复] 直接使用月球视角的太阳方向，实现正确的月相效果
            const S = sunDirectionInfo.sunDirection.clone().normalize();
            mat.uniforms.sunDirWorldForShading.value.copy(S);
          } else if (sunDirWorldForShading) {
            // 真实几何：直接使用世界太阳方向（由上层传入），随时间/季节变化
            mat.uniforms.sunDirWorldForShading.value.copy(sunDirWorldForShading);
          }
        } catch {}
      }
    }
  });

  // 🌙 屏幕尺寸恒定缩放：仅在必要事件变化时更新
  React.useEffect(() => {
    try {
      if (!meshRef.current) return;
      if (!enableScreenAnchor) return; // 仅屏幕锚定模式需要锁尺寸
      const cam = camera as THREE.PerspectiveCamera;
      if (!('fov' in cam)) return;
      const fovY = THREE.MathUtils.degToRad((cam as THREE.PerspectiveCamera).fov || 45);
      const d = anchorDistance;
      // 目标屏幕高度占比（0-1），若未指定则回退为以半径为准
      const s = (typeof (window as any)?.__LuBirthMoonScreenSize === 'number') ? (window as any).__LuBirthMoonScreenSize : undefined;
      const screenSize = s ?? 0; // 若未提供参数则不改缩放
      if (screenSize > 0) {
        const targetRadius = d * Math.tan((screenSize * fovY) / 2);
        const baseRadius = radius;
        const scale = Math.max(0.01, targetRadius / Math.max(1e-6, baseRadius));
        meshRef.current.scale.setScalar(scale);
      }
    } catch (e) {
      console.error('[Moon] screen-size lock failed:', e);
    }
    // 依赖：FOV、画布尺寸、锚定距离、半径、以及用户参数
  }, [camera, (camera as any)?.fov, (camera as any)?.aspect, anchorDistance, radius, enableScreenAnchor]);

  // 🌙 屏幕锚定模式的旋转现在在 useFrame 中处理，无需单独的 useEffect

  // 🌙 传统模式潮汐锁定现在已合并到主 useFrame 中，避免执行顺序冲突

  // 详细调试信息
  useEffect(() => {
    if (new URLSearchParams(location.search).get('debug') === '1') {
      console.log('[SimpleMoon Debug]', {
        // 基础参数
        position,
        radius,
        lightDirection: lightDirection.toArray(),
        useTextures,
        hasMap: !!moonMap,
        hasDisplacement: !!moonDisplacementMap,
        
        // 月相相关
          chi: sunDirectionInfo ? '已计算' : null,
        observerLat,
        observerLon,
        currentDate,
        
        // 正交基和太阳方向
        sdirWorld: sdirWorld?.toArray(),
        sunDirWorldForShading: sunDirWorldForShading?.toArray(),
        finalSunDir: (sdirWorld ?? sunDirWorldForShading)?.toArray(),
        
        // 渲染设置
        enableTidalLock,
        enableUniformShading,
        useCameraLockedPhase,
        
        // 材质参数
        moonNormalScale,
        moonDisplacementScale,
        normalFlipY,
        terminatorRadius,
        phaseCoupleStrength,
        
        // 本地计算的月相（仅对比）
        moonPhaseResult: moonPhaseResult ? {
          phaseAngle: moonPhaseResult.phaseAngle.toFixed(1) + '°',
          illumination: moonPhaseResult.illumination.toFixed(3),
          phaseName: moonPhaseResult.phaseName,
          moonRotation: (moonPhaseResult.moonRotation * 180 / Math.PI).toFixed(1) + '°'
        } : null,
        
        mode: 'enhanced-moon-system'
      });
      
      // 额外调试：分析光照方向
      if (sdirWorld ?? sunDirWorldForShading) {
        const sunDir = sdirWorld ?? sunDirWorldForShading;
        if (sunDir) {
          // 计算准确的位置角和光照侧
          const F = new THREE.Vector3(0, 0, -1);
          const U = new THREE.Vector3(0, 1, 0);
          const R = new THREE.Vector3().crossVectors(U, F);
          
          const sR = sunDir.dot(R);
          const sF = sunDir.dot(F.clone().multiplyScalar(-1));
          const chi = Math.atan2(sR, sF) * 180 / Math.PI;
          
          let accurateSide: string;
          if (Math.abs(chi) < 45) accurateSide = '前方（朔月）';
          else if (chi >= 45 && chi < 135) accurateSide = '右侧（上弦）';  // X轴翻转后，正角度对应右侧
          else if (Math.abs(chi) >= 135) accurateSide = '后方（满月）';
          else accurateSide = '左侧（下弦）';  // X轴翻转后，负角度对应左侧
          
          console.log('[SimpleMoon Lighting Analysis]', {
            sunDirection: sunDir.toArray(),
            x: sunDir.x.toFixed(3),
            y: sunDir.y.toFixed(3),
            z: sunDir.z.toFixed(3),
            positionAngleChi: chi.toFixed(1) + '°',
            lightingSideAccurate: accurateSide,
            legacyLightingSide: sunDir.x > 0.3 ? '右侧' : sunDir.x < -0.3 ? '左侧' : sunDir.z > 0.3 ? '前方' : sunDir.z < -0.3 ? '后方' : '其他方向',
            expectedLighting: '基于真实太阳方向和位置角计算'
          });
        }
      }
    }
  }, [position, radius, lightDirection, useTextures, moonMap, moonDisplacementMap, 
       enableTidalLock, enableUniformShading, sdirWorld, moonPhaseResult, observerLat, observerLon, currentDate, sunDirWorldForShading, sunDirectionInfo]);

  // 将月球世界半径暴露给全局，供歌词计算前后层次使用
  React.useEffect(() => {
    try {
      const scale = new THREE.Vector3();
      meshRef.current?.getWorldScale(scale);
      const geo = (meshRef.current as any)?.geometry as THREE.BufferGeometry | undefined;
      const r = geo?.boundingSphere ? geo.boundingSphere.radius * Math.max(scale.x, scale.y, scale.z) : radius;
      (window as any).__MOON_RADIUS_WORLD = r;
    } catch {}
  });
  
  // 辅助函数：根据相位角判断期望的光照方向
  function getExpectedLightingSide(angleRad: number): string {
    const angle = angleRad * 180 / Math.PI;
    if (angle < 45) return '前方';
    else if (angle < 135) return '右侧';
    else if (angle < 225) return '后方';
    else if (angle < 315) return '左侧';
    else return '前方';
  }

  // 图层设置
  React.useEffect(() => {
    if (meshRef.current) {
      meshRef.current.layers.set(renderLayer || 0);
    }
  }, [renderLayer]);

  // 更新月球光照强度比例
  React.useEffect(() => {
    if (moonMaterial && 'uniforms' in moonMaterial && sunDirectionInfo?.moonIntensityRatio !== undefined) {
      (moonMaterial as THREE.ShaderMaterial).uniforms.moonIntensityRatio.value = sunDirectionInfo.moonIntensityRatio;
    }
  }, [moonMaterial, sunDirectionInfo?.moonIntensityRatio]);

  // 月球自转逻辑 - 非潮汐锁定时才生效，避免日期变更导致的小角度抖动
  React.useEffect(() => {
    if (!meshRef.current) return;
    if (enableTidalLock) return; // 潮汐锁定时不做任何自转/贴图旋转，这些在前面的潮锁effect里完成
    if (enableScreenAnchor) return; // 🌙 屏幕锚定模式下完全跳过旋转逻辑
    
    // 重置旋转
    meshRef.current.rotation.set(0, 0, 0);
    
    // 如果不启用潮汐锁定，则应用基于时间的自转（用于演示月相变化）
    if (currentDate) {
      const date = new Date(currentDate);
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
      
      // 月球自转：每天约13.2度（360度/27.3天）
      const dailyRotation = (dayOfYear % 27.3) * 13.2;
      // 加上当天的时间影响：每小时0.55度（13.2度/24小时）
      const hourlyRotation = hours * 0.55 + minutes * 0.0092;
      
      const moonRotationY = (dailyRotation + hourlyRotation) * Math.PI / 180;
      meshRef.current.rotateY(moonRotationY);
    }
    
    // 应用经纬度调整（贴图对齐）- 仅非潮汐锁定分支需要
    meshRef.current.rotateY(THREE.MathUtils.degToRad(lonDeg));
    meshRef.current.rotateX(THREE.MathUtils.degToRad(latDeg));
    
    // 调试信息已移除，避免控制台刷屏
    
  }, [currentDate, enableTidalLock, latDeg, lonDeg]);

  return (
    <mesh 
      ref={meshRef}
      name={name}
      position={position}
      // 🌙 渲染层级控制：避免强制置前以干扰深度
      // renderOrder={999}
      // 🔧 关键修复：移除rotation prop，避免与四元数旋转冲突
      // 月球旋转现在完全由position控制
    >
      <sphereGeometry args={[radius, 64, 64]} />
      <primitive object={moonMaterial} attach="material" />
      
      {/* 月球经纬度调整 - 贴图对齐 */}
      <group
        // 🔧 关键修复：移除rotation prop，避免与四元数旋转冲突
        // 月球贴图对齐现在通过position计算
      >
        {/* 月球表面细节可以在这里添加 */}
      </group>
    </mesh>
  );
}
