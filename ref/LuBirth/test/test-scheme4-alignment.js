// 测试方案4：分层控制出生点对齐
// 在浏览器控制台中运行此脚本

console.log('=== 方案4：分层控制出生点对齐测试 ===');

// 测试不同出生点的构图一致性
const testCases = [
  { name: '北京', lon: 116.4, lat: 39.9 },
  { name: '上海', lon: 121.5, lat: 31.2 },
  { name: '广州', lon: 113.3, lat: 23.1 },
  { name: '纽约', lon: -74.0, lat: 40.7 },
  { name: '伦敦', lon: -0.1, lat: 51.5 },
  { name: '东京', lon: 139.7, lat: 35.7 },
  { name: '悉尼', lon: 151.2, lat: -33.9 },
  { name: '北极', lon: 0, lat: 85.0 }, // 极区测试
];

let currentIndex = 0;

function testNextCase() {
  if (currentIndex >= testCases.length) {
    console.log('=== 所有测试完成 ===');
    return;
  }
  
  const testCase = testCases[currentIndex];
  console.log(`\n${currentIndex + 1}. 测试 ${testCase.name} (${testCase.lon}°E, ${testCase.lat}°N)`);
  
  // 设置出生点对齐
  window.setBirthPointAlignment(true, testCase.lon, testCase.lat, 10);
  
  setTimeout(() => {
    const settings = window.getBirthPointAlignment();
    console.log(`   设置: 经度=${settings.birthPointLongitudeDeg}°, 纬度=${settings.birthPointLatitudeDeg}°, α=${settings.birthPointAlphaDeg}°`);
    
    // 测试屏幕Y模式
    console.log(`   测试屏幕Y模式...`);
    window.setBirthPointScreenY(0.3);
    
    setTimeout(() => {
      const ySettings = window.getBirthPointAlignment();
      console.log(`   屏幕Y设置: ${ySettings.birthPointTargetScreenY}`);
      
      currentIndex++;
      setTimeout(testNextCase, 1000); // 等待1秒后测试下一个
    }, 500);
  }, 500);
}

// 开始测试
console.log('开始测试不同出生点的构图一致性...');
console.log('观察：地球大小和位置应该保持一致，只有内部纹理不同');
testNextCase();
