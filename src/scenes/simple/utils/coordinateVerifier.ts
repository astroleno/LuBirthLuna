import * as THREE from 'three';
import { calculateBirthPointLocalFrame, calculateCameraOrientationForBirthPoint } from './birthPointAlignment';

/**
 * 坐标验证机制 - 确保出生点对齐的准确性
 * 提供统一的坐标系验证和测试框架
 */
export class CoordinateVerifier {
  
  /**
   * 验证出生点坐标映射准确性
   */
  static verifyBirthPointMapping(lonDeg: number, latDeg: number): {
    isValid: boolean;
    errors: string[];
    worldCoord: THREE.Vector3;
    expectedRegion: string;
    actualRegion: string;
  } {
    const errors: string[] = [];
    
    // 计算世界坐标
    const { p: worldCoord } = calculateBirthPointLocalFrame(lonDeg, latDeg);
    
    // 预期区域判断
    const expectedRegion = this.getExpectedRegion(lonDeg, latDeg);
    
    // 实际坐标对应的区域
    const actualRegion = this.getRegionFromWorldCoord(worldCoord);
    
    // 验证坐标范围
    if (Math.abs(worldCoord.length() - 1.0) > 0.001) {
      errors.push(`世界坐标不是单位向量: ${worldCoord.length().toFixed(4)}`);
    }
    
    // 验证Y轴（纬度）映射
    const expectedY = Math.sin(THREE.MathUtils.degToRad(latDeg));
    if (Math.abs(worldCoord.y - expectedY) > 0.001) {
      errors.push(`Y轴纬度映射错误: 期望 ${expectedY.toFixed(4)}, 实际 ${worldCoord.y.toFixed(4)}`);
    }
    
    // 验证区域匹配
    if (expectedRegion !== actualRegion) {
      errors.push(`区域映射错误: 期望 ${expectedRegion}, 实际 ${actualRegion}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      worldCoord,
      expectedRegion,
      actualRegion
    };
  }
  
  /**
   * 验证相机对齐结果
   */
  static verifyCameraAlignment(lonDeg: number, latDeg: number, cameraDistance: number = 15): {
    isValid: boolean;
    errors: string[];
    cameraYaw: number;
    cameraPitch: number;
    birthPointScreenPos: THREE.Vector2;
  } {
    const errors: string[] = [];
    
    // 计算相机朝向 (没有scene参数时使用原始坐标)
    const orientation = calculateCameraOrientationForBirthPoint({
      longitudeDeg: lonDeg,
      latitudeDeg: latDeg,
      alphaDeg: 10 // 默认抬升角
    }); // 不传scene参数，使用原始坐标进行验证
    
    // 验证相机角度范围
    if (Math.abs(orientation.yaw) > 180) {
      errors.push(`Yaw角度超出范围: ${orientation.yaw.toFixed(2)}°`);
    }
    
    if (Math.abs(orientation.pitch) > 90) {
      errors.push(`Pitch角度超出范围: ${orientation.pitch.toFixed(2)}°`);
    }
    
    // 模拟屏幕投影验证
    const birthPointScreenPos = this.projectBirthPointToScreen(lonDeg, latDeg, orientation, cameraDistance);
    
    // 验证出生点是否在屏幕中心附近
    const centerX = 0.5, centerY = 0.4; // 稍微偏上的位置
    const tolerance = 0.15;
    
    if (Math.abs(birthPointScreenPos.x - centerX) > tolerance) {
      errors.push(`出生点X位置偏离中心: ${birthPointScreenPos.x.toFixed(3)} vs ${centerX}`);
    }
    
    if (Math.abs(birthPointScreenPos.y - centerY) > tolerance) {
      errors.push(`出生点Y位置偏离目标: ${birthPointScreenPos.y.toFixed(3)} vs ${centerY}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      cameraYaw: orientation.yaw,
      cameraPitch: orientation.pitch,
      birthPointScreenPos
    };
  }
  
  /**
   * 批量验证知名地点
   */
  static verifyKnownLocations(): {
    totalTests: number;
    passedTests: number;
    results: Array<{
      name: string;
      location: { lon: number; lat: number };
      mappingValid: boolean;
      alignmentValid: boolean;
      errors: string[];
    }>;
  } {
    const knownLocations = [
      { name: '上海', lon: 121.47, lat: 31.23 },
      { name: '北京', lon: 116.41, lat: 39.90 },
      { name: '纽约', lon: -74.01, lat: 40.71 },
      { name: '伦敦', lon: -0.13, lat: 51.51 },
      { name: '东京', lon: 139.69, lat: 35.69 },
      { name: '悉尼', lon: 151.21, lat: -33.87 },
      { name: '本初子午线', lon: 0, lat: 0 },
      { name: '国际日期变更线', lon: 180, lat: 0 }
    ];
    
    const results = knownLocations.map(location => {
      const mappingResult = this.verifyBirthPointMapping(location.lon, location.lat);
      const alignmentResult = this.verifyCameraAlignment(location.lon, location.lat);
      
      return {
        name: location.name,
        location,
        mappingValid: mappingResult.isValid,
        alignmentValid: alignmentResult.isValid,
        errors: [...mappingResult.errors, ...alignmentResult.errors]
      };
    });
    
    const passedTests = results.filter(r => r.mappingValid && r.alignmentValid).length;
    
    return {
      totalTests: results.length,
      passedTests,
      results
    };
  }
  
  /**
   * 根据经纬度获取期望的区域名称
   */
  private static getExpectedRegion(lonDeg: number, latDeg: number): string {
    // 简化的区域映射
    if (lonDeg >= 100 && lonDeg <= 140 && latDeg >= 20 && latDeg <= 50) {
      return '东亚'; // 中国、日本、韩国
    } else if (lonDeg >= -100 && lonDeg <= -70 && latDeg >= 25 && latDeg <= 45) {
      return '北美东部'; // 美国东海岸
    } else if (lonDeg >= -10 && lonDeg <= 20 && latDeg >= 35 && latDeg <= 60) {
      return '西欧'; // 西欧
    } else if (lonDeg >= 140 && lonDeg <= 180 && latDeg >= -40 && latDeg <= -30) {
      return '澳洲'; // 澳大利亚东部
    } else if (Math.abs(lonDeg) < 10 && Math.abs(latDeg) < 10) {
      return '赤道非洲'; // 几内亚湾附近
    } else if (Math.abs(lonDeg - 180) < 10 || Math.abs(lonDeg + 180) < 10) {
      return '太平洋'; // 国际日期变更线
    } else {
      return '其他地区';
    }
  }
  
  /**
   * 根据世界坐标推断对应的地理区域
   */
  private static getRegionFromWorldCoord(worldCoord: THREE.Vector3): string {
    // 根据世界坐标的XZ分量判断经度方向，Y分量判断纬度
    const lonRad = Math.atan2(worldCoord.x, worldCoord.z);
    const latRad = Math.asin(THREE.MathUtils.clamp(worldCoord.y, -1, 1));
    
    const lonDeg = THREE.MathUtils.radToDeg(lonRad);
    const latDeg = THREE.MathUtils.radToDeg(latRad);
    
    return this.getExpectedRegion(lonDeg, latDeg);
  }
  
  /**
   * 模拟出生点在屏幕上的投影位置
   */
  private static projectBirthPointToScreen(
    lonDeg: number, 
    latDeg: number, 
    cameraOrientation: { yaw: number; pitch: number; roll: number },
    cameraDistance: number
  ): THREE.Vector2 {
    // 获取出生点世界坐标
    const { p: birthPoint } = calculateBirthPointLocalFrame(lonDeg, latDeg);
    
    // 创建相机变换矩阵
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 0, cameraDistance);
    
    // 应用相机旋转
    const euler = new THREE.Euler(
      THREE.MathUtils.degToRad(cameraOrientation.pitch),
      THREE.MathUtils.degToRad(cameraOrientation.yaw),
      THREE.MathUtils.degToRad(cameraOrientation.roll),
      'YXZ'
    );
    camera.setRotationFromEuler(euler);
    camera.updateMatrixWorld();
    
    // 投影到屏幕坐标
    const screenPoint = birthPoint.clone().project(camera);
    
    // 转换为标准化屏幕坐标 (0-1)
    return new THREE.Vector2(
      (screenPoint.x + 1) * 0.5,
      (1 - screenPoint.y) * 0.5  // Y轴翻转，0=顶部
    );
  }
  
