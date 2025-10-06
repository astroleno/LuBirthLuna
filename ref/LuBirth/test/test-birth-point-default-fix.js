// 测试出生点对齐默认坐标修复
// 在浏览器控制台中运行此脚本

console.log('=== 出生点对齐默认坐标修复测试 ===');

// 1. 先禁用出生点对齐，确保状态重置
console.log('1. 禁用出生点对齐...');
window.setBirthPointAlignment(false);

setTimeout(() => {
  // 2. 启用出生点对齐（应该自动使用当前出生地坐标）
  console.log('2. 启用出生点对齐（应该自动使用当前出生地坐标）...');
  window.setBirthPointAlignment(true);
  
  setTimeout(() => {
    // 3. 检查设置是否正确
    const current = window.getBirthPointAlignment();
    console.log('3. 检查当前设置:', current);
    
    // 4. 验证坐标是否为当前出生地坐标
    const expectedLon = 121.5; // 当前出生地经度
    const expectedLat = 31.2;  // 当前出生地纬度
    
    const lonMatch = Math.abs(current.birthPointLongitudeDeg - expectedLon) < 0.1;
    const latMatch = Math.abs(current.birthPointLatitudeDeg - expectedLat) < 0.1;
    
    console.log('4. 验证结果:');
    console.log(`   经度匹配: ${lonMatch} (期望: ${expectedLon}, 实际: ${current.birthPointLongitudeDeg})`);
    console.log(`   纬度匹配: ${latMatch} (期望: ${expectedLat}, 实际: ${current.birthPointLatitudeDeg})`);
    console.log(`   总体结果: ${lonMatch && latMatch ? '✅ 通过' : '❌ 失败'}`);
    
    // 5. 测试设置特定坐标后再次启用
    console.log('5. 测试设置特定坐标后再次启用...');
    window.setBirthPointAlignment(true, 100, 20, 15);
    
    setTimeout(() => {
      const specific = window.getBirthPointAlignment();
      console.log('6. 特定坐标设置:', specific);
      
      // 7. 再次启用（不指定坐标），应该保持之前的设置
      console.log('7. 再次启用（不指定坐标），应该保持之前的设置...');
      window.setBirthPointAlignment(true);
      
      setTimeout(() => {
        const maintained = window.getBirthPointAlignment();
        console.log('8. 保持的设置:', maintained);
        
        const maintainedLon = Math.abs(maintained.birthPointLongitudeDeg - 100) < 0.1;
        const maintainedLat = Math.abs(maintained.birthPointLatitudeDeg - 20) < 0.1;
        
        console.log('9. 保持验证:');
        console.log(`   经度保持: ${maintainedLon} (期望: 100, 实际: ${maintained.birthPointLongitudeDeg})`);
        console.log(`   纬度保持: ${maintainedLat} (期望: 20, 实际: ${maintained.birthPointLatitudeDeg})`);
        console.log(`   保持结果: ${maintainedLon && maintainedLat ? '✅ 通过' : '❌ 失败'}`);
        
        console.log('=== 测试完成 ===');
      }, 500);
    }, 500);
  }, 500);
}, 500);
