// 新坐标系方案验证测试
// 地球在原点，相机移动调整屏幕位置

console.log('=== 新坐标系方案验证 ===');

// 启用标记以便观察
setBirthPointMarker(true, 0.15, '#ff0000');

console.log('\n🚀 开始测试新坐标系方案...');

// 测试1: 默认视图（应该不再显示尼泊尔）
console.log('\n1. 测试默认视图');
setBirthPointAlignment(false);
console.log('期望：地球应该在原点，默认视图显示亚洲/太平洋区域');

setTimeout(() => {
  // 测试2: 上海对齐
  console.log('\n2. 测试上海对齐');
  setBirthPointAlignment(true, 121.47, 31.23, 10);
  console.log('期望：上海应该在屏幕中心附近，晨昏线正确');
  
  setTimeout(() => {
    // 测试3: 纽约对齐
    console.log('\n3. 测试纽约对齐');
    setBirthPointAlignment(true, -74.01, 40.71, 10);
    console.log('期望：纽约应该在屏幕中心附近');
    
    setTimeout(() => {
      // 测试4: 本初子午线对齐
      console.log('\n4. 测试本初子午线对齐');
      setBirthPointAlignment(true, 0, 0, 10);
      console.log('期望：本初子午线应该在屏幕中心');
      
      setTimeout(() => {
        // 测试5: 地球屏幕位置调整
        console.log('\n5. 测试地球屏幕位置调整');
        setBirthPointAlignment(false);
        // 调整地球在屏幕上的位置
        setEarthScreenPosition(0.4, 0.35); // earthTopY=0.4, earthSize=0.35
        console.log('期望：地球应该在屏幕上移，但仍在原点');
        
        setTimeout(() => {
          console.log('\n✅ 新坐标系方案测试完成！');
          console.log('请检查：');
          console.log('1. 默认视图是否正确（不显示尼泊尔）');
          console.log('2. 出生点对齐是否准确');
          console.log('3. 晨昏线是否正确');
          console.log('4. 地球屏幕位置调整是否正常');
        }, 3000);
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

function setEarthScreenPosition(topY, size) {
  if (window.updateComposition) {
    window.updateComposition({
      earthTopY: topY,
      earthSize: size
    });
  }
}

console.log('\n测试说明：');
console.log('1. 地球现在固定在坐标原点 [0, 0, 0]');
console.log('2. 相机位置根据屏幕需要调整');
console.log('3. 出生点对齐基于地球中心计算');
console.log('4. 每个测试间隔3秒，请观察变化');