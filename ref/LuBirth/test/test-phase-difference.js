// 测试相位差：确定正确的坐标转换
// 在浏览器控制台中运行此脚本

console.log('=== 相位差测试：确定正确的坐标转换 ===');

// 使用已知地标进行测试
const landmarks = [
  { name: '北京天安门', lon: 116.3974, lat: 39.9093, description: '应该在球体正面中央偏上' },
  { name: '伦敦大本钟', lon: -0.1245, lat: 51.4994, description: '应该在球体左侧' },
  { name: '纽约自由女神', lon: -74.0445, lat: 40.6892, description: '应该在球体左侧' },
  { name: '东京塔', lon: 139.6917, lat: 35.6586, description: '应该在球体右侧' },
  { name: '悉尼歌剧院', lon: 151.2153, lat: -33.8568, description: '应该在球体右侧下方' }
];

// 测试不同的相位差
const phaseShifts = [0, 90, 180, 270];

let landmarkIndex = 0;
let phaseIndex = 0;

function testPhaseShift() {
  if (landmarkIndex >= landmarks.length) {
    console.log('\n=== 所有地标测试完成 ===');
    console.log('请根据观察结果确定正确的相位差:');
    console.log('- 0°: 无偏移');
    console.log('- 90°: 经度+90°');
    console.log('- 180°: 经度+180°');
    console.log('- 270°: 经度+270°');
    return;
  }
  
  if (phaseIndex >= phaseShifts.length) {
    landmarkIndex++;
    phaseIndex = 0;
    setTimeout(testPhaseShift, 1000);
    return;
  }
  
  const landmark = landmarks[landmarkIndex];
  const phaseShift = phaseShifts[phaseIndex];
  
  console.log(`\n${landmarkIndex + 1}.${phaseIndex + 1} 测试 ${landmark.name}`);
  console.log(`   原始坐标: 经度=${landmark.lon}°, 纬度=${landmark.lat}°`);
  console.log(`   相位差: ${phaseShift}°`);
  console.log(`   调整后经度: ${landmark.lon + phaseShift}°`);
  console.log(`   描述: ${landmark.description}`);
  
  // 使用UI控制设置出生点对齐
  console.log('请手动操作:');
  console.log('1. 勾选"出生点对齐"复选框');
  console.log('2. 勾选"显示标记"复选框');
  console.log('3. 在经度输入框中输入:', landmark.lon + phaseShift);
  console.log('4. 在纬度输入框中输入:', landmark.lat);
  console.log('5. 观察红色标记位置是否符合描述');
  console.log('6. 记录这个相位差是否正确');
  
  phaseIndex++;
  setTimeout(testPhaseShift, 3000); // 等待3秒后测试下一个
}

// 开始测试
console.log('开始相位差测试...');
console.log('目标: 确定正确的坐标转换，让地标出现在正确位置');
console.log('方法: 测试不同相位差，观察地标位置是否符合预期');
testPhaseShift();
