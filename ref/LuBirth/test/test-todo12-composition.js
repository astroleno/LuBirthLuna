// 测试TODO12：标准构图出生点对齐
// 在浏览器控制台中运行此脚本

console.log('=== TODO12：标准构图出生点对齐测试 ===');

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
    console.log('观察结果：');
    console.log('1. 地球大小和位置应该保持一致');
    console.log('2. 出生点应该都在高纬度区域（类似80°北纬观感）');
    console.log('3. 子午线应该保持竖直');
    console.log('4. 红色标记应该准确显示出生点位置');
    return;
  }
  
  const testCase = testCases[currentIndex];
  console.log(`\n${currentIndex + 1}. 测试 ${testCase.name} (${testCase.lon}°E, ${testCase.lat}°N)`);
  
  // 设置出生点对齐
  window.setBirthPointAlignment(true, testCase.lon, testCase.lat, 10);
  
  // 显示红色标记
  window.setBirthPointMarker(true, 0.1, '#ff0000');
  
  setTimeout(() => {
    const settings = window.getBirthPointAlignment();
    console.log(`   设置: 经度=${settings.birthPointLongitudeDeg}°, 纬度=${settings.birthPointLatitudeDeg}°`);
    console.log(`   标记: ${settings.showBirthPointMarker ? '显示' : '隐藏'}`);
    
    // 计算纬度偏移
    const latitudeOffset = testCase.lat - 80;
    console.log(`   纬度偏移: ${latitudeOffset.toFixed(1)}° (目标80°北纬)`);
    
    currentIndex++;
    setTimeout(testNextCase, 2000); // 等待2秒后测试下一个
  }, 500);
}

// 开始测试
console.log('开始测试TODO12标准构图对齐...');
console.log('核心思路：先经度对齐，再纬度对齐到高纬度（80°北纬观感）');
console.log('预期效果：所有出生点都能生成相似的构图');
testNextCase();
