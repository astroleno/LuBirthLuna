// 测试坐标转换修复
// 在浏览器控制台中运行此脚本

console.log('=== 坐标转换修复测试 ===');

// 测试几个已知城市的标准坐标
const testCities = [
  { name: '北京朝阳区', lon: 116.486409, lat: 39.921489 },
  { name: '上海黄浦区', lon: 121.473701, lat: 31.230416 },
  { name: '广州天河区', lon: 113.335367, lat: 23.135171 },
  { name: '深圳南山区', lon: 113.9308, lat: 22.5314 }
];

let index = 0;

function testCity() {
  if (index >= testCities.length) {
    console.log('\n=== 测试完成 ===');
    console.log('观察要点:');
    console.log('1. 红色标记应该准确显示在对应城市位置');
    console.log('2. 地球构图应该保持一致');
    console.log('3. 子午线应该保持竖直');
    console.log('4. 出生点应该对齐到球体的180°经度、北纬80°位置');
    return;
  }
  
  const city = testCities[index];
  console.log(`\n${index + 1}. 测试 ${city.name}`);
  console.log(`   标准坐标: 经度=${city.lon}°, 纬度=${city.lat}°`);
  
  // 使用UI控制设置出生点对齐
  console.log('请手动操作:');
  console.log('1. 勾选"出生点对齐"复选框');
  console.log('2. 勾选"显示标记"复选框');
  console.log('3. 在经度输入框中输入:', city.lon);
  console.log('4. 在纬度输入框中输入:', city.lat);
  console.log('5. 观察红色标记是否准确显示在对应城市位置');
  console.log('6. 观察出生点是否对齐到球体的180°经度、北纬80°位置');
  
  index++;
  setTimeout(testCity, 5000); // 等待5秒后测试下一个
}

// 开始测试
console.log('开始坐标转换修复测试...');
console.log('修复内容: 移除了-90°的经度偏移，使用标准WGS84坐标');
console.log('目标位置：180°经度、北纬80°');
console.log('预期效果：出生点准确对齐到目标位置，不再"全飞"');
testCity();
