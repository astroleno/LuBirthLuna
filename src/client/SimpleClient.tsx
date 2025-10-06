import React, { useMemo, useState, useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Stars, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// 统一的黄昏点计算函数
function calculateDuskLongitude(sunWorld: {x: number, y: number, z: number}, dateISO: string, latDeg: number, lonDeg: number): number {
  // 直接使用已经验证正确的 calculateTerminatorLongitude 函数
  // 使用用户设置的时间而不是当前系统时间
  const currentTime = toUTCFromLocal(dateISO, lonDeg || 121.4737);
  const observerLat = latDeg || 31.2304; // 上海纬度作为默认
  const observerLon = lonDeg || 121.4737; // 上海经度作为默认
  
  return calculateTerminatorLongitude(currentTime, observerLat, observerLon);
}

// 统一的时间更新处理函数
function handleTimeUpdate(
  newTime: string, 
  setDateISO: (time: string) => void,
  updateValue: (key: keyof SimpleComposition, value: number | boolean | [number, number, number, number]) => void,
  composition: SimpleComposition,
  lonDeg: number,
  updateSunlight: () => void
): void {
  try {
    // console.log('[TimeUpdate] 统一时间更新:', newTime);
    
    // 1. 更新时间状态
    setDateISO(newTime);
    
    // 2. 立即计算并更新自转角度
    const bLon = composition.birthPointLongitudeDeg || lonDeg;
    const newEarthRotation = calculateEarthRotationFromDateISO(newTime, bLon);
    updateValue('earthYawDeg', newEarthRotation);
    
    // console.log(`[TimeUpdate] 自转更新: 时间=${newTime}, 经度=${bLon}°, 自转=${newEarthRotation.toFixed(1)}°`);
    
    // 3. 触发光照更新
    updateSunlight();
    
  } catch (error) {
    // console.error('[TimeUpdate] 时间更新失败:', error);
  }
}

// 银河贴图网格组件
function MilkyWayMesh({ 
  starsMilky, 
  bgScale, 
  bgYawDeg, 
  bgPitchDeg,
  autoRotateDegPerSec = 0,
  paused = false
}: { 
  starsMilky?: THREE.Texture | null;
  bgScale?: number;
  bgYawDeg?: number;
  bgPitchDeg?: number;
  autoRotateDegPerSec?: number; // 自动自转角速度（度/秒）
  paused?: boolean;             // 暂停自转（放大模式）
}): JSX.Element | null {
  const matRef = React.useRef<THREE.MeshBasicMaterial>(null!);
  const meshRef = React.useRef<THREE.Mesh>(null!);
  const yawRef = React.useRef<number>(0); // 累积增量（度），基于初始bgYawDeg偏移
  
  React.useEffect(() => {
    const mat = matRef.current;
    const tex = mat?.map;
    if (!tex) return;
    
    try {
      if (!('repeat' in tex)) return; // 贴图尚未准备好
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.center.set(0.5, 0.5);
      const s = bgScale ?? 1;
      // 修正缩放逻辑：值越大，纹理重复越多，显得越小
      const repeatX = Math.max(0.1, Math.min(10, 1/s));
      tex.repeat.set(repeatX, 1);
      tex.needsUpdate = true;
      // console.log('[MilkyWay] texture loaded:', {
      //   image: tex.image?.src || tex.image?.currentSrc || 'no-src',
      //   repeat: tex.repeat.toArray(),
      //   yawDeg: bgYawDeg ?? 0,
      //   pitchDeg: bgPitchDeg ?? 0,
      //   sphereRadius: 120,
      //   opacity: 0.8
      // });
    } catch (e) {
      // console.warn('[MilkyWay] update failed:', String(e));
    }
  }, [starsMilky, bgScale, bgYawDeg, bgPitchDeg]);
  
  // 帧更新：在全景模式下让银河缓慢绕世界+Y自转
  useFrame((_, delta) => {
    try {
      if (!meshRef.current) return;
      if (paused) return;                 // 放大模式或被暂停时不自转
      const speedDegPerSec = autoRotateDegPerSec || 0;
      if (Math.abs(speedDegPerSec) < 1e-6) return; // 速度为0则不转
      yawRef.current = (yawRef.current + speedDegPerSec * delta);
      // 归一化角度避免溢出
      if (yawRef.current > 360 || yawRef.current < -360) yawRef.current = yawRef.current % 360;
      const pitchRad = THREE.MathUtils.degToRad(bgPitchDeg ?? 0);
      const yawRad = THREE.MathUtils.degToRad((bgYawDeg ?? 0) + yawRef.current);
      meshRef.current.rotation.set(pitchRad, yawRad, 0);
    } catch (e) {
      // 静默保护，避免影响主渲染
    }
  });

  // 如果贴图丢失，避免报错，渲染空背景
  if (!starsMilky) {
    // console.warn('[MilkyWay] texture missing, skip rendering');
    return null;
  }
  
  return (
    <mesh
      ref={meshRef}
      key={`milky-${bgYawDeg}-${bgPitchDeg}`}
      rotation={[THREE.MathUtils.degToRad(bgPitchDeg ?? 0), THREE.MathUtils.degToRad(bgYawDeg ?? 0), 0]}
      renderOrder={-10}
    >
      <sphereGeometry args={[120, 64, 64]} />
      <meshBasicMaterial
        map={starsMilky}
        side={THREE.BackSide}
        ref={matRef}
        transparent
        opacity={0.8}
        depthTest={true}
        depthWrite={false}
      />
    </mesh>
  );
}
import { SimpleComposition, DEFAULT_SIMPLE_COMPOSITION } from '@/types/SimpleComposition';
import { useLightDirection, useLightColor, useLightIntensity, useAmbientIntensity, seasonalSunDirWorldYUp } from '@/scenes/simple/utils/lightingUtils';
import { useCameraControl, useEarthPosition, useMoonPosition, useExposureControl } from '@/scenes/simple/utils/positionUtils';
import { useTextureLoader } from '@/scenes/simple/utils/textureLoader';
import { Earth } from '@/scenes/simple/api/components/Earth';
import { BirthPointMarker } from '@/scenes/simple/api/components/BirthPointMarker';
import LocalAudioPlayer from '@/components/LocalAudioPlayer';
import Lyrics3DOverlay from '@/components/lyrics/Lyrics3DOverlay';
import { calculateCameraOrientationForBirthPoint, calculateBirthPointLocalFrame, alphaToScreenY, validateBirthPointAlignment } from '@/scenes/simple/utils/birthPointAlignment';
import { LocationSelector } from '@/components/LocationSelector';
import { Moon } from '@/scenes/simple/api/components/Moon';
import JadeMoonSphere from '@/components/JadeMoonSphere';
import { Clouds, CloudsWithLayers } from '@/scenes/simple/api/components/Clouds';
import { IntegratedCloudSystem } from '@/scenes/simple/api/components/IntegratedCloudSystem';
import { AtmosphereEffects, setupAtmosphereConsoleCommands } from '@/scenes/simple/api/components/AtmosphereEffects';
import { getEarthState, type TimeInterpretation } from '@/scenes/simple/api/earthState';
import { toUTCFromLocal, calculateTerminatorLongitude } from '@/astro/ephemeris';
import { logger } from '@/utils/logger';
import { alignLongitudeOnly } from '@/scenes/simple/api/shotRig';
import { getMoonPhase } from '@/scenes/simple/api/moonPhase';
import { calculateMoonPhase } from '@/scenes/simple/utils/moonPhaseCalculator';

// 带UV offset输出的云层包装组件 - 不再需要，因为云层阴影改为基于世界坐标
// function CloudsWithOffset({ 
//   onOffsetUpdate,
//   ...props 
// }: Parameters<typeof CloudsWithLayers>[0] & { 
//   onOffsetUpdate: (offset: THREE.Vector2) => void 
// }) {
//   return (
//     <CloudsWithLayers 
//       {...props}
//       onUvUpdate={onOffsetUpdate}
//     />
//   );
// }

// 场景内容组件
function SceneContent({ 
  composition, 
  mode, 
  sunWorld,
  altDeg,
  moonEQD,
  dateISO,
  latDeg,
  lonDeg,
  isAlignedAndZoomed,
  demParams,
  debugMode
}: { 
  composition: SimpleComposition;
  mode: 'debug' | 'celestial';
  sunWorld: { x: number; y: number; z: number };
  altDeg?: number;
  moonEQD: { x: number; y: number; z: number };
  dateISO: string;
  latDeg: number;
  lonDeg: number;
  isAlignedAndZoomed: boolean;
  demParams: {
    demNormalStrength: number;
    demNormalWeight: number;
    shadowHeightThreshold: number;
    shadowDistanceAttenuation: number;
    shadowMaxOcclusion: number;
    shadowSmoothFactor: number;
    directionalShadowStrength: number;
    directionalShadowSoftness: number;
    directionalShadowSharpness: number;
    directionalShadowContrast: number;
  };
  debugMode: number;
}): JSX.Element {
  const { camera, scene } = useThree();
  
  // 云层UV偏移状态 - 不再需要，因为云层阴影改为基于世界坐标
  // const [cloudUvOffset, setCloudUvOffset] = useState(new THREE.Vector2(0, 0));
    // 暴露当前相机用于验证
  React.useEffect(() => {
    // 🔧 修复：注释掉全局变量，避免内存泄漏和全局状态污染
    // try { (window as any).__R3F_Camera = camera; } catch {}
  }, [camera]);
  
  // 🔧 已移除：不再暴露__EARTH_QUAT全局变量，统一通过scene.getObjectByName('earthRoot')读取
  React.useEffect(() => {
    // 🔧 修复：注释掉全局变量，避免内存泄漏和全局状态污染
    // try { 
    //   (window as any).THREE = THREE;
    //   (window as any).__R3F_Scene = scene; // 🔧 新增：提供场景引用给全局
    // } catch {}
  }, [scene]);
  
  // 光照系统 - 单光照，与日期时间计算耦合
  const lightDirection = useLightDirection(mode, sunWorld, composition, altDeg);
  const lightColor = useLightColor(composition);
  const lightIntensity = useLightIntensity(composition);
  const ambientIntensity = useAmbientIntensity(composition);
  
  // 相机控制
  useCameraControl(composition);
  useExposureControl(composition);
  
  // 位置计算
  const earthInfo = useEarthPosition(composition, composition.cameraDistance);
  const moonInfo = useMoonPosition(composition, camera);
  
  // 纹理加载 - 统一在顶层获取，传递给子组件
  const textureConfig = {
    useTextures: composition.useTextures,
    useClouds: composition.useClouds,
    useMilkyWay: composition.useMilkyWay,
    stagedLowFirst: false  // 直接加载8k，避免热替换卡顿
  };
  
  const {
    earthMap,
    earthNight, 
    earthNormal,
    earthSpecular,
    earthDisplacement,
    earthClouds,
    moonMap,
    moonNormalMap,
    moonDisplacementMap,
    starsMilky
  } = useTextureLoader(textureConfig);
  
  // 音频延迟挂载：首帧稳定后再加载播放器，避免与首屏资源竞争
  const [showAudioLocal, setShowAudioLocal] = React.useState(false);
  const audioElRef = React.useRef<HTMLAudioElement | null>(null);
  React.useEffect(() => {
    let canceled = false;
    const t = setTimeout(() => { if (!canceled) setShowAudioLocal(true); }, 1200);
    return () => { canceled = true; clearTimeout(t); };
  }, []);
  // 不使用中间变量，直接在 JSX 内按需渲染，避免命名冲突

  // 调试信息（统一经 logger 输出）
  React.useEffect(() => {
    if (!logger.isEnabled()) return;
    logger.log('scene/init', {
      mode,
      lightDirection: lightDirection.toArray(),
      lightColor: lightColor.getHexString(),
      lightIntensity,
      earthPosition: earthInfo.position,
      earthSize: earthInfo.size,
      moonPosition: moonInfo.position,
      moonDistance: moonInfo.distance,
      composition
    });
  }, [mode, lightDirection, lightColor, lightIntensity, earthInfo, moonInfo, composition]);

  // 光照方向变化监听
  React.useEffect(() => {
    if (!logger.isEnabled()) return;
    logger.log('lighting/updated', {
      dir: lightDirection.toArray(),
      pos: [lightDirection.x * 50, lightDirection.y * 50, lightDirection.z * 50],
      mode,
      t: new Date().toISOString()
    });
    // 🔧 修复：注释掉全局变量，避免内存泄漏和全局状态污染
    // try { (window as any).__LightDir = lightDirection.toArray(); } catch {}
  }, [lightDirection, mode]);

  // 出生点对齐锁：开启后只动相机，不改地球/光照
  // 口径：黄昏点基准（最简）：yaw = (Lsun + 90°) − Lbirth
  React.useEffect(() => {
    if (!composition.enableBirthPointAlignment) return;
    try {
      // 统一数值化与标准化，避免选择器传入字符串或超范围角度
      let L = Number((composition.birthPointLongitudeDeg ?? lonDeg) || 0);
      while (L > 180) L -= 360; while (L < -180) L += 360;
      const B = Number((composition.birthPointLatitudeDeg ?? latDeg) || 0);
      const alpha = composition.birthPointAlphaDeg ?? 12;
      const seam = composition.seamOffsetDeg ?? 0;
      // 计算黄昏点经度：使用“全局太阳方向”（与观测者经纬无关），避免选择器改变经度导致UTC/恒星时变化
      let lonDusk = 0;
      try {
        const globalSun = getEarthState?.(dateISO, 0, 0, 'byLongitude');
        if (globalSun && globalSun.sunDirWorld) {
          const g = globalSun.sunDirWorld;
          const gLight = new THREE.Vector3(-g.x, -g.y, -g.z).normalize();
          lonDusk = THREE.MathUtils.radToDeg(Math.atan2(-gLight.x, gLight.z));
        } else {
          // 回退：使用当前 sunWorld（可能受选择器经度影响）
          const lightDir = new THREE.Vector3(-sunWorld.x, -sunWorld.y, -sunWorld.z).normalize();
          lonDusk = THREE.MathUtils.radToDeg(Math.atan2(-lightDir.x, lightDir.z));
        }
      } catch {
        const lightDir = new THREE.Vector3(-sunWorld.x, -sunWorld.y, -sunWorld.z).normalize();
        lonDusk = THREE.MathUtils.radToDeg(Math.atan2(-lightDir.x, lightDir.z));
      }
      while (lonDusk > 180) lonDusk -= 360; while (lonDusk < -180) lonDusk += 360;
      // 方位角：yaw = normalize((L + seam) - lonDusk) [出生点→黄昏点]
      let yaw = (L + seam) - lonDusk; while (yaw > 180) yaw -= 360; while (yaw < -180) yaw += 360;
      // 使用正确的俯仰角算法：基于目标纬度差值
      const targetLat = composition.latitudeAlignTargetDeg ?? 28;
      let pitch = -(targetLat - B); // 正确的算法：目标纬度 - 观测纬度
      if (pitch > 85) pitch = 85;
      if (pitch < -85) pitch = -85;
      // 覆盖式对齐：先清零再设为目标，避免累计
      // 注意：这里应该通过props传递setComposition，暂时注释掉
      // setComposition(v => ({ ...v, cameraAzimuthDeg: 0, cameraElevationDeg: 0 }));
      // requestAnimationFrame(() => {
      //   try {
      //     setComposition(v => ({ ...v, cameraAzimuthDeg: yaw, cameraElevationDeg: pitch }));
      //   } catch {}
      // });
      if (logger.isEnabled()) logger.log('birthPoint/lock/update', { L, B, targetLat, seam, lonDusk: +lonDusk.toFixed(2), yaw, pitch, formula: 'yaw = (Lsun+90) - (L+seam); pitch=-(targetLat-B)' });
    } catch (e) {
      // console.warn('[BirthPointAlign] 自动保持失败:', e);
    }
  }, [composition.enableBirthPointAlignment, composition.birthPointLongitudeDeg, composition.birthPointLatitudeDeg, composition.birthPointAlphaDeg]);

  // 单光常亮：不再按 altDeg 关灯，夜面由着色器控制
  const finalIntensity = lightIntensity;
  const finalCastShadow = true;

  
  return (
    <>
      {/* 统一光照系统 - 单光照 */}
      <directionalLight
        position={[
          lightDirection.x * 50, 
          lightDirection.y * 50, 
          lightDirection.z * 50
        ]}
        intensity={finalIntensity}
        color={lightColor}
        castShadow={composition.enableTerrainShadow || composition.enableCloudShadow}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.1}
        shadow-camera-far={100}
        shadow-camera-left={-earthInfo.size * 2.2}
        shadow-camera-right={earthInfo.size * 2.2}
        shadow-camera-top={earthInfo.size * 2.2}
        shadow-camera-bottom={-earthInfo.size * 2.2}
        shadow-bias={0.002}
        shadow-normalBias={0.5}
      />

        
      <ambientLight intensity={ambientIntensity} />
      
      {/* 地球组 */}
      <group 
        position={[0, 0, 0]}
        name="earthRoot"
        // 🔧 关键修复：不使用rotation prop，完全通过四元数控制旋转
        // 这样可以避免与alignLongitudeOnly的四元数操作冲突
      >
        {/* 地球核心 */}
        <Earth 
          position={[0, 0, 0]}
          size={earthInfo.size}
          segments={(composition.useSegLOD && (isAlignedAndZoomed || earthInfo.size >= (composition.segLODTriggerSize ?? 1.0))) ? (composition.earthSegmentsHigh ?? 288) : (composition.earthSegmentsBase ?? 144)}
          lightDirection={lightDirection}
          tiltDeg={0}
          yawDeg={composition.earthYawDeg}
          useTextures={composition.useTextures}
          lightColor={lightColor}
          sunIntensity={lightIntensity}
          dayDiffuseMax={composition.dayDiffuseMax ?? 1.0}
          dayDiffuseGamma={composition.dayDiffuseGamma ?? 1.0}
          terminatorSoftness={composition.terminatorSoftness}
          nightIntensity={composition.nightIntensity}
          nightFalloff={composition.nightFalloff}
          terminatorLift={composition.terminatorLift}
          terminatorTint={composition.terminatorTint}
          nightEarthMapIntensity={composition.nightEarthMapIntensity}
          nightEarthMapHue={composition.nightEarthMapHue}
          nightEarthMapSaturation={composition.nightEarthMapSaturation}
          nightEarthMapLightness={composition.nightEarthMapLightness}
          nightHemisphereBrightness={composition.nightHemisphereBrightness}
          nightGlowBlur={composition.nightGlowBlur}
          nightGlowOpacity={composition.nightGlowOpacity}
          nightEarthLightInfluence={composition.nightEarthLightInfluence}
          shininess={composition.shininess}
          specStrength={composition.specStrength}
          broadStrength={composition.broadStrength}
          specFresnelK={composition.specFresnelK}
            // 地球置换（相对半径比例）
          displacementScaleRel={composition.earthDisplacementScale ?? 0.0}
          displacementMid={composition.earthDisplacementMid ?? 0.5}
          displacementContrast={composition.earthDisplacementContrast ?? 1.0}
          // 大气弧光参数
          rimStrength={composition.rimStrength}
          rimWidth={composition.rimWidth}
          rimHeight={composition.rimHeight}
          rimRadius={composition.rimRadius}
          haloWidth={composition.haloWidth}
          // 阴影与云影
          receiveShadows={composition.enableTerrainShadow ?? false}
          cloudShadowMap={(composition.enableCloudShadow ?? false) ? earthClouds : undefined}
          cloudShadowStrength={composition.cloudShadowStrength ?? 0.4}
          enableCloudShadow={composition.enableCloudShadow ?? false}
          // cloudUvOffset={cloudUvOffset} // 不再使用UV偏移方式
          // DEM地形参数
          demNormalStrength={demParams.demNormalStrength}
          demNormalWeight={demParams.demNormalWeight}
          // Debug参数
          debugMode={debugMode}
          // 纹理参数
          earthMap={earthMap}
          earthNight={earthNight}
          earthNormal={earthNormal}
          earthSpecular={earthSpecular}
          earthDisplacement={earthDisplacement}
          // 地形阴影(AO)参数
          aoHeightThreshold={demParams.shadowHeightThreshold}
          aoDistanceAttenuation={demParams.shadowDistanceAttenuation}
          aoMaxOcclusion={demParams.shadowMaxOcclusion}
          aoSmoothFactor={demParams.shadowSmoothFactor}
          // 地形投影(方向性)参数
          enableDirectionalShadow={true}
          directionalShadowStrength={demParams.directionalShadowStrength}
          directionalShadowSoftness={demParams.directionalShadowSoftness}
          directionalShadowSharpness={demParams.directionalShadowSharpness}
          directionalShadowContrast={demParams.directionalShadowContrast}
        />
        
        
        {/* 云层 - 根据earthSize自动调整层数 */}
        {composition.useClouds && earthClouds && (
          <CloudsWithLayers
            radius={earthInfo.size * (1.0 + composition.cloudHeight) * 1.0006}
            texture={earthClouds}
            position={[0, 0, 0]}
            yawDeg={composition.cloudYawDeg}
            pitchDeg={composition.cloudPitchDeg}
            lightDir={lightDirection}
            lightColor={lightColor}
            strength={composition.cloudStrength}
            sunI={lightIntensity}
            cloudGamma={composition.cloudGamma}
            cloudBlack={composition.cloudBlack}
            cloudWhite={composition.cloudWhite}
            cloudContrast={composition.cloudContrast}
            // 置换贴图参数
            displacementScale={composition.cloudDisplacementScale ?? 0.05}
            displacementBias={composition.cloudDisplacementBias ?? 0.02}
            // UV滚动速度参数 - client模式下调整速度
              scrollSpeedU={composition.cloudScrollSpeedU ?? 0.0001}
              scrollSpeedV={composition.cloudScrollSpeedV ?? 0.0002}
            // 多层参数 - 直接使用配置的层数
            numLayers={composition.cloudNumLayers ?? 3}
            layerSpacing={composition.cloudLayerSpacing ?? 0.002}
            // 禁用Triplanar避免性能问题
            useTriplanar={false}
        // 体积散射参数
        useVolumeScattering={composition.cloudUseVolumeScattering ?? false}
        volumeDensity={composition.cloudVolumeDensity ?? 0.6}
        scatteringStrength={composition.cloudScatteringStrength ?? 0.8}
        scatteringG={composition.cloudScatteringG ?? 0.2}
        rimEffect={composition.cloudRimEffect ?? 0.3}
        densityEnhancement={composition.cloudDensityEnhancement ?? 1.5}
        scatteringColor={composition.cloudScatteringColor ?? [1.0, 0.95, 0.9]}
        noiseScale={composition.cloudNoiseScale ?? 1.0}
        noiseStrength={composition.cloudNoiseStrength ?? 0.8}
        
        // 厚度映射参数
        useThicknessMapping={composition.cloudUseThicknessMapping ?? false}
        thicknessScale={composition.cloudThicknessScale ?? 1.0}
        thicknessBias={composition.cloudThicknessBias ?? 0.0}
        thicknessPower={composition.cloudThicknessPower ?? 1.0}
        
        // 菲涅尔效果参数
        useFresnel={composition.cloudUseFresnel ?? true}
        fresnelPower={composition.cloudFresnelPower ?? 2.0}
        fresnelStrength={composition.cloudFresnelStrength ?? 0.7}
        // 菲涅尔曲线控制参数
        curvePowerA={composition.cloudCurvePowerA ?? 1.0}
        curvePowerB={composition.cloudCurvePowerB ?? 3.0}
        curveMixPoint={composition.cloudCurveMixPoint ?? 0.6}
        
            blendMode="alpha"
            opacity={1.0}
            // onOffsetUpdate={(offset) => setCloudUvOffset(offset)} // 不再需要UV偏移同步
          />
        )}

        {/* 大气辉光增强 */}
        {composition.enableAtmosphere && (
          <AtmosphereEffects
            radius={earthInfo.size}
            lightDirection={lightDirection}
            intensity={composition.atmoIntensity ?? 1.0}
            thickness={composition.atmoThickness ?? 0.05}
            color={composition.atmoColor ?? [0.43, 0.65, 1.0]}
            fresnelPower={composition.atmoFresnelPower ?? 2.0}
            mainContrast={composition.atmoContrast ?? 0.5}
            mainSoftness={composition.atmoSoftness ?? 0.5}
            nearShell={composition.atmoNearShell ?? true}
            nearStrength={composition.atmoNearStrength ?? 1.0}
            nearThicknessFactor={composition.atmoNearThickness ?? 0.35}
            nearContrast={composition.atmoNearContrast ?? 0.6}
            nearSoftness={composition.atmoNearSoftness ?? 0.5}
            useAlphaWeightedAdditive={(composition as any).atmoBlendUseAlpha ?? false}
            softBoundaryDelta={(composition as any).atmoSoftBoundary ?? 0.0}
            perceptualFloor={(composition as any).atmoPerceptualFloor ?? 0.0}
            scaleHeight={(composition as any).atmoScaleHeight ?? 0.0}
            offset={(composition as any).atmoOffset ?? 0.001} // 大气辉光起始偏移，填补高度贴图空隙
            visible={true}
            renderOrder={10}
          />
        )}

        {/* 出生点标记（可选） */}
        <BirthPointMarker composition={composition} earthSize={earthInfo.size} />
      </group>

      {/* 月球：恢复原有渲染管线 */}
      {(composition.showMoon ?? true) && (
      <Moon
        position={moonInfo.position}
        radius={composition.moonRadius}
        lightDirection={lightDirection}
        useTextures={composition.useTextures}
        lightColor={lightColor}
        sunIntensity={lightIntensity}
        moonLightMinRatio={composition.moonLightMinRatio}
        moonLightMaxRatio={composition.moonLightMaxRatio}
        tiltDeg={0}
        yawDeg={0}
        latDeg={composition.moonLatDeg}
        lonDeg={composition.moonLonDeg}
        moonYawDeg={composition.moonYawDeg}
        sunDirWorldForShading={new THREE.Vector3(sunWorld.x, sunWorld.y, sunWorld.z)}
        enableTidalLock={true}
        enableUniformShading={true}
        useCameraLockedPhase={composition.moonUseCameraLockedPhase ?? true}
        renderLayer={0}
        enableScreenAnchor={true}
        screenX={composition.moonScreenX}
        screenY={composition.moonScreenY}
        anchorDistance={composition.moonDistance}
        currentDate={dateISO}
        observerLat={latDeg}
        observerLon={lonDeg}
        terminatorSoftness={composition.terminatorSoftness}
        moonTintH={composition.moonTintH}
        moonTintS={composition.moonTintS}
        moonTintL={composition.moonTintL}
        moonTintStrength={composition.moonTintStrength}
        moonShadingGamma={composition.moonShadingGamma}
        moonSurgeStrength={composition.moonSurgeStrength}
        moonSurgeSigmaDeg={composition.moonSurgeSigmaDeg}
        moonDisplacementScale={composition.moonDisplacementScale}
        moonNormalScale={composition.moonNormalScale ?? 1}
        normalFlipY={composition.normalFlipY ?? false}
        normalFlipX={composition.normalFlipX ?? false}
        terminatorRadius={composition.terminatorRadius ?? 0.02}
        phaseCoupleStrength={composition.phaseCoupleStrength ?? 0}
        displacementMid={composition.displacementMid ?? 0.5}
        nightLift={composition.nightLift ?? 0.12}
        moonMap={moonMap}
        moonNormalMap={moonNormalMap}
        moonDisplacementMap={moonDisplacementMap}
      />)}
      
      {/* 星空背景 */}
      {composition.showStars && (
        composition.useMilkyWay && starsMilky ? (
          <MilkyWayMesh 
            starsMilky={starsMilky}
            bgScale={composition.bgScale}
            bgYawDeg={composition.bgYawDeg}
            bgPitchDeg={composition.bgPitchDeg}
            autoRotateDegPerSec={composition.bgAutoRotateDegPerSec ?? 0}
            paused={!!isAlignedAndZoomed}
          />
        ) : null
      )}

      
      {/* 相机控制 */}
      {composition.enableControls && (
        <OrbitControls 
          enablePan={false}
          minDistance={3}
          maxDistance={50}
          // 🌙 限制仰角范围，防止-85度突变
          minPolarAngle={THREE.MathUtils.degToRad(10)}   // 最小仰角10度（避免-80度）
          maxPolarAngle={THREE.MathUtils.degToRad(170)}  // 最大仰角170度（避免80度）
        />
      )}

    </>
  );
}

