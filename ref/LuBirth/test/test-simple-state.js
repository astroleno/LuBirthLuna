// 简单状态测试
// 在浏览器控制台中运行此脚本

console.log('=== 简单状态测试 ===');

// 步骤1：检查当前状态
console.log('步骤1：检查当前状态');
if (window.getBirthPointAlignment) {
  const currentState = window.getBirthPointAlignment();
  console.log('当前状态:', currentState);
} else {
  console.error('❌ getBirthPointAlignment函数未找到');
}

// 步骤2：设置状态
console.log('\n步骤2：设置状态');
if (window.setBirthPointAlignment) {
  window.setBirthPointAlignment(true, 116.3974, 39.9093, 10);
  console.log('✅ 已调用setBirthPointAlignment');
} else {
  console.error('❌ setBirthPointAlignment函数未找到');
}

// 步骤3：立即检查状态
console.log('\n步骤3：立即检查状态');
if (window.getBirthPointAlignment) {
  const newState = window.getBirthPointAlignment();
  console.log('新状态:', newState);
  
  if (newState.enableBirthPointAlignment) {
    console.log('✅ 出生点对齐已启用');
  } else {
    console.log('❌ 出生点对齐未启用');
  }
  
  if (newState.birthPointLongitudeDeg === 116.3974 && newState.birthPointLatitudeDeg === 39.9093) {
    console.log('✅ 坐标设置正确');
  } else {
    console.log('❌ 坐标设置错误');
  }
} else {
  console.error('❌ getBirthPointAlignment函数未找到');
}

// 步骤4：启用标记显示
console.log('\n步骤4：启用标记显示');
if (window.setBirthPointMarker) {
  window.setBirthPointMarker(true);
  console.log('✅ 已调用setBirthPointMarker');
} else {
  console.error('❌ setBirthPointMarker函数未找到');
}

// 步骤5：最终检查
console.log('\n步骤5：最终检查');
if (window.getBirthPointAlignment) {
  const finalState = window.getBirthPointAlignment();
  console.log('最终状态:', finalState);
  
  if (finalState.enableBirthPointAlignment && finalState.showBirthPointMarker) {
    console.log('✅ 所有功能已启用！');
    console.log('请检查：');
    console.log('1. 红色标记是否出现在北京天安门位置');
    console.log('2. 相机是否发生旋转');
    console.log('3. 地球构图是否保持一致');
  } else {
    console.log('❌ 功能未完全启用');
    console.log('enableBirthPointAlignment:', finalState.enableBirthPointAlignment);
    console.log('showBirthPointMarker:', finalState.showBirthPointMarker);
  }
} else {
  console.error('❌ getBirthPointAlignment函数未找到');
}

console.log('\n如果功能已启用但看不到效果，请检查：');
console.log('1. 页面是否完全加载');
console.log('2. 控制台是否有错误信息');
console.log('3. 是否需要刷新页面');
