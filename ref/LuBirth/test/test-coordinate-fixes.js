// 坐标系修正后的测试脚本
// 验证修正后的坐标系是否正确

console.log('=== 坐标系修正验证测试 ===');

// 测试数据：不同城市的坐标
const testCities = [
  { name: '上海', lon: 121.47, lat: 31.23, expected: '屏幕右侧' },
  { name: '北京', lon: 116.41, lat: 39.90, expected: '屏幕右侧' },
  { name: '纽约', lon: -74.01, lat: 40.71, expected: '屏幕左侧' },
  { name: '伦敦', lon: -0.13, lat: 51.51, expected: '屏幕中心偏左' },
  { name: '东京', lon: 139.69, lat: 35.69, expected: '屏幕右侧' },
  { name: '悉尼', lon: 151.21, lat: -33.87, expected: '屏幕右下' },
  { name: '本初子午线', lon: 0, lat: 0, expected: '屏幕中心' },
  { name: '国际日期变更线', lon: 180, lat: 0, expected: '屏幕左侧' }
];

let currentTestIndex = 0;

function runNextTest() {
  if (currentTestIndex >= testCities.length) {
    console.log('\n✅ 所有测试完成！');
    return;
  }
  
  const city = testCities[currentTestIndex];
  console.log(`\n${currentTestIndex + 1}. 测试${city.name} (经度: ${city.lon}°, 纬度: ${city.lat}°)`);
  console.log(`期望位置: ${city.expected}`);
  
  // 设置出生点对齐
  setBirthPointAlignment(true, city.lon, city.lat, 10);
  
  // 等待3秒让用户观察
  setTimeout(() => {
    console.log(`请观察：${city.name}是否出现在${city.expected}？`);
    currentTestIndex++;
    runNextTest();
  }, 3000);
}

// 开始测试
console.log('\n🚀 开始城市坐标测试...');
console.log('每个城市测试3秒，请观察屏幕上的位置是否正确');

// 启用标记以便观察
setBirthPointMarker(true, 0.15, '#ff0000');
setLongitudePhaseShift(0); // 重置相位差

// 开始测试序列
setTimeout(() => {
  runNextTest();
}, 1000);

// 额外的测试：验证默认视图
setTimeout(() => {
  console.log('\n=== 额外测试：默认视图 ===');
  console.log('关闭出生点对齐，观察默认相机位置');
  setBirthPointAlignment(false);
  
  setTimeout(() => {
    console.log('\n默认视图应该显示亚洲/太平洋区域');
    console.log('如果显示不正确，可能需要进一步调整相机参数');
  }, 2000);
}, testCities.length * 3000 + 2000);

// 辅助函数
function setBirthPointAlignment(enabled, longitude = 0, latitude = 0, alpha = 10) {
  if (window.updateComposition) {
    window.updateComposition({
      enableBirthPointAlignment: enabled,
      birthPointLongitudeDeg: longitude,
      birthPointLatitudeDeg: latitude,
      birthPointAlphaDeg: alpha
    });
  }
}

function setBirthPointMarker(enabled, size = 0.1, color = '#ff0000') {
  if (window.updateComposition) {
    window.updateComposition({
      showBirthPointMarker: enabled,
      birthPointMarkerSize: size,
      birthPointMarkerColor: color
    });
  }
}

function setLongitudePhaseShift(shift) {
  if (window.updateComposition) {
    window.updateComposition({
      longitudePhaseShift: shift
    });
  }
}

console.log('\n测试说明：');
console.log('1. 每个城市会显示3秒，请观察红点标记的位置');
console.log('2. 位置应该与期望位置基本吻合');
console.log('3. 如果位置不正确，可能需要进一步调整坐标系');
console.log('4. 最后会测试默认视图');