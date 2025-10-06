/**
 * 月相问题诊断脚本
 * 用于验证月相计算是否正确，并诊断为什么只显示左边变化
 */

import { calculateMoonPhase } from '../src/scenes/simple/utils/moonPhaseCalculator.js';

// 模拟一个月相周期的测试
function testMoonPhaseCycle() {
  console.log('=== 月相周期诊断测试 ===\n');
  
  // 测试时间：从新月开始，每隔1天测试一次，覆盖一个完整周期
  const startDate = new Date('2024-01-01T00:00:00Z'); // 假设这个时间是新月
  
  for (let day = 0; day < 30; day++) {
    const testDate = new Date(startDate.getTime() + day * 24 * 60 * 60 * 1000);
    const result = calculateMoonPhase(testDate, 39.9, 116.4); // 北京坐标
    
    console.log(`第${day}天 (${testDate.toISOString().split('T')[0]}):`);
    console.log(`  月相角度: ${result.phaseAngle.toFixed(1)}°`);
    console.log(`  月相名称: ${result.phaseName}`);
    console.log(`  照明比例: ${result.illumination.toFixed(3)}`);
    console.log(`  太阳方向: (${result.sunDirection.x.toFixed(3)}, ${result.sunDirection.y.toFixed(3)}, ${result.sunDirection.z.toFixed(3)})`);
    console.log(`  月球自转: ${(result.moonRotation * 180 / Math.PI).toFixed(1)}°`);
    console.log('');
  }
}

// 测试关键月相点的太阳方向
function testKeyMoonPhases() {
  console.log('=== 关键月相点太阳方向测试 ===\n');
  
  const keyPhases = [
    { angle: 0, name: '新月' },
    { angle: 90, name: '上弦月' },
    { angle: 180, name: '满月' },
    { angle: 270, name: '下弦月' }
  ];
  
  keyPhases.forEach(phase => {
    const phaseRad = phase.angle * Math.PI / 180;
    
    // 复制 calculateSunDirectionForMoon 的计算逻辑
    const sunDirX = Math.sin(phaseRad);
    const sunDirY = -Math.cos(phaseRad);
    const sunDirZ = 0;
    
    console.log(`${phase.name} (${phase.angle}°):`);
    console.log(`  太阳方向: (${sunDirX.toFixed(3)}, ${sunDirY.toFixed(3)}, ${sunDirZ.toFixed(3)})`);
    
    // 分析太阳方向的视觉效果
    if (Math.abs(sunDirX) < 0.1 && sunDirY < 0) {
      console.log(`  效果: 太阳从后方照射（新月，应该看不见）`);
    } else if (Math.abs(sunDirX) < 0.1 && sunDirY > 0) {
      console.log(`  效果: 太阳从前方照射（满月，应该完全明亮）`);
    } else if (sunDirX > 0) {
      console.log(`  效果: 太阳从右侧照射（右半边亮）`);
    } else if (sunDirX < 0) {
      console.log(`  效果: 太阳从左侧照射（左半边亮）`);
    }
    console.log('');
  });
}

// 测试相机跟随机制的可行性
function testCameraFollowMechanism() {
  console.log('=== 相机跟随机制可行性分析 ===\n');
  
  console.log('优势:');
  console.log('1. 月球可以固定在屏幕某个位置（如右上角）');
  console.log('2. 不受地球自转影响，月相变化只依赖时间');
  console.log('3. 实现相对简单，只需要每帧更新月球位置');
  console.log('4. 月球仍在3D空间中，可以保持现有的着色器效果');
  console.log('');
  
  console.log('实现方案:');
  console.log('1. 计算屏幕固定位置对应的世界坐标');
  console.log('2. 每帧将月球位置更新到相机前方固定偏移处');
  console.log('3. 月球始终面向相机（billboard效果）');
  console.log('4. 保持现有的月相计算逻辑');
  console.log('');
  
  console.log('伪代码:');
  console.log(`
    // 在每帧更新中
    function updateMoonPosition() {
      // 获取相机信息
      const cameraPos = camera.position;
      const cameraDir = new THREE.Vector3();
      camera.getWorldDirection(cameraDir);
      
      // 计算月球位置（相机右上方）
      const offset = new THREE.Vector3(0.3, 0.2, -1); // 屏幕坐标
      offset.unproject(camera);
      offset.sub(cameraPos).normalize();
      offset.multiplyScalar(5); // 距离相机5个单位
      
      moon.position.copy(cameraPos).add(offset);
      
      // 月球始终面向相机
      moon.lookAt(cameraPos);
    }
  `);
  console.log('');
}

// 诊断坐标系问题
function diagnoseCoordinateSystem() {
  console.log('=== 坐标系问题诊断 ===\n');
  
  console.log('当前算法假设:');
  console.log('- 相机视线方向: +Y');
  console.log('- 太阳方向计算: X=cos(phase), Y=-sin(phase)');
  console.log('');
  
  console.log('但Three.js中通常:');
  console.log('- 相机视线方向: -Z');
  console.log('- 上方向: +Y');
  console.log('- 右方向: +X');
  console.log('');
  
  console.log('可能的修正方案:');
  console.log('1. 将太阳方向从XY平面转换到XZ平面');
  console.log('2. 调整月相角度的起始点');
  console.log('3. 旋转月球的初始朝向');
  console.log('');
}

// 运行所有测试
function runAllDiagnostics() {
  testMoonPhaseCycle();
  testKeyMoonPhases();
  testCameraFollowMechanism();
  diagnoseCoordinateSystem();
  
  console.log('=== 诊断建议 ===\n');
  console.log('1. 首先检查月相角度是否正确变化');
  console.log('2. 验证太阳方向是否符合预期');
  console.log('3. 检查月球在3D场景中的初始朝向');
  console.log('4. 考虑实现相机跟随机制来固定月球位置');
}

// 如果直接运行此脚本
if (typeof window === 'undefined') {
  // Node.js 环境
  runAllDiagnostics();
} else {
  // 浏览器环境
  window.moonPhaseDiagnostics = {
    runAllDiagnostics,
    testMoonPhaseCycle,
    testKeyMoonPhases,
    testCameraFollowMechanism,
    diagnoseCoordinateSystem
  };
  
  console.log('月相诊断工具已加载到 window.moonPhaseDiagnostics');
  console.log('在浏览器控制台运行: moonPhaseDiagnostics.runAllDiagnostics()');
}

export { runAllDiagnostics, testMoonPhaseCycle, testKeyMoonPhases, testCameraFollowMechanism, diagnoseCoordinateSystem };