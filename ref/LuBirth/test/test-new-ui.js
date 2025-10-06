// 测试新的UI布局
// 在浏览器控制台中运行此脚本

console.log('=== 测试新的UI布局 ===');

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

// 步骤3：检查UI元素
setTimeout(() => {
  console.log('\n步骤3：检查UI元素');
  
  // 检查地点选择器
  const locationSelector = document.querySelector('[style*="minWidth: 400px"]');
  if (locationSelector) {
    console.log('✅ 找到地点选择器');
  } else {
    console.log('❌ 没有找到地点选择器');
  }
  
  // 检查经度输入框
  const lonInputs = document.querySelectorAll('input[type="number"]');
  console.log('找到', lonInputs.length, '个数字输入框');
  
  // 查找出生地经度输入框
  let lonInput = null;
  let latInput = null;
  
  for (let i = 0; i < lonInputs.length; i++) {
    const input = lonInputs[i];
    const label = input.previousElementSibling;
    if (label && label.textContent.includes('出生地经度')) {
      lonInput = input;
      console.log('✅ 找到出生地经度输入框，值:', input.value);
    }
    if (label && label.textContent.includes('出生地纬度')) {
      latInput = input;
      console.log('✅ 找到出生地纬度输入框，值:', input.value);
    }
  }
  
  if (!lonInput) {
    console.log('❌ 没有找到出生地经度输入框');
  }
  if (!latInput) {
    console.log('❌ 没有找到出生地纬度输入框');
  }
  
  // 检查复选框
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  console.log('找到', checkboxes.length, '个复选框');
  
  // 查找相关复选框
  for (let i = 0; i < checkboxes.length; i++) {
    const checkbox = checkboxes[i];
    const label = checkbox.parentElement;
    if (label && label.textContent.includes('出生点对齐')) {
      console.log('出生点对齐复选框状态:', checkbox.checked);
    }
    if (label && label.textContent.includes('显示标记')) {
      console.log('显示标记复选框状态:', checkbox.checked);
    }
    if (label && label.textContent.includes('屏幕Y模式')) {
      console.log('屏幕Y模式复选框状态:', checkbox.checked);
    }
  }
}, 1000);

// 步骤4：测试输入框功能
setTimeout(() => {
  console.log('\n步骤4：测试输入框功能');
  
  // 查找经度输入框
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
    
    // 检查状态更新
    setTimeout(() => {
      const settings = window.getBirthPointAlignment();
      console.log('更新后的状态:', settings);
      
      if (settings.birthPointLongitudeDeg === 121.5 && settings.birthPointLatitudeDeg === 31.2) {
        console.log('✅ 输入框功能正常！');
      } else {
        console.log('❌ 输入框功能异常');
      }
    }, 500);
  } else {
    console.log('❌ 无法找到输入框进行测试');
  }
}, 2000);

// 步骤5：检查最终状态
setTimeout(() => {
  console.log('\n步骤5：检查最终状态');
  
  const settings = window.getBirthPointAlignment();
  console.log('最终状态:', settings);
  
  if (settings.enableBirthPointAlignment && settings.showBirthPointMarker) {
    console.log('✅ 所有功能已启用！');
    console.log('请检查：');
    console.log('1. 地点选择器是否显示');
    console.log('2. 经度纬度输入框是否显示');
    console.log('3. 红色标记是否出现');
    console.log('4. 相机是否发生旋转');
  } else {
    console.log('❌ 功能未完全启用');
  }
}, 3000);

console.log('\n观察要点:');
console.log('1. 检查UI布局是否整齐');
console.log('2. 检查地点选择器和输入框是否都显示');
console.log('3. 检查输入框功能是否正常');
console.log('4. 检查红色标记是否出现');
