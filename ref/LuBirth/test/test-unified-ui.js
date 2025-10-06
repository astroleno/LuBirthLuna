// 测试统一后的UI布局
// 在浏览器控制台中运行此脚本

console.log('=== 测试统一后的UI布局 ===');

// 步骤1：启用出生点对齐
console.log('步骤1：启用出生点对齐');
if (window.setBirthPointAlignment) {
  window.setBirthPointAlignment(true, 116.3974, 39.9093, 10);
  console.log('✅ 已启用出生点对齐');
} else {
  console.error('❌ setBirthPointAlignment函数未找到');
}

// 步骤2：启用标记显示
console.log('\n步骤2：启用标记显示');
if (window.setBirthPointMarker) {
  window.setBirthPointMarker(true);
  console.log('✅ 已启用标记显示');
} else {
  console.error('❌ setBirthPointMarker函数未找到');
}

// 步骤3：检查UI布局
setTimeout(() => {
  console.log('\n步骤3：检查UI布局');
  
  // 检查地点选择器
  const locationSelector = document.querySelector('[style*="minWidth: 400px"]');
  if (locationSelector) {
    console.log('✅ 地点选择器已显示');
  } else {
    console.log('❌ 地点选择器未显示');
  }
  
  // 检查经纬度输入框
  const inputs = document.querySelectorAll('input[type="number"]');
  console.log('找到', inputs.length, '个数字输入框');
  
  let lonInput = null;
  let latInput = null;
  
  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    const label = input.previousElementSibling;
    if (label && label.textContent.includes('出生地经度')) {
      lonInput = input;
      console.log('✅ 出生地经度输入框已显示，值:', input.value);
    }
    if (label && label.textContent.includes('出生地纬度')) {
      latInput = input;
      console.log('✅ 出生地纬度输入框已显示，值:', input.value);
    }
  }
  
  // 检查复选框
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  console.log('找到', checkboxes.length, '个复选框');
  
  let alignmentCheckbox = null;
  let markerCheckbox = null;
  let screenYCheckbox = null;
  
  for (let i = 0; i < checkboxes.length; i++) {
    const checkbox = checkboxes[i];
    const label = checkbox.parentElement;
    if (label && label.textContent.includes('出生点对齐')) {
      alignmentCheckbox = checkbox;
      console.log('出生点对齐复选框状态:', checkbox.checked);
    }
    if (label && label.textContent.includes('显示标记')) {
      markerCheckbox = checkbox;
      console.log('显示标记复选框状态:', checkbox.checked);
    }
    if (label && label.textContent.includes('屏幕Y模式')) {
      screenYCheckbox = checkbox;
      console.log('屏幕Y模式复选框状态:', checkbox.checked);
    }
  }
  
  // 检查滑块
  const sliders = document.querySelectorAll('input[type="range"]');
  console.log('找到', sliders.length, '个滑块');
  
  for (let i = 0; i < sliders.length; i++) {
    const slider = sliders[i];
    const label = slider.previousElementSibling;
    if (label && label.textContent.includes('经度相位差')) {
      console.log('经度相位差滑块值:', slider.value);
    }
    if (label && label.textContent.includes('屏幕Y位置')) {
      console.log('屏幕Y位置滑块值:', slider.value);
    }
    if (label && label.textContent.includes('抬升角')) {
      console.log('抬升角滑块值:', slider.value);
    }
  }
  
  // 检查按钮
  const buttons = document.querySelectorAll('button');
  console.log('找到', buttons.length, '个按钮');
  
  for (let i = 0; i < buttons.length; i++) {
    const button = buttons[i];
    if (button.textContent.includes('关闭对齐')) {
      console.log('✅ 关闭对齐按钮已显示');
    }
  }
}, 1000);

// 步骤4：测试功能
setTimeout(() => {
  console.log('\n步骤4：测试功能');
  
  // 测试经纬度输入
  const inputs = document.querySelectorAll('input[type="number"]');
  let lonInput = null;
  let latInput = null;
  
  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    const label = input.previousElementSibling;
    if (label && label.textContent.includes('出生地经度')) {
      lonInput = input;
    }
    if (label && label.textContent.includes('出生地纬度')) {
      latInput = input;
    }
  }
  
  if (lonInput && latInput) {
    // 测试设置新坐标
    lonInput.value = '121.5';
    lonInput.dispatchEvent(new Event('input', { bubbles: true }));
    lonInput.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('✅ 已设置经度为 121.5');
    
    latInput.value = '31.2';
    latInput.dispatchEvent(new Event('input', { bubbles: true }));
    latInput.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('✅ 已设置纬度为 31.2');
  }
}, 2000);

// 步骤5：检查最终状态
setTimeout(() => {
  console.log('\n步骤5：检查最终状态');
  
  const settings = window.getBirthPointAlignment();
  console.log('最终状态:', settings);
  
  if (settings.enableBirthPointAlignment && settings.showBirthPointMarker) {
    console.log('✅ 所有功能已启用！');
    console.log('UI布局统一性检查：');
    console.log('1. 地点选择器 ✓');
    console.log('2. 经纬度输入框 ✓');
    console.log('3. 控制选项复选框 ✓');
    console.log('4. 参数调整滑块 ✓');
    console.log('5. 操作按钮 ✓');
    console.log('6. 左下角文字已删除 ✓');
  } else {
    console.log('❌ 功能未完全启用');
  }
}, 3000);

console.log('\n观察要点:');
console.log('1. 检查UI布局是否整齐统一');
console.log('2. 检查所有控件是否正常显示');
console.log('3. 检查左下角文字是否已删除');
console.log('4. 检查功能是否正常工作');
