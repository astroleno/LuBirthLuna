import * as THREE from 'three';

/**
 * 月相计算结果接口
 */
export interface MoonPhaseResult {
  sunDirection: THREE.Vector3;    // 太阳方向向量
  moonRotation: number;           // 月球自转角度
  phaseAngle: number;             // 月相角度
  illumination: number;           // 照明比例 (0-1)
  phaseName: string;              // 月相名称
}

/**
 * 月相名称枚举
 */
const MOON_PHASES = [
  { name: '新月', minAngle: 0, maxAngle: 22.5 },
  { name: '蛾眉月', minAngle: 22.5, maxAngle: 67.5 },
  { name: '上弦月', minAngle: 67.5, maxAngle: 112.5 },
  { name: '盈凸月', minAngle: 112.5, maxAngle: 157.5 },
  { name: '满月', minAngle: 157.5, maxAngle: 202.5 },
  { name: '亏凸月', minAngle: 202.5, maxAngle: 247.5 },
  { name: '下弦月', minAngle: 247.5, maxAngle: 292.5 },
  { name: '残月', minAngle: 292.5, maxAngle: 337.5 },
  { name: '新月', minAngle: 337.5, maxAngle: 360 }
];

/**
 * 计算月相信息
 * @param date 日期时间
 * @param observerLat 观察者纬度
 * @param observerLon 观察者经度
 * @returns 月相计算结果
 */
export function calculateMoonPhase(
  date: Date,
  observerLat: number,
  observerLon: number
): MoonPhaseResult {
  // 直接使用传入的 Date。getUTC* 会基于该绝对时刻计算，无需再次时区修正。
  const utcDate = date;
  
  // 计算儒略日
  const julianDay = getJulianDay(utcDate);
  
  // 计算月龄（从新月开始的天数）
  const moonAge = calculateMoonAge(julianDay);
  
  // 计算月相角度（0-360度）
  const phaseAngle = (moonAge * 360 / 29.53) % 360;
  
  // 计算照明比例
  const illumination = calculateIllumination(phaseAngle);
  
  // 计算月球自转角度（基于时间）
  const moonRotation = calculateMoonRotation(utcDate);
  
  // 计算太阳方向（基于月球的视角，避免同一天内巨大变化）
  const sunDirection = calculateSunDirectionForMoon(utcDate);
  
  // 获取月相名称
  const phaseName = getMoonPhaseName(phaseAngle);
  
  return {
    sunDirection,
    moonRotation,
    phaseAngle,
    illumination,
    phaseName
  };
}

/**
 * 计算儒略日
 */
function getJulianDay(date: Date): number {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const second = date.getUTCSeconds();
  
  // 简化的儒略日计算
  let a = Math.floor((14 - month) / 12);
  let y = year + 4800 - a;
  let m = month + 12 * a - 3;
  
  // 对于格里高利历
  const jd = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  
  // 加上时间部分
  const timeFraction = (hour + minute / 60 + second / 3600) / 24;
  
  return jd + timeFraction - 0.5;
}

/**
 * 计算月龄（从新月开始的天数）
 */
function calculateMoonAge(julianDay: number): number {
  // 已知新月参考点（2000年1月6日18:14 UTC）
  const newMoonJD = 2451549.259722;
  
  // 平均朔望月周期：29.530588853天
  const synodicMonth = 29.530588853;
  
  // 计算从参考新月开始经过的时间
  const daysSinceNewMoon = julianDay - newMoonJD;
  
  // 计算当前月龄
  const moonAge = daysSinceNewMoon % synodicMonth;
  
  return moonAge < 0 ? moonAge + synodicMonth : moonAge;
}

/**
 * 计算照明比例
 */
function calculateIllumination(phaseAngle: number): number {
  // 将角度转换为弧度
  // 对于月相，0°=新月，180°=满月，所以需要调整角度
  // 照明比例应该基于太阳-地球-月球的夹角，而不是月相角度
  const elongationAngle = (180 - phaseAngle) * Math.PI / 180;
  
  // 使用余弦函数计算照明比例
  const illumination = (1 + Math.cos(elongationAngle)) / 2;
  
  return Math.max(0, Math.min(1, illumination));
}

/**
 * 计算月球自转角度
 */
function calculateMoonRotation(date: Date): number {
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const dayOfYear = getDayOfYear(date);
  
  // 月球自转：每天约13.2度（360度/27.3天）
  const dailyRotation = (dayOfYear % 27.3) * 13.2;
  // 加上当天的时间影响：每小时0.55度（13.2度/24小时）
  const hourlyRotation = hours * 0.55 + minutes * 0.0092;
  
  return (dailyRotation + hourlyRotation) * Math.PI / 180;
}

/**
 * 计算月相的太阳方向（面对相机的潮汐锁定模式）
 * 在潮汐锁定模式下，月球的前向轴(+Z)始终指向相机/观察者
 * 着色器需要的是从光源指向表面的方向
 */
function calculateSunDirectionForMoon(date: Date): THREE.Vector3 {
  const moonAge = calculateMoonAge(getJulianDay(date));
  const phaseAngle = (moonAge * 360 / 29.53) % 360; // 月相角度
  
  // 基于月相角度直接计算太阳方向
  // 注意：着色器期望的是从光源指向表面的方向
  const phaseRad = phaseAngle * Math.PI / 180;
  
  // 面向相机的简化几何：
  // 设相机视线为 +Y（前向），当：
  // - 新月(0°)：太阳与相机在同侧，光应来自相机背后方向（-Y），近面应最暗
  // - 满月(180°)：太阳与相机在相对侧，光从相机方向（+Y）而来，近面最亮
  // - 上弦(90°)/下弦(270°)：光从左右两侧来（±X）
  // 因此取：Y 分量 = -cos(phaseRad)，X 分量 = sin(phaseRad)，Z 分量为 0（避免上下半部误判）
  const sunDirX = Math.sin(phaseRad);
  const sunDirY = -Math.cos(phaseRad);
  const sunDirZ = 0;
  
  return new THREE.Vector3(sunDirX, sunDirY, sunDirZ).normalize();
}

/**
 * 获取一年中的第几天
 */
function getDayOfYear(date: Date): number {
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * 获取月相名称
 */
function getMoonPhaseName(phaseAngle: number): string {
  const phase = MOON_PHASES.find(p => phaseAngle >= p.minAngle && phaseAngle < p.maxAngle);
  return phase?.name || '未知';
}

/**
 * 格式化月相信息用于显示
 */
export function formatMoonPhaseInfo(result: MoonPhaseResult): string {
  return `${result.phaseName} (${result.phaseAngle.toFixed(1)}°)`;
}

/**
 * 获取月相描述
 */
export function getMoonPhaseDescription(result: MoonPhaseResult): string {
  const descriptions = {
    '新月': '月球位于地球和太阳之间，完全看不到月球',
    '蛾眉月': '月球开始显现，呈现细弯钩状',
    '上弦月': '月球右半边被照亮，呈半圆形',
    '盈凸月': '月球大部分被照亮，向满月过渡',
    '满月': '月球完全被太阳照亮，呈现完整的圆形',
    '亏凸月': '月球开始变暗，从满月向新月过渡',
    '下弦月': '月球左半边被照亮，呈半圆形',
    '残月': '月球即将消失，呈现细弯钩状'
  };
  
  return descriptions[result.phaseName as keyof typeof descriptions] || '';
}
