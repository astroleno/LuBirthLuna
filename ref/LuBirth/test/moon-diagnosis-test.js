/**
 * 月相问题诊断测试代码
 * 请在浏览器控制台中运行此代码，然后将结果返回给AI
 */

// 1. 首先检查当前实际的参数设置
function checkCurrentSettings() {
  console.log('=== 当前实际设置检查 ===\n');
  
  // 检查月球组件的实际参数
  const moonMesh = document.querySelector('[name*="moon"]') || 
                  document.querySelector('[data-name*="moon"]') ||
                  Array.from(document.querySelectorAll('*')).find(el => 
                    el.material && el.material.uniforms && el.material.uniforms.sunDirWorldForShading
                  );
  
  if (moonMesh) {
    console.log('找到月球mesh:', moonMesh);
    console.log('位置:', moonMesh.position?.toArray());
    
    // 检查材质uniforms
    if (moonMesh.material && moonMesh.material.uniforms) {
      const uniforms = moonMesh.material.uniforms;
      console.log('当前uniforms:');
      console.log('- sunDirWorldForShading:', uniforms.sunDirWorldForShading?.value?.toArray());
      console.log('- phaseAngleRad:', uniforms.phaseAngleRad?.value);
      console.log('- enableUniformShading:', uniforms.enableUniformShading?.value);
    }
  } else {
    console.log('未找到月球mesh，尝试其他方法...');
  }
  
  // 检查相机位置
  const camera = window.__camera || window.camera;
  if (camera) {
    console.log('相机位置:', camera.position?.toArray());
    console.log('相机朝向:', camera.getWorldDirection(new THREE.Vector3()).toArray());
  }
  
  // 检查当前时间
  console.log('当前时间设置:', {
    currentDate: window.currentDate || '未知',
    observerLat: window.observerLat || '未知',
    observerLon: window.observerLon || '未知'
  });
  
  return {
    moonPosition: moonMesh?.position?.toArray(),
    cameraPosition: camera?.position?.toArray(),
    uniforms: moonMesh?.material?.uniforms
  };
}

// 2. 检查实际的月相计算
function checkActualMoonPhaseCalculation() {
  console.log('\n=== 实际月相计算检查 ===\n');
  
  // 尝试获取当前的月相数据
  try {
    // 检查是否有月相相关的全局变量
    if (window.moonPhaseResult) {
      console.log('全局moonPhaseResult:', window.moonPhaseResult);
    }
    
    // 检查Simple组件的状态
    if (window.simpleState) {
      console.log('Simple组件状态:', window.simpleState);
    }
    
    // 模拟几个关键时间点的计算
    const testDates = [
      '2024-01-01T12:00:00Z',  // 满月
      '2024-01-08T12:00:00Z',  // 上弦月
      '2024-01-15T12:00:00Z',  // 新月
      '2024-01-22T12:00:00Z',  // 下弦月
    ];
    
    testDates.forEach(date => {
      try {
        // 如果有getMoonPhase函数
        if (window.getMoonPhase) {
          const result = window.getMoonPhase(date, 39.9, 116.4);
          console.log(`${date}:`, result);
        }
      } catch (e) {
        console.log(`${date}: 计算失败`, e.message);
      }
    });
    
  } catch (e) {
    console.log('月相计算检查失败:', e.message);
  }
}

