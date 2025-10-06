// 测试相位差：确定正确的坐标转换
// 在浏览器控制台中运行此脚本

console.log('=== 相位差测试：确定正确的坐标转换 ===');

// 使用北京天安门作为测试点
const testPoint = { name: '北京天安门', lon: 116.3974, lat: 39.9093 };

// 测试不同的相位差
const phaseShifts = [0, 90, 180, 270];

let index = 0;

function testPhaseShift() {
  if (index >= phaseShifts.length) {
    console.log('\n=== 测试完成 ===');
    console.log('请根据观察结果确定正确的相位差:');
    console.log('- 0°: 无偏移');
    console.log('- 90°: 经度+90°');
    console.log('- 180°: 经度+180°');
    console.log('- 270°: 经度+270°');
    console.log('\n选择标准:');
    console.log('1. 北京天安门应该在球体正面中央偏上');
    console.log('2. 红色标记应该准确显示在北京天安门位置');
    console.log('3. 出生点应该对齐到球体的180°经度、北纬80°位置');
    return;
  }
  
  const phaseShift = phaseShifts[index];
  
  console.log(`\n${index + 1}. 测试相位差: ${phaseShift}°`);
  console.log(`   测试点: ${testPoint.name}`);
  console.log(`   原始坐标: 经度=${testPoint.lon}°, 纬度=${testPoint.lat}°`);
  console.log(`   调整后经度: ${testPoint.lon + phaseShift}°`);
  
  // 设置相位差
  if (window.setLongitudePhaseShift) {
    window.setLongitudePhaseShift(phaseShift);
  } else {
    console.error('setLongitudePhaseShift 函数未找到');
    return;
  }
  
  // 设置出生点对齐
  if (window.setBirthPointAlignment) {
    window.setBirthPointAlignment(true, testPoint.lon, testPoint.lat, 10);
  } else {
    console.error('setBirthPointAlignment 函数未找到');
    return;
  }
  
  // 显示红色标记
  if (window.setBirthPointMarker) {
    window.setBirthPointMarker(true, 0.1, '#ff0000');
  } else {
    console.error('setBirthPointMarker 函数未找到');
    return;
  }
  
  console.log('观察要点:');
  console.log('1. 红色标记是否准确显示在北京天安门位置？');
  console.log('2. 出生点是否对齐到球体的180°经度、北纬80°位置？');
  console.log('3. 地球构图是否保持一致？');
  
  index++;
  setTimeout(testPhaseShift, 3000); // 等待3秒后测试下一个
}

// 开始测试
console.log('开始相位差测试...');
console.log('目标: 确定正确的坐标转换，让地标出现在正确位置');
console.log('方法: 测试不同相位差，观察地标位置是否符合预期');
testPhaseShift();
