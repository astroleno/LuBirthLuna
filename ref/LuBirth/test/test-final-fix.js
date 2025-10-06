/**
 * 测试最终修复方案：原始正交基 + -sin(a)·R + cos(a)·F
 */

import * as THREE from 'three';

// 测试最终修复方案
function testFinalFix() {
  console.log('=== 测试最终修复方案 ===\n');
  
  // 使用实际配置
  const cameraPosition = new THREE.Vector3(0, 0, 15);
  const moonPosition = new THREE.Vector3(0, 5, 0);
  
  console.log('配置：');
  console.log('相机位置:', cameraPosition.toArray());
  console.log('月球位置:', moonPosition.toArray());
  
  // 构建正交基（使用原始方法）
  const F = new THREE.Vector3().subVectors(cameraPosition, moonPosition).normalize();
  const camUp = new THREE.Vector3(0, 1, 0);
  const Uprime = camUp.clone().sub(F.clone().multiplyScalar(camUp.dot(F)));
  let U = Uprime.lengthSq() > 1e-6 ? Uprime.normalize() : new THREE.Vector3(0, 1, 0);
  const R = new THREE.Vector3().crossVectors(F, U).normalize(); // 原始方法
  U = new THREE.Vector3().crossVectors(R, F).normalize();
  
  console.log('\n正交基：');
  console.log('F:', F.toArray());
  console.log('R:', R.toArray(), `(x=${R.x.toFixed(3)} - ${R.x > 0 ? '指向右侧' : '指向左侧'})`);
  console.log('U:', U.toArray());
  
  // 测试完整周期
  console.log('\n=== 完整周期测试 ===\n');
  
  let leftCount = 0, rightCount = 0, frontCount = 0, backCount = 0;
  
  for (let angle = 0; angle < 360; angle += 15) {
    const angleRad = angle * Math.PI / 180;
    
    // 使用最终修复的公式：-sin(a)·R + cos(a)·F
    const S = new THREE.Vector3()
      .add(R.clone().multiplyScalar(-Math.sin(angleRad)))
      .add(F.clone().multiplyScalar(Math.cos(angleRad)))
      .normalize();
    
    const phaseName = getPhaseName(angle);
    const side = getLightingSide(S);
    
    console.log(`${angle}° (${phaseName}): 太阳从${side}照射`);
    
    if (side === '左侧') leftCount++;
    else if (side === '右侧') rightCount++;
    else if (side === '前方') frontCount++;
    else if (side === '后方') backCount++;
  }
  
  console.log('\n=== 结果统计 ===\n');
  console.log(`左侧光照: ${leftCount}次`);
  console.log(`右侧光照: ${rightCount}次`);
  console.log(`前方光照: ${frontCount}次`);
  console.log(`后方光照: ${backCount}次`);
  
  console.log('\n=== 修复效果验证 ===\n');
  if (leftCount > 0 && rightCount > 0) {
    console.log('✅ 成功！现在有左右两侧的光照分布');
    console.log('✅ 月相应该能够显示完整的变化周期');
    console.log('✅ 不再出现"只显示一侧"的问题');
  } else {
    console.log('❌ 仍然有问题，需要进一步调整');
  }
  
  if (Math.abs(leftCount - rightCount) <= 2) {
    console.log('✅ 左右光照分布基本均匀');
  } else {
    console.log('⚠️  左右光照分布不均匀，需要微调');
  }
}

// 模拟实际月相周期
function simulateActualMoonCycle() {
  console.log('\n=== 模拟实际月相周期（30天） ===\n');
  
  const cameraPosition = new THREE.Vector3(0, 0, 15);
  const moonPosition = new THREE.Vector3(0, 5, 0);
  
  // 构建正交基
  const F = new THREE.Vector3().subVectors(cameraPosition, moonPosition).normalize();
  const camUp = new THREE.Vector3(0, 1, 0);
  const Uprime = camUp.clone().sub(F.clone().multiplyScalar(camUp.dot(F)));
  let U = Uprime.lengthSq() > 1e-6 ? Uprime.normalize() : new THREE.Vector3(0, 1, 0);
  const R = new THREE.Vector3().crossVectors(F, U).normalize();
  U = new THREE.Vector3().crossVectors(R, F).normalize();
  
  console.log('预期月相变化：');
  console.log('满月 → 亏凸月 → 下弦月 → 残月 → 新月 → 蛾眉月 → 上弦月 → 盈凸月 → 满月');
  console.log('');
  
  for (let day = 0; day < 30; day++) {
    // 模拟月相周期：29.53天
    const phaseAngle = (day / 29.53) * 360;
    const angleRad = phaseAngle * Math.PI / 180;
    
    const S = new THREE.Vector3()
      .add(R.clone().multiplyScalar(-Math.sin(angleRad)))
      .add(F.clone().multiplyScalar(Math.cos(angleRad)))
      .normalize();
    
    const phaseName = getPhaseName(phaseAngle);
    const side = getLightingSide(S);
    const emoji = getPhaseEmoji(phaseAngle);
    
    console.log(`${emoji} 第${day}天: ${phaseAngle.toFixed(1)}° (${phaseName}) - ${side}`);
  }
}

