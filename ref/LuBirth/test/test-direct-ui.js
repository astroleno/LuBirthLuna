// 直接操作UI元素测试
// 在浏览器控制台中运行此脚本

console.log('=== 直接操作UI元素测试 ===');

// 方法1：直接操作复选框
console.log('方法1：直接操作出生点对齐复选框');

// 找到出生点对齐复选框
const alignmentCheckbox = document.querySelector('input[type="checkbox"]');
if (alignmentCheckbox) {
  console.log('找到复选框:', alignmentCheckbox);
  
  // 检查当前状态
  console.log('当前状态:', alignmentCheckbox.checked);
  
  // 如果未选中，则选中
  if (!alignmentCheckbox.checked) {
    alignmentCheckbox.checked = true;
    alignmentCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('✅ 已选中出生点对齐复选框');
  } else {
    console.log('出生点对齐复选框已经选中');
  }
} else {
  console.error('❌ 没有找到出生点对齐复选框');
}

// 方法2：直接操作显示标记复选框
setTimeout(() => {
  console.log('\n方法2：直接操作显示标记复选框');
  
  // 找到所有复选框
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  console.log('找到', checkboxes.length, '个复选框');
  
  // 找到显示标记复选框（通常是最后一个）
  const markerCheckbox = checkboxes[checkboxes.length - 1];
  if (markerCheckbox) {
    console.log('找到显示标记复选框:', markerCheckbox);
    console.log('当前状态:', markerCheckbox.checked);
    
    if (!markerCheckbox.checked) {
      markerCheckbox.checked = true;
      markerCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('✅ 已选中显示标记复选框');
    } else {
      console.log('显示标记复选框已经选中');
    }
  } else {
    console.error('❌ 没有找到显示标记复选框');
  }
}, 500);

// 方法3：直接设置输入框值
setTimeout(() => {
  console.log('\n方法3：直接设置经纬度输入框');
  
  // 找到经度输入框
  const lonInputs = document.querySelectorAll('input[type="number"]');
  console.log('找到', lonInputs.length, '个数字输入框');
  
  // 尝试设置经度（通常是第一个数字输入框）
  if (lonInputs.length > 0) {
    const lonInput = lonInputs[0];
    console.log('设置经度输入框:', lonInput);
    lonInput.value = '116.3974';
    lonInput.dispatchEvent(new Event('input', { bubbles: true }));
    lonInput.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('✅ 已设置经度为 116.3974');
  }
  
  // 尝试设置纬度（通常是第二个数字输入框）
  if (lonInputs.length > 1) {
    const latInput = lonInputs[1];
    console.log('设置纬度输入框:', latInput);
    latInput.value = '39.9093';
    latInput.dispatchEvent(new Event('input', { bubbles: true }));
    latInput.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('✅ 已设置纬度为 39.9093');
  }
}, 1000);

// 方法4：检查结果
setTimeout(() => {
  console.log('\n方法4：检查结果');
  
  if (window.getBirthPointAlignment) {
    const settings = window.getBirthPointAlignment();
    console.log('最终设置:', settings);
    
    if (settings.enableBirthPointAlignment) {
      console.log('✅ 出生点对齐已启用');
    } else {
      console.log('❌ 出生点对齐未启用');
    }
    
    if (settings.showBirthPointMarker) {
      console.log('✅ 显示标记已启用');
    } else {
      console.log('❌ 显示标记未启用');
    }
    
    console.log('经度:', settings.birthPointLongitudeDeg);
    console.log('纬度:', settings.birthPointLatitudeDeg);
  }
}, 2000);

console.log('\n观察要点:');
console.log('1. 检查控制台输出，看哪些操作成功');
console.log('2. 检查UI上的复选框和输入框是否改变');
console.log('3. 检查红色标记是否出现');
console.log('4. 检查相机是否发生旋转');
