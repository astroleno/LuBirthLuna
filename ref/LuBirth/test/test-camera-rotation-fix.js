// 测试相机旋转修复
// 在浏览器控制台中运行此脚本

console.log('=== 相机旋转修复测试 ===');

// 测试北京天安门
const testPoint = { name: '北京天安门', lon: 116.3974, lat: 39.9093 };

console.log('开始测试相机旋转修复...');
console.log('修复内容: 移除了 camera.lookAt(0, 0, 0) 调用');
console.log('测试点:', testPoint.name, '坐标:', testPoint.lon, testPoint.lat);

// 设置出生点对齐
if (window.setBirthPointAlignment) {
  window.setBirthPointAlignment(true, testPoint.lon, testPoint.lat, 10);
  console.log('✅ 出生点对齐已设置');
} else {
  console.error('❌ setBirthPointAlignment 函数未找到');
}

// 显示红色标记
if (window.setBirthPointMarker) {
  window.setBirthPointMarker(true, 0.1, '#ff0000');
  console.log('✅ 红色标记已显示');
} else {
  console.error('❌ setBirthPointMarker 函数未找到');
}

// 测试不同相位差
const phaseShifts = [0, 90, 180, 270];
let index = 0;

function testPhaseShift() {
  if (index >= phaseShifts.length) {
    console.log('\n=== 测试完成 ===');
    console.log('观察要点:');
    console.log('1. 相机是否发生了旋转？');
    console.log('2. 红色标记是否准确显示在北京天安门位置？');
    console.log('3. 出生点是否对齐到球体的180°经度、北纬80°位置？');
    console.log('4. 哪个相位差效果最好？');
    return;
  }
  
  const phaseShift = phaseShifts[index];
  console.log(`\n${index + 1}. 测试相位差: ${phaseShift}°`);
  
  // 设置相位差
  if (window.setLongitudePhaseShift) {
    window.setLongitudePhaseShift(phaseShift);
    console.log(`✅ 相位差已设置为 ${phaseShift}°`);
  } else {
    console.error('❌ setLongitudePhaseShift 函数未找到');
    return;
  }
  
  console.log('观察要点:');
  console.log('1. 相机是否发生了旋转？');
  console.log('2. 红色标记位置是否正确？');
  console.log('3. 地球构图是否保持一致？');
  
  index++;
  setTimeout(testPhaseShift, 3000); // 等待3秒后测试下一个
}

// 开始测试
setTimeout(testPhaseShift, 1000);
