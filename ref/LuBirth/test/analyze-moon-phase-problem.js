/**
 * 详细分析月相问题：为什么现在是"右-满-右"模式
 */

import * as THREE from 'three';

// 重新分析月相问题
function analyzeCurrentMoonPhaseProblem() {
  console.log('=== 分析当前月相问题：右-满-右模式 ===\n');
  
  // 使用实际项目中的相同配置
  const cameraPosition = new THREE.Vector3(0, 0, 15);
  const moonPosition = new THREE.Vector3(0, 5, 0);
  
  console.log('实际配置：');
  console.log('相机位置:', cameraPosition.toArray());
  console.log('月球位置:', moonPosition.toArray());
  
  // 构建正交基（当前代码）
  const F = new THREE.Vector3().subVectors(cameraPosition, moonPosition).normalize();
  const camUp = new THREE.Vector3(0, 1, 0);
  const Uprime = camUp.clone().sub(F.clone().multiplyScalar(camUp.dot(F)));
  let U = Uprime.lengthSq() > 1e-6 ? Uprime.normalize() : new THREE.Vector3(0, 1, 0);
  const R = new THREE.Vector3().crossVectors(U, F).normalize(); // 当前修复版本
  U = new THREE.Vector3().crossVectors(F, R).normalize();
  
  console.log('\n当前正交基：');
  console.log('F (前向):', F.toArray());
  console.log('R (右向):', R.toArray());
  console.log('U (上向):', U.toArray());
  
  // 验证坐标系
  console.log('\n坐标系验证：');
  console.log('F·R =', F.dot(R).toFixed(6));
  console.log('F·U =', F.dot(U).toFixed(6));
  console.log('R·U =', R.dot(U).toFixed(6));
  
  // 关键问题：分析astronomy-engine的phase_angle定义
  console.log('\n=== 关键问题分析：astronomy-engine的phase_angle定义 ===');
  console.log('astronomy-engine的phase_angle定义：');
  console.log('- 0° = 满月（太阳在地球背后，月球完全被照亮）');
  console.log('- 180° = 新月（太阳在地球和月球之间，月球背面被照亮）');
  console.log('- 这个定义是合理的，但需要正确的坐标系配合\n');
  
  // 测试不同的phase_angle值
  console.log('=== 测试不同phase_angle的太阳方向 ===');
  
  const testAngles = [0, 45, 90, 135, 180];
  
  testAngles.forEach(angle => {
    const angleRad = angle * Math.PI / 180;
    
    // 当前使用的公式：S = sin(a)·R + cos(a)·F
    const S_current = new THREE.Vector3()
      .add(R.clone().multiplyScalar(Math.sin(angleRad)))
      .add(F.clone().multiplyScalar(Math.cos(angleRad)))
      .normalize();
    
    // 测试原始公式：S = cos(a)·F + sin(a)·R
    const S_original = new THREE.Vector3()
      .add(F.clone().multiplyScalar(Math.cos(angleRad)))
      .add(R.clone().multiplyScalar(Math.sin(angleRad)))
      .normalize();
    
    // 测试另一种公式：S = -sin(a)·R + cos(a)·F
    const S_alt1 = new THREE.Vector3()
      .add(R.clone().multiplyScalar(-Math.sin(angleRad)))
      .add(F.clone().multiplyScalar(Math.cos(angleRad)))
      .normalize();
    
    // 测试另一种公式：S = sin(a)·R - cos(a)·F
    const S_alt2 = new THREE.Vector3()
      .add(R.clone().multiplyScalar(Math.sin(angleRad)))
      .add(F.clone().multiplyScalar(-Math.cos(angleRad)))
      .normalize();
    
    console.log(`${angle}° (${getPhaseName(angle)}):`);
    console.log(`  当前公式: (${S_current.toArray().map(v => v.toFixed(3)).join(', ')}) - ${getLightingSide(S_current)}`);
    console.log(`  原始公式: (${S_original.toArray().map(v => v.toFixed(3)).join(', ')}) - ${getLightingSide(S_original)}`);
    console.log(`  替代公式1: (${S_alt1.toArray().map(v => v.toFixed(3)).join(', ')}) - ${getLightingSide(S_alt1)}`);
    console.log(`  替代公式2: (${S_alt2.toArray().map(v => v.toFixed(3)).join(', ')}) - ${getLightingSide(S_alt2)}`);
    console.log('');
  });
}

