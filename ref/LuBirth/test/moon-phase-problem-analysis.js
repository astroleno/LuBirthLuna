/**
 * 月相问题自动测试脚本
 * 测试三个可能的原因：phase_angle定义、正交基坐标系、太阳方向计算公式
 */

import { create } from 'domain';
import * as THREE from 'three';

// 模拟astronomy-engine库的phase_angle计算
function mockAstronomyEnginePhaseAngle(date) {
  // 模拟astronomy-engine的phase_angle定义：0≈满月，~180≈新月
  const startDate = new Date('2024-01-01T00:00:00Z');
  const daysDiff = (date - startDate) / (24 * 60 * 60 * 1000);
  const lunarCycle = 29.53;
  const phase = (daysDiff % lunarCycle) / lunarCycle;
  
  // astronomy-engine定义：0=满月，180=新月
  return phase * 180; // 返回0-180度
}

// 模拟现有的月相计算
function mockCalculateMoonPhase(date) {
  const phaseAngleDeg = mockAstronomyEnginePhaseAngle(date);
  const phaseAngleRad = phaseAngleDeg * Math.PI / 180;
  
  return {
    phaseAngleDeg,
    phaseAngleRad,
    phaseName: getPhaseName(phaseAngleDeg)
  };
}

function getPhaseName(angle) {
  if (angle < 22.5) return '满月';
  else if (angle < 67.5) return '亏凸月';
  else if (angle < 112.5) return '下弦月';
  else if (angle < 157.5) return '残月';
  else if (angle < 202.5) return '新月';
  else if (angle < 247.5) return '蛾眉月';
  else if (angle < 292.5) return '上弦月';
  else return '盈凸月';
}

// ========== 测试1：astronomy-engine库的phase_angle定义问题 ==========
function testPhaseAngleDefinition() {
  console.log('=== 测试1：astronomy-engine库的phase_angle定义问题 ===\n');
  
  console.log('astronomy-engine的phase_angle定义：');
  console.log('- 0° = 满月');
  console.log('- 180° = 新月');
  console.log('- 只在0-180度范围内变化，而不是0-360度\n');
  
  const startDate = new Date('2024-01-01T00:00:00Z');
  
  for (let day = 0; day < 30; day++) {
    const testDate = new Date(startDate.getTime() + day * 24 * 60 * 60 * 1000);
    const result = mockCalculateMoonPhase(testDate);
    
    console.log(`第${day}天: ${result.phaseAngleDeg.toFixed(1)}° (${result.phaseName})`);
    
    // 分析问题
    if (result.phaseAngleDeg < 90) {
      console.log(`  状态：满月到亏凸月 (只显示左侧?)`);
    } else if (result.phaseAngleDeg < 180) {
      console.log(`  状态：下弦月到新月 (只显示左侧?)`);
    }
  }
  
  console.log('\n⚠️  问题分析：');
  console.log('1. phase_angle只在0-180度变化，而不是完整的0-360度');
  console.log('2. 这可能导致月相只显示一半的变化周期');
  console.log('3. 需要检查实际代码中是否也有这个限制\n');
}

// ========== 测试2：正交基构建的坐标系问题 ==========
function testOrthogonalBasis() {
  console.log('=== 测试2：正交基构建的坐标系问题 ===\n');
  
  // 模拟相机的位置和月球的
  const cameraPosition = new THREE.Vector3(0, 0, 15);
  const moonPosition = new THREE.Vector3(0, 5, 0);
  
  console.log('相机位置:', cameraPosition.toArray());
  console.log('月球位置:', moonPosition.toArray());
  
  // 构建正交基（复制现有代码逻辑）
  const F = new THREE.Vector3().subVectors(cameraPosition, moonPosition).normalize();
  const camUp = new THREE.Vector3(0, 1, 0);
  const Uprime = camUp.clone().sub(F.clone().multiplyScalar(camUp.dot(F)));
  let U = Uprime.lengthSq() > 1e-6 ? Uprime.normalize() : new THREE.Vector3(0, 1, 0);
  const R = new THREE.Vector3().crossVectors(F, U).normalize();
  U = new THREE.Vector3().crossVectors(R, F).normalize();
  
  console.log('\n构建的正交基：');
  console.log('F (前向):', F.toArray());
  console.log('R (右向):', R.toArray());
  console.log('U (上向):', U.toArray());
  
  // 验证正交性
  console.log('\n正交性验证：');
  console.log('F·R =', F.dot(R).toFixed(6), ' (应该≈0)');
  console.log('F·U =', F.dot(U).toFixed(6), ' (应该≈0)');
  console.log('R·U =', R.dot(U).toFixed(6), ' (应该≈0)');
  
  // 检查坐标系是否为右手系
  const crossRU = new THREE.Vector3().crossVectors(R, U);
  console.log('R×U =', crossRU.toArray(), ' (应该≈F)', crossRU.equals(F) ? '✓' : '✗');
  
  console.log('\n⚠️  问题分析：');
  console.log('1. 如果正交基构建不正确，会影响太阳方向的计算');
  console.log('2. 特别是要检查R和U的方向是否符合预期');
  console.log('3. 月球贴图的朝向可能与这个坐标系不匹配\n');
}

