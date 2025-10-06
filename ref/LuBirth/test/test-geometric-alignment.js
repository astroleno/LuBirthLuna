// 测试几何计算对齐：出生点→目标位置
// 在浏览器控制台中运行此脚本

console.log('=== 几何计算对齐测试：出生点→目标位置 ===');

// 测试不同出生点的对齐效果
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
    console.log('\n=== 测试完成 ===');
    console.log('观察要点:');
    console.log('1. 红色标记应该都出现在球体的180°经度、北纬80°位置');
    console.log('2. 地球构图应该保持一致');
    console.log('3. 子午线应该保持竖直');
    console.log('4. 出生点应该真正对齐到目标位置');
    return;
  }
  
  const testCase = testCases[currentIndex];
  console.log(`\n${currentIndex + 1}. 测试 ${testCase.name} (${testCase.lon}°E, ${testCase.lat}°N)`);
  
  // 设置出生点对齐
  if (window.setBirthPointAlignment) {
    window.setBirthPointAlignment(true, testCase.lon, testCase.lat, 10);
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
  
  setTimeout(() => {
    const settings = window.getBirthPointAlignment ? window.getBirthPointAlignment() : null;
    if (settings) {
      console.log(`   设置: 经度=${settings.birthPointLongitudeDeg}°, 纬度=${settings.birthPointLatitudeDeg}°`);
      console.log(`   目标: 180°经度、北纬80°`);
      console.log(`   标记: ${settings.showBirthPointMarker ? '显示' : '隐藏'}`);
      console.log(`   观察: 红色标记是否出现在球体的180°经度、北纬80°位置？`);
    } else {
      console.error('getBirthPointAlignment 函数未找到');
    }
    
    currentIndex++;
    setTimeout(testNextCase, 2000); // 等待2秒后测试下一个
  }, 500);
}

// 检查必要的函数是否存在
function checkFunctions() {
  const requiredFunctions = ['setBirthPointAlignment', 'setBirthPointMarker', 'getBirthPointAlignment'];
  const missingFunctions = requiredFunctions.filter(func => !window[func]);
  
  if (missingFunctions.length > 0) {
    console.error('缺少必要的函数:', missingFunctions);
    console.log('请确保页面已加载完成，并且出生点对齐功能已启用');
    return false;
  }
  return true;
}

// 开始测试
console.log('开始测试几何计算对齐...');
console.log('核心思路：使用四元数计算从出生点到目标位置的旋转');
console.log('目标位置：180°经度、北纬80°');
console.log('预期效果：所有出生点都对齐到球体的180°经度、北纬80°位置');

if (checkFunctions()) {
  testNextCase();
} else {
  console.log('请刷新页面后重试');
}