// 深入分析坐标系问题
function analyzeCoordinateSystemIssue() {
  console.log('=== 深入分析坐标系问题 ===\n');
  
  console.log('问题核心：');
  console.log('1. 月球几何体的默认朝向是什么？');
  console.log('2. 相机看向月球的方向是什么？');
  console.log('3. 太阳方向应该如何计算？');
  console.log('');
  
  // 创建测试场景
  const moonGeometry = new THREE.SphereGeometry(1, 32, 32);
  const moonPosition = new THREE.Vector3(0, 0, 0);
  const cameraPosition = new THREE.Vector3(0, 0, 5);
  
  console.log('测试场景配置：');
  console.log('月球位置:', moonPosition.toArray());
  console.log('相机位置:', cameraPosition.toArray());
  console.log('月球默认朝向: +Z轴朝前（朝向相机）');
  console.log('');
  
  // 构建各种可能的正交基
  const F = new THREE.Vector3().subVectors(cameraPosition, moonPosition).normalize();
  const camUp = new THREE.Vector3(0, 1, 0);
  
  // 方法1：U × F = R
  const R1 = new THREE.Vector3().crossVectors(camUp, F).normalize();
  const U1 = new THREE.Vector3().crossVectors(F, R1).normalize();
  
  // 方法2：F × U = R
  const R2 = new THREE.Vector3().crossVectors(F, camUp).normalize();
  const U2 = new THREE.Vector3().crossVectors(R2, F).normalize();
  
  console.log('不同正交基构建方法：');
  console.log('方法1 (U × F = R):');
  console.log(`  R1: [${R1.toArray().join(', ')}] (x=${R1.x.toFixed(3)})`);
  console.log(`  U1: [${U1.toArray().join(', ')}]`);
  console.log('方法2 (F × U = R):');
  console.log(`  R2: [${R2.toArray().join(', ')}] (x=${R2.x.toFixed(3)})`);
  console.log(`  U2: [${U2.toArray().join(', ')}]`);
  console.log('');
  
  // 分析哪个方法更合理
  console.log('分析：');
  console.log('- 方法1的R1.x =', R1.x.toFixed(3), '(正值=右侧，负值=左侧)');
  console.log('- 方法2的R2.x =', R2.x.toFixed(3), '(正值=右侧，负值=左侧)');
  console.log('');
  
  // 测试不同的太阳方向计算公式
  console.log('测试不同公式的效果：');
  const testAngle = 90; // 下弦月，应该从左侧照亮
  
  const angleRad = testAngle * Math.PI / 180;
  
  // 使用方法1
  const S1_method1 = new THREE.Vector3()
    .add(R1.clone().multiplyScalar(Math.sin(angleRad)))
    .add(F.clone().multiplyScalar(Math.cos(angleRad)))
    .normalize();
  
  const S1_method1_alt = new THREE.Vector3()
    .add(R1.clone().multiplyScalar(-Math.sin(angleRad)))
    .add(F.clone().multiplyScalar(Math.cos(angleRad)))
    .normalize();
  
  // 使用方法2
  const S2_method2 = new THREE.Vector3()
    .add(R2.clone().multiplyScalar(Math.sin(angleRad)))
    .add(F.clone().multiplyScalar(Math.cos(angleRad)))
    .normalize();
  
  const S2_method2_alt = new THREE.Vector3()
    .add(R2.clone().multiplyScalar(-Math.sin(angleRad)))
    .add(F.clone().multiplyScalar(Math.cos(angleRad)))
    .normalize();
  
  console.log(`${testAngle}° (${getPhaseName(testAngle)}) 应该从左侧照亮：`);
  console.log(`方法1 + sin公式: ${getLightingSide(S1_method1)} (${S1_method1.toArray().map(v => v.toFixed(3)).join(', ')})`);
  console.log(`方法1 + -sin公式: ${getLightingSide(S1_method1_alt)} (${S1_method1_alt.toArray().map(v => v.toFixed(3)).join(', ')})`);
  console.log(`方法2 + sin公式: ${getLightingSide(S2_method2)} (${S2_method2.toArray().map(v => v.toFixed(3)).join(', ')})`);
  console.log(`方法2 + -sin公式: ${getLightingSide(S2_method2_alt)} (${S2_method2_alt.toArray().map(v => v.toFixed(3)).join(', ')})`);
}

