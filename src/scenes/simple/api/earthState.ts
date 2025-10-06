import { computeEphemeris, toUTCFromLocal } from '../../../astro/ephemeris';

export type EarthState = {
  sunDirWorld: { x: number; y: number; z: number }; // 世界坐标系太阳方向
  moonDirWorld: { x: number; y: number; z: number }; // 世界坐标系月球方向
  illumination: number; // 月面明暗比例
  // 天文角度信息（用于验证和UI显示）
  altDeg: number;   // 太阳高度角
  azDeg: number;    // 太阳方位角
};

// 根据本地时间字符串与经纬度，计算地球相关的世界系状态
// localISO 例如 '2000-01-01T12:00'
export type TimeInterpretation = 'byLongitude' | 'bySystem';

// 根据时间解释模式计算天文状态
export function getEarthState(
  localISO: string,
  latDeg: number,
  lonDeg: number,
  timeMode: TimeInterpretation = 'byLongitude'
): EarthState {
  try {
    const utc = timeMode === 'byLongitude'
      ? toUTCFromLocal(localISO, lonDeg)
      : new Date(localISO); // 直接按系统本地时间解释
    const eph = computeEphemeris(utc, latDeg, lonDeg);
    return {
      sunDirWorld: eph.sunWorld,
      moonDirWorld: eph.moonWorld,
      illumination: eph.illumination,
      altDeg: eph.altDeg,
      azDeg: eph.azDeg
    };
  } catch (err) {
    console.error('[getEarthState] failed:', err);
    // 兜底返回
    return {
      sunDirWorld: { x: 1, y: 0, z: 0 },
      moonDirWorld: { x: -1, y: 0, z: 0 },
      illumination: 0.5,
      altDeg: 0,
      azDeg: 0
    };
  }
}


