// 测试经度对齐
// 在浏览器控制台中运行此脚本

console.log('=== 测试经度对齐 ===');

// 步骤1：启用出生点对齐
console.log('步骤1：启用出生点对齐');

// 找到并选中出生点对齐复选框
const checkboxes = document.querySelectorAll('input[type="checkbox"]');
let alignmentCheckbox = null;
for (let i = 0; i < checkboxes.length; i++) {
  const checkbox = checkboxes[i];
  const label = checkbox.parentElement;
  if (label && label.textContent.includes('出生点对齐')) {
    alignmentCheckbox = checkbox;
    break;
  }
}

if (alignmentCheckbox) {
  if (!alignmentCheckbox.checked) {
    alignmentCheckbox.checked = true;
    alignmentCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('✅ 已启用出生点对齐复选框');
  } else {
    console.log('出生点对齐复选框已经选中');
  }
} else {
  console.log('❌ 没有找到出生点对齐复选框');
}

// 步骤2：测试经度对齐
setTimeout(() => {
  console.log('\n步骤2：测试经度对齐');
  
  if (window.setBirthPointAlignment) {
    // 测试1：设置一个明显的经度差异
    console.log('测试1：设置出生点经度0°E（赤道）');
    window.setBirthPointAlignment(true, 0, 0, 10); // 赤道
    console.log('预期：出生点应该出现在180°E位置');
    console.log('经度差：180 - 0 = 180度');
    console.log('Yaw旋转：180 * 0.1 = 18度');
    
    setTimeout(() => {
      // 测试2：设置另一个明显的经度差异
      console.log('\n测试2：设置出生点经度90°E');
      window.setBirthPointAlignment(true, 90, 0, 10); // 90°E
      console.log('预期：出生点应该出现在180°E位置');
      console.log('经度差：180 - 90 = 90度');
      console.log('Yaw旋转：90 * 0.1 = 9度');
      
      setTimeout(() => {
        // 测试3：设置接近目标经度的点
        console.log('\n测试3：设置出生点经度170°E');
        window.setBirthPointAlignment(true, 170, 0, 10); // 170°E
        console.log('预期：出生点应该出现在180°E位置');
        console.log('经度差：180 - 170 = 10度');
        console.log('Yaw旋转：10 * 0.1 = 1度');
        
        setTimeout(() => {
          // 测试4：设置目标经度
          console.log('\n测试4：设置出生点经度180°E');
          window.setBirthPointAlignment(true, 180, 0, 10); // 180°E
          console.log('预期：出生点应该出现在180°E位置');
          console.log('经度差：180 - 180 = 0度');
          console.log('Yaw旋转：0 * 0.1 = 0度');
        }, 2000);
      }, 2000);
    }, 2000);
  } else {
    console.error('❌ setBirthPointAlignment函数未找到');
  }
}, 1000);

// 步骤3：检查经度对齐效果
setTimeout(() => {
  console.log('\n步骤3：检查经度对齐效果');
  
  console.log('请观察以下内容:');
  console.log('1. 控制台是否有[BirthPointAlignment] 旋转计算日志');
  console.log('2. 观察Yaw旋转角度是否正确');
  console.log('3. 观察红色标记是否出现在地球的180°E位置');
  console.log('4. 观察相机是否发生相应的旋转');
  
  // 检查当前状态
  const settings = window.getBirthPointAlignment();
  console.log('当前设置:', settings);
}, 8000);

// 步骤4：分析经度对齐逻辑
setTimeout(() => {
  console.log('\n步骤4：分析经度对齐逻辑');
  
  console.log('经度对齐逻辑分析:');
  console.log('1. 出生点坐标：用户输入的经纬度');
  console.log('2. 目标位置：180°E, 80°N（固定）');
  console.log('3. 经度差：targetLongitude - (birthLongitude + phaseShift)');
  console.log('4. Yaw旋转：longitudeDiff * 0.1');
  console.log('5. 预期效果：出生点出现在地球的180°E位置');
  
  console.log('\n测试用例:');
  const testCases = [
    { name: '赤道', lon: 0, expected: '180°E' },
    { name: '90°E', lon: 90, expected: '180°E' },
    { name: '170°E', lon: 170, expected: '180°E' },
    { name: '180°E', lon: 180, expected: '180°E' }
  ];
  
  testCases.forEach(test => {
    const diff = 180 - test.lon;
    const yaw = diff * 0.1;
    console.log(`${test.name}: 经度差${diff}度 → Yaw旋转${yaw}度 → 出生点应出现在${test.expected}`);
  });
}, 10000);

console.log('\n观察要点:');
console.log('1. 确保出生点对齐复选框已选中');
console.log('2. 观察控制台中的旋转计算日志');
console.log('3. 观察红色标记是否出现在正确位置');
console.log('4. 观察相机是否发生相应的旋转');
console.log('5. 如果经度对齐不正确，需要检查旋转逻辑');
