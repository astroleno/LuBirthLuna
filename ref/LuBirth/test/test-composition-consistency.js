// 测试构图一致性：固定pitch角度方案
// 在浏览器控制台中运行此脚本

console.log('=== 构图一致性测试：固定pitch角度方案 ===');

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
let results = [];

function testNextCase() {
  if (currentIndex >= testCases.length) {
    console.log('\n=== 测试结果汇总 ===');
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.name}: yaw=${result.yaw.toFixed(1)}°, pitch=${result.pitch.toFixed(1)}°`);
    });
    
    // 分析pitch角度一致性
    const pitches = results.map(r => r.pitch);
    const pitchMin = Math.min(...pitches);
    const pitchMax = Math.max(...pitches);
    const pitchDiff = pitchMax - pitchMin;
    
    console.log(`\n构图一致性分析:`);
    console.log(`- Pitch角度范围: ${pitchMin.toFixed(1)}° ~ ${pitchMax.toFixed(1)}°`);
    console.log(`- Pitch角度差异: ${pitchDiff.toFixed(1)}°`);
    console.log(`- 构图一致性: ${pitchDiff < 1 ? '✅ 优秀' : pitchDiff < 5 ? '⚠️ 良好' : '❌ 需要优化'}`);
    
    console.log('\n观察要点:');
    console.log('1. 地球大小和位置应该保持一致');
    console.log('2. 出生点应该都在相同的高纬度区域');
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
    
    // 计算相机角度
    const yaw = -testCase.lon; // 经度对齐
    const pitch = -10; // 固定pitch角度
    
    const result = {
      name: testCase.name,
      lon: testCase.lon,
      lat: testCase.lat,
      yaw: yaw,
      pitch: pitch
    };
    
    results.push(result);
    
    console.log(`   设置: 经度=${settings.birthPointLongitudeDeg}°, 纬度=${settings.birthPointLatitudeDeg}°`);
    console.log(`   相机角度: yaw=${yaw.toFixed(1)}°, pitch=${pitch.toFixed(1)}°`);
    console.log(`   标记: ${settings.showBirthPointMarker ? '显示' : '隐藏'}`);
    
    currentIndex++;
    setTimeout(testNextCase, 1500); // 等待1.5秒后测试下一个
  }, 500);
}

// 开始测试
console.log('开始测试构图一致性...');
console.log('核心思路：固定pitch角度(-10°)，只调整yaw角度进行经度对齐');
console.log('预期效果：所有出生点都使用相同的pitch角度，构图完全一致');
testNextCase();
