// 测试相机旋转调试
// 在浏览器控制台中运行此脚本

console.log('=== 测试相机旋转调试 ===');

// 步骤1：检查当前URL参数
console.log('步骤1：检查当前URL参数');
const currentUrl = window.location.href;
console.log('当前URL:', currentUrl);

if (currentUrl.includes('debug=1')) {
  console.log('✅ 已启用调试模式');
} else {
  console.log('❌ 未启用调试模式，需要添加debug=1参数');
  console.log('请访问:', currentUrl + (currentUrl.includes('?') ? '&' : '?') + 'debug=1');
}

// 步骤2：强制启用出生点对齐
console.log('\n步骤2：强制启用出生点对齐');

// 直接操作复选框
const checkboxes = document.querySelectorAll('input[type="checkbox"]');
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
  if (!alignmentCheckbox.checked) {
    alignmentCheckbox.checked = true;
    alignmentCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('✅ 已启用出生点对齐复选框');
  } else {
    console.log('出生点对齐复选框已经选中');
  }
} else {
  console.log('❌ 没有找到出生点对齐复选框');
}

// 步骤3：设置出生点坐标
setTimeout(() => {
  console.log('\n步骤3：设置出生点坐标');
  
  if (window.setBirthPointAlignment) {
    // 设置北京坐标
    window.setBirthPointAlignment(true, 116.3974, 39.9093, 10);
    console.log('✅ 已设置北京坐标 (116.4°E, 39.9°N)');
    
    // 启用标记显示
    if (window.setBirthPointMarker) {
      window.setBirthPointMarker(true);
      console.log('✅ 已启用标记显示');
    }
  } else {
    console.error('❌ setBirthPointAlignment函数未找到');
  }
}, 1000);

// 步骤4：检查相机旋转日志
setTimeout(() => {
  console.log('\n步骤4：检查相机旋转日志');
  
  console.log('请观察控制台是否有以下日志:');
  console.log('1. [BirthPointAlignment] - 出生点对齐参数');
  console.log('2. [SimpleCamera] - 相机位置和旋转信息');
  console.log('3. [BirthPointMarker] - 标记显示信息');
  
  // 检查当前状态
  const settings = window.getBirthPointAlignment();
  console.log('当前设置:', settings);
  
  if (settings.enableBirthPointAlignment) {
    console.log('✅ 出生点对齐已启用');
  } else {
    console.log('❌ 出生点对齐未启用');
  }
}, 2000);

// 步骤5：测试不同坐标的旋转
setTimeout(() => {
  console.log('\n步骤5：测试不同坐标的旋转');
  
  if (window.setBirthPointAlignment) {
    // 测试赤道坐标
    window.setBirthPointAlignment(true, 0, 0, 10);
    console.log('✅ 已设置赤道坐标 (0°E, 0°N)');
    
    setTimeout(() => {
      // 测试对跖点坐标
      window.setBirthPointAlignment(true, 180, 0, 10);
      console.log('✅ 已设置对跖点坐标 (180°E, 0°N)');
      
      setTimeout(() => {
        // 测试北极坐标
        window.setBirthPointAlignment(true, 90, 90, 10);
        console.log('✅ 已设置北极坐标 (90°E, 90°N)');
        
        console.log('请观察相机是否发生旋转');
      }, 1000);
    }, 1000);
  }
}, 3000);

// 步骤6：检查相机旋转计算
setTimeout(() => {
  console.log('\n步骤6：检查相机旋转计算');
  
  // 手动计算旋转角度
  const targetLongitude = 180;
  const targetLatitude = 80;
  const currentLongitude = 116.3974;
  const currentLatitude = 39.9093;
  
  const longitudeDiff = targetLongitude - currentLongitude;
  const latitudeDiff = targetLatitude - currentLatitude;
  
  const yaw = longitudeDiff * 0.1;
  const pitch = latitudeDiff * 0.1;
  
  console.log('手动计算旋转角度:');
  console.log('- 经度差:', longitudeDiff.toFixed(2), '度');
  console.log('- 纬度差:', latitudeDiff.toFixed(2), '度');
  console.log('- Yaw旋转:', yaw.toFixed(2), '度');
  console.log('- Pitch旋转:', pitch.toFixed(2), '度');
  
  if (Math.abs(yaw) > 0.1 || Math.abs(pitch) > 0.1) {
    console.log('✅ 应该有明显的相机旋转');
  } else {
    console.log('❌ 旋转角度太小，可能看不出效果');
  }
}, 4000);

console.log('\n重要提醒:');
console.log('1. 如果看不到相机旋转日志，请访问带debug=1参数的URL');
console.log('2. 观察控制台是否有[BirthPointAlignment]和[SimpleCamera]日志');
console.log('3. 检查红色标记是否出现在地球表面');
console.log('4. 检查相机是否发生轻微旋转');
