// 详细诊断太阳方向计算问题
// 分析为什么太阳方向x分量始终为正

const diagnoseSunDirection = () => {
  console.log('🔍 详细诊断太阳方向计算问题');
  console.log('');
  
  // 测试不同的相位角
  const testAngles = [0, 45, 90, 135, 180, 225, 270, 315];
  
  testAngles.forEach(angle => {
    const a = angle * Math.PI / 180;
    console.log(`=== 相位角 ${angle}° (${a.toFixed(3)}rad) ===`);
    
    // 模拟基于实际log数据的正交基
    // 从log中看到的典型值
    const F = new THREE.Vector3(0.1, 0.2, 0.97).normalize();  // 前方
    const R = new THREE.Vector3(-0.97, 0.1, 0.1).normalize(); // 左侧
    const U = new THREE.Vector3(-0.1, 0.97, -0.2).normalize(); // 上方
    
    console.log('正交基向量:');
    console.log(`  F (前): (${F.x.toFixed(3)}, ${F.y.toFixed(3)}, ${F.z.toFixed(3)})`);
    console.log(`  R (左): (${R.x.toFixed(3)}, ${R.y.toFixed(3)}, ${R.z.toFixed(3)})`);
    console.log(`  U (上): (${U.x.toFixed(3)}, ${U.y.toFixed(3)}, ${U.z.toFixed(3)})`);
    
    // 计算三角函数值
    const sin_a = Math.sin(a);
    const cos_a = Math.cos(a);
    
    console.log(`三角函数:`);
    console.log(`  sin(${angle}°) = ${sin_a.toFixed(3)}`);
    console.log(`  cos(${angle}°) = ${cos_a.toFixed(3)}`);
    
    // 计算各个分量
    const R_component = R.clone().multiplyScalar(-sin_a);
    const F_component = F.clone().multiplyScalar(cos_a);
    
    console.log('分量计算:');
    console.log(`  R分量 (-sin·R): (${R_component.x.toFixed(3)}, ${R_component.y.toFixed(3)}, ${R_component.z.toFixed(3)})`);
    console.log(`  F分量 (cos·F): (${F_component.x.toFixed(3)}, ${F_component.y.toFixed(3)}, ${F_component.z.toFixed(3)})`);
    
    // 最终太阳方向
    const S = new THREE.Vector3()
      .add(R_component)
      .add(F_component)
      .normalize();
    
    console.log(`最终太阳方向 S: (${S.x.toFixed(3)}, ${S.y.toFixed(3)}, ${S.z.toFixed(3)})`);
    
    // 判断光照侧
    const lightingSide = S.x > 0.3 ? '右侧' : S.x < -0.3 ? '左侧' : S.z > 0.3 ? '前方' : S.z < -0.3 ? '后方' : '其他方向';
    
    console.log(`光照侧判断: ${lightingSide} (x=${S.x.toFixed(3)})`);
    
    // 期望的光照侧
    const expectedSide = angle < 45 ? '前方' : angle < 135 ? '右侧' : angle < 225 ? '后方' : angle < 315 ? '左侧' : '前方';
    
    console.log(`期望光照侧: ${expectedSide}`);
    console.log(`匹配结果: ${lightingSide === expectedSide ? '✅' : '❌'}`);
    console.log('');
  });
  
  // 分析问题根源
  console.log('🔬 问题分析:');
  console.log('1. R向量指向左侧 (x=-0.97)，这是正确的');
  console.log('2. 公式使用 -sin(a)·R + cos(a)·F');
  console.log('3. 当a在225°-315°时，sin(a)应该是负数，-sin(a)应该是正数');
  console.log('4. 但是R.x是负数，所以 -sin(a)·R.x 可能是负数');
  console.log('');
  console.log('让我们检查一下具体的计算:');
  
  // 重点分析270度的情况
  const a270 = 270 * Math.PI / 180;
  const sin270 = Math.sin(a270);
  const cos270 = Math.cos(a270);
  
  console.log(`270度分析:`);
  console.log(`  sin(270°) = ${sin270.toFixed(3)} (应该是-1)`);
  console.log(`  cos(270°) = ${cos270.toFixed(3)} (应该是0)`);
  console.log(`  -sin(270°) = ${(-sin270).toFixed(3)} (应该是1)`);
  console.log(`  R.x = -0.97`);
  console.log(`  -sin(270°)·R.x = ${(-sin270 * -0.97).toFixed(3)} (应该是-0.97)`);
  console.log(`  cos(270°)·F.x = ${cos270 * 0.1} (应该是0)`);
  console.log(`  最终S.x ≈ -0.97，应该是左侧光照`);
  
  return '诊断完成';
};

// 运行诊断
diagnoseSunDirection();