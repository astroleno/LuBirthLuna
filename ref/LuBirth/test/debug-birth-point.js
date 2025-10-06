// 调试出生点对齐功能
// 在浏览器控制台中运行此脚本

console.log('=== 调试出生点对齐功能 ===');

// 1. 检查页面状态
console.log('1. 检查页面状态:');
console.log('- window对象:', typeof window);
console.log('- document对象:', typeof document);
console.log('- 页面标题:', document.title);

// 2. 检查控制台接口
console.log('\n2. 检查控制台接口:');
const functions = [
  'setBirthPointAlignment',
  'getBirthPointAlignment', 
  'setBirthPointScreenY',
  'setSceneTime',
  'setUseFixedSun'
];

functions.forEach(funcName => {
  const func = (window as any)[funcName];
  console.log(`- ${funcName}:`, typeof func);
  if (typeof func === 'undefined') {
    console.warn(`  ⚠️ ${funcName} 未定义`);
  } else {
    console.log(`  ✅ ${funcName} 已定义`);
  }
});

// 3. 检查composition对象
console.log('\n3. 检查composition对象:');
try {
  const comp = (window as any).getBirthPointAlignment?.();
  console.log('当前composition状态:', comp);
} catch (e) {
  console.error('获取composition状态失败:', e);
}

// 4. 尝试简单的函数调用
console.log('\n4. 尝试简单的函数调用:');
try {
  if (typeof (window as any).setBirthPointAlignment === 'function') {
    console.log('尝试启用出生点对齐...');
    (window as any).setBirthPointAlignment(true, 0, 0, 10);
    console.log('✅ 出生点对齐已启用');
  } else {
    console.error('❌ setBirthPointAlignment 函数不可用');
  }
} catch (e) {
  console.error('❌ 函数调用失败:', e);
}

// 5. 检查页面加载状态
console.log('\n5. 检查页面加载状态:');
console.log('- document.readyState:', document.readyState);
console.log('- 页面是否完全加载:', document.readyState === 'complete');

console.log('\n调试完成！');
console.log('如果函数未定义，请等待页面完全加载后重试。');
