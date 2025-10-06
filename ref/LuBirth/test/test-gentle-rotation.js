// 测试温和的相机旋转
// 在浏览器控制台中运行此脚本

console.log('=== 测试温和的相机旋转 ===');

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

// 步骤2：测试温和旋转
setTimeout(() => {
  console.log('\n步骤2：测试温和旋转');
  
  if (window.setBirthPointAlignment) {
    // 测试1：上海（温和旋转）
    window.setBirthPointAlignment(true, 121.5, 31.2, 10); // 上海
    console.log('✅ 已设置上海坐标 (121.5°E, 31.2°N)');
    console.log('预期旋转：经度差58.5度，纬度差48.8度');
    console.log('预期Yaw旋转：', (58.5 * 0.1).toFixed(1), '度');
    console.log('预期Pitch旋转：', (48.8 * 0.1).toFixed(1), '度');
    
    setTimeout(() => {
      // 测试2：北京（温和旋转）
      window.setBirthPointAlignment(true, 116.4, 39.9, 10); // 北京
      console.log('✅ 已设置北京坐标 (116.4°E, 39.9°N)');
      console.log('预期旋转：经度差63.6度，纬度差40.1度');
      console.log('预期Yaw旋转：', (63.6 * 0.1).toFixed(1), '度');
      console.log('预期Pitch旋转：', (40.1 * 0.1).toFixed(1), '度');
      
      setTimeout(() => {
        // 测试3：广州（温和旋转）
        window.setBirthPointAlignment(true, 113.3, 23.1, 10); // 广州
        console.log('✅ 已设置广州坐标 (113.3°E, 23.1°N)');
        console.log('预期旋转：经度差66.7度，纬度差56.9度');
        console.log('预期Yaw旋转：', (66.7 * 0.1).toFixed(1), '度');
        console.log('预期Pitch旋转：', (56.9 * 0.1).toFixed(1), '度');
        
        setTimeout(() => {
          // 测试4：赤道（温和旋转）
          window.setBirthPointAlignment(true, 0, 0, 10); // 赤道
          console.log('✅ 已设置赤道坐标 (0°E, 0°N)');
          console.log('预期旋转：经度差180度，纬度差80度');
          console.log('预期Yaw旋转：', (180 * 0.1).toFixed(1), '度');
          console.log('预期Pitch旋转：', (80 * 0.1).toFixed(1), '度');
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
  console.log('3. 相机是否发生温和的旋转（不会飞得太远）');
  console.log('4. 地球在画面中的位置是否发生轻微变化');
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
    { name: '上海', lon: 121.5, lat: 31.2 },
    { name: '北京', lon: 116.4, lat: 39.9 },
    { name: '广州', lon: 113.3, lat: 23.1 },
    { name: '赤道', lon: 0, lat: 0 }
  ];
  
  console.log('各坐标的预期旋转角度:');
  testCoords.forEach(coord => {
    const lonDiff = targetLon - coord.lon;
    const latDiff = targetLat - coord.lat;
    const yaw = lonDiff * 0.1;
    const pitch = latDiff * 0.1;
    
    console.log(`${coord.name} (${coord.lon}°E, ${coord.lat}°N):`);
    console.log(`  - 经度差: ${lonDiff.toFixed(1)}度, 纬度差: ${latDiff.toFixed(1)}度`);
    console.log(`  - Yaw旋转: ${yaw.toFixed(1)}度, Pitch旋转: ${pitch.toFixed(1)}度`);
  });
}, 10000);

console.log('\n观察要点:');
console.log('1. 缩放因子已减少到0.1，旋转效果应该更温和');
console.log('2. 观察相机是否发生温和的旋转（不会飞得太远）');
console.log('3. 观察地球在画面中的位置变化');
console.log('4. 检查红色标记是否出现');
console.log('5. 如果旋转太温和，可以适当增加缩放因子到0.2或0.3');
