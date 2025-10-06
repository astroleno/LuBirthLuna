// 简化的坐标系修正验证脚本
// 快速测试关键位置的对齐效果

console.log('=== 坐标系修正快速验证 ===');

// 启用标记以便观察
setBirthPointMarker(true, 0.15, '#ff0000');

// 测试1: 上海
console.log('\n1. 测试上海 (应该出现在屏幕右侧)');
setBirthPointAlignment(true, 121.47, 31.23, 10);

setTimeout(() => {
  // 测试2: 纽约
  console.log('\n2. 测试纽约 (应该出现在屏幕左侧)');
  setBirthPointAlignment(true, -74.01, 40.71, 10);
  
  setTimeout(() => {
    // 测试3: 本初子午线
    console.log('\n3. 测试本初子午线 (应该出现在屏幕中心)');
    setBirthPointAlignment(true, 0, 0, 10);
    
    setTimeout(() => {
      // 测试4: 默认视图
      console.log('\n4. 测试默认视图');
      setBirthPointAlignment(false);
      
      setTimeout(() => {
        console.log('\n✅ 快速验证完成！');
        console.log('如果所有位置都正确，说明坐标系修正成功');
      }, 2000);
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

console.log('\n测试说明：');
console.log('每个位置测试3秒，观察红点是否在期望的位置');