// 🔧 关键修复：在Canvas内部按需触发一次对齐，将指定经度旋到屏幕中心
// 只依赖tick避免重复对齐，不依赖latDeg/lonDeg避免叠加旋转
function AlignOnDemand({ tick, latDeg, lonDeg, sunWorld, useFixedSun, fixedSunDir, birthPointMode }: { tick: number; latDeg: number; lonDeg: number; sunWorld: {x:number;y:number;z:number}; useFixedSun?: boolean; fixedSunDir?: [number,number,number]; birthPointMode?: boolean }): null {
  const { scene, camera } = useThree();
  React.useEffect(() => {
    try {
      // 🔧 关键修复：在出生点对齐模式时，完全禁用AlignOnDemand的地球旋转
      if (birthPointMode) {
        if (logger.isEnabled()) logger.log('align/skip-birth-point-mode', { tick, reason: '出生点对齐模式激活，跳过地球旋转' });
        return;
      }
      
      const earth = scene.getObjectByName('earthRoot');
      if (earth) {
        // 方案B：固定太阳模式下，禁止任何自动 yaw 对齐（仅在显式按钮时对齐）
        if (useFixedSun) {
          if (logger.isEnabled()) logger.log('align/skip-fixed-sun', { tick, reason: '固定太阳模式下禁用自动yaw对齐' });
          return;
        }
        if (logger.isEnabled()) logger.log('align/trigger', { tick, lonDeg, useFixedSun: !!useFixedSun });
        // 🔧 修复：禁用alignLongitudeOnly以避免倾斜问题
        // 现在地球固定在原点，不需要经度对齐旋转
        // alignLongitudeOnly(earth as THREE.Object3D, camera, lonDeg);
      } else {
        if (logger.isEnabled()) logger.warn('align/earthRoot-missing');
      }
    } catch (err) {
      if (logger.isEnabled()) logger.error('align/fail', String(err));
    }
  }, [tick, useFixedSun, lonDeg]);
  return null;
}

