// 快速验证脚本
// 测试基本的坐标系变化

console.log('=== 快速验证新坐标系 ===');

// 启用标记
setBirthPointMarker(true, 0.2, '#ff0000');

// 先关闭对齐，看看默认视图
console.log('\n1. 默认视图（地球在原点）');
setBirthPointAlignment(false);

setTimeout(() => {
  console.log('\n2. 测试上海对齐');
  setBirthPointAlignment(true, 121.47, 31.23, 10);
  
  setTimeout(() => {
    console.log('\n3. 测试纽约对齐');
    setBirthPointAlignment(true, -74.01, 40.71, 10);
    
    setTimeout(() => {
      console.log('\n✅ 测试完成');
    }, 2000);
  }, 2000);
}, 2000);

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