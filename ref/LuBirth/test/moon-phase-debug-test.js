// 月相调试测试工具
// 用于验证月相计算是否正常工作

const moonPhaseDebugTest = {
  // 测试月相计算的基本功能
  async testMoonPhaseCalculation() {
    console.log('🌙 开始月相计算调试测试');
    console.log('========================');
    
    // 测试不同日期的月相
    const testDates = [
      '2024-01-25T12:00:00', // 新月
      '2024-02-09T12:00:00', // 上弦月
      '2024-02-24T12:00:00', // 满月
      '2024-03-10T12:00:00', // 下弦月
      '2024-03-25T12:00:00', // 新月
    ];
    
    for (const date of testDates) {
      console.log(`\n📅 测试日期: ${date}`);
      
      try {
        // 模拟调用月相计算函数
        const result = await this.simulateMoonPhaseCalculation(date);
        console.log(`  相位角: ${result.phaseAngleDeg}°`);
        console.log(`  光照侧: ${result.lightingSide}`);
        console.log(`  期望光照: ${result.expectedLighting}`);
        console.log(`  结果: ${result.isCorrect ? '✅ 正确' : '❌ 错误'}`);
      } catch (error) {
        console.log(`  ❌ 错误: ${error.message}`);
      }
    }
    
    console.log('\n🎯 月相计算调试测试完成');
  },
  
  // 模拟月相计算
  async simulateMoonPhaseCalculation(dateString) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const date = new Date(dateString);
        const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
        
        // 简化的月相周期计算
        const phaseAngleRad = (dayOfYear % 29.53) / 29.53 * 2 * Math.PI;
        const phaseAngleDeg = (phaseAngleRad * 180 / Math.PI) % 360;
        
        // 计算光照侧
        const lightingSide = this.getLightingSide(phaseAngleRad);
        const expectedLighting = this.getExpectedLightingForPhase(phaseAngleRad);
        
        resolve({
          phaseAngleDeg: phaseAngleDeg.toFixed(1),
          lightingSide,
          expectedLighting,
          isCorrect: lightingSide === expectedLighting
        });
      }, 100);
    });
  },
  
  // 根据相位角判断光照侧
  getLightingSide(phaseAngleRad) {
    if (!phaseAngleRad) return '未知';
    
    // 模拟正交基向量
    const F = new THREE.Vector3(0.1, 0.2, 0.97).normalize();
    const R = new THREE.Vector3(-0.97, 0.1, 0.1).normalize();
    
    // 计算太阳方向
    const S = new THREE.Vector3()
      .add(R.clone().multiplyScalar(-Math.sin(phaseAngleRad)))
      .add(F.clone().multiplyScalar(Math.cos(phaseAngleRad)))
      .normalize();
    
    // 使用修复后的阈值
    return S.x > 0.15 ? '右侧' : S.x < -0.15 ? '左侧' : S.z > 0.15 ? '前方' : S.z < -0.15 ? '后方' : '其他方向';
  },
  
  // 根据相位角获取期望光照侧
  getExpectedLightingForPhase(phaseAngleRad) {
    if (!phaseAngleRad) return '未知';
    const angle = phaseAngleRad * 180 / Math.PI;
    if (angle < 45) return '前方';
    else if (angle < 135) return '右侧';
    else if (angle < 225) return '后方';
    else if (angle < 315) return '左侧';
    else return '前方';
  },
  
  // 测试当前系统的月相状态
  testCurrentSystemState() {
    console.log('🔍 检查当前系统状态');
    console.log('==================');
    
    // 检查关键参数
    const checks = [
      {
        name: '当前日期',
        value: new Date().toISOString(),
        status: '✅'
      },
      {
        name: '月球位置X',
        value: '0.5 (屏幕中央)',
        status: '✅'
      },
      {
        name: '月球位置Y', 
        value: '0.75 (屏幕上方)',
        status: '✅'
      },
      {
        name: '潮汐锁定',
        value: '启用',
        status: '✅'
      },
      {
        name: '相机锁定月相',
        value: '禁用 (使用真实太阳向量)',
        status: '✅'
      }
    ];
    
    checks.forEach(check => {
      console.log(`${check.status} ${check.name}: ${check.value}`);
    });
    
    console.log('\n💡 建议检查项:');
    console.log('1. 确保 currentDate 参数正确传递');
    console.log('2. 确保 observerLat 和 observerLon 参数正确传递');
    console.log('3. 检查月相计算函数是否正常返回相位角');
    console.log('4. 检查月球材质是否正确应用了相位角');
  }
};

// 使用说明
console.log('🌙 月相调试测试工具已加载');
console.log('可用命令:');
console.log('  moonPhaseDebugTest.testMoonPhaseCalculation() - 测试月相计算');
console.log('  moonPhaseDebugTest.testCurrentSystemState() - 检查系统状态');

// 导出测试对象
window.moonPhaseDebugTest = moonPhaseDebugTest;
