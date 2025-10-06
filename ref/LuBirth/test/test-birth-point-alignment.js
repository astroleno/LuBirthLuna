// 出生点对齐功能测试脚本
// 在浏览器控制台中运行此脚本来测试出生点对齐功能

console.log('=== 出生点对齐功能测试 ===');

// 测试1: 启用出生点对齐
console.log('\n1. 启用出生点对齐 (经度180°, 纬度80°, α=10°)');
setBirthPointAlignment(true, 180, 80, 10);

// 等待一下让效果生效
setTimeout(() => {
  console.log('当前对齐状态:', getBirthPointAlignment());
}, 1000);

// 测试2: 切换到屏幕Y模式
setTimeout(() => {
  console.log('\n2. 切换到屏幕Y模式 (Y=0.3)');
  setBirthPointScreenY(0.3);
  console.log('当前对齐状态:', getBirthPointAlignment());
}, 2000);

// 测试3: 调整屏幕Y位置
setTimeout(() => {
  console.log('\n3. 调整屏幕Y位置 (Y=0.2)');
  setBirthPointScreenY(0.2);
  console.log('当前对齐状态:', getBirthPointAlignment());
}, 3000);

// 测试4: 切换到α角模式
setTimeout(() => {
  console.log('\n4. 切换到α角模式 (α=15°)');
  setBirthPointAlignment(true, 180, 80, 15);
  console.log('当前对齐状态:', getBirthPointAlignment());
}, 4000);

// 测试5: 关闭对齐
setTimeout(() => {
  console.log('\n5. 关闭出生点对齐');
  setBirthPointAlignment(false);
  console.log('当前对齐状态:', getBirthPointAlignment());
}, 5000);

console.log('\n测试完成！请观察相机位置和地球显示的变化。');
