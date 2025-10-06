// 诊断左侧光照问题的测试脚本
// 重点检查光照侧判断逻辑

const diagnoseLeftLighting = () => {
  console.log('🔍 诊断左侧光照问题');
  
  // 模拟不同的相位角，检查太阳方向计算
  const testAngles = [0, 45, 90, 135, 180, 225, 270, 315, 360];
  
  testAngles.forEach(angle => {
    const a = angle * Math.PI / 180; // 转换为弧度
    
    // 模拟正交基向量（基于实际log数据）
    const F = new THREE.Vector3(0.1, 0.2, 0.97).normalize(); // 前
    const R = new THREE.Vector3(-0.97, 0.1, 0.1).normalize(); // 左
    const U = new THREE.Vector3(-0.1, 0.97, -0.2).normalize(); // 上
    
    // 计算太阳方向（使用当前代码的逻辑）
    const S = new THREE.Vector3()
      .add(R.clone().multiplyScalar(-Math.sin(a)))  // R分量
      .add(F.clone().multiplyScalar(Math.cos(a)))   // F分量
      .normalize();
    
    // 使用代码中的判断逻辑
    const lightingSide = S.x > 0.3 ? '右侧' : S.x < -0.3 ? '左侧' : S.z > 0.3 ? '前方' : S.z < -0.3 ? '后方' : '其他方向';
    
    // 更合理的判断逻辑（降低阈值）
    const lightingSide2 = S.x > 0.1 ? '右侧' : S.x < -0.1 ? '左侧' : S.z > 0.1 ? '前方' : S.z < -0.1 ? '后方' : '其他方向';
    
    // 基于角度的期望光照侧
    const expectedSide = angle < 45 ? '前方' : angle < 135 ? '右侧' : angle < 225 ? '后方' : angle < 315 ? '左侧' : '前方';
    
    console.log(`${angle}° (${a.toFixed(2)}rad):`);
    console.log(`  太阳方向: (${S.x.toFixed(3)}, ${S.y.toFixed(3)}, ${S.z.toFixed(3)})`);
    console.log(`  当前判断: ${lightingSide}`);
    console.log(`  改进判断: ${lightingSide2}`);
    console.log(`  期望光照: ${expectedSide}`);
    console.log(`  匹配期望: ${lightingSide === expectedSide ? '✅' : '❌'}`);
    console.log('');
  });
};

// 运行诊断
diagnoseLeftLighting();