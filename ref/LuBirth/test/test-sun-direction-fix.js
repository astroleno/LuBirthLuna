/**
 * 测试修复后的太阳方向计算公式
 */

import * as THREE from 'three';

// 测试修复后的太阳方向计算
function testFixedSunDirectionFormula() {
  console.log('=== 测试修复后的太阳方向计算公式 ===\n');
  
  // 设置相机和月球位置（与实际场景相同）
  const cameraPosition = new THREE.Vector3(0, 0, 15);
  const moonPosition = new THREE.Vector3(0, 5, 0);
  
  // 构建正交基（复制现有代码逻辑）
  const F = new THREE.Vector3().subVectors(cameraPosition, moonPosition).normalize();
  const camUp = new THREE.Vector3(0, 1, 0);
  const Uprime = camUp.clone().sub(F.clone().multiplyScalar(camUp.dot(F)));
  let U = Uprime.lengthSq() > 1e-6 ? Uprime.normalize() : new THREE.Vector3(0, 1, 0);
  const R = new THREE.Vector3().crossVectors(F, U).normalize();
  U = new THREE.Vector3().crossVectors(R, F).normalize();
  
  console.log('正交基向量：');
  console.log('F (前向):', F.toArray());
  console.log('R (右向):', R.toArray());
  console.log('U (上向):', U.toArray());
  console.log('');
  
  // 测试完整的月相周期
  const testAngles = [0, 45, 90, 135, 180]; // 度
  
  console.log('修复后的公式：S = -sin(a)·R + cos(a)·F');
  console.log('其中：a = phase_angle (0=满月, 180=新月)\n');
  
  testAngles.forEach(angleDeg => {
    const angleRad = angleDeg * Math.PI / 180;
    
    // 修复后的公式
    const S_fixed = new THREE.Vector3()
      .add(R.clone().multiplyScalar(-Math.sin(angleRad)))
      .add(F.clone().multiplyScalar(Math.cos(angleRad)))
      .normalize();
    
    // 修复前的公式（用于对比）
    const S_old = new THREE.Vector3()
      .add(F.clone().multiplyScalar(Math.cos(angleRad)))
      .add(R.clone().multiplyScalar(Math.sin(angleRad)))
      .normalize();
    
    console.log(`${angleDeg}° (${getPhaseName(angleDeg)}):`);
    console.log(`  修复前: (${S_old.x.toFixed(3)}, ${S_old.y.toFixed(3)}, ${S_old.z.toFixed(3)})`);
    console.log(`  修复后: (${S_fixed.x.toFixed(3)}, ${S_fixed.y.toFixed(3)}, ${S_fixed.z.toFixed(3)})`);
    
    // 分析太阳方向的视觉效果
    analyzeSunDirectionImproved(S_fixed, angleDeg, '修复后');
    console.log('');
  });
  
  // 测试完整的周期变化
  console.log('=== 完整周期变化测试 ===\n');
  for (let angle = 0; angle <= 360; angle += 30) {
    const angleRad = angle * Math.PI / 180;
    
    const S = new THREE.Vector3()
      .add(R.clone().multiplyScalar(-Math.sin(angleRad)))
      .add(F.clone().multiplyScalar(Math.cos(angleRad)))
      .normalize();
    
    const phaseName = getPhaseName(angle);
    const side = getLightingSide(S);
    
    console.log(`${angle}° (${phaseName}): 太阳从${side}照射, 方向=(${S.x.toFixed(3)}, ${S.y.toFixed(3)}, ${S.z.toFixed(3)})`);
  }
}

function getPhaseName(angle) {
  // 将0-360映射到astronomy-engine的0-180范围
  const normalizedAngle = angle % 360;
  const astronomyAngle = normalizedAngle > 180 ? 360 - normalizedAngle : normalizedAngle;
  
  if (astronomyAngle < 22.5) return '满月';
  else if (astronomyAngle < 67.5) return '亏凸月';
  else if (astronomyAngle < 112.5) return '下弦月';
  else if (astronomyAngle < 157.5) return '残月';
  else if (astronomyAngle < 202.5) return '新月';
  else if (astronomyAngle < 247.5) return '蛾眉月';
  else if (astronomyAngle < 292.5) return '上弦月';
  else return '盈凸月';
}

function getLightingSide(sunDir) {
  if (sunDir.x > 0.3) return '右侧';
  else if (sunDir.x < -0.3) return '左侧';
  else if (sunDir.z > 0.3) return '前方';
  else if (sunDir.z < -0.3) return '后方';
  else return '其他方向';
}

