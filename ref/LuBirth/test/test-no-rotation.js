// 测试无旋转对齐
// 在浏览器控制台中运行此脚本

console.log('=== 无旋转对齐测试 ===');

// 测试北京天安门
const testPoint = { name: '北京天安门', lon: 116.3974, lat: 39.9093 };

console.log('开始测试无旋转对齐...');
console.log('方法: 完全禁用相机旋转，只使用位置调整');

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

console.log('观察要点:');
console.log('1. 相机是否保持在合理位置？');
console.log('2. 红色标记是否准确显示在北京天安门位置？');
console.log('3. 地球构图是否保持一致？');

console.log('\n如果还是有问题，我们可以尝试:');
console.log('1. 完全禁用出生点对齐功能');
console.log('2. 只使用红色标记显示位置');
console.log('3. 重新设计对齐算法');