// 主测试组件
export default function SimpleTest() {
  
  const initialComp = React.useMemo(() => {
    const params = new URLSearchParams(location.search);
    const fixedsun = params.get('fixedsun') === '1';
    const season = params.get('season') === '1';
    
    // 云层URL参数（仅当提供参数时才覆盖默认值）
    const dualLayerParam = params.get('duallayer');
    const dualLayer = dualLayerParam !== null ? (dualLayerParam === '1') : undefined;
    
    // 大气辉光URL参数（仅当提供参数时才覆盖默认值）
    const atmoParam = params.get('atmo');
    const enableAtmosphere = atmoParam !== null ? (atmoParam === '1') : undefined;
    const atmoIntensity = params.get('atmoi') ? parseFloat(params.get('atmoi')!) : undefined;
    const atmoThickness = params.get('atmoth') ? parseFloat(params.get('atmoth')!) : undefined;
    const atmoFresnelPower = params.get('atmofp') ? parseFloat(params.get('atmofp')!) : undefined;
    const atmoSoftness = params.get('atmosf') ? parseFloat(params.get('atmosf')!) : undefined;
    const atmoContrast = params.get('atmoc') ? parseFloat(params.get('atmoc')!) : undefined;
    const atmoNearShellParam = params.get('atmons');
    const atmoNearShell = atmoNearShellParam !== null ? (atmoNearShellParam === '1') : undefined;
    const atmoNearStrength = params.get('atmonsi') ? parseFloat(params.get('atmonsi')!) : undefined;
    const atmoNearThickness = params.get('atmonth') ? parseFloat(params.get('atmonth')!) : undefined;
    const atmoNearContrast = params.get('atmonc') ? parseFloat(params.get('atmonc')!) : undefined;
    const atmoNearSoftness = params.get('atmonsf') ? parseFloat(params.get('atmonsf')!) : undefined;
    
    // 🔧 关键修复：初始化时基于绝对UTC计算地球自转角度
    const now = new Date();
    const hoursFloat = ((now.getTime() % (24 * 3600_000)) + (24 * 3600_000)) % (24 * 3600_000) / 3600_000;
    const earthRotation = (hoursFloat * 15) % 360;
    // console.log(`[EarthRotation] 初始化: UTC=${now.toISOString()}, hours=${hoursFloat.toFixed(3)}, yaw=${earthRotation.toFixed(1)}°`);
    
    const msx = params.get('msx') ? parseFloat(params.get('msx')!) : undefined;
    const msy = params.get('msy') ? parseFloat(params.get('msy')!) : undefined;
    const mdist = params.get('mdist') ? parseFloat(params.get('mdist')!) : undefined;

    return { ...DEFAULT_SIMPLE_COMPOSITION,
      useFixedSun: fixedsun || DEFAULT_SIMPLE_COMPOSITION.useFixedSun,
      useSeasonalVariation: season || DEFAULT_SIMPLE_COMPOSITION.useSeasonalVariation,
      earthYawDeg: earthRotation, // 🔧 设置正确的初始自转角度
      // Jade 月球屏幕锚定默认（可用 URL 覆盖：?msx=0.5&msy=0.3&mdist=10）
      moonScreenX: msx ?? (DEFAULT_SIMPLE_COMPOSITION as any).moonScreenX ?? 0.5,
      moonScreenY: msy ?? (DEFAULT_SIMPLE_COMPOSITION as any).moonScreenY ?? 0.3,
      moonDistance: mdist ?? (DEFAULT_SIMPLE_COMPOSITION as any).moonDistance ?? 10,
      moonRadius: (DEFAULT_SIMPLE_COMPOSITION as any).moonRadius ?? 0.9,
      showMoon: (DEFAULT_SIMPLE_COMPOSITION as any).showMoon ?? true,
      // 大气辉光参数
      enableAtmosphere: enableAtmosphere !== undefined ? enableAtmosphere : DEFAULT_SIMPLE_COMPOSITION.enableAtmosphere,
      atmoIntensity: atmoIntensity !== undefined ? atmoIntensity : DEFAULT_SIMPLE_COMPOSITION.atmoIntensity,
      atmoThickness: atmoThickness !== undefined ? atmoThickness : DEFAULT_SIMPLE_COMPOSITION.atmoThickness,
      atmoFresnelPower: atmoFresnelPower !== undefined ? atmoFresnelPower : DEFAULT_SIMPLE_COMPOSITION.atmoFresnelPower,
      atmoSoftness: atmoSoftness !== undefined ? atmoSoftness : DEFAULT_SIMPLE_COMPOSITION.atmoSoftness,
      atmoContrast: atmoContrast !== undefined ? atmoContrast : DEFAULT_SIMPLE_COMPOSITION.atmoContrast,
      atmoNearShell: atmoNearShell !== undefined ? atmoNearShell : DEFAULT_SIMPLE_COMPOSITION.atmoNearShell,
      atmoNearStrength: atmoNearStrength !== undefined ? atmoNearStrength : DEFAULT_SIMPLE_COMPOSITION.atmoNearStrength,
      atmoNearThickness: atmoNearThickness !== undefined ? atmoNearThickness : DEFAULT_SIMPLE_COMPOSITION.atmoNearThickness,
      atmoNearContrast: atmoNearContrast !== undefined ? atmoNearContrast : DEFAULT_SIMPLE_COMPOSITION.atmoNearContrast,
      atmoNearSoftness: atmoNearSoftness !== undefined ? atmoNearSoftness : DEFAULT_SIMPLE_COMPOSITION.atmoNearSoftness,
    } as SimpleComposition;
  }, []);

  const [composition, setComposition] = useState<SimpleComposition>(initialComp);
  
  // 通用更新器：更新 composition 的某个字段
  const updateValue = React.useCallback((key: keyof SimpleComposition, value: number | boolean | [number, number, number, number]) => {
    setComposition(prev => ({ ...prev, [key]: value }));
  }, []);

  const [uiHidden, setUiHidden] = useState(false);
  const [isAlignedAndZoomed, setIsAlignedAndZoomed] = useState(false);
  // 首帧后再挂载音频播放器，避免首屏竞争带宽/CPU
  const [showAudioLocal, setShowAudioLocal] = React.useState(false);
  React.useEffect(() => {
    let canceled = false;
    const t = setTimeout(() => { if (!canceled) setShowAudioLocal(true); }, 1200);
    return () => { canceled = true; clearTimeout(t); };
  }, []);
  
  // DEM地形参数控制状态
  // 客户端模式：进入全景视图时，默认将视口Y偏移设为 2.00（仅首次、且未对齐放大时）
  React.useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const devFlag = params.get('dev') === '1';
      if (!devFlag && !isAlignedAndZoomed) {
        console.log('[ClientInit] 客户端模式未对齐，设置 viewOffsetY = 2.0');
        setComposition(prev => ({ ...prev, viewOffsetY: 2.0 }));
      } else {
        console.log('[ClientInit] 跳过视口偏移设置, devFlag:', devFlag, 'isAlignedAndZoomed:', isAlignedAndZoomed);
      }
    } catch (e) {
      console.warn('[ClientInit] 设置视口偏移失败:', e);
    }
  }, [isAlignedAndZoomed]);
  const [demParams, setDemParams] = useState({
    demNormalStrength: 3.0,
    demNormalWeight: 0.05,
    // 地形阴影参数 - 更新为用户指定的默认值
    shadowHeightThreshold: 0.011,  // 高度差阈值
    shadowDistanceAttenuation: 5.0,  // 距离衰减指数
    shadowMaxOcclusion: 0.10,  // 最大遮挡强度
    shadowSmoothFactor: 1.00,   // 平滑因子
    // 地形投影(方向性)参数
    directionalShadowStrength: 0.2,  // 投影强度
    directionalShadowSoftness: 1.1,  // 投影柔和度
    // 新增投影锐利度参数
    directionalShadowSharpness: 5.0,  // 投影锐利度
    directionalShadowContrast: 1.5,  // 投影对比度
  });
  
  // Debug模式控制
  const [debugMode, setDebugMode] = useState(0);
  
  // 开发者模式控制
  const [isDevMode, setIsDevMode] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('dev') === '1';
  });
  
    // 改进的本地时间转换函数
  const toLocalInputValue = (d: Date) => {
    // 检查日期是否有效
    if (isNaN(d.getTime())) {
      return '';
    }
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // 🔧 关键修复：基于“同一绝对UTC”计算地球自转角，避免跨日别名与凌晨重复
  const calculateEarthRotationFromDateISO = (dateISOStr: string, longitude: number) => {
    try {
      // 统一将本地民用时间解析为“绝对UTC”
      const utc = toUTCFromLocal(dateISOStr, longitude);
      // 当日UTC小时（含小数），包含日期信息，避免 23:xx 与次日 00:xx 折返为同一时刻
      const hoursFloat = ((utc.getTime() % (24 * 3600_000)) + (24 * 3600_000)) % (24 * 3600_000) / 3600_000;
      const earthRotation = (hoursFloat * 15) % 360; // 24小时=360°
      // console.log(`[EarthRotation] local='${dateISOStr}', lon=${longitude} -> UTC=${utc.toISOString()}, hours=${hoursFloat.toFixed(3)}, yaw=${earthRotation.toFixed(1)}°`);
      return earthRotation;
    } catch (error) {
      // console.warn('[EarthRotation] 计算失败，使用默认值:', error);
      return 0;
    }
  };
  
  // 获取指定地点的当前本地时间（考虑时区）
  const getCurrentLocalTimeForLocation = (longitude: number) => {
    const now = new Date();
    
    // 方案C：使用浏览器时区API
    const browserTimezoneOffset = new Date().getTimezoneOffset(); // 分钟
    const browserTimezoneHours = -browserTimezoneOffset / 60; // 小时
    
    // 如果浏览器时区无效，默认东八区
    const timezoneHours = !isNaN(browserTimezoneHours) ? browserTimezoneHours : 8;
    
    // 根据经度计算理论时区
    const theoreticalTimezone = Math.round(longitude / 15);
    
    // 使用浏览器时区，不重复计算
    // new Date() 已经是浏览器本地时间，我们只需要格式化
    return toLocalInputValue(now);
  };
  
  // 获取当前本地时间（默认使用当前经度）
  const getCurrentLocalTime = () => {
    return getCurrentLocalTimeForLocation(lonDeg);
  };
  
  const [dateISO, setDateISO] = useState(() => getCurrentLocalTimeForLocation(121.5));
  const [latDeg, setLatDeg] = useState<number>(31.2);   // 上海默认
  const [lonDeg, setLonDeg] = useState<number>(121.5);
  // 客户端时间输入缓冲：避免用户输入年份首字符时被格式化覆盖
  const [clientTimeInput, setClientTimeInput] = useState<string | null>(null);

  // 🔧 修复：注释掉控制台命令注入，避免全局状态污染和内存泄漏
  // React.useEffect(() => {
  //   // 便捷接口：修改时间与固定太阳开关，及固定太阳方位锁定测试
  //   (window as any).setSceneTime = (iso: string) => { try { setDateISO(iso); } catch {} };
  //   (window as any).setUseFixedSun = (on: boolean) => { try { setComposition((prev: any)=>({...prev, useFixedSun:on})); } catch {} };
  //   (window as any).setUseSeasonalVariation = (on: boolean) => { try { setComposition((prev: any)=>({...prev, useSeasonalVariation:on})); } catch {} };
  //   (window as any).setObliquityDeg = (deg: number) => { try { setComposition((prev: any)=>({...prev, obliquityDeg:deg})); } catch {} };
  //   (window as any).setSeasonOffsetDays = (d: number) => { try { setComposition((prev: any)=>({...prev, seasonOffsetDays:d})); } catch {} };
  //   (window as any).setEnableBirthPointAlignment = (on: boolean) => { try { setComposition((prev: any)=>({ ...prev, enableBirthPointAlignment: on })); } catch {} };
  //   (window as any).setSeamOffsetDeg = (deg: number) => { try { setComposition((prev: any)=>({ ...prev, seamOffsetDeg: deg })); console.log('[SeamOffset] set to', deg); } catch {} };
  //   (window as any).getFixedSunDir = () => { try { return composition.fixedSunDir ?? null; } catch { return null; } };
  //   
  //   // 云层控制台命令
  //   (window as any).setCloudDisplacement = (scale: number, bias: number) => { try { setComposition((prev: any)=>({ ...prev, cloudDisplacementScale: scale, cloudDisplacementBias: bias })); console.log('[Clouds] Displacement set to scale:', scale, 'bias:', bias); } catch {} };
  //   (window as any).setCloudScrollSpeed = (u: number, v: number) => { try { setComposition((prev: any)=>({ ...prev, cloudScrollSpeedU: u, cloudScrollSpeedV: v })); console.log('[Clouds] Scroll speed set to U:', u, 'V:', v); } catch {} };
  //   (window as any).getCloudSettings = () => { 
  //     try { 
  //       return {
  //         displacementScale: composition.cloudDisplacementScale,
  //         displacementBias: composition.cloudDisplacementBias,
  //         scrollSpeedU: composition.cloudScrollSpeedU,
  //         scrollSpeedV: composition.cloudScrollSpeedV,
  //         gamma: composition.cloudGamma,
  //         contrast: composition.cloudContrast,
  //         black: composition.cloudBlack,
  //         white: composition.cloudWhite
  //       }; 
  //     } catch { return null; } 
  //   };
  //   
  //   // 🔧 新增：便捷出生点对齐测试接口
  //   (window as any).testBirthPointAlignment = (lat: number, lon: number, alpha: number = 12) => {
  //     try {
  //       console.log(`[TestAlignment] 测试出生点对齐: ${lat}°N, ${lon}°E, α=${alpha}°`);
  //       const params = { longitudeDeg: lon, latitudeDeg: lat, alphaDeg: alpha };
  //       const scene = (window as any).__R3F_Scene;
  //       const o = calculateCameraOrientationForBirthPoint(params, scene);
  //       setComposition((v: any) => ({
  //         ...v,
  //         birthPointLatitudeDeg: lat,
  //         birthPointLongitudeDeg: lon,
  //         birthPointAlphaDeg: alpha,
  //         enableBirthPointAlignment: true,
  //         cameraAzimuthDeg: o.yaw,
  //         cameraElevationDeg: o.pitch
  //       }));
  //       console.log('[TestAlignment] 对齐完成，相机角度:', { yaw: o.yaw.toFixed(2), pitch: o.pitch.toFixed(2) });
  //       return o;
  //     } catch (e) {
  //       console.error('[TestAlignment] 测试失败:', e);
  //       return null;
  //     }
  //   };
  //   
  //   // 大气辉光控制台命令
  //   setupAtmosphereConsoleCommands(setComposition, composition);
  // }, [composition, setComposition, setDateISO]);
  const [timeMode, setTimeMode] = useState<TimeInterpretation>('byLongitude');
  const [userModifiedTime, setUserModifiedTime] = useState<boolean>(false); // 用户是否手动修改了时间
  const userModifiedTimeRef = React.useRef<boolean>(false); // 🔧 关键修复：使用ref存储用户修改状态，立即生效
  const testIntervalRef = React.useRef<NodeJS.Timeout | null>(null); // 🔧 修复：存储测试定时器引用，避免内存泄漏
  
  // 天文数据状态
  const [sunWorld, setSunWorld] = useState<{ x:number; y:number; z:number }>({ x: 1, y: 0, z: 0 });
  const [moonEQD, setMoonEQD] = useState<{ x:number; y:number; z:number }>({ x: -1, y: 0, z: 0 });
  const [illumination, setIllumination] = useState<number>(0.5);
  // 存储真实的太阳角度信息
  const [sunAngles, setSunAngles] = useState<{ azDeg: number; altDeg: number }>({ azDeg: 0, altDeg: 0 });
  // 月相信息
  const [moonPhaseInfo, setMoonPhaseInfo] = useState<string>('计算中...');
  const [mode, setMode] = useState<'debug' | 'celestial'>('celestial');
  // 统一的黄昏点经度状态
  const [duskLongitude, setDuskLongitude] = useState<number>(0);
  const [alignTick, setAlignTick] = useState(0);
  
  // 新增：实时更新控制
  const [autoUpdate, setAutoUpdate] = useState<boolean>(false); // 🔧 默认禁用自动更新
  const [debugEnabled, setDebugEnabled] = useState<boolean>(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  const [realTimeUpdate, setRealTimeUpdate] = useState<boolean>(false); // 🔧 默认禁用实时时间更新
  const [realTimeInterval, setRealTimeInterval] = useState<number | null>(null);
  // 季相/仰角更新节流：分钟级即可，无需每帧
  const seasonalUpdateInfoRef = React.useRef<{ lastUpdateMs: number }>({ lastUpdateMs: 0 });

  // 统一调试日志开关
  React.useEffect(() => {
    logger.setEnabled(debugEnabled);
  }, [debugEnabled]);

  // 改进的光照更新函数 - 使用 useRef 避免无限循环
  const updateSunlight = React.useCallback(() => {
    try {
      // 使用出生点经纬驱动天文/光照与地球系统；观察点不影响地球系统
      const bLat = composition.birthPointLatitudeDeg ?? latDeg;
      const bLon = composition.birthPointLongitudeDeg ?? lonDeg;
      if (logger.isEnabled()) logger.log('sunlight/start', { dateISO, by: 'birthPoint', latDeg: bLat, lonDeg: bLon, timeMode });
      
      const state = getEarthState(dateISO, bLat, bLon, timeMode);
      if (logger.isEnabled()) logger.log('sunlight/ephemeris', state);
      
      const newSunWorld = { 
        x: state.sunDirWorld.x, 
        y: state.sunDirWorld.y, 
        z: state.sunDirWorld.z 
      };
      const newMoonEQD = { 
        x: state.moonDirWorld.x, 
        y: state.moonDirWorld.y, 
        z: state.moonDirWorld.z 
      };
      
      // 验证光照方向数据
      const sunMagnitude = Math.sqrt(newSunWorld.x * newSunWorld.x + newSunWorld.y * newSunWorld.y + newSunWorld.z * newSunWorld.z);
      if (logger.isEnabled()) logger.log('sunlight/magnitude', { sunMagnitude });

      // 季节模式：在固定太阳模式下，动态更新 fixedSunDir 的仰角（仅仰角，不改 yaw）
      try {
        if (composition.useFixedSun && composition.useSeasonalVariation) {
          const now = Date.now();
          const intervalMin = composition.seasonalUpdateIntervalMin ?? 1;
          const needUpdate = (now - seasonalUpdateInfoRef.current.lastUpdateMs) > intervalMin * 60 * 1000;
          if (needUpdate) {
            const utc = timeMode === 'byLongitude' ? toUTCFromLocal(dateISO, bLon) : new Date(dateISO);
            const cur = composition.fixedSunDir ?? [-0.7071, 0.7071, 0];
            const yawRad = Math.atan2(cur[0], cur[2]); // atan2(x,z)

            let newY = cur[1];
            if (composition.strongAltitudeConsistency) {
              // 强一致：仰角直接使用天文高度角，仅改变 y 分量
              const altRad = (state.altDeg ?? 0) * Math.PI / 180;
              newY = Math.sin(altRad);
            } else {
              // 推荐：由太阳赤纬δ（季相）驱动仰角，仅改变 y 分量
              const d = seasonalSunDirWorldYUp(
                utc,
                lonDeg,
                composition.obliquityDeg ?? 23.44,
                composition.seasonOffsetDays ?? 0,
                THREE.MathUtils.radToDeg(yawRad)
              );
              newY = d.y;
            }

            // 归一化并保持 yaw 不变：x,z 在水平面半径 r 上重建
            const yClamped = Math.max(-1, Math.min(1, newY));
            const r = Math.max(0, Math.sqrt(Math.max(0, 1 - yClamped * yClamped)));
            const newX = r * Math.sin(yawRad);
            const newZ = r * Math.cos(yawRad);

            setComposition(prev => ({ ...prev, fixedSunDir: [newX, yClamped, newZ] as [number, number, number] }));
            seasonalUpdateInfoRef.current.lastUpdateMs = now;
            if (logger.isEnabled()) logger.log('seasonal/fixedSunDir:update', {
              mode: composition.strongAltitudeConsistency ? 'altitude-strong' : 'declination',
              yawDeg: +(THREE.MathUtils.radToDeg(yawRad)).toFixed(2),
              newDir: { x: +newX.toFixed(4), y: +yClamped.toFixed(4), z: +newZ.toFixed(4) },
              altDeg: +(state.altDeg ?? 0).toFixed(2)
            });
          }
        }
      } catch (e) {
        if (logger.isEnabled()) logger.warn('seasonal/compute-failed', String(e));
      }
      
      if (sunMagnitude < 0.1) {
        if (logger.isEnabled()) logger.warn('sunlight/fallback-small-mag');
        // 使用兜底值
        setSunWorld({ x: 1, y: 0, z: 0 });
        setMoonEQD({ x: -1, y: 0, z: 0 });
        setIllumination(0.5);
        setSunAngles({ azDeg: 0, altDeg: 0 });
      } else {
        // 归一化光照方向
        const normalizedSunWorld = {
          x: newSunWorld.x / sunMagnitude,
          y: newSunWorld.y / sunMagnitude,
          z: newSunWorld.z / sunMagnitude
        };
        
        setSunWorld(normalizedSunWorld);
        setMoonEQD(newMoonEQD);
        setIllumination(state.illumination);
        setSunAngles({ azDeg: state.azDeg, altDeg: state.altDeg });
        
        // 固定太阳模式下不在此处阶跃更新 yaw，避免抖动；保留平滑自转通道
        if (!composition.useFixedSun) {
          const newEarthRotation = calculateEarthRotationFromDateISO(dateISO, bLon);
          updateValue('earthYawDeg', newEarthRotation);
        }
        // 一致性校验日志（开发期）：sunWorld.y 应接近 sin(altDeg)（仅在使用真实太阳照明时严格成立）
        try {
          const sinAlt = Math.sin((state.altDeg ?? 0) * Math.PI / 180);
          if (logger.isEnabled()) logger.log('consistency/alt-vs-vector', {
            sinAlt: +sinAlt.toFixed(4),
            sunWorldY: +normalizedSunWorld.y.toFixed(4),
            delta: +(normalizedSunWorld.y - sinAlt).toFixed(4)
          });
        } catch {}
        
        // 计算月相信息
        try {
          const moonPhase = calculateMoonPhase(new Date(dateISO), bLat, bLon);
          setMoonPhaseInfo(`${moonPhase.phaseName} (${moonPhase.phaseAngle.toFixed(1)}°)`);
        } catch (err) {
          setMoonPhaseInfo('计算失败');
        }
        
        // 统一计算黄昏点经度
        try {
          const lonDusk = calculateDuskLongitude(normalizedSunWorld, dateISO, bLat, bLon);
          setDuskLongitude(lonDusk);
          // console.log('[Unified Dusk Longitude] Calculated:', { lonDusk: lonDusk.toFixed(1) });
        } catch (err) {
          // console.error('[Unified Dusk Longitude] Calculation failed:', err);
          setDuskLongitude(0);
        }
        
        if (logger.isEnabled()) logger.log('sunlight/normalized', normalizedSunWorld);
        if (logger.isEnabled()) logger.log('sunlight/angles', { az: +state.azDeg.toFixed(1), alt: +state.altDeg.toFixed(1) });
      }
      
      setLastUpdateTime(new Date().toLocaleTimeString());
      
      // 自动切换到天相模式
      if (mode === 'debug') {
        setMode('celestial');
        // console.log('[Sunlight Update] Auto-switched to celestial mode');
      }
      
      // 计算并显示光照角度信息
      if (logger.isEnabled()) logger.log('sunlight/done');
      
    } catch (err) {
      if (logger.isEnabled()) logger.error('sunlight/error', String(err));
      // 使用兜底值
      setSunWorld({ x: 1, y: 0, z: 0 });
      setMoonEQD({ x: 0, y: 0, z: 0 });
      setIllumination(0.5);
      setSunAngles({ azDeg: 0, altDeg: 0 });
    }
  }, [dateISO, latDeg, lonDeg, mode, timeMode, composition.useFixedSun, composition.useSeasonalVariation, composition.obliquityDeg, composition.seasonOffsetDays, composition.birthPointLatitudeDeg, composition.birthPointLongitudeDeg]);

  // 当日期或经纬度变化时，自动计算 sunWorld 以驱动光照
  React.useEffect(() => {
    if (autoUpdate) {
      if (logger.isEnabled()) logger.log('effect/auto-update', { dateISO, latDeg, lonDeg, autoUpdate });
      updateSunlight();
    }
  }, [dateISO, latDeg, lonDeg, autoUpdate, updateSunlight]);

  // 首次加载时强制调用一次 updateSunlight 确保面板显示正常
  React.useEffect(() => {
    if (logger.isEnabled()) logger.log('effect/initial-load', { dateISO, latDeg, lonDeg });
    updateSunlight();
  }, []); // 空依赖数组，只在首次加载时执行

  // 实时时间更新逻辑 - 优化依赖项管理
  React.useEffect(() => {
    if (realTimeUpdate) {
      if (logger.isEnabled()) logger.log('realtime/start');
      // 启动实时更新
      const interval = setInterval(() => {
        // 🔧 关键修复：如果用户手动修改了时间，停止自动更新
        if (userModifiedTimeRef.current) {
          // console.log('[EarthRotation] 用户已手动修改时间，停止自动更新');
          clearInterval(interval); // 🔧 关键修复：清除定时器，完全停止自动更新
          return;
        }
        
        const now = new Date();
        const newTime = toLocalInputValue(now);
        if (logger.isEnabled()) logger.log('realtime/tick', { newTime });
        setDateISO(newTime);
        // 固定太阳模式下：不在10秒tick中写入 yaw，避免阶跃引起抖动
        if (!composition.useFixedSun) {
          try {
            const bLon = composition.birthPointLongitudeDeg ?? lonDeg;
            const utc = toUTCFromLocal(newTime, bLon);
            const hoursFloat = ((utc.getTime() % (24 * 3600_000)) + (24 * 3600_000)) % (24 * 3600_000) / 3600_000;
            const earthRotation = (hoursFloat * 15) % 360;
            // console.log(`[EarthRotation] realtime UTC=${utc.toISOString()}, hours=${hoursFloat.toFixed(3)}, yaw=${earthRotation.toFixed(1)}°`);
            updateValue('earthYawDeg', earthRotation);
          } catch (e) {
            // console.warn('[EarthRotation] realtime 计算失败:', e);
          }
        }
        
      }, 10000); // 🔧 关键修复：每10秒更新一次，便于测试和观察地球自转
      
      setRealTimeInterval(interval);
      
      return () => {
        if (interval) {
          clearInterval(interval);
          setRealTimeInterval(null);
        }
      };
    } else {
      // 停止实时更新
      if (realTimeInterval) {
        if (logger.isEnabled()) logger.log('realtime/stop');
        clearInterval(realTimeInterval);
        setRealTimeInterval(null);
      }
    }
  }, [realTimeUpdate, lonDeg, composition.birthPointLongitudeDeg]); // 依赖出生点经度以保证UTC一致

  // 轻量平滑自转：在实时模式且未手动修改时间时，每250ms用UTC毫秒推导 yaw（24h=360°）
  React.useEffect(() => {
    if (!realTimeUpdate) return;
    let timer: any = null;
    const step = 250; // ms
    const lastYawRef = { v: composition.earthYawDeg ?? 0 };
    timer = setInterval(() => {
      try {
        if (userModifiedTimeRef.current) return; // 用户接管时间时停止平滑
        let yaw;
        
        // client全景模式：2倍速自转
        if (mode === 'celestial' && composition.viewOffsetY === 2.0) {
          const nowMs = Date.now();
          const rotationPeriodMs = 225 * 1000; // 225秒一圈（2倍速）
          yaw = ((nowMs % rotationPeriodMs) / rotationPeriodMs * 360) % 360;
        } else {
          // 其他模式：真实速度自转（24小时一圈）
          const nowMs = Date.now();
          const dayMs = 24 * 3600_000;
          const hoursFloat = ((nowMs % dayMs) + dayMs) % dayMs / 3600_000;
          yaw = (hoursFloat * 15) % 360;
        }
        // 小阈值避免无谓重渲染
        if (Math.abs(yaw - lastYawRef.v) > 0.02) {
          updateValue('earthYawDeg', yaw);
          lastYawRef.v = yaw;
        }
      } catch {}
    }, step);
    return () => { if (timer) clearInterval(timer); };
  }, [realTimeUpdate, updateValue, composition.earthYawDeg, mode, composition.viewOffsetY]);

  // client全景模式独立自转逻辑：使用requestAnimationFrame获得极致平滑动画
  React.useEffect(() => {
    if (mode !== 'celestial' || composition.viewOffsetY !== 2.0) return;
    
    let animationId: number | null = null;
    const startTime = Date.now();
    const lastYawRef = { v: composition.earthYawDeg ?? 0 };
    
    const animate = () => {
      try {
        const elapsedMs = Date.now() - startTime;
        const rotationPeriodMs = 225 * 1000; // 225秒一圈（2倍速）
        const yaw = ((elapsedMs % rotationPeriodMs) / rotationPeriodMs * 360) % 360;
        
        // 每帧都更新以确保极致平滑
        updateValue('earthYawDeg', yaw);
        lastYawRef.v = yaw;
        
        animationId = requestAnimationFrame(animate);
      } catch (error) {
        console.error('[EarthRotation] Client panorama rotation error:', error);
      }
    };
    
    animationId = requestAnimationFrame(animate);
    
    return () => { 
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [mode, composition.viewOffsetY, updateValue]);

  // 清理定时器
  React.useEffect(() => {
    return () => {
      if (realTimeInterval) {
        clearInterval(realTimeInterval);
      }
      // 🔧 修复：清理测试定时器
      if (testIntervalRef.current) {
        clearInterval(testIntervalRef.current);
        testIntervalRef.current = null;
      }
    };
  }, [realTimeInterval]);

  // 手动更新光照
  const handleManualUpdate = () => {
    if (logger.isEnabled()) logger.log('manual/update');
    updateSunlight();
    
    // 🔧 同时更新地球自转角度
    try {
      const bLon = composition.birthPointLongitudeDeg || lonDeg;
      const newEarthRotation = calculateEarthRotationFromDateISO(dateISO, bLon);
      updateValue('earthYawDeg', newEarthRotation);
      // console.log(`[EarthRotation] 手动更新光照: 时间=${dateISO}, 经度=${bLon}°, 自转=${newEarthRotation.toFixed(1)}°`);
    } catch (error) {
      // console.warn('[EarthRotation] 手动更新光照时自转失败:', error);
    }
  };

  
  // 重置为当前时间
  const handleResetToCurrentTime = () => {
    if (logger.isEnabled()) logger.log('manual/reset-to-now');
    setUserModifiedTime(false); // 🔧 关键修复：重置用户修改标志，恢复自动更新
    userModifiedTimeRef.current = false; // 🔧 关键修复：立即重置ref，确保立即生效
    // console.log('[EarthRotation] 重置为当前时间，恢复自动更新');
    
    // 使用统一的时间更新处理函数
    handleTimeUpdate(getCurrentLocalTime(), setDateISO, updateValue, composition, lonDeg, updateSunlight);
  };

  // 旧的测试入口已移除，改为独立自动化测试套件（见 src/astro/autoTests.ts）

  // 计算光照方向的角度信息 - 使用真实的天文角度数据和统一的黄昏点计算
  const lightInfo = React.useMemo(() => {
    const { x, y, z } = sunWorld;
    const { azDeg, altDeg } = sunAngles;
    
    // console.log('[LightInfo] Raw sunWorld:', { x, y, z });
    // console.log('[LightInfo] Real sun angles from ephemeris:', { azimuth: azDeg.toFixed(1), altitude: altDeg.toFixed(1) });
    // console.log('[LightInfo] Earth rotation:', composition.earthYawDeg);
    // console.log('[LightInfo] Using unified duskLongitude:', duskLongitude.toFixed(1));
    
    return {
      azimuth: azDeg.toFixed(1),
      elevation: altDeg.toFixed(1),
      intensity: Math.sqrt(x*x + y*y + z*z).toFixed(3),
      duskLongitude: duskLongitude.toFixed(1)  // 使用统一的黄昏点计算结果
    };
  }, [sunWorld, sunAngles, duskLongitude, composition.earthYawDeg]);

  

  // 保持首屏：晨昏线居中（不自动对齐出生点；改为用户手动触发）

  return (
    <div className="canvas-wrap">
      {/* 音乐播放器 - 跟随UI隐藏状态做动画 */}
      <div style={{ 
        position: 'fixed', 
        top: uiHidden ? '-60px' : '10px',  // 隐藏时向上移出屏幕，显示时移回原位
        right: '16px',  // 与panel对齐 
        zIndex: 1000,
        width: '400px',  // 与panel等宽
        height: '52px',
        overflow: 'hidden',
        borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(0,0,0,0.35)',
        filter: 'grayscale(100%) brightness(0.8)',
        transition: 'top 0.3s ease',  // 添加平滑过渡动画
      }}
        title="音乐播放器"
      >
        {/** 使用本地播放器，切换为 public/audio 下的“王菲 - 但愿人长久.mp3” */}
        {showAudioLocal ? (
          <LocalAudioPlayer 
            basePath="/"
            tracks={[{ title: '王菲 - 但愿人长久', file: 'audio/王菲 - 但愿人长久.mp3', artist: '王菲' }]}
            autoPlay={false}
            audioRef={audioElRef as any}
          />
        ) : null}
      </div>
      
      <Canvas
        gl={{ 
          preserveDrawingBuffer: true, 
          alpha: false, 
          premultipliedAlpha: true, 
          powerPreference: 'high-performance',
          antialias: true,
          depth: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: composition.exposure 
        }}
        onCreated={(state) => {
          try {
            state.gl.setClearColor(0x000000, 1);
            // @ts-ignore - three@0.160 uses outputColorSpace
            state.gl.outputColorSpace = (THREE as any).SRGBColorSpace || THREE.SRGBColorSpace;
            (state.gl as any).debug.checkShaderErrors = true;
          } catch (e) {
            console.warn('[Canvas] onCreated setup failed:', e);
          }
        }}
        camera={{ 
          position: [0, 0, composition.cameraDistance], 
          fov: 45 
        }}
        style={{ background: '#000011' }}
        shadows={composition.enableTerrainShadow || composition.enableCloudShadow}
        // 在 Overlay 淡出前冻结自转：监听 overlay 事件解锁
        onPointerMissed={() => {}}
      >
        {
          (() => {
            // 局部 hook：基于事件控制运动解锁
            const [motionEnabled, setMotionEnabled] = React.useState(false);
            React.useEffect(() => {
              let unlocked = false;
              let fallbackTimer: NodeJS.Timeout | null = null;

              const unlock = () => {
                if (!unlocked) {
                  unlocked = true;
                  setMotionEnabled(true);
                  // 解锁后立即清除兜底定时器
                  if (fallbackTimer) {
                    clearTimeout(fallbackTimer);
                    fallbackTimer = null;
                  }
                }
              };

              // 优先监听资源就绪事件
              const onReady = () => {
                console.log('[MotionUnlock] Assets ready, unlocking earth rotation');
                unlock();
              };

              // 兜底：防死锁机制，10秒后强制解锁
              fallbackTimer = setTimeout(() => {
                if (!unlocked) {
                  console.warn('[MotionUnlock] Fallback timeout reached, force unlocking earth rotation');
                  unlock();
                }
              }, 10000);

              try {
                window.addEventListener('lubirth:assets-ready', onReady as EventListener, { once: true });

                // 检查是否已经就绪（处理事件在监听前就触发的情况）
                const already = (window as any).__lubirthAssetsReady;
                if (already) {
                  console.log('[MotionUnlock] Assets already ready, immediate unlock');
                  onReady();
                }
              } catch {}

              return () => {
                try {
                  window.removeEventListener('lubirth:assets-ready', onReady as EventListener);
                  if (fallbackTimer) {
                    clearTimeout(fallbackTimer);
                  }
                } catch {}
              };
            }, []);
            // 将解锁状态反映到 composition 上（安全：仅在运行期使用）
            if (!motionEnabled && composition.earthYawDeg !== 0) {
              // 冻结：就绪前强制用初始 yaw（避免加载后一瞬间大跳）
              composition.earthYawDeg = composition.earthYawDeg; // 保持现值
            }
            // 通过上下文返回 null，不渲染任何东西
            return null as any;
          })()
        }
        <SceneContent 
          composition={composition} 
          mode={mode}
          sunWorld={sunWorld}
          altDeg={sunAngles.altDeg}
          moonEQD={moonEQD}
          dateISO={dateISO}
          latDeg={latDeg}
          lonDeg={lonDeg}
          isAlignedAndZoomed={isAlignedAndZoomed}
          demParams={demParams}
          debugMode={debugMode}
        />
        <NoTiltProbe />
        <AlignOnDemand 
          tick={alignTick} 
          latDeg={latDeg} 
          lonDeg={lonDeg} 
          sunWorld={sunWorld}
          useFixedSun={composition.useFixedSun}
          fixedSunDir={composition.fixedSunDir}
          birthPointMode={composition.enableBirthPointAlignment}
        />
        {/* 3D 歌词（前 6 行测试） */}
        {showAudioLocal && <Lyrics3DOverlay audioRef={audioElRef as any} distance={8} baseOffsetX={1.8} baseOffsetY={0.7} />}
      </Canvas>
      
        
      {/* 控制面板 - 使用与原版本一致的样式 */}
      {uiHidden && (
        <div style={{ position:'absolute', top: 10, right: 10, zIndex: 40 }}>
          <button className="btn" onClick={() => {
            setUiHidden(false);
            setTimeout(() => {
              const panel = document.querySelector('.panel') as HTMLElement | null;
              if (panel) {
                panel.style.opacity = '0';
                panel.style.transform = 'translateY(-6px)';
                requestAnimationFrame(() => {
                  panel.style.opacity = '1';
                  panel.style.transform = 'translateY(0)';
                });
              }
            }, 0);
          }}>显示 UI</button>
        </div>
      )}

      {!uiHidden && (
        <>
          {isDevMode ? (
            <div className="panel">
          {/* 顶部控制栏 */}
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
            <div className="row" style={{ gap: 12 }}>
              <span className="label">构图模式</span>
              <div className="row" style={{ gap: 12, pointerEvents: 'auto' }}>
                <label>
                  <input type="radio" name="mode" checked={mode === 'celestial'} onChange={() => setMode('celestial')} /> 天相模式
                </label>
                <label>
                  <input type="radio" name="mode" checked={mode === 'debug'} onChange={() => setMode('debug')} /> 调试模式
                </label>
              </div>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn" onClick={() => setComposition(DEFAULT_SIMPLE_COMPOSITION)}>重置默认</button>
              <button className="btn" onClick={() => setUiHidden(true)}>隐藏 UI</button>
              <button 
                className="btn" 
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.delete('dev');
                  window.location.href = url.toString();
                }}
                style={{ backgroundColor: '#007aff' }}
              >
                客户端模式
              </button>
            </div>
          </div>
          {/* 出生点设置 */}
          <div className="row" style={{ marginBottom: 16, gap: 12 }}>
            <div className="col">
              <span className="label">出生点经纬: {Math.round(composition.birthPointLatitudeDeg ?? 0)}°N, {Math.round(composition.birthPointLongitudeDeg ?? 0)}°E · 抬升α: {Math.round(composition.birthPointAlphaDeg ?? 12)}°</span>
            </div>
            <div className="col">
              <label className="label">显示出生点标记</label>
              <input type="checkbox" checked={!!composition.showBirthPointMarker} onChange={(e)=>setComposition(v=>({ ...v, showBirthPointMarker: e.target.checked }))} />
            </div>
          </div>

          {/* 日面漫反射顶亮控制（A方案） */}
          <div className="row" style={{ marginBottom: 16 }}>
            <div className="col">
              <label className="label">日面漫反射上限: {(composition.dayDiffuseMax ?? 1.0).toFixed(2)}</label>
              <input className="input" type="range" min={0.2} max={3.0} step={0.05}
                     value={composition.dayDiffuseMax ?? 1.0}
                     onChange={(e)=>updateValue('dayDiffuseMax', parseFloat(e.target.value))} />
            </div>
            <div className="col">
              <label className="label">日面漫反射Gamma: {(composition.dayDiffuseGamma ?? 1.0).toFixed(2)}</label>
              <input className="input" type="range" min={0.6} max={2.0} step={0.02}
                     value={composition.dayDiffuseGamma ?? 1.0}
                     onChange={(e)=>updateValue('dayDiffuseGamma', parseFloat(e.target.value))} />
            </div>
          </div>

          

          {/* 时间同步状态指示器 */}
          <div className="row" style={{ gap: 12, alignItems: 'center', marginBottom: 16, padding: '8px 12px', background: realTimeUpdate ? 'rgba(0,255,0,0.1)' : 'rgba(255,255,255,0.05)', borderRadius: '4px', border: realTimeUpdate ? '1px solid rgba(0,255,0,0.3)' : '1px solid rgba(255,255,255,0.1)' }}>
            <div className="col">
              <span className="label" style={{ color: realTimeUpdate ? '#00ff00' : 'inherit' }}>
                {realTimeUpdate ? '🕐 实时同步中' : '⏰ 手动控制'}
              </span>
            </div>
            <div className="col">
              <span className="label">当前时间: {dateISO}</span>
            </div>
            <div className="col">
              <span className="label">位置: {latDeg.toFixed(1)}°N, {lonDeg.toFixed(1)}°E</span>
            </div>
            <div className="col">
              <span className="label">模式: {mode === 'celestial' ? '🌞 天相模式' : '🔧 调试模式'}</span>
            </div>
            <div className="col">
              <span className="label">时间解释: {timeMode === 'byLongitude' ? '按经度推时区' : '按系统时区'}</span>
            </div>
            <div className="col">
              <label>
                <input type="checkbox" checked={debugEnabled} onChange={(e)=>setDebugEnabled(e.target.checked)} /> 调试日志
              </label>
              {debugEnabled && (
                <>
                  {/* 🔧 修复：注释掉全局变量引用，避免内存泄漏 */}
                  {/* <button className="btn" style={{marginLeft:8}} onClick={()=>{ try{ navigator.clipboard.writeText(JSON.stringify((window as any).__LuBirthLogs ?? [], null, 2)); }catch{} }}>复制日志</button> */}
                </>
              )}
            </div>
          </div>

          {/* 天文与构图 - 真实光照系统 */}
          <div className="row" style={{ gap: 12, alignItems: 'flex-end', marginBottom: 16 }}>
            <div className="col">
              <label className="label">日期时间(本地)</label>
              <input className="input" type="datetime-local" value={dateISO} onChange={(e)=>{
                const newDateISO = e.target.value;
                setDateISO(newDateISO);
                setUserModifiedTime(true); // 🔧 关键修复：标记用户已手动修改时间
                userModifiedTimeRef.current = true; // 🔧 关键修复：立即设置ref，确保立即生效
                // console.log('[EarthRotation] 用户手动修改时间，停止自动更新');
                
                // 使用统一的时间更新处理函数
                handleTimeUpdate(newDateISO, setDateISO, updateValue, composition, lonDeg, updateSunlight);
              }} />
            </div>
            <div className="col">
              <label className="label">出生地纬度(°)</label>
              <input
                className="input"
                type="number"
                step={0.1}
                value={composition.birthPointLatitudeDeg ?? 0}
                onChange={(e)=>{
                  const v = parseFloat(e.target.value);
                  setComposition(prev => ({ ...prev, birthPointLatitudeDeg: v }));
                }}
              />
            </div>
            <div className="col">
              <label className="label">出生地经度(°E为正)</label>
              <input
                className="input"
                type="number"
                step={0.1}
                value={composition.birthPointLongitudeDeg ?? 0}
                onChange={(e)=>{
                  const v = parseFloat(e.target.value);
                  setComposition(prev => ({ ...prev, birthPointLongitudeDeg: v }));
                }}
              />
            </div>
            <div className="col">
              <label className="label">时间解释模式</label>
              <div className="row" style={{ gap: 8 }}>
                <label>
                  <input type="radio" name="timeMode" checked={timeMode==='byLongitude'} onChange={()=>setTimeMode('byLongitude')} /> 按经度
                </label>
                <label>
                  <input type="radio" name="timeMode" checked={timeMode==='bySystem'} onChange={()=>setTimeMode('bySystem')} /> 按系统
                </label>
              </div>
            </div>
            <div className="col">
              <button className="btn" onClick={handleManualUpdate}>手动更新光照</button>
            </div>
            <div className="col">
              <button className="btn" onClick={handleResetToCurrentTime}>重置当前时间</button>
            </div>
            <div className="col">
              <label className="label">
                <input type="checkbox" checked={!!composition.useFixedSun} onChange={(e)=>setComposition(prev=>({...prev, useFixedSun: e.target.checked}))} /> 固定太阳模式
              </label>
            </div>
              <div className="col">
              <label className="label">
                <input type="checkbox" checked={!!composition.useSeasonalVariation} onChange={(e)=>setComposition(prev=>({...prev, useSeasonalVariation: e.target.checked}))} /> 季节模式
              </label>
            </div>
            {composition.useSeasonalVariation && (
              <>
                <div className="col">
                  <label className="label">黄赤交角(°)</label>
                  <input className="input" type="number" step={0.1} value={composition.obliquityDeg ?? 23.44}
                         onChange={(e)=>setComposition(prev=>({...prev, obliquityDeg: parseFloat(e.target.value)}))} />
                </div>
                <div className="col">
                  <label className="label">季节偏移(天)</label>
                  <input className="input" type="number" step={1} value={composition.seasonOffsetDays ?? 0}
                         onChange={(e)=>setComposition(prev=>({...prev, seasonOffsetDays: parseInt(e.target.value||'0',10)}))} />
                </div>
              </>
            )}
          </div>

          {/* 快速时间跳转 - 测试明显光照变化 */}
          <div className="row" style={{ marginBottom: 16, gap: 8 }}>
            <div className="col">
              <span className="label">快速测试明显光照变化：</span>
            </div>
            <div className="col">
              <button className="btn" style={{padding: '4px 8px', fontSize: '12px'}} 
                      onClick={() => handleTimeUpdate('2024-03-21T07:00', setDateISO, updateValue, composition, lonDeg, updateSunlight)}>春分日出</button>
            </div>
            <div className="col">  
              <button className="btn" style={{padding: '4px 8px', fontSize: '12px'}}
                      onClick={() => handleTimeUpdate('2024-06-21T12:00', setDateISO, updateValue, composition, lonDeg, updateSunlight)}>夏至正午</button>
            </div>
            <div className="col">
              <button className="btn" style={{padding: '4px 8px', fontSize: '12px'}}
                      onClick={() => handleTimeUpdate('2024-09-23T18:00', setDateISO, updateValue, composition, lonDeg, updateSunlight)}>秋分日落</button>
            </div>
            <div className="col">
              <button className="btn" style={{padding: '4px 8px', fontSize: '12px'}}
                      onClick={() => handleTimeUpdate('2024-12-21T12:00', setDateISO, updateValue, composition, lonDeg, updateSunlight)}>冬至正午</button>
            </div>
          </div>

          {/* 极地测试 - 验证极端纬度的日夜变化 */}
          <div className="row" style={{ marginBottom: 16, gap: 8 }}>
            <div className="col">
              <span className="label">极地测试 - 北极圈(66°N)：</span>
            </div>
            <div className="col">
              <button className="btn" style={{padding: '4px 8px', fontSize: '12px'}} 
                      onClick={() => {setLatDeg(66); setLonDeg(0); handleTimeUpdate('2024-06-21T06:00', setDateISO, updateValue, composition, lonDeg, updateSunlight);}}>夏至06:00</button>
            </div>
            <div className="col">  
              <button className="btn" style={{padding: '4px 8px', fontSize: '12px'}}
                      onClick={() => {setLatDeg(66); setLonDeg(0); handleTimeUpdate('2024-06-21T12:00', setDateISO, updateValue, composition, lonDeg, updateSunlight);}}>夏至正午</button>
            </div>
            <div className="col">
              <button className="btn" style={{padding: '4px 8px', fontSize: '12px'}}
                      onClick={() => {setLatDeg(66); setLonDeg(0); handleTimeUpdate('2024-06-21T18:00', setDateISO, updateValue, composition, lonDeg, updateSunlight);}}>夏至18:00</button>
            </div>
            <div className="col">
              <button className="btn" style={{padding: '4px 8px', fontSize: '12px'}}
                      onClick={() => {setLatDeg(66); setLonDeg(0); handleTimeUpdate('2024-06-21T00:00', setDateISO, updateValue, composition, lonDeg, updateSunlight);}}>夏至午夜</button>
            </div>
          </div>

          {/* 赤道测试 - 应该有明显的东西方向变化 */}
          <div className="row" style={{ marginBottom: 16, gap: 8 }}>
            <div className="col">
              <span className="label">赤道测试(0°N)：</span>
            </div>
            <div className="col">
              <button className="btn" style={{padding: '4px 8px', fontSize: '12px'}} 
                      onClick={() => {setLatDeg(0); setLonDeg(0); handleTimeUpdate('2024-03-21T06:00', setDateISO, updateValue, composition, lonDeg, updateSunlight);}}>春分06:00</button>
            </div>
            <div className="col">  
              <button className="btn" style={{padding: '4px 8px', fontSize: '12px'}}
                      onClick={() => {setLatDeg(0); setLonDeg(0); handleTimeUpdate('2024-03-21T12:00', setDateISO, updateValue, composition, lonDeg, updateSunlight);}}>春分正午</button>
            </div>
            <div className="col">
              <button className="btn" style={{padding: '4px 8px', fontSize: '12px'}}
                      onClick={() => {setLatDeg(0); setLonDeg(0); handleTimeUpdate('2024-03-21T18:00', setDateISO, updateValue, composition, lonDeg, updateSunlight);}}>春分18:00</button>
            </div>
            <div className="col">
              <button className="btn" style={{padding: '4px 8px', fontSize: '12px'}}
                      onClick={() => {setLatDeg(0); setLonDeg(0); handleTimeUpdate('2024-03-21T00:00', setDateISO, updateValue, composition, lonDeg, updateSunlight);}}>春分午夜</button>
            </div>
            <div className="col">
              <button className="btn" style={{padding: '4px 8px', fontSize: '12px', backgroundColor: '#8B4513'}}
                      onClick={() => {
                        import('@/scenes/simple/utils/coordinateDebugger').then(module => {
                          module.CoordinateSystemDebugger.runAllTests();
                        });
                      }}>🔧 坐标调试</button>
            </div>
            <div className="col">
              <button className="btn" style={{padding: '4px 8px', fontSize: '12px', backgroundColor: '#4169E1'}}
                      onClick={() => {
                        import('@/scenes/simple/utils/coordinateVerifier').then(module => {
                          module.CoordinateVerifier.runFullVerification();
                        });
                      }}>🔍 坐标验证</button>
            </div>
          </div>
          
          {/* 高纬度测试 - 应该有明显的日夜差异 */}
          <div className="row" style={{ marginBottom: 16, gap: 8 }}>
            <div className="col">
              <span className="label">北京纬度测试(40°N)：</span>
            </div>
            <div className="col">
              <button className="btn" style={{padding: '4px 8px', fontSize: '12px'}} 
                      onClick={() => {setLatDeg(40); setLonDeg(116); handleTimeUpdate('2024-12-21T06:00', setDateISO, updateValue, composition, lonDeg, updateSunlight);}}>冬至日出</button>
            </div>
            <div className="col">  
              <button className="btn" style={{padding: '4px 8px', fontSize: '12px'}}
                      onClick={() => {setLatDeg(40); setLonDeg(116); handleTimeUpdate('2024-12-21T12:00', setDateISO, updateValue, composition, lonDeg, updateSunlight);}}>冬至正午</button>
            </div>
            <div className="col">
              <button className="btn" style={{padding: '4px 8px', fontSize: '12px'}}
                      onClick={() => {setLatDeg(40); setLonDeg(116); handleTimeUpdate('2024-12-21T18:00', setDateISO, updateValue, composition, lonDeg, updateSunlight);}}>冬至日落</button>
            </div>
            <div className="col">
              <button className="btn" style={{padding: '4px 8px', fontSize: '12px'}}
                      onClick={() => {setLatDeg(40); setLonDeg(116); handleTimeUpdate('2024-12-21T00:00', setDateISO, updateValue, composition, lonDeg, updateSunlight);}}>冬至午夜</button>
            </div>
          </div>

          {/* 光照状态显示 */}
          <div className="row" style={{ gap: 12, alignItems: 'center', marginBottom: 16, padding: '12px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="col">
              <span className="label">光照方向: 方位角 {lightInfo.azimuth}° · 仰角 {lightInfo.elevation}°</span>
            </div>
            <div className="col">
              <span className="label">黄昏点经度: {lightInfo.duskLongitude}°</span>
            </div>
            <div className="col">
              <span className="label">光照强度: {lightInfo.intensity}</span>
            </div>
            <div className="col">
              <span className="label">月面明暗: {(illumination * 100).toFixed(1)}%</span>
            </div>
            <div className="col">
              <span className="label">月相状态: {moonPhaseInfo}</span>
            </div>
            <div className="col">
              <span className="label">最后更新: {lastUpdateTime || '未更新'}</span>
            </div>
            <div className="col">
              <label>
                <input type="checkbox" checked={autoUpdate} onChange={(e) => setAutoUpdate(e.target.checked)} />
                自动更新
              </label>
            </div>
            <div className="col">
              <label>
                <input type="checkbox" checked={realTimeUpdate} onChange={(e) => setRealTimeUpdate(e.target.checked)} />
                实时时间
              </label>
            </div>
          </div>

          {/* 功能按钮行 */}
          <div className="row" style={{ gap: 12, alignItems: 'center', marginBottom: 16 }}>
            <div className="col">
              <button className="btn" onClick={() => {
                try {
                  const phase = getMoonPhase(dateISO, latDeg, lonDeg);
                  // console.log('[MoonPhase]', phase);
                  alert(`月相明亮比例: ${phase.illumination.toFixed(2)}\n相位角: ${(phase.phaseAngleRad*180/Math.PI).toFixed(1)}°`);
                } catch (err) {
                  // console.error(err);
                }
              }}>计算月相</button>
            </div>
            <div className="col">
              <button className="btn" onClick={() => {
                try {
                  // 与“对齐放大”复用同一口径：基于当前地球世界yaw与观察地经度对齐经线
                  const seam = composition.seamOffsetDeg ?? 0;
                  const L0 = lonDeg || 0;
                  let L = L0; while (L > 180) L -= 360; while (L < -180) L += 360;
                  let earthYaw = composition.earthYawDeg || 0;
                  try {
                    const earthRoot = (window as any).__R3F_Scene?.getObjectByName?.('earthRoot');
                    if (earthRoot) {
                      const mesh = earthRoot.getObjectByProperty?.('type', 'Mesh');
                      const q = new THREE.Quaternion();
                      if (mesh) mesh.getWorldQuaternion(q); else earthRoot.getWorldQuaternion(q);
                      const v = new THREE.Vector3(0,0,-1).applyQuaternion(q).normalize();
                      earthYaw = THREE.MathUtils.radToDeg(Math.atan2(v.x, v.z));
                    }
                  } catch {}
                  let yaw = earthYaw - (L + seam);
                  while (yaw > 180) yaw -= 360;
                  while (yaw < -180) yaw += 360;
                  setComposition(prev => ({ ...prev, cameraAzimuthDeg: yaw }));
                  // console.log('[AlignMeridianOnly] yaw=', yaw.toFixed(2), { earthYaw, L, seam });
                } catch (e) {
                  // console.error('[AlignMeridianOnly] failed:', e);
                }
              }}>对齐到当前经度（仅方位角）</button>
            </div>
            <div className="col">
              <button className="btn" onClick={() => {
                // 显示当前地球四元数状态
                const earth = document.querySelector('canvas')?.parentElement?.querySelector('[name="earthRoot"]');
                if (earth) {
                  // console.log('[Debug] 当前earthRoot状态:', {
                  //   position: earth.getAttribute('position'),
                  //   quaternion: (earth as any).quaternion,
                  //   matrix: (earth as any).matrix,
                  //   matrixWorld: (earth as any).matrixWorld
                  // });
                }
              }}>显示地球状态</button>
            </div>
            <div className="col">
              <button className="btn" onClick={() => {
                // console.log('[Current State]', {
                //   dateISO,
                //   latDeg,
                //   lonDeg,
                //   sunWorld,
                //   moonEQD,
                //   illumination,
                //   mode
                // });
              }}>打印当前状态</button>
            </div>
            <div className="col">
              <button className="btn" onClick={() => {
                // 测试真正有明显差异的时间点 - 重点测试方位角变化
                const testTimes = [
                  '2024-03-21T07:00', // 春分日出 (东方)
                  '2024-03-21T12:00', // 春分正午 (南方)
                  '2024-03-21T18:00', // 春分日落 (西方)  
                  '2024-06-21T12:00', // 夏至正午 (高角度南方)
                  '2024-12-21T12:00'  // 冬至正午 (低角度或地平线下)
                ];
                console.log('[Test] Testing dramatically different sun positions...');
                
                // 🔧 修复：清理已存在的测试定时器
                if (testIntervalRef.current) {
                  clearInterval(testIntervalRef.current);
                  testIntervalRef.current = null;
                }
                
                let index = 0;
                testIntervalRef.current = setInterval(() => {
                  if (index >= testTimes.length) {
                    if (testIntervalRef.current) {
                      clearInterval(testIntervalRef.current);
                      testIntervalRef.current = null;
                    }
                    console.log('[Test] Dramatic sun position test completed');
                    return;
                  }
                  
                  const time = testTimes[index];
                  try {
                    console.log(`[Test] Setting time to ${time}...`);
                    setDateISO(time);
                    const state = getEarthState(time, latDeg, lonDeg, timeMode);
                    const azimuth = Math.atan2(state.sunDirWorld.z, state.sunDirWorld.x) * 180 / Math.PI;
                    const elevation = Math.asin(state.sunDirWorld.y) * 180 / Math.PI;
                    console.log(`[Test] ${time}:`, {
                      sunWorld: state.sunDirWorld,
                      azimuth: azimuth < 0 ? azimuth + 360 : azimuth,
                      elevation
                    });
                  } catch (err) {
                    console.error(`[Test] ${time} failed:`, err);
                  }
                  index++;
                }, 3000); // 每3秒切换一次
              }}>测试季节光照</button>
            </div>
            {/* 旧测试入口已移除；使用 URL 参数 ?autotest=1 触发新的自动测试 */}
          </div>

          {/* 地球位置控制 */}
          <div className="row" style={{ marginBottom: 16 }}>
            <div className="col">
              <label className="label">地球上沿位置 (0-1): {composition.earthTopY.toFixed(3)}</label>
              <input className="input" type="range" min={0.05} max={0.8} step={0.005}
                     value={composition.earthTopY}
                     onChange={(e) => updateValue('earthTopY', parseFloat(e.target.value))} />
            </div>
            <div className="col">
              <label className="label">地球大小(占屏): {Math.round((composition.earthSize * 100))}%</label>
              <input className="input" type="range" min={0.08} max={3.0} step={0.01}
                     value={composition.earthSize}
                     onChange={(e) => updateValue('earthSize', parseFloat(e.target.value))} />
            </div>
          </div>

          {/* 地球姿态控制 */}
          <div className="row" style={{ marginBottom: 16 }}>
            <div className="col">
              <label className="label">地轴倾角: 0°（固定）</label>
              <input className="input" type="range" min={0} max={0} step={0.1}
                     value={0}
                     disabled />
            </div>
            <div className="col">
              <label className="label">地球经线对齐(自转角): {composition.earthYawDeg}°</label>
              <input className="input" type="range" min={-180} max={180} step={1}
                     value={composition.earthYawDeg}
                     onChange={(e) => updateValue('earthYawDeg', parseInt(e.target.value))} />
            </div>
            <div className="col">
              <label className="label">🔧 当前真实经度: {lonDeg.toFixed(1)}°E</label>
              <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
                基于天文计算的真实位置
              </div>
            </div>
          </div>
          
          {/* 月球位置控制 */}
          <div className="row" style={{ marginBottom: 16 }}>
            <div className="col">
              <label className="label">月球距离: {composition.moonDistance.toFixed(1)}</label>
              <input className="input" type="range" min={3} max={20} step={0.5}
                     value={composition.moonDistance}
                     onChange={(e) => updateValue('moonDistance', parseFloat(e.target.value))} />
            </div>
            <div className="col">
              <label className="label">月球半径: {composition.moonRadius.toFixed(2)}</label>
              <input className="input" type="range" min={0.1} max={1.0} step={0.01}
                     value={composition.moonRadius}
                     onChange={(e) => updateValue('moonRadius', parseFloat(e.target.value))} />
            </div>
          </div>
          
          {/* 月球姿态控制 */}
          <div className="row" style={{ marginBottom: 16 }}>
            <div className="col">
              <label className="label">月球纬度调整: {composition.moonLatDeg}°</label>
              <input className="input" type="range" min={-180} max={180} step={1}
                     value={composition.moonLatDeg}
                     onChange={(e) => updateValue('moonLatDeg', parseInt(e.target.value))} />
            </div>
            <div className="col">
              <label className="label">月球经度调整: {composition.moonLonDeg}°</label>
              <input className="input" type="range" min={-180} max={180} step={1}
                     value={composition.moonLonDeg}
                     onChange={(e) => updateValue('moonLonDeg', parseInt(e.target.value))} />
            </div>
            <div className="col">
              <label className="label">月球水平转角: {composition.moonYawDeg || 0}°</label>
              <input className="input" type="range" min={-180} max={180} step={1}
                     value={composition.moonYawDeg || 0}
                     onChange={(e) => updateValue('moonYawDeg', parseInt(e.target.value))} />
            </div>
          </div>

          {/* 月球外观（色调/亮度曲线/位移） */}
          <div className="row" style={{ marginBottom: 16 }}>
            <div className="col">
              <label className="label">色调强度: {composition.moonTintStrength.toFixed(2)}</label>
              <input className="input" type="range" min={0} max={1} step={0.01}
                     value={composition.moonTintStrength}
                     onChange={(e) => updateValue('moonTintStrength', parseFloat(e.target.value))} />
            </div>
            <div className="col">
              <label className="label">色相H: {Math.round(composition.moonTintH)}°</label>
              <input className="input" type="range" min={0} max={360} step={1}
                     value={composition.moonTintH}
                     onChange={(e) => updateValue('moonTintH', parseFloat(e.target.value))} />
            </div>
            <div className="col">
              <label className="label">饱和S: {Math.round(composition.moonTintS * 100)}%</label>
              <input className="input" type="range" min={0} max={100} step={1}
                     value={Math.round(composition.moonTintS * 100)}
                     onChange={(e) => updateValue('moonTintS', parseInt(e.target.value) / 100)} />
            </div>
            <div className="col">
              <label className="label">亮度L: {Math.round(composition.moonTintL * 100)}%</label>
              <input className="input" type="range" min={0} max={100} step={1}
                     value={Math.round(composition.moonTintL * 100)}
                     onChange={(e) => updateValue('moonTintL', parseInt(e.target.value) / 100)} />
            </div>
          </div>

          <div className="row" style={{ marginBottom: 16 }}>
            <div className="col">
              <label className="label">朗伯Gamma: {composition.moonShadingGamma.toFixed(2)}</label>
              <input className="input" type="range" min={0.6} max={1.6} step={0.01}
                     value={composition.moonShadingGamma}
                     onChange={(e) => updateValue('moonShadingGamma', parseFloat(e.target.value))} />
            </div>
            <div className="col">
              <label className="label">法线强度: {(composition.moonNormalScale ?? 1).toFixed(2)}</label>
              <input className="input" type="range" min={0} max={2} step={0.05}
                     value={composition.moonNormalScale ?? 1}
                     onChange={(e) => updateValue('moonNormalScale', parseFloat(e.target.value))} />
            </div>
            <div className="col">
              <label className="label">法线Y翻转: {composition.normalFlipY ? '是' : '否'}</label>
              <input type="checkbox" checked={composition.normalFlipY ?? false}
                     onChange={(e)=>updateValue('normalFlipY', e.target.checked)} />
            </div>
            <div className="col">
              <label className="label">满月增强强度: {Math.round(composition.moonSurgeStrength*100)}%</label>
              <input className="input" type="range" min={0} max={50} step={1}
                     value={Math.round(composition.moonSurgeStrength*100)}
                     onChange={(e) => updateValue('moonSurgeStrength', parseInt(e.target.value)/100)} />
            </div>
            <div className="col">
              <label className="label">增强宽度σ(°): {composition.moonSurgeSigmaDeg}</label>
              <input className="input" type="range" min={5} max={30} step={1}
                     value={composition.moonSurgeSigmaDeg}
                     onChange={(e) => updateValue('moonSurgeSigmaDeg', parseInt(e.target.value))} />
            </div>
            <div className="col">
              <label className="label">高度位移: {composition.moonDisplacementScale.toFixed(3)}</label>
              <input className="input" type="range" min={0} max={1} step={0.001}
                     value={composition.moonDisplacementScale}
                     onChange={(e) => updateValue('moonDisplacementScale', parseFloat(e.target.value))} />
            </div>
          </div>
          <div className="row" style={{ marginBottom: 16 }}>
            <div className="col">
              <label className="label">晨昏线软半径: {(composition.terminatorRadius ?? 0.02).toFixed(3)}</label>
              <input className="input" type="range" min={0} max={0.2} step={0.001}
                     value={composition.terminatorRadius ?? 0.02}
                     onChange={(e)=>updateValue('terminatorRadius', parseFloat(e.target.value))} />
            </div>
            <div className="col">
              <label className="label">相位耦合强度: {Math.round((composition.phaseCoupleStrength ?? 0)*100)}%</label>
              <input className="input" type="range" min={0} max={100} step={5}
                     value={Math.round((composition.phaseCoupleStrength ?? 0)*100)}
                     onChange={(e)=>updateValue('phaseCoupleStrength', parseInt(e.target.value)/100)} />
            </div>
            <div className="col">
              <label className="label">位移中点: {(composition.displacementMid ?? 0.5).toFixed(2)}</label>
              <input className="input" type="range" min={0} max={1} step={0.01}
                     value={composition.displacementMid ?? 0.5}
                     onChange={(e)=>updateValue('displacementMid', parseFloat(e.target.value))} />
            </div>
            <div className="col">
              <label className="label">夜面抬升: {(composition.nightLift ?? 0.02).toFixed(2)}</label>
              <input className="input" type="range" min={0} max={0.2} step={0.005}
                     value={composition.nightLift ?? 0.02}
                     onChange={(e)=>updateValue('nightLift', parseFloat(e.target.value))} />
            </div>
          </div>

          {/* 外观预设 */}
          <div className="row" style={{ marginBottom: 16, gap: 8 }}>
            <div className="col">
              <span className="label">外观预设</span>
            </div>
            <div className="col">
              <button className="btn" onClick={()=>{
                setComposition(v=>({
                  ...v,
                  moonTintH: 12, moonTintS: 0.85, moonTintL: 0.5, moonTintStrength: 0.35,
                  moonShadingGamma: 1.05,
                  moonSurgeStrength: 0.18, moonSurgeSigmaDeg: 18,
                  moonDisplacementScale: Math.max(0.012, v.moonDisplacementScale)
                }));
              }}>血月</button>
            </div>
            <div className="col">
              <button className="btn" onClick={()=>{
                setComposition(v=>({
                  ...v,
                  moonTintH: 210, moonTintS: 0.12, moonTintL: 0.55, moonTintStrength: 0.12,
                  moonShadingGamma: 0.95,
                  moonSurgeStrength: 0.12, moonSurgeSigmaDeg: 20
                }));
              }}>冷白半月</button>
            </div>
            <div className="col">
              <button className="btn" onClick={()=>{
                setComposition(v=>({
                  ...v,
                  moonTintH: 35, moonTintS: 0.18, moonTintL: 0.55, moonTintStrength: 0.10,
                  moonShadingGamma: 1.0,
                  moonSurgeStrength: 0.2, moonSurgeSigmaDeg: 16
                }));
              }}>暖满月</button>
            </div>
          </div>

          {/* 银河控制 */}
          <div className="row" style={{ marginBottom: 16 }}>
            <div className="col">
              <label className="label">银河经度(°): {Math.round(composition.bgYawDeg ?? 0)}</label>
              <input className="input" type="range" min={-180} max={180} step={1}
                     value={composition.bgYawDeg ?? 0}
                     onChange={(e)=>updateValue('bgYawDeg', parseInt(e.target.value))} />
            </div>
            <div className="col">
              <label className="label">银河纬度(°): {Math.round(composition.bgPitchDeg ?? 0)}</label>
              <input className="input" type="range" min={-90} max={90} step={1}
                     value={composition.bgPitchDeg ?? 0}
                     onChange={(e)=>updateValue('bgPitchDeg', parseInt(e.target.value))} />
            </div>
            <div className="col">
              <label className="label">银河缩放: {Math.round(((composition.bgScale ?? 1)*100))}%</label>
              <input className="input" type="range" min={50} max={200} step={5}
                     value={Math.round((composition.bgScale ?? 1)*100)}
                     onChange={(e)=>updateValue('bgScale', parseInt(e.target.value)/100)} />
            </div>
          </div>
          
          {/* 月球屏幕位置控制 */}
          <div className="row" style={{ marginBottom: 16 }}>
            <div className="col">
              <label className="label">月球屏幕X位置: {composition.moonScreenX.toFixed(2)}</label>
              <input className="input" type="range" min={0.1} max={0.9} step={0.01}
                     value={composition.moonScreenX}
                     onChange={(e) => updateValue('moonScreenX', parseFloat(e.target.value))} />
            </div>
            <div className="col">
              <label className="label">月球屏幕Y位置: {composition.moonScreenY.toFixed(2)}</label>
              <input className="input" type="range" min={0.1} max={0.9} step={0.01}
                     value={composition.moonScreenY}
                     onChange={(e) => updateValue('moonScreenY', parseFloat(e.target.value))} />
            </div>
          </div>
          
          {/* 光照控制 */}
          <div className="row" style={{ marginBottom: 16 }}>
            <div className="col">
              <label className="label">阳光强度: {composition.sunIntensity.toFixed(2)}</label>
              <input className="input" type="range" min={0} max={6} step={0.05}
                     value={composition.sunIntensity}
                     onChange={(e) => updateValue('sunIntensity', parseFloat(e.target.value))} />
            </div>
            <div className="col">
              <label className="label">色温: {composition.lightTempK}K</label>
              <input className="input" type="range" min={2000} max={10000} step={100}
                     value={composition.lightTempK}
                     onChange={(e) => updateValue('lightTempK', parseInt(e.target.value))} />
            </div>
          </div>
          
          {/* 光照方向控制 - 根据模式显示不同内容 */}
          {mode === 'debug' ? (
            // 调试模式：显示手动控制滑块
            <div className="row" style={{ marginBottom: 16 }}>
              <div className="col">
                <label className="label">手动光照方位角: {composition.lightAzimuth}°</label>
                <input className="input" type="range" min={0} max={360} step={5}
                       value={composition.lightAzimuth}
                       onChange={(e) => updateValue('lightAzimuth', parseInt(e.target.value))} />
              </div>
              <div className="col">
                <label className="label">手动光照仰角: {composition.lightElevation}°</label>
                <input className="input" type="range" min={-90} max={90} step={5}
                       value={composition.lightElevation}
                       onChange={(e) => updateValue('lightElevation', parseInt(e.target.value))} />
              </div>
            </div>
          ) : (
            // 天相模式：显示实时计算的光照方向（只读）
            <div className="row" style={{ marginBottom: 16, padding: '12px', background: 'rgba(0,255,0,0.05)', borderRadius: '4px', border: '1px solid rgba(0,255,0,0.2)' }}>
              <div className="col">
                <label className="label" style={{ color: '#00ff00' }}>🌞 实时光照方位角: {lightInfo.azimuth}°</label>
                <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
                  基于当前时间自动计算 · 0°=北，顺时针为正
                </div>
              </div>
              <div className="col">
                <label className="label" style={{ color: '#00ff00' }}>🌞 实时光照仰角: {lightInfo.elevation}°</label>
                <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
                  基于当前时间自动计算 · 正值=地平线上，负值=地平线下
                </div>
              </div>
              <div className="col">
                <label className="label" style={{ color: '#00ff00' }}>🔧 坐标约定</label>
                <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
                  方位角：北=0°，东=90°，南=180°，西=270°
                </div>
              </div>
            </div>
          )}
          
          {/* 地球材质控制 */}
          <div className="row" style={{ marginBottom: 16 }}>
            <div className="col">
              <label className="label">镜面高光: 强度 {Math.round((composition.specStrength * 100))}% · 锐度 {composition.shininess}</label>
              <div className="row">
                <input className="input" type="range" min={0} max={300} step={1}
                       value={Math.round((composition.specStrength * 100))}
                       onChange={(e) => updateValue('specStrength', parseFloat(e.target.value) / 100)} />
                <input className="input" type="range" min={1} max={400} step={1}
                       value={composition.shininess}
                       onChange={(e) => updateValue('shininess', parseInt(e.target.value))} />
              </div>
            </div>
            <div className="col">
              <label className="label">高光铺展: 强度 {Math.round((composition.broadStrength * 100))}%</label>
              <input className="input" type="range" min={0} max={200} step={1}
                     value={Math.round((composition.broadStrength * 100))}
                     onChange={(e) => updateValue('broadStrength', parseFloat(e.target.value) / 100)} />
            </div>
          </div>
          
          <div className="row" style={{ marginBottom: 16 }}>
            <div className="col">
              <label className="label">海面菲涅尔: 系数 {composition.specFresnelK.toFixed(1)} (0关闭)</label>
              <input className="input" type="range" min={0} max={5} step={0.1}
                     value={composition.specFresnelK}
                     onChange={(e) => updateValue('specFresnelK', parseFloat(e.target.value))} />
            </div>
          </div>
          
          {/* 晨昏线控制 */}
          <div className="row" style={{ marginBottom: 16 }}>
            <div className="col">
              <label className="label">晨昏线柔和度: {composition.terminatorSoftness.toFixed(3)}</label>
              <input className="input" type="range" min={0} max={0.3} step={0.005}
                     value={composition.terminatorSoftness}
                     onChange={(e) => updateValue('terminatorSoftness', parseFloat(e.target.value))} />
            </div>
            <div className="col">
              <label className="label">夜景衰减: {composition.nightFalloff.toFixed(1)}</label>
              <input className="input" type="range" min={0.5} max={3.0} step={0.1}
                     value={composition.nightFalloff}
                     onChange={(e) => updateValue('nightFalloff', parseFloat(e.target.value))} />
            </div>
          </div>
          
          <div className="row" style={{ marginBottom: 16 }}>
            <div className="col">
              <label className="label">终止线提亮: {composition.terminatorLift.toFixed(3)}</label>
              <input className="input" type="range" min={0} max={0.05} step={0.001}
                     value={composition.terminatorLift}
                     onChange={(e) => updateValue('terminatorLift', parseFloat(e.target.value))} />
            </div>
            <div className="col">
              <label className="label">夜景强度: {composition.nightIntensity.toFixed(1)}</label>
              <input className="input" type="range" min={0} max={5} step={0.1}
                     value={composition.nightIntensity}
                     onChange={(e) => updateValue('nightIntensity', parseFloat(e.target.value))} />
            </div>
          </div>
          
          <div className="row" style={{ marginBottom: 16 }}>
            <div className="col">
              <label className="label">终止线暖色调: R{composition.terminatorTint[0].toFixed(2)} G{composition.terminatorTint[1].toFixed(2)} B{composition.terminatorTint[2].toFixed(2)} A{composition.terminatorTint[3].toFixed(2)}</label>
              <div className="row">
                <input className="input" type="range" min={0.8} max={1.2} step={0.01}
                       value={composition.terminatorTint[0]}
                       onChange={(e) => {
                         const newTint = [...composition.terminatorTint];
                         newTint[0] = parseFloat(e.target.value);
                         updateValue('terminatorTint', newTint as [number, number, number, number]);
                       }} />
                <input className="input" type="range" min={0.7} max={1.0} step={0.01}
                       value={composition.terminatorTint[1]}
                       onChange={(e) => {
                         const newTint = [...composition.terminatorTint];
                         newTint[1] = parseFloat(e.target.value);
                         updateValue('terminatorTint', newTint as [number, number, number, number]);
                       }} />
                <input className="input" type="range" min={0.6} max={0.9} step={0.01}
                       value={composition.terminatorTint[2]}
                       onChange={(e) => {
                         const newTint = [...composition.terminatorTint];
                         newTint[2] = parseFloat(e.target.value);
                         updateValue('terminatorTint', newTint as [number, number, number, number]);
                       }} />
                <input className="input" type="range" min={0.0} max={0.1} step={0.005}
                       value={composition.terminatorTint[3]}
                       onChange={(e) => {
                         const newTint = [...composition.terminatorTint];
                         newTint[3] = parseFloat(e.target.value);
                         updateValue('terminatorTint', newTint as [number, number, number, number]);
                       }} />
              </div>
            </div>
          </div>
          
          <div className="row" style={{ marginBottom: 16 }}>
            <div className="col">
              <label className="label">月光地球贴图强度: {composition.nightEarthMapIntensity.toFixed(2)}</label>
              <input className="input" type="range" min={0} max={0.8} step={0.05}
                     value={composition.nightEarthMapIntensity}
                     onChange={(e) => updateValue('nightEarthMapIntensity', parseFloat(e.target.value))} />
            </div>
          </div>
          
          <div className="row" style={{ marginBottom: 16 }}>
            <div className="col">
              <label className="label">月光色调: {composition.nightEarthMapHue.toFixed(0)}°</label>
              <input className="input" type="range" min={0} max={360} step={1}
                     value={composition.nightEarthMapHue}
                     onChange={(e) => updateValue('nightEarthMapHue', parseFloat(e.target.value))} />
            </div>
            <div className="col">
              <label className="label">月光饱和度: {composition.nightEarthMapSaturation.toFixed(2)}</label>
              <input className="input" type="range" min={0} max={2} step={0.1}
                     value={composition.nightEarthMapSaturation}
                     onChange={(e) => updateValue('nightEarthMapSaturation', parseFloat(e.target.value))} />
            </div>
            <div className="col">
              <label className="label">月光亮度: {composition.nightEarthMapLightness.toFixed(2)}</label>
              <input className="input" type="range" min={0} max={2} step={0.1}
                     value={composition.nightEarthMapLightness}
                     onChange={(e) => updateValue('nightEarthMapLightness', parseFloat(e.target.value))} />
            </div>
          </div>
          
          <div className="row" style={{ marginBottom: 16 }}>
            <div className="col">
              <label className="label">夜半球明度: {composition.nightHemisphereBrightness.toFixed(2)}</label>
              <input className="input" type="range" min={0.2} max={2} step={0.1}
                     value={composition.nightHemisphereBrightness}
                     onChange={(e) => updateValue('nightHemisphereBrightness', parseFloat(e.target.value))} />
            </div>
          </div>
          
          <div className="row" style={{ marginBottom: 16 }}>
            <div className="col">
              <label className="label">夜景发光模糊: {composition.nightGlowBlur.toFixed(3)}</label>
              <input className="input" type="range" min={0} max={0.1} step={0.001}
                     value={composition.nightGlowBlur}
                     onChange={(e) => updateValue('nightGlowBlur', parseFloat(e.target.value))} />
            </div>
            <div className="col">
              <label className="label">夜景发光不透明度: {composition.nightGlowOpacity.toFixed(2)}</label>
              <input className="input" type="range" min={0} max={1} step={0.05}
                     value={composition.nightGlowOpacity}
                     onChange={(e) => updateValue('nightGlowOpacity', parseFloat(e.target.value))} />
            </div>
          </div>
          
          {/* 大气效果控制 */}
          <div className="row" style={{ marginBottom: 16 }}>
            <div className="col">
              <label className="label">大气弧光: 强度 {composition.rimStrength.toFixed(2)} · 宽度 {composition.rimWidth.toFixed(2)} · 高度 {composition.rimHeight.toFixed(3)}</label>
              <div className="row">
                <input className="input" type="range" min={0} max={2} step={0.01}
                       value={composition.rimStrength}
                       onChange={(e) => updateValue('rimStrength', parseFloat(e.target.value))} />
                <input className="input" type="range" min={0} max={3} step={0.01}
                       value={composition.rimWidth}
                       onChange={(e) => updateValue('rimWidth', parseFloat(e.target.value))} />
                <input className="input" type="range" min={0} max={0.05} step={0.001}
                       value={composition.rimHeight}
                       onChange={(e) => updateValue('rimHeight', parseFloat(e.target.value))} />
              </div>
            </div>
          </div>

          {/* 大气辉光增强控制 */}
          <div className="row" style={{ marginBottom: 16, padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="col">
              <div className="row" style={{ marginBottom: 8 }}>
                <label>
                  <input type="checkbox" checked={composition.enableAtmosphere ?? true} 
                         onChange={(e) => updateValue('enableAtmosphere', e.target.checked)} /> 
                  大气辉光增强
                </label>
              </div>
              <div className="row" style={{ gap: 12 }}>
                <div className="col" style={{ flex: 1 }}>
                  <div className="label" style={{ marginBottom: 4, fontSize: '12px' }}>强度</div>
                  <input type="range" min={0} max={4} step={0.1}
                         value={composition.atmoIntensity ?? 1.0}
                         onChange={(e) => updateValue('atmoIntensity', parseFloat(e.target.value))} />
                  <span style={{ fontSize: '10px', opacity: 0.8 }}>{(composition.atmoIntensity ?? 1.0).toFixed(1)}</span>
                </div>
                <div className="col" style={{ flex: 1 }}>
                  <div className="label" style={{ marginBottom: 4, fontSize: '12px' }}>厚度</div>
                  <input type="range" min={0.02} max={0.30} step={0.01}
                         value={composition.atmoThickness ?? 0.05}
                         onChange={(e) => updateValue('atmoThickness', parseFloat(e.target.value))} />
                  <span style={{ fontSize: '10px', opacity: 0.8 }}>{(composition.atmoThickness ?? 0.05).toFixed(2)}</span>
                </div>
                <div className="col" style={{ flex: 1 }}>
                  <div className="label" style={{ marginBottom: 4, fontSize: '12px' }}>Fresnel</div>
                  <input type="range" min={1} max={3} step={0.1}
                         value={composition.atmoFresnelPower ?? 2.0}
                         onChange={(e) => updateValue('atmoFresnelPower', parseFloat(e.target.value))} />
                  <span style={{ fontSize: '10px', opacity: 0.8 }}>{(composition.atmoFresnelPower ?? 2.0).toFixed(1)}</span>
                </div>
                <div className="col" style={{ flex: 1 }}>
                  <div className="label" style={{ marginBottom: 4, fontSize: '12px' }}>大气柔度</div>
                  <input type="range" min={0} max={3} step={0.01}
                         value={composition.atmoSoftness ?? 0.5}
                         onChange={(e) => updateValue('atmoSoftness', parseFloat(e.target.value))} />
                  <span style={{ fontSize: '10px', opacity: 0.8 }}>{(composition.atmoSoftness ?? 0.5).toFixed(2)}</span>
                </div>
                <div className="col" style={{ flex: 1 }}>
                  <div className="label" style={{ marginBottom: 4, fontSize: '12px' }}>大气对比</div>
                  <input type="range" min={0} max={1} step={0.01}
                         value={composition.atmoContrast ?? 0.5}
                         onChange={(e) => updateValue('atmoContrast', parseFloat(e.target.value))} />
                  <span style={{ fontSize: '10px', opacity: 0.8 }}>{(composition.atmoContrast ?? 0.5).toFixed(2)}</span>
                </div>
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                <label>
                  <input type="checkbox" checked={composition.atmoNearShell ?? true} 
                         onChange={(e) => updateValue('atmoNearShell', e.target.checked)} /> 
                  近地薄壳渐变
                </label>
              </div>
              {composition.atmoNearShell && (
                <div className="row" style={{ gap: 12, marginTop: 8 }}>
                  <div className="col" style={{ flex: 1 }}>
                    <div className="label" style={{ marginBottom: 4, fontSize: '12px' }}>近地强度</div>
                    <input type="range" min={0} max={4} step={0.1}
                           value={composition.atmoNearStrength ?? 1.0}
                           onChange={(e) => updateValue('atmoNearStrength', parseFloat(e.target.value))} />
                    <span style={{ fontSize: '10px', opacity: 0.8 }}>{(composition.atmoNearStrength ?? 1.0).toFixed(1)}</span>
                  </div>
                  <div className="col" style={{ flex: 1 }}>
                    <div className="label" style={{ marginBottom: 4, fontSize: '12px' }}>近地厚度</div>
                    <input type="range" min={0} max={1} step={0.01}
                           value={composition.atmoNearThickness ?? 0.35}
                           onChange={(e) => updateValue('atmoNearThickness', parseFloat(e.target.value))} />
                    <span style={{ fontSize: '10px', opacity: 0.8 }}>{(composition.atmoNearThickness ?? 0.35).toFixed(2)}</span>
                  </div>
                  <div className="col" style={{ flex: 1 }}>
                    <div className="label" style={{ marginBottom: 4, fontSize: '12px' }}>近地对比</div>
                    <input type="range" min={0} max={1} step={0.01}
                           value={composition.atmoNearContrast ?? 0.6}
                           onChange={(e) => updateValue('atmoNearContrast', parseFloat(e.target.value))} />
                    <span style={{ fontSize: '10px', opacity: 0.8 }}>{(composition.atmoNearContrast ?? 0.6).toFixed(2)}</span>
                  </div>
                  <div className="col" style={{ flex: 1 }}>
                  <div className="label" style={{ marginBottom: 4, fontSize: '12px' }}>近地柔度</div>
                    <input type="range" min={0} max={3} step={0.01}
                           value={composition.atmoNearSoftness ?? 0.5}
                           onChange={(e) => updateValue('atmoNearSoftness', parseFloat(e.target.value))} />
                    <span style={{ fontSize: '10px', opacity: 0.8 }}>{(composition.atmoNearSoftness ?? 0.5).toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* 大气融合 · 实验参数（仅裁“不可见尾巴”，默认关闭） */}
              <div className="row" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed rgba(255,255,255,0.15)' }}>
                <div className="col" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox"
                         checked={(composition as any).atmoBlendUseAlpha ?? false}
                         onChange={(e) => updateValue('atmoBlendUseAlpha' as any, e.target.checked)} />
                  <span style={{ fontSize: 12 }}>Alpha 加权加法混合</span>
                </div>
                <div className="col" style={{ flex: 1 }}>
                  <div className="label" style={{ marginBottom: 4, fontSize: '12px' }}>感知地板 (线性域)</div>
                  <input type="range" min={0} max={0.01} step={0.001}
                         value={(composition as any).atmoPerceptualFloor ?? 0.0}
                         onChange={(e) => updateValue('atmoPerceptualFloor' as any, parseFloat(e.target.value))} />
                  <span style={{ fontSize: '10px', opacity: 0.8 }}>{(((composition as any).atmoPerceptualFloor ?? 0.0)).toFixed(3)}</span>
                </div>
                <div className="col" style={{ flex: 1 }}>
                  <div className="label" style={{ marginBottom: 4, fontSize: '12px' }}>尺度高度 H/R</div>
                  <input type="range" min={0} max={0.06} step={0.002}
                         value={(composition as any).atmoScaleHeight ?? 0.0}
                         onChange={(e) => updateValue('atmoScaleHeight' as any, parseFloat(e.target.value))} />
                  <span style={{ fontSize: '10px', opacity: 0.8 }}>{(((composition as any).atmoScaleHeight ?? 0.0)).toFixed(3)}</span>
                </div>
              </div>
              </div>
          </div>

          {/* 地球材质控制 */}
          <div className="row" style={{ marginBottom: 16 }}>
            <div className="col">
              <label className="label">地球材质亮度: {composition.earthLightIntensity.toFixed(2)}</label>
              <input className="input" type="range" min={0} max={3} step={0.05}
                     value={composition.earthLightIntensity}
                     onChange={(e) => updateValue('earthLightIntensity', parseFloat(e.target.value))} />
            </div>
            <div className="col">
              <label className="label">地球材质色温: {composition.earthLightTempK}K</label>
              <input className="input" type="range" min={2000} max={10000} step={100}
                     value={composition.earthLightTempK}
                     onChange={(e) => updateValue('earthLightTempK', parseInt(e.target.value))} />
            </div>
          </div>

          {/* 镜面/高光（放在此处，靠近材质与位移） */}
          <div className="row" style={{ marginBottom: 16 }}>
            <div className="col">
              <label className="label">镜面高光: 强度 {Math.round((composition.specStrength * 100))}% · 锐度 {composition.shininess}</label>
              <div className="row">
                <input className="input" type="range" min={0} max={300} step={1}
                       value={Math.round((composition.specStrength * 100))}
                       onChange={(e) => updateValue('specStrength', parseFloat(e.target.value) / 100)} />
                <input className="input" type="range" min={1} max={400} step={1}
                       value={composition.shininess}
                       onChange={(e) => updateValue('shininess', parseInt(e.target.value))} />
              </div>
            </div>
            <div className="col">
              <label className="label">高光铺展: 强度 {Math.round((composition.broadStrength * 100))}%</label>
              <input className="input" type="range" min={0} max={200} step={1}
                     value={Math.round((composition.broadStrength * 100))}
                     onChange={(e) => updateValue('broadStrength', parseFloat(e.target.value) / 100)} />
            </div>
          </div>
          
          <div className="row" style={{ marginBottom: 16 }}>
            <div className="col">
              <label className="label">海面菲涅尔: 系数 {composition.specFresnelK.toFixed(1)} (0关闭)</label>
              <input className="input" type="range" min={0} max={5} step={0.1}
                     value={composition.specFresnelK}
                     onChange={(e) => updateValue('specFresnelK', parseFloat(e.target.value))} />
            </div>
          </div>

  
          {/* 地球置换控制（高度） */}
          <div className="row" style={{ marginBottom: 16 }}>
            <div className="col">
              <label className="label">地球高度位移: 比例 {(composition.earthDisplacementScale ?? 0.0021).toFixed(4)} · 中点 {(composition.earthDisplacementMid ?? 0.30).toFixed(2)} · 对比 {(composition.earthDisplacementContrast ?? 4.00).toFixed(2)}</label>
              <div className="row">
                <input className="input" type="range" min={0} max={0.01} step={0.0001}
                       value={composition.earthDisplacementScale ?? 0.0021}
                       onChange={(e) => updateValue('earthDisplacementScale', parseFloat(e.target.value))} />
                <input className="input" type="range" min={0} max={1} step={0.01}
                       value={composition.earthDisplacementMid ?? 0.30}
                       onChange={(e) => updateValue('earthDisplacementMid', parseFloat(e.target.value))} />
                <input className="input" type="range" min={0.5} max={6} step={0.1}
                       value={composition.earthDisplacementContrast ?? 4.00}
                       onChange={(e) => updateValue('earthDisplacementContrast', parseFloat(e.target.value))} />
              </div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>说明：需要提供地球高度贴图（height/displacement）；无贴图时该控制无效。</div>
              
              {/* Debug模式控制 */}
              <label className="label" style={{ marginTop: 8 }}>Debug模式: {debugMode === 0 ? '关闭' : debugMode === 1 ? '原始高度' : debugMode === 2 ? '调整后高度' : debugMode === 3 ? '地形阴影(AO)' : '地形投影(方向性)'}</label>
              <div className="row">
                <input className="input" type="range" min={0} max={4} step={1}
                       value={debugMode}
                       onChange={(e) => setDebugMode(parseInt(e.target.value))} />
              </div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>说明：0=关闭，1=原始高度，2=调整后高度，3=AO阴影强度，4=方向性投影强度</div>
            </div>
          </div>

          {/* 地表细节 LOD（预留） */}
          <div className="row" style={{ marginBottom: 16 }}>
            <div className="col">
              <label className="label">地表细节 LOD</label>
              <div className="row" style={{ gap: 8 }}>
                <select className="input" value={(composition as any).earthDetailLOD ?? 'auto'}
                        onChange={(e) => updateValue('earthDetailLOD' as any, e.target.value as any)}>
                  <option value="auto">自动（按距离）</option>
                  <option value="normal">仅法线</option>
                  <option value="displacement">置换（近景）</option>
                </select>
                <div className="col" style={{ flex: 1 }}>
                  <div className="label" style={{ marginBottom: 4, fontSize: '12px' }}>近景阈值</div>
                  <input type="range" min={4} max={20} step={1}
                         value={(composition as any).earthNearDistance ?? 8}
                         onChange={(e) => updateValue('earthNearDistance' as any, parseFloat(e.target.value))} />
                  <span style={{ fontSize: '10px', opacity: 0.8 }}>{(((composition as any).earthNearDistance ?? 8)).toFixed(0)}m</span>
                </div>
                <div className="col" style={{ flex: 1 }}>
                  <div className="label" style={{ marginBottom: 4, fontSize: '12px' }}>远景阈值</div>
                  <input type="range" min={10} max={40} step={1}
                         value={(composition as any).earthFarDistance ?? 18}
                         onChange={(e) => updateValue('earthFarDistance' as any, parseFloat(e.target.value))} />
                  <span style={{ fontSize: '10px', opacity: 0.8 }}>{(((composition as any).earthFarDistance ?? 18)).toFixed(0)}m</span>
                </div>
              </div>
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>说明：当前仅作为参数占位；近景将用于置换，中远景使用法线。</div>
            </div>
          </div>

          {/* DEM地形控制 */}
          { (
            <div className="row" style={{ marginBottom: 16 }}>
              <div className="col">
                <label className="label">DEM地形参数</label>
                <div className="row" style={{ gap: 8, marginBottom: 8 }}>
                  <div className="col" style={{ flex: 1 }}>
                    <div className="label" style={{ marginBottom: 4, fontSize: '12px' }}>法线强度</div>
                    <input type="range" min={0} max={10} step={0.1}
                           value={demParams.demNormalStrength}
                           onChange={(e) => setDemParams(prev => ({ ...prev, demNormalStrength: parseFloat(e.target.value) }))} />
                    <span style={{ fontSize: '10px', opacity: 0.8 }}>{demParams.demNormalStrength.toFixed(1)}</span>
                  </div>
                  <div className="col" style={{ flex: 1 }}>
                    <div className="label" style={{ marginBottom: 4, fontSize: '12px' }}>法线权重</div>
                    <input type="range" min={0} max={0.2} step={0.01}
                           value={demParams.demNormalWeight}
                           onChange={(e) => setDemParams(prev => ({ ...prev, demNormalWeight: parseFloat(e.target.value) }))} />
                    <span style={{ fontSize: '10px', opacity: 0.8 }}>{demParams.demNormalWeight.toFixed(2)}</span>
                  </div>
                </div>
                <div className="row" style={{ gap: 8, marginBottom: 8 }}>
                </div>
                <div className="row" style={{ gap: 8 }}>
                </div>
                
                {/* 地形投影(AO)精细控制 */}
                <div className="row" style={{ gap: 8, marginBottom: 8 }}>
                  <div className="col" style={{ flex: 1 }}>
                    <div className="label" style={{ marginBottom: 4, fontSize: '12px' }}>阴影阈值</div>
                    <input type="range" min={0.001} max={0.1} step={0.001}
                           value={demParams.shadowHeightThreshold}
                           onChange={(e) => setDemParams(prev => ({ ...prev, shadowHeightThreshold: parseFloat(e.target.value) }))} />
                    <span style={{ fontSize: '10px', opacity: 0.8 }}>{demParams.shadowHeightThreshold.toFixed(3)}</span>
                  </div>
                  <div className="col" style={{ flex: 1 }}>
                    <div className="label" style={{ marginBottom: 4, fontSize: '12px' }}>距离衰减</div>
                    <input type="range" min={0.5} max={5.0} step={0.1}
                           value={demParams.shadowDistanceAttenuation}
                           onChange={(e) => setDemParams(prev => ({ ...prev, shadowDistanceAttenuation: parseFloat(e.target.value) }))} />
                    <span style={{ fontSize: '10px', opacity: 0.8 }}>{demParams.shadowDistanceAttenuation.toFixed(1)}</span>
                  </div>
                </div>
                <div className="row" style={{ gap: 8, marginBottom: 8 }}>
                  <div className="col" style={{ flex: 1 }}>
                    <div className="label" style={{ marginBottom: 4, fontSize: '12px' }}>最大遮挡</div>
                    <input type="range" min={0.1} max={1.0} step={0.05}
                           value={demParams.shadowMaxOcclusion}
                           onChange={(e) => setDemParams(prev => ({ ...prev, shadowMaxOcclusion: parseFloat(e.target.value) }))} />
                    <span style={{ fontSize: '10px', opacity: 0.8 }}>{demParams.shadowMaxOcclusion.toFixed(2)}</span>
                  </div>
                  <div className="col" style={{ flex: 1 }}>
                    <div className="label" style={{ marginBottom: 4, fontSize: '12px' }}>平滑因子</div>
                    <input type="range" min={0.1} max={1.0} step={0.05}
                           value={demParams.shadowSmoothFactor}
                           onChange={(e) => setDemParams(prev => ({ ...prev, shadowSmoothFactor: parseFloat(e.target.value) }))} />
                    <span style={{ fontSize: '10px', opacity: 0.8 }}>{demParams.shadowSmoothFactor.toFixed(2)}</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>说明：新参数可精细调节地形阴影(AO)效果，避免"池塘"现象。</div>
                
                {/* 地形投影(方向性)控制 */}
                <div style={{ fontSize: 12, fontWeight: 500, marginTop: 12, marginBottom: 8 }}>地形投影（方向性）</div>
                <div className="row" style={{ gap: 8, marginBottom: 8 }}>
                  <div className="col" style={{ flex: 1 }}>
                    <div className="label" style={{ marginBottom: 4, fontSize: '12px' }}>投影强度</div>
                    <input type="range" min={0} max={2} step={0.1}
                           value={demParams.directionalShadowStrength}
                           onChange={(e) => setDemParams(prev => ({ ...prev, directionalShadowStrength: parseFloat(e.target.value) }))} />
                    <span style={{ fontSize: '10px', opacity: 0.8 }}>{demParams.directionalShadowStrength.toFixed(1)}</span>
                  </div>
                  <div className="col" style={{ flex: 1 }}>
                    <div className="label" style={{ marginBottom: 4, fontSize: '12px' }}>投影柔和度</div>
                    <input type="range" min={0.1} max={2} step={0.1}
                           value={demParams.directionalShadowSoftness}
                           onChange={(e) => setDemParams(prev => ({ ...prev, directionalShadowSoftness: parseFloat(e.target.value) }))} />
                    <span style={{ fontSize: '10px', opacity: 0.8 }}>{demParams.directionalShadowSoftness.toFixed(1)}</span>
                  </div>
                </div>
                <div className="row" style={{ gap: 8, marginBottom: 8 }}>
                  <div className="col" style={{ flex: 1 }}>
                    <div className="label" style={{ marginBottom: 4, fontSize: '12px' }}>投影锐利度</div>
                    <input type="range" min={0.5} max={5.0} step={0.1}
                           value={demParams.directionalShadowSharpness}
                           onChange={(e) => setDemParams(prev => ({ ...prev, directionalShadowSharpness: parseFloat(e.target.value) }))} />
                    <span style={{ fontSize: '10px', opacity: 0.8 }}>{demParams.directionalShadowSharpness.toFixed(1)}</span>
                  </div>
                  <div className="col" style={{ flex: 1 }}>
                    <div className="label" style={{ marginBottom: 4, fontSize: '12px' }}>投影对比度</div>
                    <input type="range" min={0.5} max={3.0} step={0.1}
                           value={demParams.directionalShadowContrast}
                           onChange={(e) => setDemParams(prev => ({ ...prev, directionalShadowContrast: parseFloat(e.target.value) }))} />
                    <span style={{ fontSize: '10px', opacity: 0.8 }}>{demParams.directionalShadowContrast.toFixed(1)}</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>说明：基于光照方向的地形投影，与AO阴影独立工作产生真实阴影效果。锐利度控制边缘清晰度，对比度调节阴影强度差异。</div>
              </div>
            </div>
          )}

          {/* 阴影与细分 LOD */}
          <div className="row" style={{ marginBottom: 16 }}>
            <div className="col" style={{ minWidth: 260 }}>
              <div className="row" style={{ gap: 12, marginBottom: 8 }}>
                <label>
                  <input type="checkbox" checked={composition.enableTerrainShadow ?? false}
                         onChange={(e) => updateValue('enableTerrainShadow', e.target.checked)} /> 地形阴影（AO）
                </label>
                <label>
                  <input type="checkbox" checked={composition.enableCloudShadow ?? false}
                         onChange={(e) => updateValue('enableCloudShadow', e.target.checked)} /> 云层投影（云贴图暗化）
                </label>
              </div>
              <label className="label">云层投影强度: {Math.round((composition.cloudShadowStrength ?? 0.4) * 100)}%</label>
              <input className="input" type="range" min={0} max={1} step={0.01}
                     value={composition.cloudShadowStrength ?? 0.4}
                     onChange={(e) => updateValue('cloudShadowStrength', parseFloat(e.target.value))} />
            </div>
            <div className="col">
              <div className="row" style={{ gap: 12, marginBottom: 8 }}>
                <label>
                  <input type="checkbox" checked={composition.useSegLOD ?? true}
                         onChange={(e) => updateValue('useSegLOD', e.target.checked)} /> 启用细分 LOD
                </label>
              </div>
              <div className="row" style={{ gap: 12 }}>
                <div className="col">
                  <label className="label">基础段数: {composition.earthSegmentsBase ?? 144}</label>
                  <input className="input" type="range" min={32} max={512} step={16}
                         value={composition.earthSegmentsBase ?? 144}
                         onChange={(e) => updateValue('earthSegmentsBase', parseInt(e.target.value))} />
                </div>
                <div className="col">
                  <label className="label">近景段数: {composition.earthSegmentsHigh ?? 288}</label>
                  <input className="input" type="range" min={64} max={2048} step={16}
                         value={composition.earthSegmentsHigh ?? 288}
                         onChange={(e) => updateValue('earthSegmentsHigh', parseInt(e.target.value))} />
                </div>
              </div>
              <div className="col">
                <label className="label">LOD触发阈值（地球半径 size ≥）: {(composition.segLODTriggerSize ?? 1.0).toFixed(2)}</label>
                <input className="input" type="range" min={0.5} max={2.0} step={0.05}
                       value={composition.segLODTriggerSize ?? 1.0}
                       onChange={(e) => updateValue('segLODTriggerSize', parseFloat(e.target.value))} />
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>也会在“经线对齐并放大”后触发。</div>
              </div>
            </div>
          </div>
          
          {/* 月球材质控制 */}
          <div className="row" style={{ marginBottom: 16 }}>
            <div className="col">
              <label className="label">月球材质亮度: {composition.moonLightIntensity.toFixed(2)}</label>
              <input className="input" type="range" min={0} max={3} step={0.05}
                     value={composition.moonLightIntensity}
                     onChange={(e) => updateValue('moonLightIntensity', parseFloat(e.target.value))} />
            </div>
            <div className="col">
              <label className="label">月球材质色温: {composition.moonLightTempK}K</label>
              <input className="input" type="range" min={2000} max={10000} step={100}
                     value={composition.moonLightTempK}
                     onChange={(e) => updateValue('moonLightTempK', parseInt(e.target.value))} />
            </div>
          </div>
          
          {/* 月球光照强度极值控制 */}
          <div className="row" style={{ marginBottom: 16 }}>
            <div className="col">
              <label className="label">新月光照比例: {composition.moonLightMinRatio.toFixed(2)}</label>
              <input className="input" type="range" min={0} max={1} step={0.05}
                     value={composition.moonLightMinRatio}
                     onChange={(e) => updateValue('moonLightMinRatio', parseFloat(e.target.value))} />
            </div>
            <div className="col">
              <label className="label">满月光照比例: {composition.moonLightMaxRatio.toFixed(2)}</label>
              <input className="input" type="range" min={0} max={1} step={0.05}
                     value={composition.moonLightMaxRatio}
                     onChange={(e) => updateValue('moonLightMaxRatio', parseFloat(e.target.value))} />
            </div>
          </div>
          
          {/* 保存和重置按钮 */}
          <div className="row" style={{ marginBottom: 16 }}>
            <div className="col">
              <button className="btn" onClick={() => setComposition(DEFAULT_SIMPLE_COMPOSITION)}>
                重置为默认
              </button>
            </div>
            <div className="col">
              <button className="btn" onClick={() => {
                localStorage.setItem('simpleComposition', JSON.stringify(composition));
                alert('参数已保存为默认值！');
              }}>
                保存为默认
          </button>
            </div>
          </div>
          
          {/* 云层控制 */}
          <div className="row" style={{ marginBottom: 16 }}>
            <div className="col">
              <label className="label">云层强度: {composition.cloudStrength.toFixed(2)} · 高度: {composition.cloudHeight.toFixed(3)}</label>
              <div className="row">
                <input className="input" type="range" min={0} max={1} step={0.01}
                       value={composition.cloudStrength}
                       onChange={(e) => updateValue('cloudStrength', parseFloat(e.target.value))} />
                <input className="input" type="range" min={0.0005} max={0.03} step={0.0005}
                       value={composition.cloudHeight}
                       onChange={(e) => updateValue('cloudHeight', parseFloat(e.target.value))} />
              </div>
            </div>
            <div className="col">
              <label className="label">云层旋转: 经度 {composition.cloudYawDeg}° · 纬度 {composition.cloudPitchDeg}°</label>
              <div className="row">
                <input className="input" type="range" min={-180} max={180} step={1}
                       value={composition.cloudYawDeg}
                       onChange={(e) => updateValue('cloudYawDeg', parseInt(e.target.value))} />
                <input className="input" type="range" min={-90} max={90} step={1}
                       value={composition.cloudPitchDeg}
                       onChange={(e) => updateValue('cloudPitchDeg', parseInt(e.target.value))} />
              </div>
            </div>
          </div>
          
          {/* 云层置换控制 */}
          <div className="row" style={{ marginBottom: 16 }}>
            <div className="col">
              <label className="label">置换强度: {((composition.cloudDisplacementScale ?? 0.05) * 100).toFixed(1)}%</label>
              <input className="input" type="range" min={0.0} max={0.1} step={0.001}
                     value={composition.cloudDisplacementScale ?? 0.05}
                     onChange={(e) => updateValue('cloudDisplacementScale', parseFloat(e.target.value))} />
            </div>
            <div className="col">
              <label className="label">置换偏移: {((composition.cloudDisplacementBias ?? 0.01) * 100).toFixed(1)}%</label>
              <input className="input" type="range" min={-0.5} max={0.5} step={0.01}
                     value={composition.cloudDisplacementBias ?? 0.01}
                     onChange={(e) => updateValue('cloudDisplacementBias', parseFloat(e.target.value))} />
            </div>
          </div>
          
          {/* 云层滚动速度控制 */}
          <div className="row" style={{ marginBottom: 16 }}>
            <div className="col">
              <label className="label">U方向滚动: {((composition.cloudScrollSpeedU ?? 0.0001) * 10000).toFixed(1)}</label>
              <input className="input" type="range" min={0.0} max={0.001} step={0.00001}
                     value={composition.cloudScrollSpeedU ?? 0.0001}
                     onChange={(e) => updateValue('cloudScrollSpeedU', parseFloat(e.target.value))} />
            </div>
            <div className="col">
              <label className="label">V方向滚动: {((composition.cloudScrollSpeedV ?? 0.0002) * 10000).toFixed(1)}</label>
              <input className="input" type="range" min={0.0} max={0.0005} step={0.00001}
                     value={composition.cloudScrollSpeedV ?? 0.0002}
                     onChange={(e) => updateValue('cloudScrollSpeedV', parseFloat(e.target.value))} />
            </div>
          </div>
          
          {/* 云层材质控制 */}
          <div className="row" style={{ marginBottom: 16 }}>
            <div className="col">
              <label className="label">云层Gamma: {composition.cloudGamma.toFixed(2)} · 对比度: {composition.cloudContrast.toFixed(1)}</label>
              <div className="row">
                <input className="input" type="range" min={0.5} max={2} step={0.01}
                       value={composition.cloudGamma}
                       onChange={(e) => updateValue('cloudGamma', parseFloat(e.target.value))} />
                <input className="input" type="range" min={0.5} max={2} step={0.1}
                       value={composition.cloudContrast}
                       onChange={(e) => updateValue('cloudContrast', parseFloat(e.target.value))} />
              </div>
            </div>
            <div className="col">
              <label className="label">云层黑点: {composition.cloudBlack.toFixed(2)} · 白点: {composition.cloudWhite.toFixed(2)}</label>
              <div className="row">
                <input className="input" type="range" min={0} max={1} step={0.01}
                       value={composition.cloudBlack}
                       onChange={(e) => updateValue('cloudBlack', parseFloat(e.target.value))} />
                <input className="input" type="range" min={0} max={1} step={0.01}
                       value={composition.cloudWhite}
                       onChange={(e) => updateValue('cloudWhite', parseFloat(e.target.value))} />
              </div>
            </div>
          </div>
          
          {/* 云层厚度控制 */}
          <div className="section">
            <h3>云层厚度控制</h3>
            
            <div className="row">
              <label className="label">云层层数: {composition.cloudNumLayers ?? 3} (点击"对齐放大"自动设为16层)</label>
              <input className="input" type="range" min={1} max={16} step={1}
                     value={composition.cloudNumLayers ?? 3}
                     onChange={(e) => updateValue('cloudNumLayers', parseInt(e.target.value))} />
            </div>
            
            <div className="row">
              <label className="label">层间距: {(composition.cloudLayerSpacing ?? 0.002).toFixed(4)}</label>
              <input className="input" type="range" min={0.0005} max={0.005} step={0.0005}
                     value={composition.cloudLayerSpacing ?? 0.002}
                     onChange={(e) => updateValue('cloudLayerSpacing', parseFloat(e.target.value))} />
            </div>
            
            {/* 体积散射控制 */}
            <div className="row">
              <label className="checkbox">
                <input type="checkbox" checked={composition.cloudUseVolumeScattering ?? false}
                       onChange={(e) => updateValue('cloudUseVolumeScattering', e.target.checked)} />
                启用体积散射
              </label>
            </div>
            <div className="row">
              <label className="label">体积密度: {(composition.cloudVolumeDensity ?? 0.6).toFixed(2)}</label>
              <input className="input" type="range" min={0.1} max={1.2} step={0.1}
                     value={composition.cloudVolumeDensity ?? 0.6}
                     onChange={(e) => updateValue('cloudVolumeDensity', parseFloat(e.target.value))} />
            </div>
            <div className="row">
              <label className="label">散射强度: {(composition.cloudScatteringStrength ?? 0.8).toFixed(2)}</label>
              <input className="input" type="range" min={0.1} max={1.5} step={0.1}
                     value={composition.cloudScatteringStrength ?? 0.8}
                     onChange={(e) => updateValue('cloudScatteringStrength', parseFloat(e.target.value))} />
            </div>
            <div className="row">
              <label className="label">相位函数G: {(composition.cloudScatteringG ?? 0.2).toFixed(2)}</label>
              <input className="input" type="range" min={-0.5} max={0.5} step={0.1}
                     value={composition.cloudScatteringG ?? 0.2}
                     onChange={(e) => updateValue('cloudScatteringG', parseFloat(e.target.value))} />
            </div>
            
            {/* 体积散射高级参数 */}
            <div className="row">
              <label className="label">边缘增强: {(composition.cloudRimEffect ?? 0.3).toFixed(2)}</label>
              <input className="input" type="range" min={0.0} max={1.0} step={0.1}
                     value={composition.cloudRimEffect ?? 0.3}
                     onChange={(e) => updateValue('cloudRimEffect', parseFloat(e.target.value))} />
            </div>
            <div className="row">
              <label className="label">密度增强: {(composition.cloudDensityEnhancement ?? 1.5).toFixed(2)}</label>
              <input className="input" type="range" min={0.5} max={3.0} step={0.1}
                     value={composition.cloudDensityEnhancement ?? 1.5}
                     onChange={(e) => updateValue('cloudDensityEnhancement', parseFloat(e.target.value))} />
            </div>
            <div className="row">
              <label className="label">噪声缩放: {(composition.cloudNoiseScale ?? 1.0).toFixed(2)}</label>
              <input className="input" type="range" min={0.5} max={2.0} step={0.1}
                     value={composition.cloudNoiseScale ?? 1.0}
                     onChange={(e) => updateValue('cloudNoiseScale', parseFloat(e.target.value))} />
            </div>
            <div className="row">
              <label className="label">噪声强度: {(composition.cloudNoiseStrength ?? 0.8).toFixed(2)}</label>
              <input className="input" type="range" min={0.1} max={1.5} step={0.1}
                     value={composition.cloudNoiseStrength ?? 0.8}
                     onChange={(e) => updateValue('cloudNoiseStrength', parseFloat(e.target.value))} />
            </div>
          </div>
          
          {/* 厚度映射控制 */}
          <div className="section">
            <h3>厚度映射控制</h3>
            <div className="row">
              <label className="checkbox">
                <input type="checkbox" checked={composition.cloudUseThicknessMapping ?? false}
                       onChange={(e) => updateValue('cloudUseThicknessMapping', e.target.checked)} />
                启用厚度映射（最亮的地方最厚）
              </label>
            </div>
            <div className="row">
              <label className="label">厚度缩放: {(composition.cloudThicknessScale ?? 2.0).toFixed(2)}</label>
              <input className="input" type="range" min={0.5} max={4.0} step={0.1}
                     value={composition.cloudThicknessScale ?? 2.0}
                     onChange={(e) => updateValue('cloudThicknessScale', parseFloat(e.target.value))} />
            </div>
            <div className="row">
              <label className="label">厚度偏移: {(composition.cloudThicknessBias ?? 0.2).toFixed(2)}</label>
              <input className="input" type="range" min={-0.5} max={1.0} step={0.1}
                     value={composition.cloudThicknessBias ?? 0.2}
                     onChange={(e) => updateValue('cloudThicknessBias', parseFloat(e.target.value))} />
            </div>
            <div className="row">
              <label className="label">厚度幂次: {(composition.cloudThicknessPower ?? 0.6).toFixed(2)}</label>
              <input className="input" type="range" min={0.3} max={1.5} step={0.1}
                     value={composition.cloudThicknessPower ?? 0.6}
                     onChange={(e) => updateValue('cloudThicknessPower', parseFloat(e.target.value))} />
            </div>
          </div>
          
          {/* 菲涅尔效果控制 */}
          <div className="section">
            <h3>菲涅尔效果控制</h3>
            <div className="row">
              <label className="checkbox">
                <input type="checkbox" checked={composition.cloudUseFresnel ?? true}
                       onChange={(e) => updateValue('cloudUseFresnel', e.target.checked)} />
                启用菲涅尔效果（边缘透明）
              </label>
            </div>
            <div className="row">
              <label className="label">菲涅尔强度: {(composition.cloudFresnelStrength ?? 0.7).toFixed(2)}</label>
              <input className="input" type="range" min={0.0} max={1.0} step={0.1}
                     value={composition.cloudFresnelStrength ?? 0.7}
                     onChange={(e) => updateValue('cloudFresnelStrength', parseFloat(e.target.value))} />
            </div>
            <div className="row">
              <label className="label">菲涅尔幂次: {(composition.cloudFresnelPower ?? 2.0).toFixed(2)}</label>
              <input className="input" type="range" min={0.5} max={5.0} step={0.1}
                     value={composition.cloudFresnelPower ?? 2.0}
                     onChange={(e) => updateValue('cloudFresnelPower', parseFloat(e.target.value))} />
            </div>
            
            {/* 菲涅尔曲线控制 */}
            <div className="subsection" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #444' }}>
              <h4 style={{ margin: 0, marginBottom: '8px', fontSize: '14px', color: '#aaa' }}>曲线控制</h4>
              <div className="row">
                <label className="label">前半段幂次: {(composition.cloudCurvePowerA ?? 1.0).toFixed(2)}</label>
                <input className="input" type="range" min={0.1} max={10.0} step={0.1}
                       value={composition.cloudCurvePowerA ?? 1.0}
                       onChange={(e) => updateValue('cloudCurvePowerA', parseFloat(e.target.value))} />
              </div>
              <div className="row">
                <label className="label">后半段幂次: {(composition.cloudCurvePowerB ?? 3.0).toFixed(2)}</label>
                <input className="input" type="range" min={0.1} max={10.0} step={0.1}
                       value={composition.cloudCurvePowerB ?? 3.0}
                       onChange={(e) => updateValue('cloudCurvePowerB', parseFloat(e.target.value))} />
              </div>
              <div className="row">
                <label className="label">混合点位置: {(composition.cloudCurveMixPoint ?? 0.6).toFixed(2)}</label>
                <input className="input" type="range" min={0.1} max={0.9} step={0.05}
                       value={composition.cloudCurveMixPoint ?? 0.6}
                       onChange={(e) => updateValue('cloudCurveMixPoint', parseFloat(e.target.value))} />
              </div>
              <div className="row">
                <label className="label" style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                  💡 前半段：控制近处云层的透明度变化速度（小值=平缓，大值=陡峭）<br/>
                  后半段：控制远处云层的透明度变化速度（小值=平缓，大值=陡峭）<br/>
                  混合点：决定前后半段的分界位置
                </label>
              </div>
            </div>
            
            <div className="row">
              <label className="label" style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                💡 菲涅尔效果让云层边缘和远离相机的区域变得更透明，创造出更自然的大气深度感
              </label>
            </div>
          </div>
          
          
          {/* 夜半球地球贴图光照控制 */}
          <div className="row" style={{ marginBottom: 16 }}>
            <h3>夜半球地球贴图光照控制</h3>
            <div className="row">
              <label className="label">夜半球光照影响: {((composition.nightEarthLightInfluence ?? 0.3) * 100).toFixed(0)}%</label>
              <input className="input" type="range" min={0} max={1} step={0.1}
                     value={composition.nightEarthLightInfluence ?? 0.3}
                     onChange={(e) => updateValue('nightEarthLightInfluence', parseFloat(e.target.value))} />
            </div>
          </div>
          
          {/* 相机和曝光控制 */}
          <div className="row" style={{ marginBottom: 16 }}>
            <div className="col">
              <label className="label">曝光: {composition.exposure.toFixed(2)}</label>
              <input className="input" type="range" min={0.2} max={3.0} step={0.05}
                     value={composition.exposure}
                     onChange={(e) => updateValue('exposure', parseFloat(e.target.value))} />
            </div>
            <div className="col">
              <label className="label">相机距离: {composition.cameraDistance.toFixed(1)}</label>
              <input className="input" type="range" min={3} max={50} step={0.5}
                     value={composition.cameraDistance}
                     onChange={(e) => updateValue('cameraDistance', parseFloat(e.target.value))} />
            </div>
            <div className="col">
              <label className="label">相机方位 λ: {Math.round(composition.cameraAzimuthDeg ?? 0)}°</label>
              <input className="input" type="range" min={-180} max={180} step={1}
                     value={composition.cameraAzimuthDeg ?? 0}
                     onChange={(e) => updateValue('cameraAzimuthDeg', parseFloat(e.target.value))} />
            </div>
            <div className="col">
              <label className="label">相机仰角 φ: {Math.round(composition.cameraElevationDeg ?? 0)}°</label>
              <input className="input" type="range" min={-85} max={85} step={1}
                     value={composition.cameraElevationDeg ?? 0}
                     onChange={(e) => updateValue('cameraElevationDeg', parseFloat(e.target.value))} />
            </div>
            <div className="col">
              <label className="label">朝向上下 (R倍数): {(composition.lookAtDistanceRatio ?? 0).toFixed(2)}</label>
              <input className="input" type="range" min={-2} max={2} step={0.01}
                     value={composition.lookAtDistanceRatio ?? 0}
                     onChange={(e) => updateValue('lookAtDistanceRatio', parseFloat(e.target.value))} />
            </div>
            <div className="col">
              <label className="label">视口偏移Y: {(composition.viewOffsetY ?? 0).toFixed(2)}</label>
              <input className="input" type="range" min={-5} max={5} step={0.01}
                     value={composition.viewOffsetY ?? 0}
                     onChange={(e) => updateValue('viewOffsetY', parseFloat(e.target.value))} />
            </div>
          </div>

          {/* 出生点 UI：三级城市选择 + 经纬度输入（可覆盖） */}
          <div className="row" style={{ marginBottom: 16, gap: 12, alignItems: 'flex-start' }}>
            <div className="col" style={{ minWidth: 380 }}>
              <label className="label">观察地点（三级选择或搜索）</label>
              <LocationSelector
                onLocationChange={(loc:any)=>{
                  try {
                    // 下方地点：观察点 → 只更新观测经纬度，用于天文/光照
                    setLatDeg(loc.lat);
                    setLonDeg(loc.lon);
                  } catch (e) { console.error('[LocationSelector] set failed', e); }
                }}
                initialLocation={{}}
              />
              {/* 观察地经纬度（可手动覆盖） */}
              <div className="row" style={{ marginTop: 8, gap: 12, alignItems: 'center' }}>
                <div className="col">
                  <label className="label">观察地纬度(°)</label>
                  <input
                    className="input"
                    type="number"
                    step={0.1}
                    value={latDeg}
                    onChange={(e)=>setLatDeg(parseFloat(e.target.value))}
                  />
                </div>
                <div className="col">
                  <label className="label">观察地经度(°E为正)</label>
                  <input
                    className="input"
                    type="number"
                    step={0.1}
                    value={lonDeg}
                    onChange={(e)=>setLonDeg(parseFloat(e.target.value))}
                  />
                </div>
              </div>

              {/* 纬度对齐（仅动相机俯仰；目标纬度独立于地点） */}
              <div className="row" style={{ marginTop: 8, gap: 12, alignItems: 'center' }}>
                <div className="col">
                  <label className="label">目标纬度(°N为正，默认28)</label>
                  <input
                    className="input"
                    type="number"
                    step={0.1}
                    value={composition.latitudeAlignTargetDeg ?? 28}
                    onChange={(e)=>{
                      const v = parseFloat(e.target.value);
                      setComposition(prev => ({ ...prev, latitudeAlignTargetDeg: v }));
                    }}
                  />
                </div>
                <div className="col">
                  <button className="btn" onClick={() => {
                    try {
                      const target = composition.latitudeAlignTargetDeg ?? 28; // 被减数（目标屏幕纬线）
                      const obsLat = latDeg; // 观察地纬度
                      // 非累加：每次直接计算绝对俯仰
                      // 旋转纬度 = 目标纬度 − 观察地纬度；Δpitch = −(目标 − 观察地)；基线取0
                      let newPitch = -(target - obsLat);
                      if (newPitch > 85) newPitch = 85;
                      if (newPitch < -85) newPitch = -85;
                      setComposition(prev => ({ ...prev, cameraElevationDeg: newPitch }));
                      // 对齐后关闭实时，避免后续tick导致状态跳变
                      try { setRealTimeUpdate(false); setAutoUpdate(false); } catch {}
                      console.log('[LatitudeAlign] obsLat(N)=', obsLat, 'target(N)=', target, 'newPitch=', newPitch);
                    } catch (e) {
                      console.error('[LatitudeAlign] failed:', e);
                    }
                  }}>对齐纬度</button>
                </div>
                <div className="col">
                  <button
                    className="btn"
                    onClick={() => {
                      // 对齐到出生点并放大
                      console.log('[ClientAlignButton] 对齐按钮被点击');
                      try {
                        console.log('[ClientAlign] 🔧 启动客户端对齐并放大');

                        // 1. 先计算所有需要的参数
                        const current = composition;
                        const L = (current.birthPointLongitudeDeg ?? lonDeg) || 121.5;
                        const B = (current.birthPointLatitudeDeg ?? latDeg) || 31.2;
                        // 使用dev模式成功的alpha值：10，而不是默认的12
                        const alpha = 10;
                        console.log('[ClientAlign] 使用dev模式成功的alpha值:', alpha, '(固定为10，不是默认12)');
                        const seam = current.seamOffsetDeg ?? 0;
                        
                        // 2. 计算黄昏点经度（与 dev 模式一致：基于光照向量）
                        let lonDusk;
                        try {
                          const lightDir = new THREE.Vector3(-sunWorld.x, -sunWorld.y, -sunWorld.z).normalize();
                          lonDusk = THREE.MathUtils.radToDeg(Math.atan2(-lightDir.x, lightDir.z));
                          while (lonDusk > 180) lonDusk -= 360;
                          while (lonDusk < -180) lonDusk += 360;
                          console.log('[ClientAlign] 使用光照向量计算黄昏点经度:', lonDusk);
                        } catch (error) {
                          console.warn('[ClientAlign] 黄昏点计算失败，使用回退值:', error);
                          lonDusk = -75.3;
                        }
                        
                        console.log('[ClientAlign] === 开始五步操作（原子更新版）===');
                        
                        // 第1步：对齐经度
                        console.log('[ClientAlign] 第1步：对齐经度 - 计算方位角');
                        let yaw = (L + seam) - lonDusk; 
                        while (yaw > 180) yaw -= 360; 
                        while (yaw < -180) yaw += 360;
                        console.log('[ClientAlign] 方位角计算完成:', yaw);
                        
                        console.log('[ClientAlign] 第2步：旋转纬度 - 计算俯仰角');
                        console.log('[ClientAlign] 输入参数 - B(纬度):', B, 'alpha(抬升角):', alpha);
                        const targetLat = 28; // 使用dev模式的目标纬度
                        const obsLat = B; // 当前纬度
                        let pitch = -(targetLat - obsLat); // dev模式的成功算法
                        if (pitch > 85) pitch = 85;
                        if (pitch < -85) pitch = -85;
                        console.log('[ClientAlign] 俯仰角计算(dev模式算法):', `targetLat(${targetLat}) - obsLat(${obsLat}) =`, pitch);
                        
                        // 第3步：放大 - 使用你提供的默认参数
                        console.log('[ClientAlign] 第3步：放大 - 设置地球大小和相机距离');
                        const earthSize = 1.68;  // 正确的地球大小
                        const cameraDistance = 15;  // 正确的相机距离
                        console.log('[ClientAlign] 放大参数:', { earthSize, cameraDistance });
                        
                        // 第4步：旋转相机俯仰角
                        console.log('[ClientAlign] 第4步：旋转相机俯仰角 - 应用相机参数');
                        console.log('[ClientAlign] 相机参数:', { azimuth: yaw, elevation: pitch, distance: cameraDistance });
                        
                        // 第5步：改参数设置
                        console.log('[ClientAlign] 第5步：改参数设置 - 应用所有参数');
                        // 先确保视口偏移在同一轮事件内被归零（双保险）
                        setComposition((prev)=>({ ...prev, viewOffsetY: 0 }));
                        console.log('[ClientAlign] 应用对齐参数:', {
                          enableBirthPointAlignment: true,
                          birthPointAlignmentMode: true,
                          cameraAzimuthDeg: yaw,
                          cameraElevationDeg: pitch,
                          cameraDistance: 15
                        });
                        console.log('[ClientAlign] 五步操作完成，开始设置参数...');
                        setComposition((prev) => ({
                          ...prev,
                          // 先归零视口偏移，避免对齐时受偏移影响（同批次更新）
                          viewOffsetY: 0,
                          // 对齐参数
                          enableBirthPointAlignment: true,
                          birthPointAlignmentMode: true,
                          cameraAzimuthDeg: yaw,
                          cameraElevationDeg: pitch,
                          cameraDistance: 15,
                          
                          // 地球参数 - 使用你提供的默认参数
                          earthSize: 1.68,  // 地球大小
                          lookAtDistanceRatio: 1.08,  // 视点距离比例
                          birthPointAlphaDeg: 10, // 抬升角
                          
                          // 云层参数 - 使用你提供的默认参数（16层云系统）
                          cloudsEnabled: true,
                          cloudNumLayers: 16,  // 16层云系统
                          cloudLayerSpacing: 0.0010,  // 层间距
                          cloudStrength: 0.25,  // 云层强度
                          cloudHeight: 0.002,  // 云层高度
                          cloudYawDeg: 0,  // 云层旋转-经度
                          cloudPitchDeg: 0,  // 云层旋转-纬度
                          cloudDisplacementScale: 0.0,  // 置换强度
                          cloudDisplacementBias: 0.03,  // 置换偏移
                          cloudScrollSpeedU: 0.00033,  // U方向滚动（降至约1/3）
                          cloudScrollSpeedV: 0.00066,  // V方向滚动（降至约1/3）
                          cloudGamma: 0.50,  // 云层Gamma
                          cloudContrast: 0.9,  // 云层对比度
                          cloudBlack: 0.00,  // 云层黑点
                          cloudWhite: 0.90,
                          // 体积散射参数 - 使用你提供的默认参数
                          cloudUseVolumeScattering: true,  // 启用体积散射
                          cloudVolumeDensity: 0.50,  // 体积密度
                          cloudScatteringStrength: 1.50,  // 散射强度
                          cloudScatteringG: -0.50,  // 相位函数G
                          cloudRimEffect: 0.10,  // 边缘增强
                          cloudDensityEnhancement: 2.00,  // 密度增强
                          cloudNoiseScale: 2.00,  // 噪声缩放
                          cloudNoiseStrength: 0.70,  // 噪声强度
                          // 启用厚度映射
                          cloudUseThicknessMapping: true,
                          cloudThicknessScale: 4.00,
                          cloudThicknessBias: 1.00,
                          cloudThicknessPower: 1.50,
                          
                          // 其他重要参数 - 确保与dev模式一致
                          exposure: 1.00,
                          atmosphereEnabled: true,
                          starsEnabled: true,
                          moonEnabled: true,
                          moonDistance: 14,
                          moonRadius: 0.68,
                          
                          // 材质参数 - 与dev模式一致
                          sunIntensity: 2.45,
                          lightAzimuth: 0,
                          lightElevation: 0,
                          terminatorSoftness: 1.00,
                          nightIntensity: 0.20,
                          
                          // 月球参数 - 确保月相显示正确
                          moonPhaseEnabled: true,
                          moonAutoPosition: true
                        }));
                        
                        // 4. 设置对齐状态（已在开始时设置，此处仅需设置其他状态）
                        setRealTimeUpdate(false);
                        setAutoUpdate(false);
                        
                        // 5. 强制更新光照和自转
                        setTimeout(() => {
                          updateSunlight();
                          const bLon = composition.birthPointLongitudeDeg ?? lonDeg ?? 121.5;
                          
                          // 安全计算地球自转
                          let newEarthRotation;
                          try {
                            newEarthRotation = calculateEarthRotationFromDateISO(dateISO, bLon);
                            if (typeof newEarthRotation !== 'number' || isNaN(newEarthRotation)) {
                              newEarthRotation = 0;
                              console.warn('[ClientAlign] 使用默认自转角度:', newEarthRotation);
                            }
                          } catch (error) {
                            console.warn('[ClientAlign] 自转计算失败，使用默认值:', error);
                            newEarthRotation = 0;
                          }
                          
                          updateValue('earthYawDeg', newEarthRotation);
                          
                          console.log('[ClientAlign] ✅ 客户端对齐并放大完成 - 五步操作总结:', { 
                            step1_对齐经度: yaw,
                            step2_旋转纬度: pitch,
                            step3_放大: { earthSize: 1.68, cameraDistance: 8 },
                            step4_旋转相机俯仰角: pitch,
                            step5_改参数设置: '已完成',
                            最终相机参数: { azimuth: yaw, elevation: pitch, radius: 8 },
                            地球自转: newEarthRotation.toFixed(1),
                            黄昏点经度: lonDusk
                          });
                        }, 0);
                      } catch (e) {
                        console.error('[ClientAlign] ❌ 对齐失败:', e);
                      }
                    }}
                    style={{ minWidth: '120px' }}
                  >
                    📍 对齐到出生点
                  </button>
                </div>
              </div>
              <div style={{ marginTop: 8 }}>
                {/* 移除：经线居中（只转相机）按钮，统一使用黄昏点基准 */}
                {/* <button className="btn" onClick={() => {
                  try {
                    const L0 = (composition.birthPointLongitudeDeg ?? lonDeg) || 0;
                    // 规范化经度
                    let L = L0;
                    while (L > 180) L -= 360;
                    while (L < -180) L += 360;

                    // 经线居中（考虑自转）：保持“晨昏线居中”的语义
                    // yaw = normalize(earthYawDeg - (L + seam))
                    const seam = composition.seamOffsetDeg ?? 0;
                    // 读取真实世界 yaw（包含组 + 网格）
                    let earthYaw = composition.earthYawDeg || 0;
                    try {
                      const earthRoot = (window as any).__R3F_Scene?.getObjectByName?.('earthRoot');
                      if (earthRoot) {
                        const mesh = earthRoot.getObjectByProperty?.('type', 'Mesh');
                        const q = new THREE.Quaternion();
                        if (mesh) mesh.getWorldQuaternion(q); else earthRoot.getWorldQuaternion(q);
                        const v = new THREE.Vector3(0,0,-1).applyQuaternion(q).normalize();
                        earthYaw = THREE.MathUtils.radToDeg(Math.atan2(v.x, v.z));
                      }
                    } catch {}
                    let yaw = earthYaw - (L + seam);
                    while (yaw > 180) yaw -= 360;
                    while (yaw < -180) yaw += 360;

                    setComposition(v => ({ ...v, cameraAzimuthDeg: yaw }));
                    if (logger.isEnabled()) logger.log('align/meridian-center', {
                      targetLonDeg: L0,
                      normalizedLon: L,
                      earthWorldYawDeg: earthYaw,
                      cameraAzimuthDeg: yaw,
                      seamOffsetDeg: seam,
                      formula: 'yaw = normalize(earthYawDeg - (L+seam))'
                    });

                    // 即刻同步相机，避免一帧延迟
                    try {
                      const cam: any = (window as any).__R3F_Camera;
                      if (cam) {
                        const R = composition.cameraDistance ?? 15;
                        const elDeg = composition.cameraElevationDeg ?? 0;
                        const lookAtRatio = composition.lookAtDistanceRatio ?? 0;
                        const az = THREE.MathUtils.degToRad(yaw);
                        const el = THREE.MathUtils.degToRad(elDeg);
                        const x = R * Math.sin(az) * Math.cos(el);
                        const y = R * Math.sin(el);
                        const z = R * Math.cos(az) * Math.cos(el);
                        cam.position.set(x, y, z);
                        cam.up.set(0,1,0);
                        cam.lookAt(0, (lookAtRatio ?? 0) * R, 0);
                        if (cam.updateProjectionMatrix) cam.updateProjectionMatrix();
                      }
                    } catch {}

                    // 误差自检：中心经度 expected = normalize((earthYawDeg - (L+seam)) + 180)
                    requestAnimationFrame(() => {
                      try {
                        const cam: any = (window as any).__R3F_Camera;
                        if (cam && cam.position) {
                          const forward = new THREE.Vector3().subVectors(new THREE.Vector3(0,0,0), cam.position).normalize();
                          let centerLon1 = THREE.MathUtils.radToDeg(Math.atan2(forward.x, forward.z));
                          while (centerLon1 > 180) centerLon1 -= 360;
                          while (centerLon1 < -180) centerLon1 += 360;

                          const forward2 = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
                          let centerLon2 = THREE.MathUtils.radToDeg(Math.atan2(forward2.x, forward2.z));
                          while (centerLon2 > 180) centerLon2 -= 360;
                          while (centerLon2 < -180) centerLon2 += 360;

                          let expectedN = (earthYaw - (L + seam)) + 180;
                          while (expectedN > 180) expectedN -= 360;
                          while (expectedN < -180) expectedN += 360;

                          const err1 = ((centerLon1 - expectedN + 540) % 360) - 180;
                          const err2 = ((centerLon2 - expectedN + 540) % 360) - 180;
                          console.log('[AlignCheck] center vs target', {
                            targetL: L0,
                            expectedCenterLon: +expectedN.toFixed(2),
                            centerLon1: +centerLon1.toFixed(2),
                            centerLon2: +centerLon2.toFixed(2),
                            errorDeg1: +err1.toFixed(2),
                            errorDeg2: +err2.toFixed(2)
                          });
                          console.log('[AlignCheck:Analysis]', {
                            yawSet: +yaw.toFixed(2),
                            cameraPos: cam.position.toArray().map((x:number) => +x.toFixed(2)),
                            forward1: forward.toArray().map((x:number) => +x.toFixed(2)),
                            forward2: forward2.toArray().map((x:number) => +x.toFixed(2))
                          });
                        }
                      } catch (e) { console.warn('[AlignCheck] failed:', e); }
                    });
                  } catch (e) { console.error('[Align] 经线居中失败:', e); }
                }}>经线对齐至中心（只转相机）</button> */}

                <button className="btn" style={{ marginLeft: 8 }} onClick={() => {
                  try {
                    // 口径：黄昏点 − 观察经度
                    const L0 = lonDeg || 0;
                    let L = L0; while (L > 180) L -= 360; while (L < -180) L += 360;
                    const seam = composition.seamOffsetDeg ?? 0;

                    // 使用统一的黄昏点计算函数
                    const lonDusk = calculateDuskLongitude(sunWorld, dateISO, latDeg, lonDeg);
                    // 绝对方位角（按用户约定）：yaw = normalize((L + seam) - lonDusk) [出生点→黄昏点]
                    let yaw = (L + seam) - lonDusk;
                    while (yaw > 180) yaw -= 360; while (yaw < -180) yaw += 360;

                    setComposition(vv => ({ ...vv, cameraAzimuthDeg: yaw }));
                    // 对齐后关闭实时与自动更新，避免后续tick带来抖动
                    try { setRealTimeUpdate(false); setAutoUpdate(false); } catch {}

                    if (logger.isEnabled()) logger.log('align/terminator-minus-observe', {
                      lonDusk: +lonDusk.toFixed(2), birthLon: L, seam, yaw,
                      formula: 'yaw = normalize((Lsun+90) - (L+seam))'
                    });

                    // 误差自检：中心经度 = normalize(yaw + 180)
                    requestAnimationFrame(() => {
                      try {
                        const cam: any = (window as any).__R3F_Camera;
                        if (cam && cam.position) {
                          const forward = new THREE.Vector3().subVectors(new THREE.Vector3(0,0,0), cam.position).normalize();
                          let centerLon1 = THREE.MathUtils.radToDeg(Math.atan2(forward.x, forward.z));
                          while (centerLon1 > 180) centerLon1 -= 360; while (centerLon1 < -180) centerLon1 += 360;
                          const forward2 = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
                          let centerLon2 = THREE.MathUtils.radToDeg(Math.atan2(forward2.x, forward2.z));
                          while (centerLon2 > 180) centerLon2 -= 360; while (centerLon2 < -180) centerLon2 += 360;
                          let expectedCenter = yaw + 180; while (expectedCenter > 180) expectedCenter -= 360; while (expectedCenter < -180) expectedCenter += 360;
                          console.log('[AlignCheck:TermMinusBirth] center vs expected', {
                            lonDusk: +lonDusk.toFixed(2), L, seam,
                            expectedCenterLon: +expectedCenter.toFixed(2),
                            centerLon1: +centerLon1.toFixed(2), centerLon2: +centerLon2.toFixed(2),
                            err1: +((((centerLon1 - expectedCenter + 540)%360)-180).toFixed(2)),
                            err2: +((((centerLon2 - expectedCenter + 540)%360)-180).toFixed(2))
                          });
                        }
                      } catch {}
                    });
                  } catch (e) { console.error('[Align] 终交点-观察经度 对齐失败:', e); }
                }}>对齐(晨昏交点 − 观察经度)</button>
                <label style={{ marginLeft: 12 }} className="label">显示出生点标记</label>
                <input type="checkbox" checked={!!composition.showBirthPointMarker} onChange={(e)=>setComposition(v=>({ ...v, showBirthPointMarker: e.target.checked }))} />
              </div>
            </div>
            <div className="col">
              <label className="label">出生点纬度(°)（可覆盖）</label>
              <input className="input" type="number" step={0.1} value={composition.birthPointLatitudeDeg ?? latDeg}
                     onChange={(e)=>setComposition(v=>({...v, birthPointLatitudeDeg: parseFloat(e.target.value)}))} />
            </div>
            <div className="col">
              <label className="label">出生点经度(°E为正)（可覆盖）</label>
              <input className="input" type="number" step={0.1} value={composition.birthPointLongitudeDeg ?? lonDeg}
                     onChange={(e)=>setComposition(v=>({...v, birthPointLongitudeDeg: parseFloat(e.target.value)}))} />
            </div>
          </div>

          {/* 显示选项 */}
          <div className="row" style={{ marginBottom: 16 }}>
            <div className="col">
              <span className="label">显示选项</span>
              <div className="row" style={{ gap: 12, pointerEvents: 'auto' }}>
                <label>
                  <input type="checkbox" checked={composition.useTextures} onChange={(e) => updateValue('useTextures', e.target.checked)} /> 使用贴图
                </label>
                <label>
                  <input type="checkbox" checked={composition.useClouds} onChange={(e) => updateValue('useClouds', e.target.checked)} /> 显示云层
                </label>
                <label>
                  <input type="checkbox" checked={composition.showStars} onChange={(e) => updateValue('showStars', e.target.checked)} /> 显示星空
                </label>
                <label>
                  <input type="checkbox" checked={composition.useMilkyWay} onChange={(e) => updateValue('useMilkyWay', e.target.checked)} /> 银河星空
                </label>
                <label>
                  <input type="checkbox" checked={composition.moonUseCameraLockedPhase ?? true} onChange={(e) => updateValue('moonUseCameraLockedPhase', e.target.checked)} /> 相机锁定月相
                </label>
                <label>
                  <input type="checkbox" checked={false} disabled readOnly /> 相机控制 (已禁用，保持理想构图)
                </label>
                </div>
            </div>
          </div>

        </div>
          ) : (
            // 客户端模式 - 简洁UI
            <div className="panel" style={{ 
              maxWidth: '400px', 
              position: 'absolute', 
              right: 16, 
              top: 80,  // 向下移动，为音乐播放器留出空间 
              bottom: 'auto',
              transition: 'opacity 0.3s ease, transform 0.3s ease',
              opacity: 1,
              transform: 'translateY(0)'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: '0', color: '#fff' }}>LuBirth</h2>
                <p style={{ margin: '5px 0 0 0', color: '#aaa', fontSize: '14px' }}>天 地 你</p>
              </div>
                <div style={{ display: 'none' }} />
              
              {/* 地点选择区域 */}
              <div style={{ marginBottom: '20px' }}>
                <div className="label" style={{ marginBottom: '8px' }}>出生地点</div>
                <LocationSelector
                  lat={latDeg}
                  lon={lonDeg}
                  onLocationChange={(newLat, newLon) => {
                    // 确保参数是数字类型并处理对象输入
                    let lat, lon;
                    
                    if (typeof newLat === 'object' && newLat !== null) {
                      // 处理对象输入
                      lat = parseFloat(newLat.lat) || parseFloat(newLat.longitude) || 31.2;
                      lon = parseFloat(newLat.lon) || parseFloat(newLat.lng) || parseFloat(newLat.longitude) || 121.5;
                    } else {
                      // 处理数字或字符串输入
                      lat = typeof newLat === 'number' ? newLat : parseFloat(newLat);
                      lon = typeof newLon === 'number' ? newLon : parseFloat(newLon);
                    }
                    
                    if (!isNaN(lat) && !isNaN(lon)) {
                      setLatDeg(lat);
                      setLonDeg(lon);
                      // 客户端模式：地点选择同时更新出生点
                      updateValue('birthPointLatitudeDeg', lat);
                      updateValue('birthPointLongitudeDeg', lon);
                      
                      console.log(`[ClientLocation] 地点变更: ${lat.toFixed(1)}°N, ${lon.toFixed(1)}°E`);
                    } else {
                      console.error('[ClientLocation] 无效的经纬度:', { newLat, newLon, lat, lon });
                    }
                  }}
                />
              </div>
              
              {/* 时间设置区域 */}
              <div style={{ marginBottom: '20px' }}>
                <div className="label" style={{ marginBottom: '8px' }}>出生时间</div>
                <input
                  type="datetime-local"
                  value={clientTimeInput != null ? clientTimeInput : toLocalInputValue(new Date(dateISO))}
                  onChange={(e) => {
                    try {
                      // 使用输入缓冲，不立刻写入全局 dateISO，避免首字符被格式化覆盖
                      const v = e.target.value;
                      setClientTimeInput(v);
                      console.log('[ClientTimeInput] 输入缓冲变更:', v);
                    } catch (err) {
                      console.error('[ClientTimeInput] 输入缓冲失败:', err);
                    }
                  }}
                  onBlur={(e) => {
                    // 失去焦点时进行计算
                    console.log('[ClientTimeInput] 时间输入完成，开始计算:', e.target.value);
                    
                    const newTime = clientTimeInput != null ? clientTimeInput : e.target.value;
                    if (!newTime) return;
                    
                    try {
                      console.log('[ClientTimeUpdate] 计算时间:', newTime);
                      
                      // 使用函数式更新获取最新composition状态
                      setComposition(prev => {
                        // 优先使用birthPointLongitudeDeg，然后使用当前lonDeg状态
                        const bLon = prev.birthPointLongitudeDeg || lonDeg || 121.5;
                        
                        // 安全计算地球自转
                        let newEarthRotation;
                        try {
                          newEarthRotation = calculateEarthRotationFromDateISO(newTime, bLon);
                          if (typeof newEarthRotation !== 'number' || isNaN(newEarthRotation)) {
                            newEarthRotation = 0;
                            console.warn('[ClientTimeUpdate] 使用默认自转角度:', newEarthRotation);
                          }
                        } catch (error) {
                          console.warn('[ClientTimeUpdate] 自转计算失败，使用默认值:', error);
                          newEarthRotation = 0;
                        }
                        
                        console.log(`[ClientTimeUpdate] 自转更新: 时间=${newTime}, 经度=${bLon}°, 自转=${newEarthRotation.toFixed(1)}°`);
                        
                        return {
                          ...prev,
                          earthYawDeg: newEarthRotation
                        };
                      });
                      // 将缓冲写入主状态并清空缓冲
                      setDateISO(newTime);
                      setClientTimeInput(null);
                      
                      // 更新光照
                      setTimeout(() => {
                        updateSunlight();
                      }, 0);
                      
                    } catch (error) {
                      console.error('[ClientTimeUpdate] 时间更新失败:', error);
                    }
                  }}
                  onKeyDown={(e) => {
                    // 按Enter键时也进行计算
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    }
                  }}
                  style={{ width: '100%', padding: '8px', background: '#1a1a1a', border: '1px solid #444', color: '#fff', borderRadius: '4px' }}
                />
                <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                  时区: UTC{lonDeg > 0 ? '+' : ''}{Math.round(lonDeg / 15)}
                </div>
              </div>
              
              {/* 主要操作按钮 */}
              <div style={{ marginBottom: '20px' }}>
                <div className="label" style={{ marginBottom: '8px' }}>主要操作</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    className="btn"
                    onClick={() => {
                      // 对齐到出生点并放大
                      console.log('[ClientAlignButton] 对齐按钮被点击');
                      try {
                        console.log('[ClientAlign] 🔧 启动客户端对齐并放大');

                        // 🔧 关键修复：立即设置对齐状态，防止 useEffect 竞态条件
                        setIsAlignedAndZoomed(true);
                        console.log('[ClientAlign] 立即设置 isAlignedAndZoomed = true，防止视口偏移被重置');
                        console.log('[ClientAlign] 当前 viewOffsetY 值:', composition.viewOffsetY);

                        // 1. 先计算所有需要的参数
                        const current = composition;
                        const L = (current.birthPointLongitudeDeg ?? lonDeg) || 121.5;
                        const B = (current.birthPointLatitudeDeg ?? latDeg) || 31.2;
                        // 使用dev模式成功的alpha值：10，而不是默认的12
                        const alpha = 10;
                        console.log('[ClientAlign] 使用dev模式成功的alpha值:', alpha, '(固定为10，不是默认12)');
                        const seam = current.seamOffsetDeg ?? 0;
                        
                        // 2. 计算黄昏点经度（与 dev 模式一致：基于光照向量）
                        let lonDusk;
                        try {
                          const lightDir = new THREE.Vector3(-sunWorld.x, -sunWorld.y, -sunWorld.z).normalize();
                          lonDusk = THREE.MathUtils.radToDeg(Math.atan2(-lightDir.x, lightDir.z));
                          while (lonDusk > 180) lonDusk -= 360;
                          while (lonDusk < -180) lonDusk += 360;
                          console.log('[ClientAlign] 使用光照向量计算黄昏点经度:', lonDusk);
                        } catch (error) {
                          console.warn('[ClientAlign] 黄昏点计算失败，使用回退值:', error);
                          lonDusk = -75.3;
                        }
                        
                        console.log('[ClientAlign] === 开始五步操作 ===');
                        
                        // 第1步：对齐经度
                        console.log('[ClientAlign] 第1步：对齐经度 - 计算方位角');
                        let yaw = (L + seam) - lonDusk; 
                        while (yaw > 180) yaw -= 360; 
                        while (yaw < -180) yaw += 360;
                        console.log('[ClientAlign] 方位角计算完成:', yaw);
                        
                        console.log('[ClientAlign] 第2步：旋转纬度 - 计算俯仰角');
                        console.log('[ClientAlign] 输入参数 - B(纬度):', B, 'alpha(抬升角):', alpha);
                        const targetLat = 28; // 使用dev模式的目标纬度
                        const obsLat = B; // 当前纬度
                        let pitch = -(targetLat - obsLat); // dev模式的成功算法
                        if (pitch > 85) pitch = 85;
                        if (pitch < -85) pitch = -85;
                        console.log('[ClientAlign] 俯仰角计算(dev模式算法):', `targetLat(${targetLat}) - obsLat(${obsLat}) =`, pitch);
                        
                        // 第3步：放大 - 使用你提供的默认参数
                        console.log('[ClientAlign] 第3步：放大 - 设置地球大小和相机距离');
                        const earthSize = 1.68;  // 正确的地球大小
                        const cameraDistance = 15;  // 正确的相机距离
                        console.log('[ClientAlign] 放大参数:', { earthSize, cameraDistance });
                        
                        // 第4步：旋转相机俯仰角
                        console.log('[ClientAlign] 第4步：旋转相机俯仰角 - 应用相机参数');
                        console.log('[ClientAlign] 相机参数:', { azimuth: yaw, elevation: pitch, distance: cameraDistance });
                        
                        // 第5步：改参数设置
                        console.log('[ClientAlign] 第5步：改参数设置 - 应用所有参数');
                        console.log('[ClientAlign] 应用对齐参数:', {
                          enableBirthPointAlignment: true,
                          birthPointAlignmentMode: true,
                          cameraAzimuthDeg: yaw,
                          cameraElevationDeg: pitch,
                          cameraDistance: 15
                        });
                        // 预先计算地球自转角，避免中间帧出现旧自转导致的错误位置
                        let newEarthRotation = 0;
                        try {
                          const bLonInstant = composition.birthPointLongitudeDeg ?? lonDeg ?? 121.5;
                          newEarthRotation = calculateEarthRotationFromDateISO(dateISO, bLonInstant) || 0;
                        } catch (err) {
                          console.warn('[ClientAlign] 自转即时计算失败，使用0:', err);
                          newEarthRotation = 0;
                        }

                        console.log('[ClientAlign] 五步操作完成，开始原子设置参数...');
                        console.log('[ClientAlign] 设置 viewOffsetY = 0 + earthYawDeg 同步更新');
                        setComposition(prev => ({
                          ...prev,
                          viewOffsetY: 0,
                          enableBirthPointAlignment: true,
                          birthPointAlignmentMode: true,
                          cameraAzimuthDeg: yaw,
                          cameraElevationDeg: pitch,
                          cameraDistance: 15,
                          earthYawDeg: newEarthRotation,

                          // 地球参数 - 使用你提供的默认参数
                          earthSize: 1.68,
                          lookAtDistanceRatio: 1.08,
                          birthPointAlphaDeg: 10,

                          // 云层参数 - 使用你提供的默认参数（16层云系统）
                          cloudsEnabled: true,
                          cloudNumLayers: 16,
                          cloudLayerSpacing: 0.0010,
                          cloudStrength: 0.25,
                          cloudHeight: 0.002,
                          cloudYawDeg: 0,
                          cloudPitchDeg: 0,
                          cloudDisplacementScale: 0.0,
                          cloudDisplacementBias: 0.03,
                          cloudScrollSpeedU: 0.00033,
                          cloudScrollSpeedV: 0.00066,
                          cloudGamma: 0.50,
                          cloudContrast: 0.9,
                          cloudBlack: 0.00,
                          cloudWhite: 0.90,
                          // 体积散射参数
                          cloudUseVolumeScattering: true,
                          cloudVolumeDensity: 0.50,
                          cloudScatteringStrength: 1.50,
                          cloudScatteringG: -0.50,
                          cloudRimEffect: 0.10,
                          cloudDensityEnhancement: 2.00,
                          cloudNoiseScale: 2.00,
                          cloudNoiseStrength: 0.70,
                          // 厚度映射
                          cloudUseThicknessMapping: true,
                          cloudThicknessScale: 4.00,
                          cloudThicknessBias: 1.00,
                          cloudThicknessPower: 1.50,

                          // 其他重要参数
                          exposure: 1.00,
                          atmosphereEnabled: true,
                          starsEnabled: true,
                          moonEnabled: true,
                          moonDistance: 14,
                          moonRadius: 0.68,

                          // 材质参数
                          sunIntensity: 2.45,
                          lightAzimuth: 0,
                          lightElevation: 0,
                          terminatorSoftness: 1.00,
                          nightIntensity: 0.20,

                          // 月球参数
                          moonPhaseEnabled: true,
                          moonAutoPosition: true
                        }));

                        // 与参数更新同一批次设置标志，减少中间态
                        setIsAlignedAndZoomed(true);
                        
                        // 4. 设置对齐状态（已在开始时设置，此处仅需设置其他状态）
                        setRealTimeUpdate(false);
                        setAutoUpdate(false);
                        // 5. 轻量触发光照刷新（异步，不再改变earthYawDeg）
                        setTimeout(() => {
                          try { updateSunlight(); } catch (e) { console.error('[ClientAlign] 光照刷新失败:', e); }
                          console.log('[ClientAlign] ✅ 客户端对齐并放大完成 - 五步操作总结:', { 
                            step1_对齐经度: yaw,
                            step2_旋转纬度: pitch,
                            step3_放大: { earthSize: 1.68, cameraDistance: 15 },
                            step4_旋转相机俯仰角: pitch,
                            step5_改参数设置: '已完成',
                            最终相机参数: { azimuth: yaw, elevation: pitch, radius: 15 },
                            地球自转: newEarthRotation.toFixed(1),
                            黄昏点经度: lonDusk
                          });
                        }, 0);
                      } catch (e) {
                        console.error('[ClientAlign] ❌ 对齐失败:', e);
                      }
                    }}
                    style={{ width: '100%' }}
                  >
                    Xiu!!!
                  </button>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn"
                      onClick={() => {
                      try {
                        const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
                        if (!canvas) { alert('未找到画布'); return; }
                        // 等待两帧，确保最新一帧完成并已落入绘图缓冲
                        requestAnimationFrame(() => {
                          requestAnimationFrame(() => {
                            try {
                              const openComposited = (srcUrl: string) => {
                                const img = new Image();
                                img.crossOrigin = 'anonymous';
                                img.onload = () => {
                                  try {
                                    const w = canvas.width, h = canvas.height;
                                    const temp = document.createElement('canvas');
                                    temp.width = w; temp.height = h;
                                    const ctx = temp.getContext('2d');
                                    if (!ctx) { window.open(srcUrl, '_blank'); return; }
                                    // 用纯黑底合成，避免任何透明与预乘导致的偏灰
                                    ctx.fillStyle = '#000';
                                    ctx.fillRect(0, 0, w, h);
                                    ctx.drawImage(img, 0, 0, w, h);
                                    const out = temp.toDataURL('image/png');
                                    const win = window.open('', '_blank');
                                    if (win) {
                                      win.document.body.style.margin = '0';
                                      const i = new Image(); i.src = out; win.document.body.appendChild(i);
                                    }
                                  } catch (e) {
                                    console.error('[Screenshot] 合成失败:', e);
                                    window.open(srcUrl, '_blank');
                                  }
                                };
                                img.src = srcUrl;
                              };

                              canvas.toBlob((blob) => {
                                try {
                                  if (blob) {
                                    const url = URL.createObjectURL(blob);
                                    openComposited(url);
                                    setTimeout(() => URL.revokeObjectURL(url), 30000);
                                    return;
                                  }
                                  const dataUrl = canvas.toDataURL('image/png');
                                  if (dataUrl && dataUrl.startsWith('data:image/png')) {
                                    openComposited(dataUrl);
                                  } else {
                                    alert('截图失败，可能是跨域纹理导致。');
                                  }
                                } catch (err) {
                                  console.error('[Screenshot] 预览失败:', err);
                                }
                              }, 'image/png');
                            } catch (err2) {
                              console.error('[Screenshot] toBlob失败:', err2);
                            }
                          });
                        });
                      } catch (e) {
                        console.error('[Screenshot] 截图失败:', e);
                      }
                    }}
                    style={{ flex: 1 }}
                  >
                    截图
                  </button>
                  <button
                    className="btn"
                    onClick={() => {
                      const panel = document.querySelector('.panel') as HTMLElement | null;
                      if (panel) { panel.style.opacity = '0'; panel.style.transform = 'translateY(-6px)'; }
                      setTimeout(() => setUiHidden(true), 160);
                    }}
                    style={{ flex: 1 }}
                  >
                    隐藏 UI
                  </button>
                  </div>
                </div>
              </div>

              
              
              
              {/* 显示选项 */}
              <div style={{ marginBottom: '20px' }}>
                <div className="label" style={{ marginBottom: '8px' }}>显示选项</div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                    <input
                      type="checkbox"
                      checked={!!composition.useClouds}
                      onChange={(e) => {
                        updateValue('useClouds', e.target.checked);
                      }}
                      style={{ filter: 'grayscale(100%) brightness(0.8)' }}
                    />
                    云层
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                    <input
                      type="checkbox"
                      checked={!!composition.showStars}
                      onChange={(e) => updateValue('showStars', e.target.checked)}
                      style={{ filter: 'grayscale(100%) brightness(0.8)' }}
                    />
                    星空
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                    <input
                      type="checkbox"
                      checked={composition.showMoon ?? true}
                      onChange={(e) => updateValue('showMoon', e.target.checked)}
                      style={{ filter: 'grayscale(100%) brightness(0.8)' }}
                    />
                    月球
                  </label>
                </div>
              </div>
              
              {/* 开发者模式入口：已按需求在客户端隐藏 */}
            </div>
          )}
        </>
      )}

      {/* 客户端模式底部说明文案已按需求移除 */}
    </div>
  );
}

// 在渲染上下文中提供一个自动化"无倾斜"检测脚本
function NoTiltProbe(): JSX.Element | null {
  const { scene } = useThree();
  React.useEffect(() => {
    // 🔧 修复：注释掉全局变量，避免内存泄漏和全局状态污染
    // (window as any).runNoTiltAutoTest = async (frames: number = 120) => {
    //   const worldUp = new THREE.Vector3(0,1,0);
    //   let maxDeg = 0;
    //   let samples = 0;
    //   const getTiltDeg = () => {
    //     const earth = scene.getObjectByName('earthRoot') as THREE.Object3D | undefined;
    //     if (!earth) return null;
    //     const up = new THREE.Vector3(0,1,0).applyQuaternion(earth.quaternion).normalize();
    //     const dot = THREE.MathUtils.clamp(up.dot(worldUp), -1, 1);
    //     const ang = Math.acos(dot) * 180 / Math.PI; // 与世界Y的夹角
    //     return ang;
    //   };
    //   await new Promise<void>((resolve) => {
    //     let count = 0;
    //     const step = () => {
    //       const deg = getTiltDeg();
    //       if (deg != null) {
    //         maxDeg = Math.max(maxDeg, deg);
    //         samples++;
    //       }
    //       count++;
    //       if (count >= frames) return resolve();
    //       requestAnimationFrame(step);
    //     };
    //     requestAnimationFrame(step);
    //   });
    //   const ok = maxDeg <= 0.5; // 容差0.5°以内视为无倾斜
    //   const payload = { when: new Date().toISOString(), ok, maxTiltDeg: +maxDeg.toFixed(3), samples };
    //   console[ok?'log':'error']('[NoTiltTest] ' + (ok?'✅ PASS':'❌ FAIL'), payload);
    //   console.log('[NoTiltTest:JSON]', JSON.stringify(payload, null, 2));
    //   return payload;
    // };

    // 🔧 修复：注释掉全局变量，避免内存泄漏和全局状态污染
    // (window as any).diagnoseBirthPointCoords = (lat: number, lon: number) => {
    //   try {
    //     console.log(`\n=== 出生点坐标诊断: ${lat}°N, ${lon}°E ===`);
    //     
    //     // 1. 基础球面坐标转换
    //     const latRad = THREE.MathUtils.degToRad(lat);
    //     const lonRad = THREE.MathUtils.degToRad(lon);
    //     const p = new THREE.Vector3(
    //       Math.cos(latRad) * Math.sin(lonRad),  // x = 东西方向
    //       Math.sin(latRad),                     // y = 上下方向
    //       -Math.cos(latRad) * Math.cos(lonRad)  // z = 南北方向（负号）
    //     );
    //     
    //     console.log('1. 出生点局部坐标 p:', { x: +p.x.toFixed(4), y: +p.y.toFixed(4), z: +p.z.toFixed(4) });
    //     
    //     // 2. 读取地球当前旋转
    //     const scene = (window as any).__R3F_Scene;
    //     const earthRoot = scene?.getObjectByName?.('earthRoot');
    //     let worldP = p.clone();
    //     if (earthRoot && earthRoot.quaternion) {
    //       worldP = p.clone().applyQuaternion(earthRoot.quaternion);
    //       console.log('2. 地球四元数:', { 
    //         x: +earthRoot.quaternion.x.toFixed(4), 
    //         y: +earthRoot.quaternion.y.toFixed(4), 
    //         z: +earthRoot.quaternion.z.toFixed(4), 
    //         w: +earthRoot.quaternion.w.toFixed(4) 
    //       });
    //       console.log('3. 世界坐标 worldP:', { x: +worldP.x.toFixed(4), y: +worldP.y.toFixed(4), z: +worldP.z.toFixed(4) });
    //     }
    //     
    //     // 3. 相机角度计算  
    //     const rawYaw = THREE.MathUtils.radToDeg(Math.atan2(worldP.x, -worldP.z));
    //     const yaw = rawYaw + 180; // 🔧 关键修复：相机从出生点向地心看，加180°
    //     const pitch = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(worldP.y, -1, 1)));
    //     
    //     console.log('4. 相机角度计算:');
    //     console.log('   - 原始atan2(x, -z) = atan2(' + worldP.x.toFixed(4) + ', ' + (-worldP.z).toFixed(4) + ') = ' + rawYaw.toFixed(2) + '°');
    //     console.log('   - 修正yaw = ' + rawYaw.toFixed(2) + '° + 180° = ' + yaw.toFixed(2) + '°');
    //     console.log('   - asin(y) = asin(' + worldP.y.toFixed(4) + ') = ' + pitch.toFixed(2) + '°');
    //     
    //     // 4. 预期结果验证
    //     console.log('5. 预期验证:');
    //     console.log('   - 经度' + lon + '°应该对应相机yaw约' + lon + '° (如果地球未旋转)');
    //     console.log('   - 纬度' + lat + '°应该对应相机pitch约' + lat + '°');
    //     console.log('   - 实际yaw: ' + yaw.toFixed(2) + '°, pitch: ' + pitch.toFixed(2) + '°');
    //     
    //     return { p, worldP, yaw, pitch };
    //   } catch (e) {
    //     console.error('[CoordsDiagnosis] 诊断失败:', e);
    //     return null;
    //   }
    // };
    
    // 🔧 新增：验证修复后的对齐精度
    // 🔧 修复：注释掉全局变量，避免内存泄漏和全局状态污染
    // (window as any).verifyAlignment = (lat: number, lon: number, cityName: string = `${lat}°N,${lon}°E`) => {
      try {
        console.log(`[VerifyAlignment] 开始验证 ${cityName} 的对齐精度...`);
        
        // 模拟点击经线对齐按钮的逻辑
        const L0 = lon;
        let L = L0;
        while (L > 180) L -= 360;
        while (L < -180) L += 360;
        const textureLon = L; // 直接映射，无偏移
        
        console.log(`[VerifyAlignment] ${cityName}:`, {
          输入经度: L0,
          标准化经度: L.toFixed(2),
          贴图经度: textureLon.toFixed(2),
          预期偏移: '0.00° (修复后应该为零)',
          修复状态: textureLon === L ? '✅ 正确' : '❌ 仍有偏移'
        });
        
        return { 
          city: cityName,
          inputLon: L0,
          textureLon,
          offset: Math.abs(textureLon - L),
          isFixed: Math.abs(textureLon - L) < 0.01
        };
      } catch (e) {
        console.error('[VerifyAlignment] 验证失败:', e);
        return null;
      }
    // };
    
    // 🔧 测试不同偏移量找到正确值
    // 🔧 修复：注释掉全局变量，避免内存泄漏和全局状态污染
    // (window as any).testOffsets = (lon: number) => {
    //   console.log(`[TestOffsets] 测试不同偏移量对经度 ${lon}° 的影响:`);
    //   const offsets = [0, 90, 180, -90, 52.5, -52.5, 127.5, -127.5];
    //   const results = [];
    //   
    //   for (const offset of offsets) {
    //     const textureLon = lon + offset;
    //     const lonRad = THREE.MathUtils.degToRad(textureLon);
    //     const vLocal = new THREE.Vector3(Math.sin(lonRad), 0, Math.cos(lonRad));
    //     const gammaDeg = THREE.MathUtils.radToDeg(Math.atan2(vLocal.x, vLocal.z));
    //     
    //     results.push({
    //       偏移量: offset,
    //       贴图经度: textureLon.toFixed(1),
    //       伽马角: gammaDeg.toFixed(1),
    //       说明: offset === 90 ? '基础偏移' : offset === 0 ? '无偏移' : offset === 52.5 ? '原错误值' : ''
    //     });
    //   }
    //   
    //   console.table(results);
    //   return results;
    // };
    // 🔧 修复：注释掉全局变量，避免内存泄漏和全局状态污染
    // (window as any).runFixedSunAzimuthLockTest = async () => {
    //   try {
    //     (window as any).setUseFixedSun?.(true);
    //     const yawOf = (arr:any) => {
    //       try {
    //         if (!arr || !Array.isArray(arr) || arr.length < 3) return NaN;
    //         const [x,,z] = arr as number[];
    //         return Math.atan2(x, z) * 180/Math.PI;
    //       } catch { return NaN; }
    //     };
    //     const waitFrames = (n:number)=> new Promise<void>(res=>{ let c=0; const step=()=>{ if(++c>=n) res(); else requestAnimationFrame(step); }; requestAnimationFrame(step); });
    //     (window as any).setSceneTime?.('2024-03-21T06:00'); await waitFrames(30);
    //     const d1 = (window as any).getFixedSunDir?.() || (window as any).__LightDir;
    //     (window as any).setSceneTime?.('2024-03-21T18:00'); await waitFrames(30);
    //     const d2 = (window as any).getFixedSunDir?.() || (window as any).__LightDir;
    //     const y1 = yawOf(d1), y2 = yawOf(d2);
    //     const diff = Math.abs(((y2 - y1 + 540)%360)-180); // shortest diff
    //     const ok = diff <= 1.0;
    //     const payload = { when:new Date().toISOString(), ok, yaw06:+y1.toFixed(2), yaw18:+y2.toFixed(2), diff:+diff.toFixed(2) };
    //     console[ok?'log':'error']('[FixedSunAzTest] ' + (ok?'✅ PASS':'❌ FAIL'), payload);
    //     console.log('[FixedSunAzTest:JSON]', JSON.stringify(payload, null, 2));
    //     return payload;
    //   } catch (e) {
    //     console.error('[FixedSunAzTest] failed:', e);
    //     return null;
    //   }
    // };
    // 🔧 修复：注释掉全局变量，避免内存泄漏和全局状态污染
    // (window as any).runSeasonalAutoTest = async () => {
    //   try {
    //     // 使用最新的 composition 值，而不是闭包快照
    //     const getComp = () => (window as any).__getComposition?.() ?? {};
    //     const comp = getComp();
    //     const utc = new Date('2024-06-21T12:00:00Z');
    //     const dSum = seasonalSunDirWorldYUp(utc, 0, (comp.obliquityDeg ?? 23.44), (comp.seasonOffsetDays ?? 0));
    //     const eps = comp.obliquityDeg ?? 23.44;
    //     const altSum = Math.asin(dSum.y) * 180/Math.PI;
    //     const ok1 = Math.abs(altSum - eps) < 3.0;
    //     const utc2 = new Date('2024-12-21T12:00:00Z');
    //     const dWin = seasonalSunDirWorldYUp(utc2, 0, (comp.obliquityDeg ?? 23.44), (comp.seasonOffsetDays ?? 0));
    //     const altWin = Math.asin(dWin.y) * 180/Math.PI;
    //     const ok2 = Math.abs(altWin + eps) < 3.0;
    //     const payload = { when: new Date().toISOString(), ok: ok1 && ok2, altSummer: +altSum.toFixed(2), altWinter: +altWin.toFixed(2), eps };
    //     console[payload.ok?'log':'error']('[SeasonalTest] ' + (payload.ok?'✅ PASS':'❌ FAIL'), payload);
    //     console.log('[SeasonalTest:JSON]', JSON.stringify(payload, null, 2));
    //     return payload;
    //   } catch (e) {
    //     console.error('[SeasonalTest] failed:', e);
    //     return null;
    //   }
    // };
    // 只读 composition getter，避免闭包旧值
    // 🔧 修复：注释掉全局变量，避免内存泄漏和全局状态污染
    // (window as any).__getComposition = () => { try { return {}; } catch { return null; } };
  }, [scene]);
  return null;
}
