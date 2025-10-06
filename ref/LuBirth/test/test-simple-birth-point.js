// 简单的出生点对齐测试脚本
// 在浏览器控制台中运行此脚本来测试出生点对齐功能

console.log('=== 简单出生点对齐测试 ===');

// 检查函数是否可用
console.log('检查函数可用性:');
console.log('- setBirthPointAlignment:', typeof setBirthPointAlignment);
console.log('- getBirthPointAlignment:', typeof getBirthPointAlignment);
console.log('- setSceneTime:', typeof setSceneTime);

if (typeof setBirthPointAlignment === 'undefined') {
  console.error('❌ setBirthPointAlignment 函数未定义，请确保页面已完全加载');
  console.log('请等待页面加载完成后重试');
} else {
  console.log('✅ 函数已定义，开始测试');
  
  // 测试1: 启用出生点对齐
  console.log('\n1. 启用出生点对齐 (0°经度)');
  try {
    setBirthPointAlignment(true, 0, 0, 10);
    console.log('✅ 出生点对齐已启用');
    
    // 等待一下再获取状态
    setTimeout(() => {
      try {
        const status = getBirthPointAlignment();
        console.log('当前对齐状态:', status);
      } catch (e) {
        console.error('获取对齐状态失败:', e);
      }
    }, 500);
    
  } catch (e) {
    console.error('启用出生点对齐失败:', e);
  }
  
  // 测试2: 测试180°经度
  setTimeout(() => {
    console.log('\n2. 测试180°经度');
    try {
      setBirthPointAlignment(true, 180, 0, 10);
      console.log('✅ 180°经度对齐已设置');
    } catch (e) {
      console.error('设置180°经度失败:', e);
    }
  }, 2000);
  
  // 测试3: 关闭对齐
  setTimeout(() => {
    console.log('\n3. 关闭出生点对齐');
    try {
      setBirthPointAlignment(false);
      console.log('✅ 出生点对齐已关闭');
    } catch (e) {
      console.error('关闭出生点对齐失败:', e);
    }
  }, 4000);
  
  // 测试4: 重新启用对齐
  setTimeout(() => {
    console.log('\n4. 重新启用出生点对齐 (0°经度)');
    try {
      setBirthPointAlignment(true, 0, 0, 10);
      console.log('✅ 出生点对齐已重新启用');
      console.log('预期：0°经度应该显示在格林威治（地球已重置）');
    } catch (e) {
      console.error('重新启用出生点对齐失败:', e);
    }
  }, 6000);
}

console.log('\n测试完成！请观察相机位置变化。');
