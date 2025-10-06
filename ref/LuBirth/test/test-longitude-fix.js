// 经度计算修复测试脚本
// 在浏览器控制台中运行此脚本来测试经度计算是否正确

console.log('=== 经度计算修复测试 ===');

// 测试1: 0°经度（本初子午线）
console.log('\n1. 测试0°经度（本初子午线）');
setBirthPointAlignment(true, 0, 0, 10);
setTimeout(() => {
  console.log('当前对齐状态:', getBirthPointAlignment());
}, 1000);

// 测试2: 90°东经
setTimeout(() => {
  console.log('\n2. 测试90°东经');
  setBirthPointAlignment(true, 90, 0, 10);
  console.log('当前对齐状态:', getBirthPointAlignment());
}, 2000);

// 测试3: 180°经度（国际日期变更线）
setTimeout(() => {
  console.log('\n3. 测试180°经度（国际日期变更线）');
  setBirthPointAlignment(true, 180, 0, 10);
  console.log('当前对齐状态:', getBirthPointAlignment());
}, 3000);

// 测试4: 270°经度（西经90°）
setTimeout(() => {
  console.log('\n4. 测试270°经度（西经90°）');
  setBirthPointAlignment(true, 270, 0, 10);
  console.log('当前对齐状态:', getBirthPointAlignment());
}, 4000);

// 测试5: 关闭对齐
setTimeout(() => {
  console.log('\n5. 关闭出生点对齐');
  setBirthPointAlignment(false);
  console.log('当前对齐状态:', getBirthPointAlignment());
}, 5000);

console.log('\n测试完成！请观察相机位置变化是否符合预期：');
console.log('- 0°经度：应该显示本初子午线');
console.log('- 90°东经：应该显示东经90°位置');
console.log('- 180°经度：应该显示国际日期变更线');
console.log('- 270°经度：应该显示西经90°位置');