function analyzeSunDirectionImproved(sunDir, angleDeg, formulaName) {
  const moonToCamera = new THREE.Vector3(0, 0, -1); // 假设相机看向-Z
  const dot = sunDir.dot(moonToCamera);
  
  if (angleDeg === 0) {
    console.log(`    ${formulaName}: 满月 - 太阳应该从相机方向照射`);
    if (dot > 0.5) console.log(`    ✅ 正确：太阳从相机方向照射 (dot=${dot.toFixed(3)})`);
    else console.log(`    ❌ 错误：太阳没有从相机方向照射 (dot=${dot.toFixed(3)})`);
  } else if (angleDeg === 180) {
    console.log(`    ${formulaName}: 新月 - 太阳应该从相机背后照射`);
    if (dot < -0.5) console.log(`    ✅ 正确：太阳从相机背后照射 (dot=${dot.toFixed(3)})`);
    else console.log(`    ❌ 错误：太阳没有从相机背后照射 (dot=${dot.toFixed(3)})`);
  } else if (sunDir.x > 0.3) {
    console.log(`    ${formulaName}: 太阳从右侧照射 ✅`);
  } else if (sunDir.x < -0.3) {
    console.log(`    ${formulaName}: 太阳从左侧照射 ✅`);
  } else {
    console.log(`    ${formulaName}: 太阳从其他方向照射`);
  }
}

// 验证修复效果
function verifyFixEffectiveness() {
  console.log('\n=== 修复效果验证 ===\n');
  
  let hasRightSideLighting = false;
  let hasLeftSideLighting = false;
  
  // 模拟一个月相周期
  for (let angle = 0; angle < 360; angle += 10) {
    const angleRad = angle * Math.PI / 180;
    
    // 使用修复后的公式
    const cameraPosition = new THREE.Vector3(0, 0, 15);
    const moonPosition = new THREE.Vector3(0, 5, 0);
    const F = new THREE.Vector3().subVectors(cameraPosition, moonPosition).normalize();
    const camUp = new THREE.Vector3(0, 1, 0);
    const Uprime = camUp.clone().sub(F.clone().multiplyScalar(camUp.dot(F)));
    let U = Uprime.lengthSq() > 1e-6 ? Uprime.normalize() : new THREE.Vector3(0, 1, 0);
    const R = new THREE.Vector3().crossVectors(F, U).normalize();
    
    const S = new THREE.Vector3()
      .add(R.clone().multiplyScalar(-Math.sin(angleRad)))
      .add(F.clone().multiplyScalar(Math.cos(angleRad)))
      .normalize();
    
    if (S.x > 0.3) hasRightSideLighting = true;
    if (S.x < -0.3) hasLeftSideLighting = true;
  }
  
  console.log('修复效果检查：');
  console.log(`✅ 有右侧光照: ${hasRightSideLighting}`);
  console.log(`✅ 有左侧光照: ${hasLeftSideLighting}`);
  console.log(`✅ 有左右两侧光照: ${hasRightSideLighting && hasLeftSideLighting}`);
  
  if (hasRightSideLighting && hasLeftSideLighting) {
    console.log('\n🎉 修复成功！太阳方向现在能够覆盖左右两侧');
    console.log('月相应该能够显示完整的变化周期了');
  } else {
    console.log('\n❌ 修复可能不完全，需要进一步调整');
  }
}

// 运行测试
function runSunDirectionFixTest() {
  testFixedSunDirectionFormula();
  verifyFixEffectiveness();
  
  console.log('\n=== 下一步建议 ===\n');
  console.log('1. 如果修复成功，测试实际应用中的月相显示');
  console.log('2. 如果仍有问题，继续修复phase_angle定义');
  console.log('3. 最后检查正交基构建和月球朝向');
}

// 如果直接运行此脚本
if (typeof window === 'undefined') {
  runSunDirectionFixTest();
} else {
  window.sunDirectionFixTest = {
    runSunDirectionFixTest,
    testFixedSunDirectionFormula,
    verifyFixEffectiveness
  };
  
  console.log('太阳方向修复测试工具已加载到 window.sunDirectionFixTest');
  console.log('在浏览器控制台运行: sunDirectionFixTest.runSunDirectionFixTest()');
}

export { runSunDirectionFixTest, testFixedSunDirectionFormula, verifyFixEffectiveness };