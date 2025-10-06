// 完整月相周期测试 - 覆盖0-360度所有相位角
// 使用方法：在浏览器控制台中运行此脚本（确保页面已加载，debug=1参数开启）

class MoonPhaseFullCycleTest {
  constructor() {
    this.results = [];
    this.testDates = this.generateTestDates();
  }

  // 生成覆盖完整月相周期的测试日期
  generateTestDates() {
    const dates = [];
    const baseDate = new Date('2024-01-01T00:00:00+08:00');
    
    // 每2天测试一次，覆盖一个完整的月相周期（约29.5天）
    for (let i = 0; i <= 30; i += 2) {
      const testDate = new Date(baseDate);
      testDate.setDate(baseDate.getDate() + i);
      dates.push({
        date: testDate.toISOString().split('T')[0],
        time: '12:00',
        fullDateTime: testDate.toISOString()
      });
    }
    
    return dates;
  }

  // 设置当前日期和时间
  async setDateTime(dateString, timeString) {
    // 查找日期时间选择器并设置值
    const dateInputs = document.querySelectorAll('input[type="date"]');
    const timeInputs = document.querySelectorAll('input[type="time"]');
    
    if (dateInputs.length > 0) {
      dateInputs[0].value = dateString;
      dateInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    if (timeInputs.length > 0) {
      timeInputs[0].value = timeString;
      timeInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    // 等待界面更新
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // 从控制台日志中提取月相信息
  extractMoonPhaseInfo() {
    return new Promise((resolve) => {
      const originalLog = console.log;
      const logs = [];
      
      console.log = function(...args) {
        logs.push(args);
        originalLog.apply(console, args);
      };
      
      // 等待一段时间收集日志
      setTimeout(() => {
        console.log = originalLog;
        
        // 分析收集到的日志
        const moonPhaseInfo = {};
        
        for (const log of logs) {
          const logStr = JSON.stringify(log);
          
          // 查找正交基调试信息
          if (logStr.includes('SimpleMoon Orthogonal Basis Debug')) {
            try {
              const debugInfo = log.find(arg => 
                arg && typeof arg === 'object' && arg.phaseAngleDeg
              );
              if (debugInfo) {
                moonPhaseInfo.phaseAngleDeg = parseFloat(debugInfo.phaseAngleDeg);
                moonPhaseInfo.sunDirection = debugInfo.sunDirection;
                moonPhaseInfo.lightingSide = debugInfo.lightingSide;
                moonPhaseInfo.expectedForPhase = debugInfo.expectedForPhase;
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
          
          // 查找光照分析信息
          if (logStr.includes('SimpleMoon Lighting Analysis')) {
            try {
              const lightingInfo = log.find(arg => 
                arg && typeof arg === 'object' && arg.phaseAngleDeg
              );
              if (lightingInfo) {
                moonPhaseInfo.phaseAngleDeg = moonPhaseInfo.phaseAngleDeg || parseFloat(lightingInfo.phaseAngleDeg);
                moonPhaseInfo.lightingSide = lightingInfo.lightingSide;
                moonPhaseInfo.expectedLighting = lightingInfo.expectedLighting;
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
        
        resolve(moonPhaseInfo);
      }, 2000);
    });
  }

  // 运行完整测试
  async runFullCycleTest() {
    console.log('🌙 开始完整月相周期测试...');
    console.log(`将测试 ${this.testDates.length} 个时间点`);
    
    for (let i = 0; i < this.testDates.length; i++) {
      const testPoint = this.testDates[i];
      console.log(`\n=== 测试 ${i + 1}/${this.testDates.length}: ${testPoint.date} ${testPoint.time} ===`);
      
      try {
        // 设置日期时间
        await this.setDateTime(testPoint.date, testPoint.time);
        
        // 提取月相信息
        const moonPhaseInfo = await this.extractMoonPhaseInfo();
        
        // 记录结果
        const result = {
          testPoint: i + 1,
          date: testPoint.date,
          time: testPoint.time,
          phaseAngleDeg: moonPhaseInfo.phaseAngleDeg || 'N/A',
          lightingSide: moonPhaseInfo.lightingSide || 'N/A',
          expectedLighting: moonPhaseInfo.expectedLighting || moonPhaseInfo.expectedForPhase || 'N/A',
          sunDirection: moonPhaseInfo.sunDirection || 'N/A'
        };
        
        this.results.push(result);
        
        console.log('✅ 测试结果:', result);
        
        // 短暂延迟，避免过于频繁的测试
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error('❌ 测试失败:', error);
        this.results.push({
          testPoint: i + 1,
          date: testPoint.date,
          time: testPoint.time,
          error: error.message
        });
      }
    }
    
    this.analyzeResults();
  }

  // 分析测试结果
  analyzeResults() {
    console.log('\n📊 完整月相周期测试结果分析');
    console.log('='.repeat(60));
    
    // 按光照侧分组
    const sideGroups = {
      '前方': [],
      '右侧': [],
      '后方': [],
      '左侧': [],
      '其他方向': [],
      'N/A': []
    };
    
    // 按相位角范围分组
    const angleRanges = {
      '0-45° (满月)': [],
      '45-135° (亏凸月→下弦月→残月)': [],
      '135-225° (新月)': [],
      '225-315° (蛾眉月→上弦月→盈凸月)': [],
      '315-360° (满月)': []
    };
    
    for (const result of this.results) {
      if (result.lightingSide !== 'N/A') {
        sideGroups[result.lightingSide].push(result);
      }
      
      if (result.phaseAngleDeg !== 'N/A') {
        const angle = parseFloat(result.phaseAngleDeg);
        if (angle >= 0 && angle < 45) angleRanges['0-45° (满月)'].push(result);
        else if (angle >= 45 && angle < 135) angleRanges['45-135° (亏凸月→下弦月→残月)'].push(result);
        else if (angle >= 135 && angle < 225) angleRanges['135-225° (新月)'].push(result);
        else if (angle >= 225 && angle < 315) angleRanges['225-315° (蛾眉月→上弦月→盈凸月)'].push(result);
        else if (angle >= 315 && angle <= 360) angleRanges['315-360° (满月)'].push(result);
      }
    }
    
    // 输出光照侧分布
    console.log('\n🌈 光照侧分布:');
    for (const [side, results] of Object.entries(sideGroups)) {
      console.log(`${side}: ${results.length} 个测试点`);
      if (results.length > 0) {
        const angles = results.map(r => r.phaseAngleDeg).join(', ');
        console.log(`   相位角: ${angles}`);
      }
    }
    
    // 输出相位角范围分布
    console.log('\n📐 相位角范围分布:');
    for (const [range, results] of Object.entries(angleRanges)) {
      console.log(`${range}: ${results.length} 个测试点`);
      if (results.length > 0) {
        const sides = results.map(r => r.lightingSide).join(', ');
        console.log(`   光照侧: ${sides}`);
      }
    }
    
    // 检查是否覆盖了所有光照侧
    const allSidesCovered = Object.keys(sideGroups).filter(side => 
      side !== '其他方向' && side !== 'N/A' && sideGroups[side].length > 0
    );
    
    console.log('\n✅ 测试覆盖验证:');
    console.log(`覆盖的光照侧: ${allSidesCovered.join(', ') || '无'}`);
    console.log(`总测试点数: ${this.results.length}`);
    console.log(`成功测试: ${this.results.filter(r => !r.error).length}`);
    console.log(`失败测试: ${this.results.filter(r => r.error).length}`);
    
    // 输出完整结果表格
    console.log('\n📋 完整测试结果:');
    console.table(this.results);
    
    // 输出JSON格式结果
    console.log('\n🔧 JSON格式结果:');
    console.log('[MoonPhaseFullCycleTest:JSON]', JSON.stringify({
      testSummary: {
        totalTests: this.results.length,
        successfulTests: this.results.filter(r => !r.error).length,
        failedTests: this.results.filter(r => r.error).length,
        coveredSides: allSidesCovered,
        dateRange: {
          start: this.testDates[0].date,
          end: this.testDates[this.testDates.length - 1].date
        }
      },
      detailedResults: this.results
    }, null, 2));
    
    return this.results;
  }

  // 快速测试关键相位点
  async runKeyPhaseTest() {
    console.log('🎯 快速测试关键相位点...');
    
    const keyPhases = [
      { name: '新月', targetAngle: 180 },
      { name: '上弦月', targetAngle: 270 },
      { name: '满月', targetAngle: 0 },
      { name: '下弦月', targetAngle: 90 }
    ];
    
    for (const phase of keyPhases) {
      console.log(`\n🔍 寻找${phase.name}附近的测试点 (目标角度: ${phase.targetAngle}°)...`);
      
      // 查找最接近目标角度的测试结果
      const closest = this.results
        .filter(r => r.phaseAngleDeg !== 'N/A')
        .map(r => ({
          ...r,
          angleDiff: Math.abs(parseFloat(r.phaseAngleDeg) - phase.targetAngle)
        }))
        .sort((a, b) => a.angleDiff - b.angleDiff)[0];
      
      if (closest) {
        console.log(`✅ 找到最接近的测试点:`);
        console.log(`   日期: ${closest.date} ${closest.time}`);
        console.log(`   相位角: ${closest.phaseAngleDeg}° (差异: ${closest.angleDiff.toFixed(1)}°)`);
        console.log(`   光照侧: ${closest.lightingSide}`);
        console.log(`   期望光照: ${closest.expectedLighting}`);
      }
    }
  }
}

// 创建测试实例并运行
const moonPhaseTest = new MoonPhaseFullCycleTest();

// 自动运行完整测试
console.log('🚀 月相完整周期测试已准备就绪');
console.log('运行 moonPhaseTest.runFullCycleTest() 开始完整测试');
console.log('运行 moonPhaseTest.runKeyPhaseTest() 快速测试关键相位点');

// 导出测试函数供手动调用
window.moonPhaseFullCycleTest = moonPhaseTest;