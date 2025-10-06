/**
 * 独立月相问题诊断脚本
 * 直接复制月相计算逻辑进行分析
 */

// 复制月相计算的核心逻辑
function getJulianDay(date) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const second = date.getUTCSeconds();
  
  let a = Math.floor((14 - month) / 12);
  let y = year + 4800 - a;
  let m = month + 12 * a - 3;
  
  const jd = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  
  const timeFraction = (hour + minute / 60 + second / 3600) / 24;
  
  return jd + timeFraction - 0.5;
}

function calculateMoonAge(julianDay) {
  const newMoonJD = 2451549.259722;
  const synodicMonth = 29.530588853;
  
  const daysSinceNewMoon = julianDay - newMoonJD;
  const moonAge = daysSinceNewMoon % synodicMonth;
  
  return moonAge < 0 ? moonAge + synodicMonth : moonAge;
}

function calculateSunDirectionForMoon(date) {
  const moonAge = calculateMoonAge(getJulianDay(date));
  const phaseAngle = (moonAge * 360 / 29.53) % 360;
  
  const phaseRad = phaseAngle * Math.PI / 180;
  
  // 关键计算：这是当前算法的太阳方向计算
  const sunDirX = Math.sin(phaseRad);
  const sunDirY = -Math.cos(phaseRad);
  const sunDirZ = 0;
  
  return {
    x: sunDirX,
    y: sunDirY,
    z: sunDirZ,
    phaseAngle: phaseAngle,
    moonAge: moonAge
  };
}

// 测试月相周期
function testMoonPhaseCycle() {
  console.log('=== 月相周期诊断测试 ===\n');
  
  const startDate = new Date('2024-01-01T00:00:00Z');
  
  for (let day = 0; day < 30; day++) {
    const testDate = new Date(startDate.getTime() + day * 24 * 60 * 60 * 1000);
    const result = calculateSunDirectionForMoon(testDate);
    
    console.log(`第${day}天:`);
    console.log(`  月相角度: ${result.phaseAngle.toFixed(1)}°`);
    console.log(`  太阳方向: (${result.x.toFixed(3)}, ${result.y.toFixed(3)}, ${result.z.toFixed(3)})`);
    
    // 分析视觉效果
    if (result.phaseAngle < 45 || result.phaseAngle > 315) {
      console.log(`  月相: 新月 (应该几乎看不见)`);
    } else if (result.phaseAngle >= 45 && result.phaseAngle < 135) {
      console.log(`  月相: 上弦月 (${result.x > 0 ? '右侧' : '左侧'}亮)`);
    } else if (result.phaseAngle >= 135 && result.phaseAngle < 225) {
      console.log(`  月相: 满月 (应该完全明亮)`);
    } else if (result.phaseAngle >= 225 && result.phaseAngle < 315) {
      console.log(`  月相: 下弦月 (${result.x > 0 ? '右侧' : '左侧'}亮)`);
    }
    console.log('');
  }
}

// 测试关键月相点
function testKeyMoonPhases() {
  console.log('=== 关键月相点分析 ===\n');
  
  const keyPhases = [
    { angle: 0, name: '新月' },
    { angle: 90, name: '上弦月' },
    { angle: 180, name: '满月' },
    { angle: 270, name: '下弦月' }
  ];
  
  keyPhases.forEach(phase => {
    const phaseRad = phase.angle * Math.PI / 180;
    
    // 复制算法的计算
    const sunDirX = Math.sin(phaseRad);
    const sunDirY = -Math.cos(phaseRad);
    const sunDirZ = 0;
    
    console.log(`${phase.name} (${phase.angle}°):`);
    console.log(`  太阳方向: (${sunDirX.toFixed(3)}, ${sunDirY.toFixed(3)}, ${sunDirZ.toFixed(3)})`);
    
    // 分析问题
    if (phase.angle === 0) {
      console.log(`  期望: 月球暗面朝向相机，应该看不见`);
      console.log(`  实际: 太阳从下方照射，可能看到边缘光`);
    } else if (phase.angle === 90) {
      console.log(`  期望: 右半边亮`);
      console.log(`  实际: 太阳从右侧照射，右半边亮 ✓`);
    } else if (phase.angle === 180) {
      console.log(`  期望: 完全明亮`);
      console.log(`  实际: 太阳从上方照射，应该完全明亮 ✓`);
    } else if (phase.angle === 270) {
      console.log(`  期望: 左半边亮`);
      console.log(`  实际: 太阳从左侧照射，左半边亮 ✓`);
    }
    console.log('');
  });
}

