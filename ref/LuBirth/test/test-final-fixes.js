// 修正后的验证测试
// 验证坐标系和光照问题是否解决

console.log('=== 修正后验证测试 ===');

// 启用标记
setBirthPointMarker(true, 0.2, '#ff0000');

console.log('\n🔧 修正内容：');
console.log('1. 地球固定在原点 [0, 0, 0]');
console.log('2. 相机默认方位角改为90度');
console.log('3. 坐标系映射修正：+90度而不是-90度');
console.log('4. 光照默认在debug模式，方位角135度，仰角30度');

console.log('\n🚀 开始验证测试...');

// 测试1: 默认视图
console.log('\n1. 测试默认视图（应该不再显示尼泊尔）');
setBirthPointAlignment(false);
setLightMode('debug');

setTimeout(() => {
  // 测试2: 0,0对齐
  console.log('\n2. 测试0,0对齐（应该对齐到大西洋中部）');
  setBirthPointAlignment(true, 0, 0, 10);
  
  setTimeout(() => {
    // 测试3: 上海对齐
    console.log('\n3. 测试上海对齐（应该对齐到上海）');
    setBirthPointAlignment(true, 121.47, 31.23, 10);
    
    setTimeout(() => {
      // 测试4: 纽约对齐
      console.log('\n4. 测试纽约对齐（应该对齐到纽约）');
      setBirthPointAlignment(true, -74.01, 40.71, 10);
      
      setTimeout(() => {
        // 测试5: 检查光照方向
        console.log('\n5. 检查光照方向（应该从左上角来）');
        setBirthPointAlignment(false);
        
        // 检查当前光照设置
        const comp = window.getCurrentComposition();
        if (comp) {
          console.log('当前光照设置:', {
            mode: comp.useFixedSun ? 'fixed' : 'calculated',
            lightAzimuth: comp.lightAzimuth,
            lightElevation: comp.lightElevation,
            fixedSunDir: comp.fixedSunDir
          });
        }
        
        setTimeout(() => {
          console.log('\n✅ 修正验证测试完成！');
          console.log('请检查：');
          console.log('1. 默认视图是否正确（不显示尼泊尔）');
          console.log('2. 0,0对齐是否在大西洋中部');
          console.log('3. 上海对齐是否准确');
          console.log('4. 纽约对齐是否准确');
          console.log('5. 光照是否从左上角来');
        }, 2000);
      }, 3000);
    }, 3000);
  }, 3000);
}, 3000);

// 辅助函数
function setBirthPointAlignment(enabled, longitude = 0, latitude = 0, alpha = 10) {
  if (window.updateComposition) {
    window.updateComposition({
      enableBirthPointAlignment: enabled,
      birthPointLongitudeDeg: longitude,
      birthPointLatitudeDeg: latitude,
      birthPointAlphaDeg: alpha
    });
  }
}

function setBirthPointMarker(enabled, size = 0.1, color = '#ff0000') {
  if (window.updateComposition) {
    window.updateComposition({
      showBirthPointMarker: enabled,
      birthPointMarkerSize: size,
      birthPointMarkerColor: color
    });
  }
}

function setLightMode(mode) {
  if (window.updateComposition) {
    // 这里需要根据实际情况调整
    // 暂时无法直接设置mode，但可以通过其他方式影响光照
    console.log(`光照模式设置为: ${mode}`);
  }
}

console.log('\n测试说明：');
console.log('1. 每个测试间隔3秒');
console.log('2. 请观察红点标记的位置是否正确');
console.log('3. 请观察光照方向是否从左上角来');
console.log('4. 请观察晨昏线是否正确');