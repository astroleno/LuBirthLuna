import { toUTCFromLocal } from '../../../astro/ephemeris';
import { AstroTime, Body, Illumination, Elongation, GeoVector } from 'astronomy-engine';
import * as THREE from 'three';

export type MoonPhaseInfo = {
  illumination: number; // 0..1
  phaseAngleRad: number; // 太阳-月球夹角 γ (0-π)，用于亮度计算
  sunDirection: THREE.Vector3; // 真实太阳方向向量
  moonDirection: THREE.Vector3; // 真实月球方向向量
  positionAngle: number; // 位置角 χ (弧度)，用于左右判断
};

export function getMoonPhase(localISO: string, latDeg: number, lonDeg: number): MoonPhaseInfo {
  try {
    const utc = toUTCFromLocal(localISO, lonDeg);
    const time = new AstroTime(utc);
    
    // 获取月相照明信息
    const illumInfo = Illumination(Body.Moon, time);
    const illumination = Math.min(1, Math.max(0, illumInfo.phase_fraction));
    
    // [🔧 关键修复] 获取真实的太阳和月球方向向量
    // 使用地心坐标系（Geocentric）获取方向向量
    const sunGeo = GeoVector(Body.Sun, time, false); // 地心太阳向量
    const moonGeo = GeoVector(Body.Moon, time, false); // 地心月球向量
    
    // 转换为单位向量（Three.js 坐标系：Y-up）
    // astronomy-engine 使用 ICRF 坐标系，需要转换到我们的渲染坐标系
    const sunDirection = new THREE.Vector3(sunGeo.x, sunGeo.z, sunGeo.y).normalize();
    const moonDirection = new THREE.Vector3(moonGeo.x, moonGeo.z, moonGeo.y).normalize();
    
    // 计算太阳-月球夹角 γ（用于亮度）
    const gamma = Math.acos(Math.max(-1, Math.min(1, sunDirection.dot(moonDirection))));
    
    // [🔧 针对固定月球系统的月相计算]
    // 在你们的系统中：月球固定在屏幕位置，潮汐锁定，月相只跟日期相关
    // 我们需要计算的是：在固定的屏幕坐标下，太阳光从哪个方向照射月球
    
    // 使用 Elongation 来确定月相周期位置（但修正其含义）
    const elongationInfo = Elongation(Body.Moon, time);
    let elongationDeg = elongationInfo.elongation;
    
    // 确定月相周期中的位置：使用月球的黄经差来判断盈亏
    // 获取太阳和月球的黄经
    const sunEcliptic = GeoVector(Body.Sun, time, true); // 使用黄道坐标
    const moonEcliptic = GeoVector(Body.Moon, time, true);
    
    // 计算月球相对于太阳的黄经差（月相角）
    const sunLon = Math.atan2(sunEcliptic.y, sunEcliptic.x);
    const moonLon = Math.atan2(moonEcliptic.y, moonEcliptic.x);
    let phaseLon = moonLon - sunLon;
    
    // 标准化到 0-2π 范围
    while (phaseLon < 0) phaseLon += 2 * Math.PI;
    while (phaseLon >= 2 * Math.PI) phaseLon -= 2 * Math.PI;
    
    // 转换为位置角：在固定屏幕坐标系下的光照方向
    // 0° = 新月（太阳在前）, 90° = 上弦（太阳在右）, 180° = 满月（太阳在后）, 270° = 下弦（太阳在左）
    const positionAngle = phaseLon - Math.PI; // 调整基准，使满月时 positionAngle ≈ 0
    
    // 构建对应的太阳方向向量（用于渲染）
    const sunX = Math.sin(phaseLon);
    const sunY = 0;
    const sunZ = -Math.cos(phaseLon); // 负号确保新月时太阳在前方
    const renderSunDirection = new THREE.Vector3(sunX, sunY, sunZ).normalize();
    
    console.log('[getMoonPhase] 固定月球系统月相计算:', {
      localISO,
      utc: utc.toISOString(),
      elongationDeg: elongationDeg.toFixed(1),
      sunLon_deg: (sunLon * 180 / Math.PI).toFixed(1),
      moonLon_deg: (moonLon * 180 / Math.PI).toFixed(1),
      phaseLon_deg: (phaseLon * 180 / Math.PI).toFixed(1),
      positionAngle_deg: (positionAngle * 180 / Math.PI).toFixed(1),
      renderSunDirection: renderSunDirection.toArray().map(x => x.toFixed(3)),
      illumination: illumination.toFixed(3),
      gamma_deg: (gamma * 180 / Math.PI).toFixed(1),
      cyclePosition: `${((phaseLon * 180 / Math.PI) / 360 * 100).toFixed(1)}% through cycle`
    });
    
    return { 
      illumination, 
      phaseAngleRad: gamma, // 太阳-月球夹角，用于亮度
      sunDirection: renderSunDirection, // 用于固定屏幕坐标系的渲染方向
      moonDirection,
      positionAngle
    };
  } catch (err) {
    console.error('[getMoonPhase] failed:', err);
    // 默认返回上弦月状态
    return { 
      illumination: 0.5, 
      phaseAngleRad: Math.PI / 2,
      sunDirection: new THREE.Vector3(1, 0, 0),
      moonDirection: new THREE.Vector3(0, 0, 1),
      positionAngle: Math.PI / 2
    };
  }
}

