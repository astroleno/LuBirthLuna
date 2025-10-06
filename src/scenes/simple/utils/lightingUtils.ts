import React from 'react';
import * as THREE from 'three';
import { kelvinToRGB } from './textureLoader';
import { logger } from '../../../utils/logger';

// 光照方向计算 - 与日期时间计算耦合
export function useLightDirection(
  mode: 'debug' | 'celestial',
  sunWorld: { x: number; y: number; z: number },
  composition: any,
  altDeg?: number
) {
  return React.useMemo(() => {
    // console.log('[useLightDirection] Recalculating light direction:', { 
    //   mode, 
    //   sunWorld: { x: sunWorld.x, y: sunWorld.y, z: sunWorld.z },
    //   lightAzimuth: composition.lightAzimuth,
    //   lightElevation: composition.lightElevation
    // });
    
    if (mode === 'celestial') {
      // 固定太阳模式：直接使用 fixedSunDir
      if (composition?.useFixedSun && Array.isArray(composition?.fixedSunDir)) {
        const [fx, fy, fz] = composition.fixedSunDir as [number, number, number];
        const result = new THREE.Vector3(fx, fy, fz).normalize();
        return result;
      }
      // 普通模式：使用 -sunWorld 作为光照方向（太阳光从太阳射向地球）
      const result = new THREE.Vector3(-sunWorld.x, -sunWorld.y, -sunWorld.z).normalize();
      
      // 检查太阳是否在地平线下
      const elevation = typeof altDeg === 'number' ? altDeg : (Math.asin(sunWorld.y) * 180 / Math.PI);
      const isSunBelowHorizon = elevation < 0;
      
      // console.log('[useLightDirection] Celestial mode result:', {
      //   direction: result.toArray(),
      //   elevation: elevation.toFixed(2) + '°',
      //   belowHorizon: isSunBelowHorizon
      // });
      
      // 如果太阳在地平线下，可能需要调整光照强度或方向
      if (isSunBelowHorizon) {
        // console.log('[useLightDirection] WARNING: Sun is below horizon! Elevation:', elevation);
      }
      
      return result;
    } else {
      // 使用手动控制的光照方向
      const azRad = (composition.lightAzimuth * Math.PI) / 180;
      const elRad = (composition.lightElevation * Math.PI) / 180;
      const result = new THREE.Vector3(
        Math.cos(elRad) * Math.cos(azRad),
        Math.sin(elRad),
        Math.cos(elRad) * Math.sin(azRad)
      );
      // console.log('[useLightDirection] Debug mode result:', result.toArray());
      return result;
    }
  }, [mode, sunWorld, composition.lightAzimuth, composition.lightElevation, altDeg, composition.useFixedSun, composition.fixedSunDir?.[0], composition.fixedSunDir?.[1], composition.fixedSunDir?.[2]]);
}

// 生成季节性太阳方向（Y-up 世界）：将黄赤交角的季节摆动转嫁到太阳方向
export function seasonalSunDirWorldYUp(
  utc: Date,
  lonDeg: number,
  obliquityDeg: number = 23.44,
  seasonOffsetDays: number = 0,
  fixedYawDeg?: number // 可选：锁定世界XZ平面方位角（度），仅改变仰角
) {
  const dayOfYear = (d: Date) => {
    const start = Date.UTC(d.getUTCFullYear(), 0, 1);
    return Math.floor((d.getTime() - start) / 86400000) + 1;
  };
  const fracDayUTC = (utc.getUTCHours() + utc.getUTCMinutes() / 60 + utc.getUTCSeconds() / 3600) / 24;
  // 将相位校准到夏至（北半球约第172天）
  const doy = dayOfYear(utc);
  const gamma = 2 * Math.PI * ((doy - 172) + seasonOffsetDays) / 365.2422;
  const eps = obliquityDeg * Math.PI / 180;
  const delta = eps * Math.cos(gamma); // 赤纬（季节摆动）
  let H: number;
  if (typeof fixedYawDeg === 'number' && isFinite(fixedYawDeg)) {
    const yawRad = fixedYawDeg * Math.PI / 180;
    H = Math.PI / 2 - yawRad;
  } else {
    const fracLocal = ((fracDayUTC + lonDeg / 360) % 1 + 1) % 1;
    H = 2 * Math.PI * (fracLocal - 0.5);
  }
  const ux = Math.cos(delta) * Math.cos(H);
  const uy = Math.cos(delta) * Math.sin(H);
  const uz = Math.sin(delta);
  // ECEF(x=ux,y=uy,z=uz) → World Y-up: (x=ux, y=uz, z=uy)
  const vx = ux, vy = uz, vz = uy;
  const n = Math.hypot(vx, vy, vz) || 1;
  return { x: vx / n, y: vy / n, z: vz / n };
}

