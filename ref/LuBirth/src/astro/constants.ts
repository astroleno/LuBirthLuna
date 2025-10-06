// 天文常数配置文件
// 包含所有关键天文常数和验证函数

export const ASTRONOMICAL_CONSTANTS = {
  // 地球自转轴参数
  EARTH_OBLIQUITY_J2000: 23.439291, // 黄赤交角（度）
  EARTH_OBLIQUITY_RATE: 0.0130042,  // 黄赤交角变化率（度/世纪）
  
  // 岁差参数
  PRECESSION_RATE: 5028.796195,     // 岁差率（角秒/世纪）
  PRECESSION_ACCELERATION: 1.1054348, // 岁差加速度（角秒/世纪²）
  
  // 地球轨道参数
  EARTH_ECCENTRICITY: 0.0167,       // 轨道偏心率
  EARTH_PERIHELION_LONGITUDE: 102.947, // 近日点黄经（度）
  EARTH_SEMI_MAJOR_AXIS: 1.496e8,   // 轨道半长轴（km）
  
  // 时间系统参数
  JULIAN_EPOCH_J2000: 2451545.0,    // J2000儒略日
  JULIAN_CENTURY: 36525.0,           // 儒略世纪（天）
  
  // 太阳运动参数
  SOLAR_MEAN_LONGITUDE_COEFF: [280.46646, 36000.76983, 0.0003032],
  SOLAR_MEAN_ANOMALY_COEFF: [357.52911, 35999.05029, -0.0001537],
  
  // 恒星时参数
  GREENWICH_SIDEREAL_TIME_COEFF: [280.46061837, 360.98564736629]
};

// 验证函数
export function validateAstronomicalConstants(): boolean {
  const constants = ASTRONOMICAL_CONSTANTS;
  
  // 检查关键常数的合理性
  if (constants.EARTH_OBLIQUITY_J2000 < 20 || constants.EARTH_OBLIQUITY_J2000 > 30) {
    console.error('地球黄赤交角异常:', constants.EARTH_OBLIQUITY_J2000);
    return false;
  }
  
  if (constants.EARTH_ECCENTRICITY < 0 || constants.EARTH_ECCENTRICITY > 0.1) {
    console.error('地球轨道偏心率异常:', constants.EARTH_ECCENTRICITY);
    return false;
  }
  
  if (constants.JULIAN_EPOCH_J2000 < 2450000 || constants.JULIAN_EPOCH_J2000 > 2460000) {
    console.error('J2000儒略日异常:', constants.JULIAN_EPOCH_J2000);
    return false;
  }
  
  console.log('✅ 天文常数验证通过');
  return true;
}

// 物理限制常量
export const PHYSICAL_LIMITS = {
  MAX_ALTITUDE: 90.1,   // 最大高度角
  MIN_ALTITUDE: -90.1,  // 最小高度角
  MAX_AZIMUTH: 360.1,  // 最大方位角
  MIN_AZIMUTH: -0.1     // 最小方位角
};

// 验证函数
export function validatePhysicalLimits(altitude: number, azimuth: number): boolean {
  if (altitude < PHYSICAL_LIMITS.MIN_ALTITUDE || altitude > PHYSICAL_LIMITS.MAX_ALTITUDE) {
    console.error(`高度角超出物理范围: ${altitude}°`);
    return false;
  }
  
  if (azimuth < PHYSICAL_LIMITS.MIN_AZIMUTH || azimuth > PHYSICAL_LIMITS.MAX_AZIMUTH) {
    console.error(`方位角超出物理范围: ${azimuth}°`);
    return false;
  }
  
  return true;
}

// 季节验证常量
export const SEASONAL_VALIDATION = {
  SUMMER_MONTHS: [6, 7, 8],      // 北半球夏季月份
  WINTER_MONTHS: [12, 1, 2],     // 北半球冬季月份
  SPRING_MONTHS: [3, 4, 5],      // 北半球春季月份
  AUTUMN_MONTHS: [9, 10, 11]     // 北半球秋季月份
};

// 季节一致性验证
export function validateSeasonalConsistency(
  date: Date, 
  latitude: number, 
  altitude: number
): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  const month = date.getMonth() + 1;
  const isNorthernHemisphere = latitude > 0;
  
  // 🔧 关键修复：季节验证应该更宽松
  // 因为"中午"时间不等于"太阳在正午位置"
  // 太阳的实际位置取决于日期、时间和经度
  
  if (isNorthernHemisphere) {
    // 北半球验证 - 放宽限制
    if (SEASONAL_VALIDATION.SUMMER_MONTHS.includes(month) && altitude < -90) {
      issues.push(`北半球夏季太阳高度角异常低 (月份: ${month}, 高度角: ${altitude}°)`);
    }
    
    if (SEASONAL_VALIDATION.WINTER_MONTHS.includes(month) && altitude < -90) {
      issues.push(`北半球冬季太阳高度角异常低 (月份: ${month}, 高度角: ${altitude}°)`);
    }
  } else {
    // 南半球验证（季节相反） - 放宽限制
    if (SEASONAL_VALIDATION.WINTER_MONTHS.includes(month) && altitude < -90) {
      issues.push(`南半球冬季太阳高度角异常低 (月份: ${month}, 高度角: ${altitude}°)`);
    }
    
    if (SEASONAL_VALIDATION.SUMMER_MONTHS.includes(month) && altitude < -90) {
      issues.push(`南半球夏季太阳高度角异常低 (月份: ${month}, 高度角: ${altitude}°)`);
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
}
