/**
 * 完整月相周期验证测试
 * 测试一个完整农历月份内的月相变化，确保所有光照方向都正确显示
 */

// 测试完整月相周期（约29.5天）
function testCompleteLunarCycle() {
  console.log('🌙 开始测试完整月相周期...\n');
  
  // 选择一个包含完整月相周期的时间段
  const startDate = new Date('2024-01-01T12:00:00Z'); // 满月附近
  const testDates = [];
  
  // 生成29.5天内的测试点（每2天一个测试点）
  for (let i = 0; i < 15; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i * 2);
    testDates.push(date.toISOString());
  }
  
  console.log(`将测试 ${testDates.length} 个时间点：`);
  testDates.forEach((date, index) => {
    console.log(`${index + 1}. ${date}`);
  });
  console.log('');
  
  // 查找时间控件
  const dateInput = document.querySelector('input[type="date"]') ||
                   document.querySelector('input[name*="date"]') ||
                   document.querySelector('input[id*="date"]');
  
  const timeInput = document.querySelector('input[type="time"]') ||
                   document.querySelector('input[name*="time"]') ||
                   document.querySelector('input[id*="time"]');
  
  if (!dateInput) {
    console.log('❌ 未找到日期输入控件');
    console.log('请手动测试以下关键时间点：');
    showKeyTestDates();
    return;
  }
  
  console.log('✅ 找到时间控件，开始自动测试...\n');
  
  // 逐个测试时间点
  testDates.forEach((testDate, index) => {
    setTimeout(() => {
      console.log(`--- 测试 ${index + 1}/${testDates.length}: ${testDate} ---`);
      
      // 设置日期时间
      const dateObj = new Date(testDate);
      const dateStr = dateObj.toISOString().split('T')[0];
      const timeStr = dateObj.toTimeString().split(' ')[0].substring(0, 5);
      
      if (dateInput) {
        dateInput.value = dateStr;
        dateInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      if (timeInput) {
        timeInput.value = timeStr;
        timeInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      // 等待更新完成
      setTimeout(() => {
        // 收集调试信息
        const debugInfo = collectDebugInfo();
        console.log('📊 测试结果:', debugInfo);
        
        // 检查光照方向是否正确
        const phaseAngle = debugInfo.phaseAngleDeg;
        const lightingSide = debugInfo.lightingSide;
        const expectedSide = getExpectedLightingSide(phaseAngle);
        
        console.log(`相位角: ${phaseAngle}°`);
        console.log(`光照方向: ${lightingSide}`);
        console.log(`期望方向: ${expectedSide}`);
        console.log(`匹配: ${lightingSide === expectedSide ? '✅' : '❌'}`);
        
        console.log(''); // 空行分隔
        
        // 如果是最后一个测试，显示总结
        if (index === testDates.length - 1) {
          showTestSummary();
        }
      }, 3000); // 等待3秒让月相更新
      
    }, index * 8000); // 每8秒测试一个时间点
  });
}

// 显示关键测试时间点
function showKeyTestDates() {
  const keyDates = [
    { date: '2024-01-01', time: '12:00', phase: '满月', expected: '前方' },
    { date: '2024-01-08', time: '12:00', phase: '上弦月', expected: '右侧' },
    { date: '2024-01-15', time: '12:00', phase: '新月', expected: '后方' },
    { date: '2024-01-22', time: '12:00', phase: '下弦月', expected: '左侧' },
    { date: '2024-01-29', time: '12:00', phase: '满月', expected: '前方' }
  ];
  
  console.log('\n📋 关键时间点测试指南：');
  keyDates.forEach((test, index) => {
    console.log(`${index + 1}. ${test.date} ${test.time} - ${test.phase} (期望: ${test.expected})`);
  });
}

// 收集当前调试信息
function collectDebugInfo() {
  // 尝试从页面文本中提取调试信息
  const allText = document.body.innerText || document.body.textContent;
  const moonDebugs = allText.match(/\[SimpleMoon.*?\]/g);
  
  if (moonDebugs && moonDebugs.length > 0) {
    // 解析最新的调试信息
    const latestDebug = moonDebugs[moonDebugs.length - 1];
    
    // 尝试提取关键信息
    const phaseMatch = latestDebug.match(/phaseAngle[：:]\s*([\d.]+)°/);
    const lightingMatch = latestDebug.match(/lightingSide[：:]\s*([^\s,\}]+)/);
    
    return {
      phaseAngleDeg: phaseMatch ? parseFloat(phaseMatch[1]) : null,
      lightingSide: lightingMatch ? lightingMatch[1] : '未知',
      rawDebug: latestDebug
    };
  }
  
  return {
    phaseAngleDeg: null,
    lightingSide: '未知',
    rawDebug: null
  };
}

// 根据相位角判断期望的光照方向
function getExpectedLightingSide(phaseAngleDeg) {
  if (!phaseAngleDeg) return '未知';
  
  if (phaseAngleDeg < 45) return '前方';
  else if (phaseAngleDeg < 135) return '右侧';
  else if (phaseAngleDeg < 225) return '后方';
  else if (phaseAngleDeg < 315) return '左侧';
  else return '前方';
}

// 显示测试总结
function showTestSummary() {
  console.log('\n🎉 完整月相周期测试完成！');
  console.log('\n📊 期望的月相变化规律：');
  console.log('0° → 45°:   满月阶段（前方照射）');
  console.log('45° → 135°:  右侧照射阶段（亏凸月→下弦月→残月）');
  console.log('135° → 225°: 新月阶段（后方照射）');
  console.log('225° → 315°: 左侧照射阶段（蛾眉月→上弦月→盈凸月）');
  console.log('315° → 360°: 满月阶段（前方照射）');
  
  console.log('\n🔍 如果测试结果显示：');
  console.log('- 所有阶段都显示右侧光照 → 说明修复未生效');
  console.log('- 能看到左右前后变化 → 说明修复已生效');
  console.log('- 部分阶段正确 → 需要进一步调整公式');
}

// 快速验证当前设置
function quickVerification() {
  console.log('🔍 快速验证当前设置...\n');
  
  const debugInfo = collectDebugInfo();
  console.log('当前状态：', debugInfo);
  
  if (debugInfo.phaseAngleDeg) {
    const expectedSide = getExpectedLightingSide(debugInfo.phaseAngleDeg);
    console.log(`\n当前相位角: ${debugInfo.phaseAngleDeg}°`);
    console.log(`期望光照方向: ${expectedSide}`);
    console.log(`实际光照方向: ${debugInfo.lightingSide}`);
    console.log(`状态: ${debugInfo.lightingSide === expectedSide ? '✅ 正确' : '❌ 需要修复'}`);
  }
}

// 导出测试工具
window.lunarCycleTest = {
  testCompleteLunarCycle,
  showKeyTestDates,
  quickVerification,
  collectDebugInfo,
  getExpectedLightingSide
};

console.log('🌙 完整月相周期测试工具已加载');
console.log('可用命令：');
console.log('- lunarCycleTest.testCompleteLunarCycle()  // 测试完整月相周期');
console.log('- lunarCycleTest.showKeyTestDates()        // 显示关键测试时间点');
console.log('- lunarCycleTest.quickVerification()       // 快速验证当前状态');