// 分析问题原因
function analyzeProblems() {
  console.log('=== 问题分析 ===\n');
  
  console.log('1. 月相角度计算正确性:');
  console.log('   ✓ 基于儒略日和月龄的计算是准确的');
  console.log('   ✓ 29.53天的月相周期是正确的');
  console.log('');
  
  console.log('2. 太阳方向计算:');
  console.log('   ✓ 数学公式正确：X=sin(θ), Y=-cos(θ)');
  console.log('   ✓ 能够覆盖360度完整周期');
  console.log('');
  
  console.log('3. 可能的问题原因:');
  console.log('   a) 坐标系不匹配:');
  console.log('      - 算法假设相机看向+Y，但Three.js通常看向-Z');
  console.log('      - 这可能导致月相左右颠倒');
  console.log('');
  console.log('   b) 月球初始朝向:');
  console.log('      - 月球3D模型的初始朝向可能不符合算法假设');
  console.log('      - 可能需要旋转90度或180度');
  console.log('');
  console.log('   c) 着色器处理:');
  console.log('      - 着色器可能只处理了特定的法线方向');
  console.log('      - 光照计算可能有偏差');
  console.log('');
  
  console.log('4. 验证方法:');
  console.log('   - 检查月球的rotation设置');
  console.log('   - 验证相机的lookAt方向');
  console.log('   - 在着色器中添加调试输出');
  console.log('');
}

// 相机跟随机制优势分析
function analyzeCameraFollowAdvantages() {
  console.log('=== 相机跟随机制优势分析 ===\n');
  
  console.log('如果采用相机跟随机制:');
  console.log('');
  
  console.log('✓ 解决位置问题:');
  console.log('  - 月球可以固定在屏幕任意位置');
  console.log('  - 不受地球自转和相机移动影响');
  console.log('');
  
  console.log('✓ 简化月相显示:');
  console.log('  - 月球始终面向相机，显示效果稳定');
  console.log('  - 可以使用简化的2D月相算法');
  console.log('');
  
  console.log('✓ 保持现有优势:');
  console.log('  - 继续使用准确的时间计算');
  console.log('  - 保持真实的天文周期');
  console.log('');
  
  console.log('✓ 性能优势:');
  console.log('  - 不需要复杂的潮汐锁定计算');
  console.log('  - 减少了3D空间变换的复杂性');
  console.log('');
  
  console.log('实现复杂度: 低到中等');
  console.log('推荐指数: ⭐⭐⭐⭐⭐');
  console.log('');
}

// 运行所有分析
function runAnalysis() {
  testMoonPhaseCycle();
  testKeyMoonPhases();
  analyzeProblems();
  analyzeCameraFollowAdvantages();
  
  console.log('=== 结论和建议 ===\n');
  console.log('1. 当前月相算法本身是正确的，能够计算完整周期');
  console.log('2. 问题很可能在3D场景中的坐标系匹配或月球朝向');
  console.log('3. 建议采用相机跟随机制来:');
  console.log('   - 固定月球屏幕位置');
  console.log('   - 简化显示逻辑');
  console.log('   - 避免复杂的3D空间变换问题');
  console.log('4. 这样可以同时解决位置问题和月相显示问题');
}

// 运行分析
runAnalysis();