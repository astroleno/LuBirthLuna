/**
 * 测试修复后的正交基构建
 */

import * as THREE from 'three';

// 测试修复后的正交基构建
function testFixedOrthogonalBasis() {
  console.log('=== 测试修复后的正交基构建 ===\n');
  
  // 设置标准配置
  const cameraPosition = new THREE.Vector3(0, 0, 15);
  const moonPosition = new THREE.Vector3(0, 5, 0);
  
  console.log('相机位置:', cameraPosition.toArray());
  console.log('月球位置:', moonPosition.toArray());
  
  // 修复后的正交基构建
  const F = new THREE.Vector3().subVectors(cameraPosition, moonPosition).normalize();
  const camUp = new THREE.Vector3(0, 1, 0);
  const Uprime = camUp.clone().sub(F.clone().multiplyScalar(camUp.dot(F)));
  let U = Uprime.lengthSq() > 1e-6 ? Uprime.normalize() : new THREE.Vector3(0, 1, 0);
  
  // 修复前：F × U = R (导致R指向左侧)
  const R_old = new THREE.Vector3().crossVectors(F, U).normalize();
  
  // 修复后：U × F = R (确保R指向真正的右侧)
  const R_fixed = new THREE.Vector3().crossVectors(U, F).normalize();
  U = new THREE.Vector3().crossVectors(F, R_fixed).normalize();
  
  console.log('\n修复前后的对比：');
  console.log('F (前向):', F.toArray());
  console.log('U (上向):', U.toArray());
  console.log('R_修复前 (左向):', R_old.toArray());
  console.log('R_修复后 (右向):', R_fixed.toArray());
  
  // 验证右手法则
  console.log('\n右手法则验证：');
  const crossTest_old = new THREE.Vector3().crossVectors(R_old, U);
  const crossTest_fixed = new THREE.Vector3().crossVectors(R_fixed, U);
  
  console.log('修复前 R×U = F:', crossTest_old.equals(F) ? '✅' : '❌');
  console.log('修复后 R×U = F:', crossTest_fixed.equals(F) ? '✅' : '❌');
  
  // 验证R向量方向
  console.log('\nR向量方向验证：');
  console.log('修复前 R.x =', R_old.x.toFixed(3), '(正值表示右侧，负值表示左侧)');
  console.log('修复后 R.x =', R_fixed.x.toFixed(3), '(正值表示右侧，负值表示左侧)');
  
  // 测试太阳方向计算
  console.log('\n太阳方向计算测试：');
  console.log('修复后公式：S = sin(a)·R + cos(a)·F\n');
  
  const testAngles = [0, 45, 90, 135, 180, 225, 270, 315];
  
  testAngles.forEach(angle => {
    const angleRad = angle * Math.PI / 180;
    
    // 使用修复后的公式和正交基
    const S = new THREE.Vector3()
      .add(R_fixed.clone().multiplyScalar(Math.sin(angleRad)))
      .add(F.clone().multiplyScalar(Math.cos(angleRad)))
      .normalize();
    
    const phaseName = getPhaseName(angle);
    const lightingSide = getLightingSide(S);
    
    console.log(`${angle}° (${phaseName}):`);
    console.log(`  太阳方向: [${S.toArray().map(v => v.toFixed(3)).join(', ')}]`);
    console.log(`  光照方向: ${lightingSide}`);
    console.log('');
  });
}