// 对比修复前后的效果
function compareBeforeAfter() {
  console.log('\n=== 修复前后对比 ===\n');
  
  const cameraPosition = new THREE.Vector3(0, 0, 15);
  const moonPosition = new THREE.Vector3(0, 5, 0);
  
  // 构建正交基
  const F = new THREE.Vector3().subVectors(cameraPosition, moonPosition).normalize();
  const camUp = new THREE.Vector3(0, 1, 0);
  const Uprime = camUp.clone().sub(F.clone().multiplyScalar(camUp.dot(F)));
  let U = Uprime.lengthSq() > 1e-6 ? Uprime.normalize() : new THREE.Vector3(0, 1, 0);
  const R = new THREE.Vector3().crossVectors(F, U).normalize();
  U = new THREE.Vector3().crossVectors(R, F).normalize();
  
  console.log('关键测试点（90° = 下弦月，应该从左侧照亮）：');
  
  const testAngle = 90;
  const angleRad = testAngle * Math.PI / 180;
  
  // 修复前的公式（导致只显示左侧）
  const S_before = new THREE.Vector3()
    .add(F.clone().multiplyScalar(Math.cos(angleRad)))
    .add(R.clone().multiplyScalar(Math.sin(angleRad)))
    .normalize();
  
  // 修复后的公式
  const S_after = new THREE.Vector3()
    .add(R.clone().multiplyScalar(-Math.sin(angleRad)))
    .add(F.clone().multiplyScalar(Math.cos(angleRad)))
    .normalize();
  
  console.log(`${testAngle}° (${getPhaseName(testAngle)}):`);
  console.log(`  修复前: ${getLightingSide(S_before)} (${S_before.toArray().map(v => v.toFixed(3)).join(', ')})`);
  console.log(`  修复后: ${getLightingSide(S_after)} (${S_after.toArray().map(v => v.toFixed(3)).join(', ')})`);
  
  console.log('\n修复总结：');
  console.log('1. ✅ 保持原始正交基构建方法 (F × U = R)');
  console.log('2. ✅ 修改太阳方向公式为 -sin(a)·R + cos(a)·F');
  console.log('3. ✅ 确保phase_angle在0-360度范围内');
  console.log('4. ✅ 现在月相应该显示完整的周期变化');
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

function getPhaseEmoji(angle) {
  if (angle < 22.5) return '🌕';
  else if (angle < 67.5) return '🌖';
  else if (angle < 112.5) return '🌗';
  else if (angle < 157.5) return '🌘';
  else if (angle < 202.5) return '🌑';
  else if (angle < 247.5) return '🌒';
  else if (angle < 292.5) return '🌓';
  else return '🌔';
}

// 运行测试
function runFinalFixTest() {
  testFinalFix();
  console.log('\n' + '='.repeat(60) + '\n');
  
  simulateActualMoonCycle();
  console.log('\n' + '='.repeat(60) + '\n');
  
  compareBeforeAfter();
}

// 如果直接运行此脚本
if (typeof window === 'undefined') {
  runFinalFixTest();
} else {
  window.finalFixTest = {
    runFinalFixTest,
    testFinalFix,
    simulateActualMoonCycle,
    compareBeforeAfter
  };
  
  console.log('最终修复测试工具已加载到 window.finalFixTest');
  console.log('在浏览器控制台运行: finalFixTest.runFinalFixTest()');
}

export { runFinalFixTest };