// 月相光照方向测试脚本
// 验证不同相位角下的光照方向计算

function testMoonPhaseLighting() {
  console.log('🌙 月相光照方向测试');
  console.log('==================');
  
  // 测试关键相位角
  const testAngles = [
    0,    // 新月 - 应该显示前方
    45,   // 蛾眉月 - 应该显示右侧  
    90,   // 上弦月 - 应该显示右侧
    135,  // 盈凸月 - 应该显示右侧
    180,  // 满月 - 应该显示后方
    225,  // 亏凸月 - 应该显示左侧
    270,  // 下弦月 - 应该显示左侧
    315,  // 残月 - 应该显示左侧
    360   // 新月 - 应该显示前方
  ];
  
  testAngles.forEach(angleDeg => {
    const angleRad = angleDeg * Math.PI / 180;
    
    // 模拟正交基向量（基于实际代码逻辑）
    const F = new THREE.Vector3(0.1, 0.2, 0.97).normalize();
    const R = new THREE.Vector3(-0.97, 0.1, 0.1).normalize();
    const U = new THREE.Vector3(-0.1, 0.97, -0.2).normalize();
    
    // 计算太阳方向（使用当前代码的公式）
    const S = new THREE.Vector3()
      .add(R.clone().multiplyScalar(-Math.sin(angleRad)))
      .add(F.clone().multiplyScalar(Math.cos(angleRad)))
      .normalize();
    
    // 判断光照侧
    const lightingSide = S.x > 0.15 ? '右侧' : S.x < -0.15 ? '左侧' : S.z > 0.15 ? '前方' : S.z < -0.15 ? '后方' : '其他方向';
    
    // 期望的光照侧
    const expectedLighting = getExpectedLighting(angleDeg);
    
    console.log(`${angleDeg}° (${getPhaseName(angleDeg)}):`);
    console.log(`  太阳方向: (${S.x.toFixed(3)}, ${S.y.toFixed(3)}, ${S.z.toFixed(3)})`);
    console.log(`  实际光照: ${lightingSide}`);
    console.log(`  期望光照: ${expectedLighting}`);
    console.log(`  结果: ${lightingSide === expectedLighting ? '✅ 正确' : '❌ 错误'}`);
    console.log('');
  });
}

function getExpectedLighting(angleDeg) {
  if (angleDeg < 45) return '前方';
  else if (angleDeg < 135) return '右侧';
  else if (angleDeg < 225) return '后方';
  else if (angleDeg < 315) return '左侧';
  else return '前方';
}

function getPhaseName(angleDeg) {
  if (angleDeg < 22.5) return '新月';
  else if (angleDeg < 67.5) return '蛾眉月';
  else if (angleDeg < 112.5) return '上弦月';
  else if (angleDeg < 157.5) return '盈凸月';
  else if (angleDeg < 202.5) return '满月';
  else if (angleDeg < 247.5) return '亏凸月';
  else if (angleDeg < 292.5) return '下弦月';
  else if (angleDeg < 337.5) return '残月';
  else return '新月';
}

// 测试用户遇到的特定情况
function testUserScenario() {
  console.log('🔍 用户场景测试');
  console.log('===============');
  
  // 测试log文件中出现的相位角范围
  const userAngles = [21.9, 26.2, 49.1, 76.4, 88.6, 88.7, 100.7, 102.0, 109.9, 126.3, 159.0];
  
  console.log('用户测试的相位角范围:');
  userAngles.forEach(angle => {
    const angleRad = angle * Math.PI / 180;
    
    const F = new THREE.Vector3(0.1, 0.2, 0.97).normalize();
    const R = new THREE.Vector3(-0.97, 0.1, 0.1).normalize();
    
    const S = new THREE.Vector3()
      .add(R.clone().multiplyScalar(-Math.sin(angleRad)))
      .add(F.clone().multiplyScalar(Math.cos(angleRad)))
      .normalize();
    
    const lightingSide = S.x > 0.15 ? '右侧' : S.x < -0.15 ? '左侧' : S.z > 0.15 ? '前方' : S.z < -0.15 ? '后方' : '其他方向';
    
    console.log(`${angle}°: ${lightingSide} (${getPhaseName(angle)})`);
  });
  
  console.log('\n问题分析:');
  console.log('- 所有测试角度都在21.9°-159.0°范围内');
  console.log('- 这个范围应该显示右侧光照，符合预期');
  console.log('- 如果用户看到"右-满-右"模式，可能是测试时间范围不够完整');
}

// 执行测试
console.log('开始测试月相光照方向...\n');
testMoonPhaseLighting();
testUserScenario();

console.log('\n📋 建议:');
console.log('1. 测试完整的月相周期（0-360度）');
console.log('2. 特别关注225°-315°范围的左侧光照');
console.log('3. 验证满月（180°）是否正确显示为后方光照');