// 找到正确的解决方案
function findCorrectSolution() {
  console.log('\n=== 找到正确的解决方案 ===\n');
  
  console.log('基于以上分析，问题可能是：');
  console.log('1. 正交基构建方法选择错误');
  console.log('2. 太阳方向计算公式与正交基不匹配');
  console.log('3. 需要考虑月球几何体的实际朝向');
  console.log('');
  
  console.log('建议的解决方案：');
  console.log('1. 回到原始的正交基构建方法 (F × U = R)');
  console.log('2. 但使用修正的太阳方向公式 (-sin(a)·R + cos(a)·F)');
  console.log('3. 这样应该能获得正确的左右分布');
  console.log('');
  
  // 测试这个解决方案
  const cameraPosition = new THREE.Vector3(0, 0, 15);
  const moonPosition = new THREE.Vector3(0, 5, 0);
  
  const F = new THREE.Vector3().subVectors(cameraPosition, moonPosition).normalize();
  const camUp = new THREE.Vector3(0, 1, 0);
  const Uprime = camUp.clone().sub(F.clone().multiplyScalar(camUp.dot(F)));
  let U = Uprime.lengthSq() > 1e-6 ? Uprime.normalize() : new THREE.Vector3(0, 1, 0);
  
  // 回到原始方法：F × U = R
  const R = new THREE.Vector3().crossVectors(F, U).normalize();
  U = new THREE.Vector3().crossVectors(R, F).normalize();
  
  console.log('建议的正交基：');
  console.log('F:', F.toArray());
  console.log('R:', R.toArray(), `(x=${R.x.toFixed(3)})`);
  console.log('U:', U.toArray());
  
  console.log('\n测试完整周期：');
  
  let leftCount = 0, rightCount = 0;
  
  for (let angle = 0; angle < 360; angle += 30) {
    const angleRad = angle * Math.PI / 180;
    
    // 使用修正的公式：-sin(a)·R + cos(a)·F
    const S = new THREE.Vector3()
      .add(R.clone().multiplyScalar(-Math.sin(angleRad)))
      .add(F.clone().multiplyScalar(Math.cos(angleRad)))
      .normalize();
    
    const phaseName = getPhaseName(angle);
    const side = getLightingSide(S);
    
    console.log(`${angle}° (${phaseName}): ${side}`);
    
    if (side === '左侧') leftCount++;
    else if (side === '右侧') rightCount++;
  }
  
  console.log('\n结果统计：');
  console.log(`左侧光照: ${leftCount}次`);
  console.log(`右侧光照: ${rightCount}次`);
  
  if (leftCount > 0 && rightCount > 0) {
    console.log('✅ 这个解决方案应该能工作！');
  } else {
    console.log('❌ 这个方案仍然有问题');
  }
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

function getLightingSide(sunDir) {
  if (sunDir.x > 0.3) return '右侧';
  else if (sunDir.x < -0.3) return '左侧';
  else if (sunDir.z > 0.3) return '前方';
  else if (sunDir.z < -0.3) return '后方';
  else return '其他方向';
}

// 运行分析
function runProblemAnalysis() {
  analyzeCurrentMoonPhaseProblem();
  console.log('\n' + '='.repeat(60) + '\n');
  
  analyzeCoordinateSystemIssue();
  console.log('\n' + '='.repeat(60) + '\n');
  
  findCorrectSolution();
}

// 如果直接运行此脚本
if (typeof window === 'undefined') {
  runProblemAnalysis();
} else {
  window.moonPhaseProblemAnalysis = {
    runProblemAnalysis,
    analyzeCurrentMoonPhaseProblem,
    analyzeCoordinateSystemIssue,
    findCorrectSolution
  };
  
  console.log('月相问题分析工具已加载到 window.moonPhaseProblemAnalysis');
  console.log('在浏览器控制台运行: moonPhaseProblemAnalysis.runProblemAnalysis()');
}

export { runProblemAnalysis };