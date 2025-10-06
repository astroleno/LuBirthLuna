/**
 * 测试正交基构建问题
 */

import * as THREE from 'three';

// 测试正交基构建
function testOrthogonalBasisConstruction() {
  console.log('=== 测试正交基构建问题 ===\n');
  
  // 设置不同的相机和月球位置配置
  const testConfigs = [
    {
      name: '标准配置',
      camera: new THREE.Vector3(0, 0, 15),
      moon: new THREE.Vector3(0, 5, 0)
    },
    {
      name: '相机在右侧',
      camera: new THREE.Vector3(10, 0, 10),
      moon: new THREE.Vector3(0, 5, 0)
    },
    {
      name: '相机在上方',
      camera: new THREE.Vector3(0, 10, 10),
      moon: new THREE.Vector3(0, 5, 0)
    },
    {
      name: '相机在左侧',
      camera: new THREE.Vector3(-10, 0, 10),
      moon: new THREE.Vector3(0, 5, 0)
    }
  ];
  
  testConfigs.forEach(config => {
    console.log(`--- ${config.name} ---`);
    console.log(`相机位置: [${config.camera.toArray().join(', ')}]`);
    console.log(`月球位置: [${config.moon.toArray().join(', ')}]`);
    
    // 构建正交基（复制现有代码逻辑）
    const F = new THREE.Vector3().subVectors(config.camera, config.moon).normalize();
    const camUp = new THREE.Vector3(0, 1, 0);
    const Uprime = camUp.clone().sub(F.clone().multiplyScalar(camUp.dot(F)));
    let U = Uprime.lengthSq() > 1e-6 ? Uprime.normalize() : new THREE.Vector3(0, 1, 0);
    const R = new THREE.Vector3().crossVectors(F, U).normalize();
    U = new THREE.Vector3().crossVectors(R, F).normalize();
    
    console.log('构建的正交基：');
    console.log(`F (前向): [${F.toArray().join(', ')}]`);
    console.log(`R (右向): [${R.toArray().join(', ')}]`);
    console.log(`U (上向): [${U.toArray().join(', ')}]`);
    
    // 验证正交性
    const fDotR = F.dot(R);
    const fDotU = F.dot(U);
    const rDotU = R.dot(U);
    
    console.log('正交性验证：');
    console.log(`F·R = ${fDotR.toFixed(6)} (应该≈0) ${Math.abs(fDotR) < 1e-6 ? '✅' : '❌'}`);
    console.log(`F·U = ${fDotU.toFixed(6)} (应该≈0) ${Math.abs(fDotU) < 1e-6 ? '✅' : '❌'}`);
    console.log(`R·U = ${rDotU.toFixed(6)} (应该≈0) ${Math.abs(rDotU) < 1e-6 ? '✅' : '❌'}`);
    
    // 检查坐标系是否为右手系
    const crossRU = new THREE.Vector3().crossVectors(R, U);
    const isRightHanded = crossRU.distanceTo(F) < 1e-6;
    console.log(`R×U = F: ${isRightHanded ? '✅' : '❌'}`);
    
    // 分析R向量的方向问题
    console.log('R向量分析：');
    console.log(`R.x = ${R.x.toFixed(3)} (正值表示右侧，负值表示左侧)`);
    console.log(`R.z = ${R.z.toFixed(3)} (正值表示前方，负值表示后方)`);
    
    // 测试不同phase_angle下的太阳方向
    console.log('\n太阳方向测试：');
    const testAngles = [0, 90, 180, 270];
    
    testAngles.forEach(angle => {
      const angleRad = angle * Math.PI / 180;
      
      // 使用修复后的公式
      const S = new THREE.Vector3()
        .add(R.clone().multiplyScalar(-Math.sin(angleRad)))
        .add(F.clone().multiplyScalar(Math.cos(angleRad)))
        .normalize();
      
      console.log(`${angle}°: 太阳方向=[${S.toArray().map(v => v.toFixed(3)).join(', ')}]`);
      
      // 分析光照方向
      if (S.x > 0.3) console.log(`  → 太阳从右侧照射`);
      else if (S.x < -0.3) console.log(`  → 太阳从左侧照射`);
      else if (S.z > 0.3) console.log(`  → 太阳从前方照射`);
      else if (S.z < -0.3) console.log(`  → 太阳从后方照射`);
      else console.log(`  → 太阳从其他方向照射`);
    });
    
    console.log('\n');
  });
}

