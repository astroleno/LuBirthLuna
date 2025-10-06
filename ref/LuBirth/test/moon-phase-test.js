// 完整月相周期测试工具
// 测试覆盖完整的月相周期（0-360度）

const moonPhaseTest = {
  // 测试关键时间点，覆盖完整月相周期
  testDates: [
    // 2024年关键日期
    { date: '2024-01-25T12:00:00', name: '新月（0°）' },
    { date: '2024-02-02T12:00:00', name: '蛾眉月（45°）' },
    { date: '2024-02-09T12:00:00', name: '上弦月（90°）' },
    { date: '2024-02-16T12:00:00', name: '盈凸月（135°）' },
    { date: '2024-02-24T12:00:00', name: '满月（180°）' },
    { date: '2024-03-03T12:00:00', name: '亏凸月（225°）' },
    { date: '2024-03-10T12:00:00', name: '下弦月（270°）' },
    { date: '2024-03-17T12:00:00', name: '残月（315°）' },
    { date: '2024-03-25T12:00:00', name: '新月（360°）' },
    
    // 补充测试点
    { date: '2024-04-08T12:00:00', name: '新月' },
    { date: '2024-04-15T12:00:00', name: '上弦月' },
    { date: '2024-04-23T12:00:00', name: '满月' },
    { date: '2024-05-01T12:00:00', name: '下弦月' },
    
    // 2024年9月（用户原始测试时间）
    { date: '2024-09-01T12:00:00', name: '9月1日' },
    { date: '2024-09-02T12:00:00', name: '9月2日' },
    { date: '2024-09-03T12:00:00', name: '9月3日' },
    { date: '2024-09-04T12:00:00', name: '9月4日' },
    { date: '2024-09-05T12:00:00', name: '9月5日' },
    { date: '2024-09-06T12:00:00', name: '9月6日' },
  ],
  
  // 执行完整测试
  async testMoonPhaseAcrossMonth() {
    console.log('🌙 开始完整月相周期测试');
    console.log('========================');
    
    for (const test of this.testDates) {
      console.log(`\n📅 测试日期: ${test.date} (${test.name})`);
      
      // 模拟调用getMoonPhase函数
      try {
        const result = await this.getMoonPhaseAtDate(test.date);
        console.log(`  相位角: ${result.phaseAngleRad ? (result.phaseAngleRad * 180 / Math.PI).toFixed(1) + '°' : 'N/A'}`);
        console.log(`  光照侧: ${this.getLightingSide(result.phaseAngleRad)}`);
        console.log(`  期望光照: ${this.getExpectedLightingForPhase(result.phaseAngleRad)}`);
        
        // 分析是否正确
        const lightingSide = this.getLightingSide(result.phaseAngleRad);
        const expected = this.getExpectedLightingForPhase(result.phaseAngleRad);
        const isCorrect = lightingSide === expected;
        
        console.log(`  ✅ 结果: ${isCorrect ? '正确' : '错误'}`);
        
        if (!isCorrect) {
          console.log(`  ❌ 错误详情: 期望${expected}, 实际${lightingSide}`);
        }
      } catch (error) {
        console.log(`  ❌ 错误: ${error.message}`);
      }
    }
    
    console.log('\n🎯 测试完成，请检查结果');
  },
  
  // 模拟获取月相数据
  async getMoonPhaseAtDate(dateString) {
    // 这里需要根据实际的getMoonPhase函数实现
    // 暂时返回模拟数据
    return new Promise((resolve) => {
      setTimeout(() => {
        // 模拟基于日期的相位角计算
        const date = new Date(dateString);
        const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
        
        // 简化的月相周期计算（实际应使用astronomy-engine）
        const phaseAngleRad = (dayOfYear % 29.53) / 29.53 * 2 * Math.PI;
        
        resolve({
          phaseAngleRad,
          illumination: 0.5 + 0.5 * Math.cos(phaseAngleRad),
          phaseName: this.getPhaseName(phaseAngleRad)
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
  
  // 获取月相名称
  getPhaseName(phaseAngleRad) {
    if (!phaseAngleRad) return '未知';
    const angle = phaseAngleRad * 180 / Math.PI;
    if (angle < 22.5) return '新月';
    else if (angle < 67.5) return '蛾眉月';
    else if (angle < 112.5) return '上弦月';
    else if (angle < 157.5) return '盈凸月';
    else if (angle < 202.5) return '满月';
    else if (angle < 247.5) return '亏凸月';
    else if (angle < 292.5) return '下弦月';
    else if (angle < 337.5) return '残月';
    else return '新月';
  },
  
  // 手动测试当前日期
  testCurrentDate() {
    const currentDate = new Date().toISOString();
    console.log('🌙 测试当前日期:', currentDate);
    
    this.getMoonPhaseAtDate(currentDate).then(result => {
      console.log('当前月相信息:', result);
      console.log('光照侧:', this.getLightingSide(result.phaseAngleRad));
      console.log('期望光照:', this.getExpectedLightingForPhase(result.phaseAngleRad));
    });
  },
  
  // 验证特定相位角
  testSpecificAngle(angleDeg) {
    const angleRad = angleDeg * Math.PI / 180;
    console.log(`🌙 测试特定角度: ${angleDeg}°`);
    
    const lightingSide = this.getLightingSide(angleRad);
    const expected = this.getExpectedLightingForPhase(angleRad);
    
    console.log(`实际光照: ${lightingSide}`);
    console.log(`期望光照: ${expected}`);
    console.log(`结果: ${lightingSide === expected ? '✅ 正确' : '❌ 错误'}`);
    
    // 显示详细的太阳方向向量
    const F = new THREE.Vector3(0.1, 0.2, 0.97).normalize();
    const R = new THREE.Vector3(-0.97, 0.1, 0.1).normalize();
    
    const S = new THREE.Vector3()
      .add(R.clone().multiplyScalar(-Math.sin(angleRad)))
      .add(F.clone().multiplyScalar(Math.cos(angleRad)))
      .normalize();
    
    console.log(`太阳方向: (${S.x.toFixed(3)}, ${S.y.toFixed(3)}, ${S.z.toFixed(3)})`);
  }
};

// 使用说明：
// 1. 在浏览器控制台中运行此脚本
// 2. 确保页面加载了THREE.js库
// 3. 使用以下命令进行测试：

// 完整月相周期测试
// moonPhaseTest.testMoonPhaseAcrossMonth();

// 测试当前日期
// moonPhaseTest.testCurrentDate();

// 测试特定角度
// moonPhaseTest.testSpecificAngle(225); // 测试左侧光照
// moonPhaseTest.testSpecificAngle(270); // 测试左侧光照
// moonPhaseTest.testSpecificAngle(90);  // 测试右侧光照

console.log('🌙 月相测试工具已加载');
console.log('可用命令:');
console.log('  moonPhaseTest.testMoonPhaseAcrossMonth() - 完整周期测试');
console.log('  moonPhaseTest.testCurrentDate() - 测试当前日期');
console.log('  moonPhaseTest.testSpecificAngle(角度) - 测试特定角度');

// 导出测试对象
window.moonPhaseTest = moonPhaseTest;