// 修复状态同步问题
// 在浏览器控制台中运行此脚本

console.log('=== 修复状态同步问题 ===');

// 方法1：强制触发React重新渲染
console.log('方法1：强制触发React重新渲染');

// 找到React根元素并强制更新
const reactRoot = document.querySelector('#root');
if (reactRoot) {
  console.log('找到React根元素');
  
  // 尝试触发重新渲染
  const event = new Event('resize', { bubbles: true });
  window.dispatchEvent(event);
  console.log('✅ 已触发resize事件');
  
  // 尝试触发focus事件
  const focusEvent = new Event('focus', { bubbles: true });
  window.dispatchEvent(focusEvent);
  console.log('✅ 已触发focus事件');
} else {
  console.error('❌ 没有找到React根元素');
}

// 方法2：使用正确的setBirthPointAlignment函数
setTimeout(() => {
  console.log('\n方法2：使用setBirthPointAlignment函数');
  
  if (window.setBirthPointAlignment) {
    // 先启用对齐
    window.setBirthPointAlignment(true, 116.3974, 39.9093, 10);
    console.log('✅ 已设置出生点对齐');
    
    // 再启用标记显示
    if (window.setBirthPointMarker) {
      window.setBirthPointMarker(true);
      console.log('✅ 已启用标记显示');
    }
    
    // 检查结果
    setTimeout(() => {
      const settings = window.getBirthPointAlignment();
      console.log('设置结果:', settings);
      
      if (settings.enableBirthPointAlignment && settings.showBirthPointMarker) {
        console.log('✅ 状态同步成功！');
      } else {
        console.log('❌ 状态同步失败');
      }
    }, 500);
  } else {
    console.error('❌ setBirthPointAlignment函数未找到');
  }
}, 1000);

// 方法3：检查UI状态
setTimeout(() => {
  console.log('\n方法3：检查UI状态');
  
  // 检查复选框状态
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  console.log('找到', checkboxes.length, '个复选框');
  
  // 检查出生点对齐复选框
  const alignmentCheckbox = checkboxes[0];
  if (alignmentCheckbox) {
    console.log('出生点对齐复选框状态:', alignmentCheckbox.checked);
  }
  
  // 检查显示标记复选框
  const markerCheckbox = checkboxes[checkboxes.length - 1];
  if (markerCheckbox) {
    console.log('显示标记复选框状态:', markerCheckbox.checked);
  }
  
  // 检查输入框状态
  const inputs = document.querySelectorAll('input[type="number"]');
  if (inputs.length >= 2) {
    console.log('经度输入框值:', inputs[0].value);
    console.log('纬度输入框值:', inputs[1].value);
  }
}, 2000);

// 方法4：如果还是不行，尝试重新加载页面
setTimeout(() => {
  console.log('\n方法4：检查最终状态');
  
  const settings = window.getBirthPointAlignment();
  console.log('最终状态:', settings);
  
  if (!settings.enableBirthPointAlignment || !settings.showBirthPointMarker) {
    console.log('⚠️ 状态同步仍然失败，建议：');
    console.log('1. 刷新页面重新开始');
    console.log('2. 手动勾选UI上的复选框');
    console.log('3. 检查控制台是否有错误信息');
  } else {
    console.log('✅ 所有功能已正常工作！');
  }
}, 3000);

console.log('\n观察要点:');
console.log('1. 检查控制台输出，看哪个方法有效');
console.log('2. 检查UI上的复选框状态是否改变');
console.log('3. 检查红色标记是否出现');
console.log('4. 如果还是不行，请刷新页面重试');
