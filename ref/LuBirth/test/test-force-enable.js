// 强制启用出生点对齐UI
// 在浏览器控制台中运行此脚本

console.log('=== 强制启用出生点对齐UI ===');

// 步骤1：直接操作UI复选框
console.log('步骤1：直接操作UI复选框');

// 找到出生点对齐复选框
const checkboxes = document.querySelectorAll('input[type="checkbox"]');
console.log('找到', checkboxes.length, '个复选框');

let alignmentCheckbox = null;
for (let i = 0; i < checkboxes.length; i++) {
  const checkbox = checkboxes[i];
  const label = checkbox.parentElement;
  if (label && label.textContent.includes('出生点对齐')) {
    alignmentCheckbox = checkbox;
    break;
  }
}

if (alignmentCheckbox) {
  console.log('找到出生点对齐复选框，当前状态:', alignmentCheckbox.checked);
  
  if (!alignmentCheckbox.checked) {
    // 强制选中复选框
    alignmentCheckbox.checked = true;
    alignmentCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('✅ 已强制选中出生点对齐复选框');
  } else {
    console.log('出生点对齐复选框已经选中');
  }
} else {
  console.log('❌ 没有找到出生点对齐复选框');
}

// 步骤2：等待UI更新后检查LocationSelector
setTimeout(() => {
  console.log('\n步骤2：检查LocationSelector是否显示');
  
  const locationSelector = document.querySelector('.location-selector');
  if (locationSelector) {
    console.log('✅ LocationSelector已显示');
    
    // 检查样式
    const searchInput = locationSelector.querySelector('.search-input');
    if (searchInput) {
      const styles = window.getComputedStyle(searchInput);
      console.log('搜索框样式:');
      console.log('- 背景色:', styles.backgroundColor);
      console.log('- 边框色:', styles.borderColor);
      console.log('- 文字色:', styles.color);
    }
  } else {
    console.log('❌ LocationSelector仍未显示');
    
    // 尝试手动创建LocationSelector
    console.log('尝试手动创建LocationSelector...');
    
    // 找到出生点对齐的容器
    const alignmentContainer = document.querySelector('[style*="minWidth: 400px"]');
    if (alignmentContainer) {
      console.log('找到对齐容器，但LocationSelector未显示');
    } else {
      console.log('没有找到对齐容器');
    }
  }
}, 1000);

// 步骤3：强制设置状态
setTimeout(() => {
  console.log('\n步骤3：强制设置状态');
  
  if (window.setBirthPointAlignment) {
    window.setBirthPointAlignment(true, 116.3974, 39.9093, 10);
    console.log('✅ 已调用setBirthPointAlignment');
    
    // 启用标记显示
    if (window.setBirthPointMarker) {
      window.setBirthPointMarker(true);
      console.log('✅ 已启用标记显示');
    }
    
    // 检查状态
    setTimeout(() => {
      const settings = window.getBirthPointAlignment();
      console.log('当前设置:', settings);
      
      if (settings.enableBirthPointAlignment) {
        console.log('✅ 出生点对齐已启用');
      } else {
        console.log('❌ 出生点对齐未启用');
      }
    }, 500);
  }
}, 2000);

// 步骤4：检查相机旋转
setTimeout(() => {
  console.log('\n步骤4：检查相机旋转');
  
  // 检查是否有相机旋转的日志
  console.log('请观察控制台是否有相机旋转相关的日志');
  console.log('如果没有，说明相机旋转功能没有生效');
  
  // 尝试设置不同的坐标来测试
  if (window.setBirthPointAlignment) {
    window.setBirthPointAlignment(true, 0, 0, 10); // 设置到赤道
    console.log('✅ 已设置到赤道 (0°E, 0°N)');
    
    setTimeout(() => {
      window.setBirthPointAlignment(true, 180, 0, 10); // 设置到对跖点
      console.log('✅ 已设置到对跖点 (180°E, 0°N)');
      
      setTimeout(() => {
        window.setBirthPointAlignment(true, 90, 90, 10); // 设置到北极
        console.log('✅ 已设置到北极 (90°E, 90°N)');
      }, 1000);
    }, 1000);
  }
}, 3000);

// 步骤5：检查相机控制函数
setTimeout(() => {
  console.log('\n步骤5：检查相机控制函数');
  
  // 检查是否有相机控制相关的函数
  if (window.setSceneTime) {
    console.log('✅ setSceneTime函数存在');
  } else {
    console.log('❌ setSceneTime函数不存在');
  }
  
  if (window.setUseFixedSun) {
    console.log('✅ setUseFixedSun函数存在');
  } else {
    console.log('❌ setUseFixedSun函数不存在');
  }
  
  // 检查是否有相机旋转的日志
  console.log('请检查控制台是否有以下日志:');
  console.log('- [BirthPointAlignment] 日志');
  console.log('- [SimpleCamera] 日志');
  console.log('- [BirthPointMarker] 日志');
}, 4000);

console.log('\n观察要点:');
console.log('1. 检查出生点对齐复选框是否被选中');
console.log('2. 检查LocationSelector是否显示');
console.log('3. 检查控制台是否有相机旋转相关日志');
console.log('4. 检查红色标记是否出现');
console.log('5. 检查相机是否发生旋转');
