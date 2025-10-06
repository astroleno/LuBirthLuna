// 测试大角度相机旋转
// 在浏览器控制台中运行此脚本

console.log('=== 测试大角度相机旋转 ===');

// 步骤1：启用出生点对齐
console.log('步骤1：启用出生点对齐');

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

// 步骤2：测试大角度旋转
setTimeout(() => {
  console.log('\n步骤2：测试大角度旋转');
  
  if (window.setBirthPointAlignment) {
    // 测试1：从赤道到北极（大角度旋转）
    window.setBirthPointAlignment(true, 0, 0, 10); // 赤道
    console.log('✅ 已设置赤道坐标 (0°E, 0°N)');
    console.log('预期旋转：经度差180度，纬度差80度');
    console.log('预期Yaw旋转：', (180 * 0.8).toFixed(1), '度');
    console.log('预期Pitch旋转：', (80 * 0.8).toFixed(1), '度');
    
    setTimeout(() => {
      // 测试2：从赤道到南极（大角度旋转）
      window.setBirthPointAlignment(true, 0, -80, 10); // 南极附近
      console.log('✅ 已设置南极坐标 (0°E, -80°N)');
      console.log('预期旋转：经度差180度，纬度差160度');
      console.log('预期Yaw旋转：', (180 * 0.8).toFixed(1), '度');
      console.log('预期Pitch旋转：', (160 * 0.8).toFixed(1), '度');
      
      setTimeout(() => {
        // 测试3：从赤道到对跖点（大角度旋转）
        window.setBirthPointAlignment(true, 180, 0, 10); // 对跖点
        console.log('✅ 已设置对跖点坐标 (180°E, 0°N)');
        console.log('预期旋转：经度差0度，纬度差80度');
        console.log('预期Yaw旋转：', (0 * 0.8).toFixed(1), '度');
        console.log('预期Pitch旋转：', (80 * 0.8).toFixed(1), '度');
        
        setTimeout(() => {
          // 测试4：从赤道到北极（最大旋转）
          window.setBirthPointAlignment(true, 90, 90, 10); // 北极
          console.log('✅ 已设置北极坐标 (90°E, 90°N)');
          console.log('预期旋转：经度差90度，纬度差-10度');
          console.log('预期Yaw旋转：', (90 * 0.8).toFixed(1), '度');
          console.log('预期Pitch旋转：', (-10 * 0.8).toFixed(1), '度');
        }, 2000);
      }, 2000);
    }, 2000);
  } else {
    console.error('❌ setBirthPointAlignment函数未找到');
  }
}, 1000);

// 步骤3：检查旋转效果
setTimeout(() => {
  console.log('\n步骤3：检查旋转效果');
  
  console.log('请观察以下内容:');
  console.log('1. 控制台是否有[BirthPointAlignment] 旋转计算日志');
  console.log('2. 控制台是否有[SimpleCamera] 出生点对齐相机旋转日志');
  console.log('3. 相机是否发生明显的旋转');
  console.log('4. 地球在画面中的位置是否发生变化');
  console.log('5. 红色标记是否出现在地球表面');
  
  // 检查当前状态
  const settings = window.getBirthPointAlignment();
  console.log('当前设置:', settings);
}, 8000);

// 步骤4：计算预期旋转角度
setTimeout(() => {
  console.log('\n步骤4：计算预期旋转角度');
  
  const targetLon = 180;
  const targetLat = 80;
  
  // 测试不同坐标的旋转角度
  const testCoords = [
    { name: '赤道', lon: 0, lat: 0 },
    { name: '南极', lon: 0, lat: -80 },
    { name: '对跖点', lon: 180, lat: 0 },
    { name: '北极', lon: 90, lat: 90 }
  ];
  
  console.log('各坐标的预期旋转角度:');
  testCoords.forEach(coord => {
    const lonDiff = targetLon - coord.lon;
    const latDiff = targetLat - coord.lat;
    const yaw = lonDiff * 0.8;
    const pitch = latDiff * 0.8;
    
    console.log(`${coord.name} (${coord.lon}°E, ${coord.lat}°N):`);
    console.log(`  - 经度差: ${lonDiff}度, 纬度差: ${latDiff}度`);
    console.log(`  - Yaw旋转: ${yaw.toFixed(1)}度, Pitch旋转: ${pitch.toFixed(1)}度`);
  });
}, 10000);

console.log('\n观察要点:');
console.log('1. 缩放因子已增加到0.8，旋转效果应该更明显');
console.log('2. 观察相机是否发生明显的旋转');
console.log('3. 观察地球在画面中的位置变化');
console.log('4. 检查红色标记是否出现');
console.log('5. 如果还是看不出效果，可能需要进一步增加缩放因子');