// 3. 诊断正交基构建
function diagnoseOrthogonalBasis() {
  console.log('\n=== 正交基构建诊断 ===\n');
  
  // 获取实际的相机和月球位置
  const camera = window.__camera || window.camera;
  const moonMesh = document.querySelector('[name*="moon"]') || 
                  document.querySelector('[data-name*="moon"]') ||
                  Array.from(document.querySelectorAll('*')).find(el => 
                    el.material && el.material.uniforms && el.material.uniforms.sunDirWorldForShading
                  );
  
  if (!camera || !moonMesh) {
    console.log('缺少必要信息，无法诊断正交基');
    return;
  }
  
  const moonPos = moonMesh.position;
  const camPos = camera.position;
  
  console.log('实际位置:');
  console.log('月球位置:', moonPos.toArray());
  console.log('相机位置:', camPos.toArray());
  
  // 构建正交基（按照当前代码逻辑）
  const F = new THREE.Vector3().subVectors(camPos, moonPos).normalize();
  const camUp = camera.up || new THREE.Vector3(0, 1, 0);
  const Uprime = camUp.clone().sub(F.clone().multiplyScalar(camUp.dot(F)));
  let U = Uprime.lengthSq() > 1e-6 ? Uprime.normalize() : new THREE.Vector3(0, 1, 0);
  const R = new THREE.Vector3().crossVectors(F, U).normalize(); // 当前使用的方法
  U = new THREE.Vector3().crossVectors(R, F).normalize();
  
  console.log('\n构建的正交基:');
  console.log('F (前向):', F.toArray());
  console.log('R (右向):', R.toArray(), `(x=${R.x.toFixed(3)})`);
  console.log('U (上向):', U.toArray());
  
  // 验证正交性
  console.log('\n正交性验证:');
  console.log('F·R =', F.dot(R).toFixed(6));
  console.log('F·U =', F.dot(U).toFixed(6));
  console.log('R·U =', R.dot(U).toFixed(6));
  
  // 测试不同的太阳方向计算
  console.log('\n太阳方向计算测试:');
  const testAngles = [0, 90, 180, 270];
  
  testAngles.forEach(angle => {
    const angleRad = angle * Math.PI / 180;
    
    // 当前公式：-sin(a)·R + cos(a)·F
    const S_current = new THREE.Vector3()
      .add(R.clone().multiplyScalar(-Math.sin(angleRad)))
      .add(F.clone().multiplyScalar(Math.cos(angleRad)))
      .normalize();
    
    // 原始公式：cos(a)·F + sin(a)·R
    const S_original = new THREE.Vector3()
      .add(F.clone().multiplyScalar(Math.cos(angleRad)))
      .add(R.clone().multiplyScalar(Math.sin(angleRad)))
      .normalize();
    
    // 另一种公式：sin(a)·R + cos(a)·F
    const S_alt = new THREE.Vector3()
      .add(R.clone().multiplyScalar(Math.sin(angleRad)))
      .add(F.clone().multiplyScalar(Math.cos(angleRad)))
      .normalize();
    
    console.log(`${angle}°:`);
    console.log(`  当前公式: (${S_current.toArray().map(v => v.toFixed(3)).join(', ')}) - ${getLightingSide(S_current)}`);
    console.log(`  原始公式: (${S_original.toArray().map(v => v.toFixed(3)).join(', ')}) - ${getLightingSide(S_original)}`);
    console.log(`  替代公式: (${S_alt.toArray().map(v => v.toFixed(3)).join(', ')}) - ${getLightingSide(S_alt)}`);
  });
  
  return { F, R, U };
}

// 4. 检查实际的渲染结果
function checkActualRendering() {
  console.log('\n=== 实际渲染结果检查 ===\n');
  
  // 获取当前的太阳方向
  const moonMesh = document.querySelector('[name*="moon"]') || 
                  document.querySelector('[data-name*="moon"]') ||
                  Array.from(document.querySelectorAll('*')).find(el => 
                    el.material && el.material.uniforms && el.material.uniforms.sunDirWorldForShading
                  );
  
  if (moonMesh && moonMesh.material && moonMesh.material.uniforms) {
    const sunDir = moonMesh.material.uniforms.sunDirWorldForShading?.value;
    const phaseAngle = moonMesh.material.uniforms.phaseAngleRad?.value;
    
    if (sunDir) {
      console.log('当前太阳方向:', sunDir.toArray());
      console.log('光照方向:', getLightingSide(sunDir));
      
      // 分析光照方向与月相的匹配度
      const expectedSide = getExpectedLightingSide(phaseAngle);
      console.log(`phaseAngle=${(phaseAngle * 180 / Math.PI).toFixed(1)}°, 期望光照方向: ${expectedSide}`);
      console.log(`实际光照方向: ${getLightingSide(sunDir)}`);
      console.log(`匹配度: ${expectedSide === getLightingSide(sunDir) ? '✅' : '❌'}`);
    }
  }
}

// 5. 完整诊断
function runCompleteDiagnosis() {
  console.log('🔍 月相问题完整诊断开始...\n');
  
  const settings = checkCurrentSettings();
  checkActualMoonPhaseCalculation();
  const basis = diagnoseOrthogonalBasis();
  checkActualRendering();
  
  console.log('\n=== 诊断总结 ===');
  console.log('请将以上完整的控制台输出复制给AI进行分析');
  console.log('包括：');
  console.log('1. 当前设置检查');
  console.log('2. 月相计算检查');
  console.log('3. 正交基构建诊断');
  console.log('4. 实际渲染结果检查');
  
  return {
    settings,
    basis
  };
}

// 辅助函数
function getLightingSide(sunDir) {
  if (!sunDir) return '未知';
  if (sunDir.x > 0.3) return '右侧';
  else if (sunDir.x < -0.3) return '左侧';
  else if (sunDir.z > 0.3) return '前方';
  else if (sunDir.z < -0.3) return '后方';
  else return '其他方向';
}

function getExpectedLightingSide(phaseAngleRad) {
  if (!phaseAngleRad) return '未知';
  const angle = phaseAngleRad * 180 / Math.PI;
  if (angle < 45) return '前方';
  else if (angle < 135) return '右侧';
  else if (angle < 225) return '后方';
  else if (angle < 315) return '左侧';
  else return '前方';
}

// 导出到全局
window.moonDiagnosis = {
  runCompleteDiagnosis,
  checkCurrentSettings,
  checkActualMoonPhaseCalculation,
  diagnoseOrthogonalBasis,
  checkActualRendering,
  getLightingSide,
  getExpectedLightingSide
};

console.log('🔍 月相诊断工具已加载到 window.moonDiagnosis');
console.log('请运行: moonDiagnosis.runCompleteDiagnosis()');
console.log('然后将完整的控制台输出返回给AI');