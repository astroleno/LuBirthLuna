// 验证左侧光照修复效果的测试脚本
// 测试修复后的光照侧判断逻辑

const testLightingFix = () => {
  console.log('🧪 测试光照侧判断修复效果');
  console.log('修复前阈值: 0.3, 修复后阈值: 0.15');
  console.log('');
  
  // 测试不同的相位角
  const testAngles = [
    { angle: 0, expected: '前方' },
    { angle: 45, expected: '右侧' },
    { angle: 90, expected: '右侧' },
    { angle: 135, expected: '右侧' },
    { angle: 180, expected: '后方' },
    { angle: 225, expected: '左侧' },  // 关键测试点
    { angle: 270, expected: '左侧' },  // 关键测试点
    { angle: 315, expected: '左侧' },  // 关键测试点
    { angle: 360, expected: '前方' }
  ];
  
  testAngles.forEach(({ angle, expected }) => {
    const a = angle * Math.PI / 180;
    
    // 模拟正交基向量（基于实际log数据）
    const F = new THREE.Vector3(0.1, 0.2, 0.97).normalize();
    const R = new THREE.Vector3(-0.97, 0.1, 0.1).normalize();
    const U = new THREE.Vector3(-0.1, 0.97, -0.2).normalize();
    
    // 计算太阳方向
    const S = new THREE.Vector3()
      .add(R.clone().multiplyScalar(-Math.sin(a)))
      .add(F.clone().multiplyScalar(Math.cos(a)))
      .normalize();
    
    // 修复后的判断逻辑
    const lightingSide = S.x > 0.15 ? '右侧' : S.x < -0.15 ? '左侧' : S.z > 0.15 ? '前方' : S.z < -0.15 ? '后方' : '其他方向';
    
    // 修复前的判断逻辑（用于对比）
    const lightingSideOld = S.x > 0.3 ? '右侧' : S.x < -0.3 ? '左侧' : S.z > 0.3 ? '前方' : S.z < -0.3 ? '后方' : '其他方向';
    
    console.log(`${angle}°:`);
    console.log(`  太阳方向: (${S.x.toFixed(3)}, ${S.y.toFixed(3)}, ${S.z.toFixed(3)})`);
    console.log(`  期望光照: ${expected}`);
    console.log(`  修复前: ${lightingSideOld} ${lightingSideOld === expected ? '✅' : '❌'}`);
    console.log(`  修复后: ${lightingSide} ${lightingSide === expected ? '✅' : '❌'}`);
    console.log('');
  });
  
  console.log('🎯 重点检查左侧光照范围 (225°-315°):');
  const leftAngles = [225, 240, 270, 300, 315];
  
  leftAngles.forEach(angle => {
    const a = angle * Math.PI / 180;
    
    const F = new THREE.Vector3(0.1, 0.2, 0.97).normalize();
    const R = new THREE.Vector3(-0.97, 0.1, 0.1).normalize();
    
    const S = new THREE.Vector3()
      .add(R.clone().multiplyScalar(-Math.sin(a)))
      .add(F.clone().multiplyScalar(Math.cos(a)))
      .normalize();
    
    const lightingSide = S.x > 0.15 ? '右侧' : S.x < -0.15 ? '左侧' : S.z > 0.15 ? '前方' : S.z < -0.15 ? '后方' : '其他方向';
    
    console.log(`${angle}°: 太阳方向x=${S.x.toFixed(3)}, 光照侧=${lightingSide} ${lightingSide === '左侧' ? '✅' : '❌'}`);
  });
};

// 运行测试
testLightingFix();