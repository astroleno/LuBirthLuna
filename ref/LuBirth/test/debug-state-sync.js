// 调试状态同步问题
// 在浏览器控制台中运行此脚本

console.log('=== 调试状态同步问题 ===');

// 检查当前状态
if (window.getBirthPointAlignment) {
  const settings = window.getBirthPointAlignment();
  console.log('当前设置:', settings);
} else {
  console.error('❌ getBirthPointAlignment 函数未找到');
}

// 尝试手动设置状态
console.log('\n尝试手动设置状态...');

// 方法1：使用setBirthPointAlignment
if (window.setBirthPointAlignment) {
  console.log('方法1：使用setBirthPointAlignment');
  window.setBirthPointAlignment(true, 116.3974, 39.9093, 10);
  
  setTimeout(() => {
    const settings1 = window.getBirthPointAlignment();
    console.log('方法1结果:', settings1);
  }, 500);
} else {
  console.error('❌ setBirthPointAlignment 函数未找到');
}

// 方法2：直接设置composition
setTimeout(() => {
  console.log('\n方法2：检查composition状态');
  
  // 检查是否有全局的composition对象
  if (window.composition) {
    console.log('全局composition:', window.composition);
  } else {
    console.log('没有找到全局composition对象');
  }
  
  // 检查是否有setComposition函数
  if (window.setComposition) {
    console.log('找到setComposition函数');
    window.setComposition(prev => ({
      ...prev,
      enableBirthPointAlignment: true,
      birthPointLongitudeDeg: 116.3974,
      birthPointLatitudeDeg: 39.9093,
      showBirthPointMarker: true
    }));
    
    setTimeout(() => {
      const settings2 = window.getBirthPointAlignment();
      console.log('方法2结果:', settings2);
    }, 500);
  } else {
    console.log('没有找到setComposition函数');
  }
}, 1000);

// 方法3：检查React组件状态
setTimeout(() => {
  console.log('\n方法3：检查React组件状态');
  
  // 尝试找到React组件
  const reactRoot = document.querySelector('#root');
  if (reactRoot) {
    console.log('找到React根元素');
    
    // 检查是否有React DevTools
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      console.log('React DevTools可用');
    } else {
      console.log('React DevTools不可用');
    }
  } else {
    console.log('没有找到React根元素');
  }
}, 2000);

console.log('\n观察要点:');
console.log('1. 检查控制台输出，看哪个方法有效');
console.log('2. 检查UI上的复选框状态是否改变');
console.log('3. 检查红色标记是否出现');