// ========== 测试3：太阳方向计算公式问题 ==========
function testSunDirectionFormula() {
  console.log('=== 测试3：太阳方向计算公式问题 ===\n');
  
  // 测试不同的phase_angle值
  const testAngles = [0, 45, 90, 135, 180]; // 度
  
  // 设置相机和月球位置
  const cameraPosition = new THREE.Vector3(0, 0, 15);
  const moonPosition = new THREE.Vector3(0, 5, 0);
  
  // 构建正交基
  const F = new THREE.Vector3().subVectors(cameraPosition, moonPosition).normalize();
  const camUp = new THREE.Vector3(0, 1, 0);
  const Uprime = camUp.clone().sub(F.clone().multiplyScalar(camUp.dot(F)));
  let U = Uprime.lengthSq() > 1e-6 ? Uprime.normalize() : new THREE.Vector3(0, 1, 0);
  const R = new THREE.Vector3().crossVectors(F, U).normalize();
  U = new THREE.Vector3().crossVectors(R, F).normalize();
  
  console.log('测试公式：S = cos(a)·F + sin(a)·R');
  console.log('其中：a = phase_angle (0=满月, 180=新月)\n');
  
  testAngles.forEach(angleDeg => {
    const angleRad = angleDeg * Math.PI / 180;
    
    // 当前的公式
    const S_current = new THREE.Vector3()
      .add(F.clone().multiplyScalar(Math.cos(angleRad)))
      .add(R.clone().multiplyScalar(Math.sin(angleRad)))
      .normalize();
    
    // 测试 alternative 公式：S = sin(a)·F + cos(a)·R
    const S_alt1 = new THREE.Vector3()
      .add(F.clone().multiplyScalar(Math.sin(angleRad)))
      .add(R.clone().multiplyScalar(Math.cos(angleRad)))
      .normalize();
    
    // 测试 alternative 公式：S = cos(a)·R + sin(a)·F
    const S_alt2 = new THREE.Vector3()
      .add(R.clone().multiplyScalar(Math.cos(angleRad)))
      .add(F.clone().multiplyScalar(Math.sin(angleRad)))
      .normalize();
    
    console.log(`${angleDeg}° (${getPhaseName(angleDeg)}):`);
    console.log(`  当前公式: (${S_current.x.toFixed(3)}, ${S_current.y.toFixed(3)}, ${S_current.z.toFixed(3)})`);
    console.log(`  替代公式1: (${S_alt1.x.toFixed(3)}, ${S_alt1.y.toFixed(3)}, ${S_alt1.z.toFixed(3)})`);
    console.log(`  替代公式2: (${S_alt2.x.toFixed(3)}, ${S_alt2.y.toFixed(3)}, ${S_alt2.z.toFixed(3)})`);
    
    // 分析太阳方向的视觉效果
    analyzeSunDirection(S_current, angleDeg, '当前公式');
    analyzeSunDirection(S_alt1, angleDeg, '替代公式1');
    analyzeSunDirection(S_alt2, angleDeg, '替代公式2');
    console.log('');
  });
}

function analyzeSunDirection(sunDir, angleDeg, formulaName) {
  const moonToCamera = new THREE.Vector3(0, 0, -1); // 假设相机看向-Z
  const dot = sunDir.dot(moonToCamera);
  
  if (dot > 0.8) {
    console.log(`    ${formulaName}: 太阳从相机方向照射 (应该明亮)`);
  } else if (dot < -0.8) {
    console.log(`    ${formulaName}: 太阳从相机背后照射 (应该黑暗)`);
  } else if (sunDir.x > 0.5) {
    console.log(`    ${formulaName}: 太阳从右侧照射`);
  } else if (sunDir.x < -0.5) {
    console.log(`    ${formulaName}: 太阳从左侧照射`);
  } else {
    console.log(`    ${formulaName}: 太阳从其他方向照射`);
  }
}

// ========== 综合分析 ==========
function comprehensiveAnalysis() {
  console.log('=== 综合分析 ===\n');
  
  console.log('基于以上测试，最可能的问题原因：');
  console.log('');
  
  console.log('🔍 原因1：phase_angle定义问题');
  console.log('   - astronomy-engine的phase_angle只在0-180度变化');
  console.log('   - 这可能导致月相只显示半个周期');
  console.log('   - 影响：中等');
  console.log('');
  
  console.log('🔍 原因2：正交基构建问题');
  console.log('   - F、R、U的构建顺序可能影响坐标系');
  console.log('   - 月球贴图朝向可能与坐标系不匹配');
  console.log('   - 影响：高');
  console.log('');
  
  console.log('🔍 原因3：太阳方向计算公式问题');
  console.log('   - 当前公式 S = cos(a)·F + sin(a)·R 可能不正确');
  console.log('   - cos和sin的分配可能需要调整');
  console.log('   - 影响：很高');
  console.log('');
  
  console.log('💡 建议的修复顺序：');
  console.log('1. 首先测试替代的太阳方向计算公式');
  console.log('2. 检查月球几何体的初始朝向');
  console.log('3. 验证phase_angle的完整周期');
  console.log('4. 调整正交基构建顺序');
}

// 运行所有测试
function runAllTests() {
  testPhaseAngleDefinition();
  console.log('\n' + '='.repeat(60) + '\n');
  
  testOrthogonalBasis();
  console.log('\n' + '='.repeat(60) + '\n');
  
  testSunDirectionFormula();
  console.log('\n' + '='.repeat(60) + '\n');
  
  comprehensiveAnalysis();
}

// 如果直接运行此脚本
if (typeof window === 'undefined') {
  runAllTests();
} else {
  window.moonPhaseTests = {
    runAllTests,
    testPhaseAngleDefinition,
    testOrthogonalBasis,
    testSunDirectionFormula,
    comprehensiveAnalysis
  };
  
  console.log('月相问题测试工具已加载到 window.moonPhaseTests');
  console.log('在浏览器控制台运行: moonPhaseTests.runAllTests()');
}

export { runAllTests, testPhaseAngleDefinition, testOrthogonalBasis, testSunDirectionFormula };