// 测试月球几何体朝向问题
function testMoonGeometryOrientation() {
  console.log('=== 测试月球几何体朝向问题 ===\n');
  
  console.log('问题分析：');
  console.log('1. 月球几何体的初始朝向可能影响光照效果');
  console.log('2. Three.js球体默认+Z轴朝前');
  console.log('3. 潮汐锁定和贴图对齐可能改变实际朝向');
  console.log('4. 需要验证光照方向与月球朝向的匹配关系\n');
  
  // 创建测试场景
  const moonGeometry = new THREE.SphereGeometry(1, 32, 32);
  const moonPosition = new THREE.Vector3(0, 0, 0);
  const cameraPosition = new THREE.Vector3(0, 0, 5);
  
  console.log('默认月球几何体朝向：');
  console.log('- 球体中心: (0, 0, 0)');
  console.log('- 相机位置: (0, 0, 5)');
  console.log('- 默认+Z轴朝向相机方向');
  console.log('- 贴图UV映射：U=右左，V=上下\n');
  
  // 构建正交基
  const F = new THREE.Vector3().subVectors(cameraPosition, moonPosition).normalize();
  const camUp = new THREE.Vector3(0, 1, 0);
  const Uprime = camUp.clone().sub(F.clone().multiplyScalar(camUp.dot(F)));
  let U = Uprime.lengthSq() > 1e-6 ? Uprime.normalize() : new THREE.Vector3(0, 1, 0);
  const R = new THREE.Vector3().crossVectors(F, U).normalize();
  U = new THREE.Vector3().crossVectors(R, F).normalize();
  
  console.log('正交基构建结果：');
  console.log(`F (相机方向): [${F.toArray().join(', ')}]`);
  console.log(`R (右向): [${R.toArray().join(', ')}]`);
  console.log(`U (上向): [${U.toArray().join(', ')}]`);
  
  // 分析坐标系匹配问题
  console.log('\n坐标系匹配分析：');
  console.log('月球几何体坐标系 vs 计算坐标系：');
  console.log('- 几何体: +Z朝前 (相机方向)');
  console.log('- 计算: F朝前, R朝右, U朝上');
  console.log('- 理论上应该匹配\n');
  
  // 测试光照方向与法线的关系
  console.log('光照方向与法线关系测试：');
  const testNormals = [
    new THREE.Vector3(0, 0, 1),  // 前方法线
    new THREE.Vector3(1, 0, 0),  // 右侧法线
    new THREE.Vector3(0, 0, -1), // 后方法线
    new THREE.Vector3(-1, 0, 0)  // 左侧法线
  ];
  
  testNormals.forEach((normal, index) => {
    const normalName = ['前方', '右侧', '后方', '左侧'][index];
    
    // 测试不同phase_angle下的光照
    [0, 90, 180, 270].forEach(angle => {
      const angleRad = angle * Math.PI / 180;
      const S = new THREE.Vector3()
        .add(R.clone().multiplyScalar(-Math.sin(angleRad)))
        .add(F.clone().multiplyScalar(Math.cos(angleRad)))
        .normalize();
      
      const ndl = Math.max(0, normal.dot(S));
      console.log(`${normalName}法线 + ${angle}°光照: dot=${ndl.toFixed(3)} ${ndl > 0.5 ? '明亮' : ndl > 0.1 ? '中等' : '黑暗'}`);
    });
    
    console.log('');
  });
}

// 综合问题分析
function comprehensiveOrthogonalAnalysis() {
  console.log('=== 综合正交基问题分析 ===\n');
  
  console.log('基于测试结果，可能的问题：');
  console.log('');
  
  console.log('🔍 问题1：正交基构建顺序问题');
  console.log('   - 当前顺序：F → U → R');
  console.log('   - 可能导致坐标系与月球几何体不匹配');
  console.log('   - 建议：尝试不同的构建顺序');
  console.log('');
  
  console.log('🔍 问题2：月球几何体初始朝向');
  console.log('   - Three.js球体默认+Z朝前');
  console.log('   - 但潮汐锁定可能改变了实际朝向');
  console.log('   - 建议：验证月球实际朝向');
  console.log('');
  
  console.log('🔍 问题3：相机up向量选择');
  console.log('   - 当前使用(0,1,0)作为相机up');
  console.log('   - 在某些相机角度下可能不稳定');
  console.log('   - 建议：使用更稳定的up向量');
  console.log('');
  
  console.log('💡 建议的修复方案：');
  console.log('1. 尝试调整正交基构建顺序');
  console.log('2. 验证月球几何体实际朝向');
  console.log('3. 测试不同的相机up向量');
  console.log('4. 确保光照方向与月球法线匹配');
}

// 运行测试
function runOrthogonalBasisTest() {
  testOrthogonalBasisConstruction();
  console.log('\n' + '='.repeat(60) + '\n');
  
  testMoonGeometryOrientation();
  console.log('\n' + '='.repeat(60) + '\n');
  
  comprehensiveOrthogonalAnalysis();
}

// 如果直接运行此脚本
if (typeof window === 'undefined') {
  runOrthogonalBasisTest();
} else {
  window.orthogonalBasisTest = {
    runOrthogonalBasisTest,
    testOrthogonalBasisConstruction,
    testMoonGeometryOrientation,
    comprehensiveOrthogonalAnalysis
  };
  
  console.log('正交基测试工具已加载到 window.orthogonalBasisTest');
  console.log('在浏览器控制台运行: orthogonalBasisTest.runOrthogonalBasisTest()');
}

export { runOrthogonalBasisTest, testOrthogonalBasisConstruction, testMoonGeometryOrientation };