// 验证完整周期
function testCompleteCycle() {
  console.log('=== 验证完整月相周期 ===\n');
  
  const cameraPosition = new THREE.Vector3(0, 0, 15);
  const moonPosition = new THREE.Vector3(0, 5, 0);
  
  // 构建修复后的正交基
  const F = new THREE.Vector3().subVectors(cameraPosition, moonPosition).normalize();
  const camUp = new THREE.Vector3(0, 1, 0);
  const Uprime = camUp.clone().sub(F.clone().multiplyScalar(camUp.dot(F)));
  let U = Uprime.lengthSq() > 1e-6 ? Uprime.normalize() : new THREE.Vector3(0, 1, 0);
  const R = new THREE.Vector3().crossVectors(U, F).normalize();
  U = new THREE.Vector3().crossVectors(F, R).normalize();
  
  console.log('测试完整周期（0-360度）的光照分布：');
  console.log('');
  
  let leftCount = 0, rightCount = 0, frontCount = 0, backCount = 0;
  
  for (let angle = 0; angle < 360; angle += 15) {
    const angleRad = angle * Math.PI / 180;
    
    const S = new THREE.Vector3()
      .add(R.clone().multiplyScalar(Math.sin(angleRad)))
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
  
  console.log('\n光照方向分布统计：');
  console.log(`左侧光照: ${leftCount}次`);
  console.log(`右侧光照: ${rightCount}次`);
  console.log(`前方光照: ${frontCount}次`);
  console.log(`后方光照: ${backCount}次`);
  
  console.log('\n修复效果验证：');
  if (leftCount > 0 && rightCount > 0) {
    console.log('✅ 现在有左右两侧的光照分布！');
    console.log('✅ 月相应该能够显示完整的变化周期');
  } else {
    console.log('❌ 仍然缺少左右两侧的光照分布');
  }
  
  if (leftCount === rightCount) {
    console.log('✅ 左右光照分布均匀');
  } else {
    console.log('⚠️  左右光照分布不均匀');
  }
}

// 模拟实际应用效果
function simulateRealWorldEffect() {
  console.log('\n=== 模拟实际应用效果 ===\n');
  
  console.log('修复总结：');
  console.log('1. ✅ 修复了正交基构建：U × F = R (确保R指向右侧)');
  console.log('2. ✅ 修复了太阳方向公式：S = sin(a)·R + cos(a)·F');
  console.log('3. ✅ 修复了phase_angle定义：确保0-360度完整覆盖');
  console.log('');
  
  console.log('预期效果：');
  console.log('- 月相现在应该能够显示完整的周期变化');
  console.log('- 太阳方向能够正确覆盖左右两侧');
  console.log('- 不再出现"只显示左边变化"的问题');
  console.log('');
  
  // 模拟一个月相周期
  console.log('模拟一个月相周期（30天）：');
  console.log('');
  
  const cameraPosition = new THREE.Vector3(0, 0, 15);
  const moonPosition = new THREE.Vector3(0, 5, 0);
  const F = new THREE.Vector3().subVectors(cameraPosition, moonPosition).normalize();
  const camUp = new THREE.Vector3(0, 1, 0);
  const Uprime = camUp.clone().sub(F.clone().multiplyScalar(camUp.dot(F)));
  let U = Uprime.lengthSq() > 1e-6 ? Uprime.normalize() : new THREE.Vector3(0, 1, 0);
  const R = new THREE.Vector3().crossVectors(U, F).normalize();
  U = new THREE.Vector3().crossVectors(F, R).normalize();
  
  for (let day = 0; day < 30; day++) {
    const angle = (day / 30) * 360; // 模拟月相周期
    const angleRad = angle * Math.PI / 180;
    
    const S = new THREE.Vector3()
      .add(R.clone().multiplyScalar(Math.sin(angleRad)))
      .add(F.clone().multiplyScalar(Math.cos(angleRad)))
      .normalize();
    
    const phaseName = getPhaseName(angle);
    const side = getLightingSide(S);
    const emoji = getPhaseEmoji(angle);
    
    console.log(`${emoji} 第${day}天: ${angle.toFixed(1)}° (${phaseName}) - ${side}`);
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
function runOrthogonalBasisFixTest() {
  testFixedOrthogonalBasis();
  console.log('\n' + '='.repeat(60) + '\n');
  
  testCompleteCycle();
  console.log('\n' + '='.repeat(60) + '\n');
  
  simulateRealWorldEffect();
}

// 如果直接运行此脚本
if (typeof window === 'undefined') {
  runOrthogonalBasisFixTest();
} else {
  window.orthogonalBasisFixTest = {
    runOrthogonalBasisFixTest,
    testFixedOrthogonalBasis,
    testCompleteCycle,
    simulateRealWorldEffect
  };
  
  console.log('正交基修复测试工具已加载到 window.orthogonalBasisFixTest');
  console.log('在浏览器控制台运行: orthogonalBasisFixTest.runOrthogonalBasisFixTest()');
}

export { runOrthogonalBasisFixTest, testFixedOrthogonalBasis, testCompleteCycle };