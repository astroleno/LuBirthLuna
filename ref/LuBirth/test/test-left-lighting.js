// 测试特定的高相位角（左侧光照范围）
// 用于验证是否存在左侧光照的问题

const testLeftLighting = async () => {
  console.log('🔍 测试左侧光照范围（225°-315°）');
  
  // 测试日期：选择应该产生高相位角的日期
  const testDates = [
    '2024-11-15', // 新月附近
    '2024-11-20', // 新月后几天
    '2024-11-25', // 上弦月附近
    '2024-12-05', // 接近满月
    '2024-12-10', // 满月后
    '2024-12-15', // 下弦月附近
  ];
  
  for (const date of testDates) {
    console.log(`\n--- 测试日期: ${date} ---`);
    
    // 模拟设置日期
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
    
    // 检查是否有左侧光照
    const logs = [];
    const originalLog = console.log;
    
    console.log = function(...args) {
      logs.push(args);
      originalLog.apply(console, args);
    };
    
    // 等待日志收集
    setTimeout(() => {
      console.log = originalLog;
      
      // 分析日志
      for (const log of logs) {
        const logStr = JSON.stringify(log);
        
        if (logStr.includes('SimpleMoon Lighting Analysis')) {
          try {
            const lightingInfo = log.find(arg => 
              arg && typeof arg === 'object' && arg.lightingSide
            );
            if (lightingInfo) {
              console.log('光照分析结果:', lightingInfo);
              
              // 检查是否有左侧光照
              if (lightingInfo.lightingSide === '左侧') {
                console.log('✅ 发现左侧光照！');
                console.log('详细信息:', lightingInfo);
              }
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }, 2000);
  }
};

// 运行测试
testLeftLighting();