  /**
   * 运行完整的坐标验证测试套件
   */
  static runFullVerification(): void {
    console.group('🔍 坐标验证测试套件');
    
    // 1. 批量验证知名地点
    const locationTests = this.verifyKnownLocations();
    console.log(`📍 地点测试: ${locationTests.passedTests}/${locationTests.totalTests} 通过`);
    
    locationTests.results.forEach(result => {
      const status = result.mappingValid && result.alignmentValid ? '✅' : '❌';
      console.log(`  ${status} ${result.name} (${result.location.lon}°, ${result.location.lat}°)`);
      
      if (result.errors.length > 0) {
        result.errors.forEach(error => console.warn(`    ⚠️ ${error}`));
      }
    });
    
    // 2. 单独验证上海（关键测试用例）
    console.group('🎯 上海关键验证');
    const shanghaiMapping = this.verifyBirthPointMapping(121.47, 31.23);
    const shanghaiAlignment = this.verifyCameraAlignment(121.47, 31.23);
    
    console.log('映射验证:', shanghaiMapping.isValid ? '✅' : '❌');
    console.log('对齐验证:', shanghaiAlignment.isValid ? '✅' : '❌');
    
    if (!shanghaiMapping.isValid) {
      shanghaiMapping.errors.forEach(error => console.warn(`  映射问题: ${error}`));
    }
    
    if (!shanghaiAlignment.isValid) {
      shanghaiAlignment.errors.forEach(error => console.warn(`  对齐问题: ${error}`));
    }
    
    console.log('世界坐标:', {
      x: +shanghaiMapping.worldCoord.x.toFixed(4),
      y: +shanghaiMapping.worldCoord.y.toFixed(4),
      z: +shanghaiMapping.worldCoord.z.toFixed(4)
    });
    
    console.log('相机参数:', {
      yaw: shanghaiAlignment.cameraYaw.toFixed(2) + '°',
      pitch: shanghaiAlignment.cameraPitch.toFixed(2) + '°'
    });
    
    console.log('屏幕位置:', {
      x: shanghaiAlignment.birthPointScreenPos.x.toFixed(3),
      y: shanghaiAlignment.birthPointScreenPos.y.toFixed(3)
    });
    
    console.groupEnd();
    
    // 3. 总体结果
    const overallScore = locationTests.passedTests / locationTests.totalTests;
    const status = overallScore >= 0.8 ? '🎉 优秀' : overallScore >= 0.6 ? '⚠️ 良好' : '❌ 需改进';
    
    console.log(`\n📊 总体验证结果: ${status} (${(overallScore * 100).toFixed(1)}%)`);
    
    console.groupEnd();
  }
}