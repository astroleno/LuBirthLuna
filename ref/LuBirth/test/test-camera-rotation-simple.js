// 简单测试相机旋转
// 在浏览器控制台中运行此脚本

console.log('=== 简单测试相机旋转 ===');

// 步骤1：启用调试模式
console.log('步骤1：启用调试模式');
const currentUrl = window.location.href;
if (!currentUrl.includes('debug=1')) {
  const newUrl = currentUrl + (currentUrl.includes('?') ? '&' : '?') + 'debug=1';
  console.log('请访问以下URL启用调试模式:');
  console.log(newUrl);
  console.log('然后重新运行此脚本');
} else {
  console.log('✅ 调试模式已启用');
}

// 步骤2：强制启用出生点对齐
console.log('\n步骤2：强制启用出生点对齐');

// 找到并选中出生点对齐复选框
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

// 步骤3：设置出生点坐标并观察日志
setTimeout(() => {
  console.log('\n步骤3：设置出生点坐标并观察日志');
  
  if (window.setBirthPointAlignment) {
    // 设置一个有明显差异的坐标
    window.setBirthPointAlignment(true, 0, 0, 10); // 赤道
    console.log('✅ 已设置赤道坐标 (0°E, 0°N)');
    console.log('请观察控制台是否有[BirthPointAlignment]和[SimpleCamera]日志');
    
    setTimeout(() => {
      window.setBirthPointAlignment(true, 180, 0, 10); // 对跖点
      console.log('✅ 已设置对跖点坐标 (180°E, 0°N)');
      console.log('请观察相机是否发生旋转');
      
      setTimeout(() => {
        window.setBirthPointAlignment(true, 90, 90, 10); // 北极
        console.log('✅ 已设置北极坐标 (90°E, 90°N)');
        console.log('请观察相机是否发生旋转');
      }, 2000);
    }, 2000);
  } else {
    console.error('❌ setBirthPointAlignment函数未找到');
  }
}, 1000);

// 步骤4：检查相机旋转计算
setTimeout(() => {
  console.log('\n步骤4：检查相机旋转计算');
  
  // 计算从赤道到北极的旋转角度
  const fromLon = 0;
  const fromLat = 0;
  const toLon = 180;
  const toLat = 80;
  
  const lonDiff = toLon - fromLon;
  const latDiff = toLat - fromLat;
  
  const yaw = lonDiff * 0.1;
  const pitch = latDiff * 0.1;
  
  console.log('从赤道到目标位置的旋转计算:');
  console.log('- 经度差:', lonDiff, '度');
  console.log('- 纬度差:', latDiff, '度');
  console.log('- Yaw旋转:', yaw, '度');
  console.log('- Pitch旋转:', pitch, '度');
  
  if (Math.abs(yaw) > 1 || Math.abs(pitch) > 1) {
    console.log('✅ 应该有明显的相机旋转');
  } else {
    console.log('❌ 旋转角度太小，可能看不出效果');
    console.log('建议增加缩放因子');
  }
}, 5000);

// 步骤5：检查相机位置
setTimeout(() => {
  console.log('\n步骤5：检查相机位置');
  
  // 尝试获取相机对象
  if (window.scene && window.scene.camera) {
    const camera = window.scene.camera;
    console.log('相机位置:', camera.position);
    console.log('相机旋转:', camera.quaternion);
  } else {
    console.log('无法直接访问相机对象');
  }
}, 6000);

console.log('\n观察要点:');
console.log('1. 确保URL包含debug=1参数');
console.log('2. 观察控制台是否有[BirthPointAlignment]日志');
console.log('3. 观察控制台是否有[SimpleCamera]日志');
console.log('4. 检查相机是否发生旋转');
console.log('5. 检查红色标记是否出现');
