import React, { useMemo } from 'react';
import * as THREE from 'three';
import { POMCloudRenderer } from './POMCloudRenderer';
import { CloudsWithLayers } from './Clouds';

// 两套并存LOD系统配置
interface LODConfig {
  midFar: {
    usePOM: boolean;
    pomSteps: number;
    numLayers: number;
    useVolume: boolean;
    renderMode: string;
  };
  nearClose: {
    usePOM: boolean;
    pomSteps: number;
    numLayers: number;
    useVolume: boolean;
    renderMode: string;
  } | null;
  renderMode: string;
}

// 获取LOD配置
const getLODConfig = (earthSize: number, viewAngle: number, isAlignedAndZoomed: boolean): LODConfig => {
  // 中远景方案：始终启用（提供基础视差+厚度感）
  const midFarConfig = {
    usePOM: false, // 暂时禁用POM，避免性能问题
    pomSteps: 0,
    numLayers: Math.min(3, Math.floor(earthSize * 3)), // 减少到1-3层
    useVolume: false,
    renderMode: 'pom-shell'
  };
  
  // 近景特写方案：仅在earthSize >= 1.0时启用（叠加到中远景上）
  const nearCloseConfig = earthSize >= 1.0 ? {
    usePOM: false, // 不重复POM
    pomSteps: 0,
    numLayers: Math.min(6, 3 + Math.floor((earthSize - 1.0) * 3)), // 减少到3-6层
    useVolume: false, // 暂时禁用体积渲染
    renderMode: 'shell-volume'
  } : null;
  
  return { 
    midFar: midFarConfig,
    nearClose: nearCloseConfig,
    // 并存策略：中远景始终存在，近景特写叠加
    renderMode: 'layered' // 'mid-far', 'near-close', 'layered'
  };
};

// 两套并存系统集成组件
export function IntegratedCloudSystem({ 
  composition,
  earthInfo,
  lightDirection,
  lightColor,
  lightIntensity,
  camera,
  isAlignedAndZoomed = false, // 从UI对齐按钮传入的状态
  earthClouds // 云层贴图
}: {
  composition: any;
  earthInfo: { size: number; position: [number, number, number] };
  lightDirection: THREE.Vector3;
  lightColor: THREE.Color;
  lightIntensity: number;
  camera: THREE.Camera;
  isAlignedAndZoomed?: boolean;
  earthClouds: THREE.Texture | null;
}) {
  
  // 计算视角角度（简化计算）
  const viewAngle = useMemo(() => {
    if (!camera) return 0;
    const cameraPos = camera.position.clone().normalize();
    const lightDir = lightDirection.clone().normalize();
    return Math.acos(Math.max(-1, Math.min(1, cameraPos.dot(lightDir))));
  }, [camera, lightDirection]);
  
  // 获取LOD配置
  const lodConfig = useMemo(() => {
    return getLODConfig(composition.earthSize, viewAngle, isAlignedAndZoomed);
  }, [composition.earthSize, viewAngle, isAlignedAndZoomed]);
  
  if (!earthClouds) {
    console.warn('[IntegratedCloudSystem] 云层贴图未找到');
    return null;
  }
  
  return (
    <>
      {/* 中远景方案：始终启用 */}
      {/* POM远景渲染 - 暂时禁用以避免性能问题 */}
      {false && lodConfig.midFar.usePOM && (
        <POMCloudRenderer 
          radius={earthInfo.size * 1.0006}
          texture={earthClouds}
          position={earthInfo.position}
          lightDir={lightDirection}
          lightColor={lightColor}
          strength={composition.cloudStrength || 0.4}
          sunI={lightIntensity}
          cloudGamma={composition.cloudGamma || 1.0}
          cloudBlack={composition.cloudBlack || 0.4}
          cloudWhite={composition.cloudWhite || 0.85}
          cloudContrast={composition.cloudContrast || 1.2}
          pomSteps={lodConfig.midFar.pomSteps}
          heightScale={0.0005}
          blendMode="additive"
          opacity={0.4} // 中远景POM透明度
        />
      )}
      
      {/* 中远景壳层渲染 - 1-8层 */}
      <CloudsWithLayers 
        radius={earthInfo.size * 1.0006}
        texture={earthClouds}
        position={earthInfo.position}
        lightDir={lightDirection}
        lightColor={lightColor}
        strength={composition.cloudStrength || 0.5}
        sunI={lightIntensity}
        cloudGamma={composition.cloudGamma || 1.0}
        cloudBlack={composition.cloudBlack || 0.4}
        cloudWhite={composition.cloudWhite || 0.85}
        cloudContrast={composition.cloudContrast || 1.2}
        displacementScale={composition.cloudDisplacementScale || 0.05}
        displacementBias={composition.cloudDisplacementBias || 0.02}
        scrollSpeedU={composition.cloudScrollSpeedU || 0.0003}
        scrollSpeedV={composition.cloudScrollSpeedV || 0.00015}
        numLayers={lodConfig.midFar.numLayers}
        layerSpacing={composition.cloudLayerSpacing || 0.00025}
        useTriplanar={composition.cloudUseTriplanar || true}
        triplanarScale={0.1}
        blendMode="alpha"
        opacity={0.6} // 中远景壳层透明度
      />
      
      {/* 近景特写方案：暂时禁用以避免性能问题 */}
      {false && lodConfig.nearClose && (
        <>
          {/* 近景壳层渲染 - 暂时禁用 */}
          <CloudsWithLayers 
            radius={earthInfo.size * 1.0006}
            texture={earthClouds}
            position={earthInfo.position}
            lightDir={lightDirection}
            lightColor={lightColor}
            strength={(composition.cloudStrength || 0.5) * 0.8} // 降低强度避免过度叠加
            sunI={lightIntensity}
            cloudGamma={composition.cloudGamma || 1.0}
            cloudBlack={composition.cloudBlack || 0.4}
            cloudWhite={composition.cloudWhite || 0.85}
            cloudContrast={composition.cloudContrast || 1.2}
            displacementScale={composition.cloudDisplacementScale || 0.05}
            displacementBias={composition.cloudDisplacementBias || 0.02}
            scrollSpeedU={composition.cloudScrollSpeedU || 0.0003}
            scrollSpeedV={composition.cloudScrollSpeedV || 0.00015}
            numLayers={lodConfig.nearClose.numLayers}
            layerSpacing={composition.cloudLayerSpacing || 0.00025}
            useTriplanar={composition.cloudUseTriplanar || true}
            triplanarScale={0.1}
            blendMode="alpha"
            opacity={0.5} // 近景壳层透明度
          />
          
          {/* 体积渲染 - 暂时禁用 */}
          {false && lodConfig.nearClose.useVolume && (
            <div>
              {/* 体积渲染组件将在第二阶段实现 */}
              <mesh>
                <sphereGeometry args={[earthInfo.size * 1.0006, 32, 16]} />
                <meshBasicMaterial color="rgba(255,255,255,0.1)" transparent />
              </mesh>
            </div>
          )}
        </>
      )}
    </>
  );
}
