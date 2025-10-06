// 测试手动设置坐标
// 在浏览器控制台中运行此脚本

console.log('=== 手动设置坐标测试 ===');

// 测试北京天安门
const testPoint = { name: '北京天安门', lon: 116.3974, lat: 39.9093 };

console.log('开始测试手动设置坐标...');
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

// 设置相位差为0
if (window.setLongitudePhaseShift) {
  window.setLongitudePhaseShift(0);
  console.log('✅ 相位差已设置为 0°');
} else {
  console.error('❌ setLongitudePhaseShift 函数未找到');
}

// 获取当前设置
if (window.getBirthPointAlignment) {
  const settings = window.getBirthPointAlignment();
  console.log('当前设置:', settings);
} else {
  console.error('❌ getBirthPointAlignment 函数未找到');
}

console.log('\n观察要点:');
console.log('1. 红色标记是否出现在北京天安门位置？');
console.log('2. 相机是否发生了旋转？');
console.log('3. 地球构图是否保持一致？');

console.log('\n如果还是没有效果，请检查:');
console.log('1. 出生点对齐复选框是否已勾选');
console.log('2. 显示标记复选框是否已勾选');
console.log('3. 控制台是否有错误信息');