// 光照颜色计算 (色温控制)
export function useLightColor(composition: any) {
  return React.useMemo(() => {
    const tempK = Math.min(Math.max(composition.lightTempK ?? 5200, 2000), 10000);
    return kelvinToRGB(tempK);
  }, [composition.lightTempK]);
}

// 光照强度计算
export function useLightIntensity(composition: any) {
  return React.useMemo(() => {
    return Math.min(Math.max(composition.sunIntensity ?? 1.3, 0), 5);
  }, [composition.sunIntensity]);
}

// 环境光强度计算
export function useAmbientIntensity(composition: any) {
  return React.useMemo(() => {
    return Math.min(Math.max(composition.dayAmbient ?? 0.02, 0), 0.2);
  }, [composition.dayAmbient]);
}

// 夜景强度计算
export function useNightIntensity(composition: any) {
  return React.useMemo(() => {
    return Math.min(Math.max(composition.nightIntensity ?? 3.0, 0), 10);
  }, [composition.nightIntensity]);
}

// 光照组件 - 统一的光照系统
export function createSimpleLighting(
  lightDirection: THREE.Vector3,
  lightColor: THREE.Color,
  lightIntensity: number,
  ambientIntensity: number
) {
  return {
    directionalLight: {
      position: [
        lightDirection.x * 50, 
        lightDirection.y * 50, 
        lightDirection.z * 50
      ] as [number, number, number],
      intensity: lightIntensity,
      color: lightColor,
      castShadow: true
    },
    ambientLight: {
      intensity: ambientIntensity
    }
  };
}

// 光照调试信息
export function useLightingDebug(lightDirection: THREE.Vector3, lightColor: THREE.Color, lightIntensity: number) {
  React.useEffect(() => {
    if (new URLSearchParams(location.search).get('debug') === '1') {
      console.log('[SimpleLighting]', {
        direction: lightDirection.toArray(),
        color: lightColor.getHexString(),
        intensity: lightIntensity,
        mode: 'single-light-system'
      });
    }
  }, [lightDirection, lightColor, lightIntensity]);
}

// 光照参数验证
export function validateLightingParams(composition: any) {
  const errors: string[] = [];
  
  if (composition.sunIntensity < 0 || composition.sunIntensity > 5) {
    errors.push('sunIntensity should be between 0 and 5');
  }
  
  if (composition.lightTempK < 2000 || composition.lightTempK > 10000) {
    errors.push('lightTempK should be between 2000 and 10000');
  }
  
  if (composition.dayAmbient < 0 || composition.dayAmbient > 0.2) {
    errors.push('dayAmbient should be between 0 and 0.2');
  }
  
  if (composition.nightIntensity < 0 || composition.nightIntensity > 10) {
    errors.push('nightIntensity should be between 0 and 10');
  }
  
  return errors;
}

// 光照预设
export const LIGHTING_PRESETS = {
  daylight: {
    lightTempK: 5500,
    sunIntensity: 1.5,
    dayAmbient: 0.1,
    nightIntensity: 2.0
  },
  sunset: {
    lightTempK: 3000,
    sunIntensity: 1.0,
    dayAmbient: 0.05,
    nightIntensity: 3.0
  },
  moonlight: {
    lightTempK: 4000,
    sunIntensity: 0.3,
    dayAmbient: 0.02,
    nightIntensity: 5.0
  },
  studio: {
    lightTempK: 5200,
    sunIntensity: 1.0,
    dayAmbient: 0.15,
    nightIntensity: 1.5
  }
};

// 应用光照预设
export function applyLightingPreset(composition: any, presetName: keyof typeof LIGHTING_PRESETS) {
  const preset = LIGHTING_PRESETS[presetName];
  return {
    ...composition,
    lightTempK: preset.lightTempK,
    sunIntensity: preset.sunIntensity,
    dayAmbient: preset.dayAmbient,
    nightIntensity: preset.nightIntensity
  };
}
