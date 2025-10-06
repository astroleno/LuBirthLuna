// 测试出生点对齐功能是否正常工作
// 在浏览器控制台中运行此脚本

console.log('=== 出生点对齐功能测试 ===');

// 1. 测试启用出生点对齐（应该自动使用当前出生地坐标）
console.log('1. 启用出生点对齐...');
window.setBirthPointAlignment(true);

// 等待一下让状态更新
setTimeout(() => {
  // 2. 检查当前设置
  console.log('2. 检查当前设置...');
  const current = window.getBirthPointAlignment();
  console.log('当前出生点对齐设置:', current);
  
  // 3. 测试设置特定坐标
  console.log('3. 测试设置特定坐标 (120°E, 30°N)...');
  window.setBirthPointAlignment(true, 120, 30, 15);
  
  setTimeout(() => {
    const updated = window.getBirthPointAlignment();
    console.log('更新后的设置:', updated);
    
    // 4. 测试屏幕Y模式
    console.log('4. 测试屏幕Y模式...');
    window.setBirthPointScreenY(0.4);
    
    setTimeout(() => {
      const final = window.getBirthPointAlignment();
      console.log('最终设置:', final);
      
      // 5. 禁用出生点对齐
      console.log('5. 禁用出生点对齐...');
      window.setBirthPointAlignment(false);
      
      setTimeout(() => {
        const disabled = window.getBirthPointAlignment();
        console.log('禁用后的设置:', disabled);
        console.log('=== 测试完成 ===');
      }, 500);
    }, 500);
  }, 500);
}, 500);
