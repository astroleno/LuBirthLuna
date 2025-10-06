// 寻找能产生左侧光照的日期
// 测试不同的日期以找到225°-315°相位角的范围

const findLeftLightingDates = async () => {
  console.log('🔍 寻找能产生左侧光照的日期');
  console.log('目标相位角范围: 225°-315° (左侧光照)');
  console.log('');
  
  // 测试更多日期，特别关注新月后的日期
  const testDates = [
    // 2024年11月 (可能有高相位角)
    '2024-11-01', '2024-11-05', '2024-11-10', '2024-11-15', 
    '2024-11-20', '2024-11-25', '2024-11-30',
    // 2024年12月
    '2024-12-01', '2024-12-05', '2024-12-10', '2024-12-15',
    '2024-12-20', '2024-12-25', '2024-12-30',
    // 2025年1月
    '2025-01-01', '2025-01-05', '2025-01-10', '2025-01-15',
    '2025-01-20', '2025-01-25', '2025-01-30',
  ];
  
  const results = [];
  
  for (const date of testDates) {
    console.log(`--- 测试日期: ${date} ---`);
    
    try {
      // 设置日期
      const dateInputs = document.querySelectorAll('input[type="date"]');
      const timeInputs = document.querySelectorAll('input[type="time"]');
      
      if (dateInputs.length > 0) {
        dateInputs[0].value = date;
        dateInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      if (timeInputs.length > 0) {
        timeInputs[0].value = '12:00';
        timeInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      // 等待更新
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 收集日志
      const logs = [];
      const originalLog = console.log;
      
      console.log = function(...args) {
        logs.push(args);
        originalLog.apply(console, args);
      };
      
      // 等待日志收集
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log = originalLog;
      
      // 分析日志
      let phaseAngle = null;
      let lightingSide = null;
      
      for (const log of logs) {
        const logStr = JSON.stringify(log);
        
        if (logStr.includes('SimpleMoon Orthogonal Basis Debug')) {
          try {
            const debugInfo = log.find(arg => 
              arg && typeof arg === 'object' && arg.phaseAngleDeg
            );
            if (debugInfo) {
              phaseAngle = parseFloat(debugInfo.phaseAngleDeg);
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
        
        if (logStr.includes('SimpleMoon Lighting Analysis')) {
          try {
            const lightingInfo = log.find(arg => 
              arg && typeof arg === 'object' && arg.lightingSide
            );
            if (lightingInfo) {
              lightingSide = lightingInfo.lightingSide;
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
      
      const result = {
        date,
        phaseAngle,
        lightingSide,
        inLeftRange: phaseAngle >= 225 && phaseAngle <= 315,
        isLeft: lightingSide === '左侧'
      };
      
      results.push(result);
      
      console.log(`相位角: ${phaseAngle}°`);
      console.log(`光照侧: ${lightingSide}`);
      console.log(`是否在左侧范围: ${result.inLeftRange}`);
      console.log(`是否显示左侧: ${result.isLeft}`);
      
      if (result.isLeft) {
        console.log('🎉 发现左侧光照！');
      }
      
      console.log('');
      
    } catch (error) {
      console.error(`测试 ${date} 失败:`, error);
      results.push({
        date,
        error: error.message
      });
    }
  }
  
  // 分析结果
  console.log('📊 测试结果分析:');
  console.log('='.repeat(50));
  
  const leftLightingFound = results.filter(r => r.isLeft);
  const highAngles = results.filter(r => r.phaseAngle >= 200);
  
  console.log(`找到左侧光照: ${leftLightingFound.length} 个`);
  if (leftLightingFound.length > 0) {
    leftLightingFound.forEach(r => {
      console.log(`  ${r.date}: ${r.phaseAngle}° (${r.lightingSide})`);
    });
  }
  
  console.log(`\n高相位角 (>200°): ${highAngles.length} 个`);
  if (highAngles.length > 0) {
    highAngles.forEach(r => {
      console.log(`  ${r.date}: ${r.phaseAngle}° (${r.lightingSide})`);
    });
  }
  
  console.log(`\n最高相位角: ${Math.max(...results.filter(r => r.phaseAngle).map(r => r.phaseAngle))}°`);
  console.log(`最低相位角: ${Math.min(...results.filter(r => r.phaseAngle).map(r => r.phaseAngle))}°`);
  
  return results;
};

// 运行测试
findLeftLightingDates();