// 坐标系调试脚本
// 验证当前的坐标映射是否正确

console.log('=== 坐标系调试 ===');

// 启用标记
setBirthPointMarker(true, 0.2, '#ff0000');

console.log('\n🔍 调试坐标系映射...');

// 测试不同的经度，看看实际对应的位置
const testPoints = [
  { name: '0°经度', lon: 0, lat: 0 },
  { name: '90°E', lon: 90, lat: 0 },
  { name: '180°', lon: 180, lat: 0 },
  { name: '90°W', lon: -90, lat: 0 },
  { name: '上海', lon: 121.47, lat: 31.23 }
];

let currentIndex = 0;

function testNextPoint() {
  if (currentIndex >= testPoints.length) {
    console.log('\n✅ 坐标系调试完成');
    return;
  }
  
  const point = testPoints[currentIndex];
  console.log(`\n${currentIndex + 1}. 测试${point.name} (经度: ${point.lon}°)`);
  
  setBirthPointAlignment(true, point.lon, point.lat, 10);
  
  setTimeout(() => {
    console.log(`请观察：${point.name}实际显示在什么位置？`);
    currentIndex++;
    testNextPoint();
  }, 3000);
}

// 检查光照方向
console.log('\n💡 检查光照方向...');
const comp = window.getCurrentComposition();
if (comp) {
  console.log('当前光照设置:', {
    useFixedSun: comp.useFixedSun,
    fixedSunDir: comp.fixedSunDir,
    useSeasonalVariation: comp.useSeasonalVariation
  });
}

// 检查地球旋转
console.log('\n🌍 检查地球旋转...');
if (comp) {
  console.log('地球旋转:', {
    earthTiltDeg: comp.earthTiltDeg,
    earthYawDeg: comp.earthYawDeg
  });
}

// 检查相机设置
console.log('\n📷 检查相机设置...');
if (comp) {
  console.log('相机设置:', {
    cameraAzimuthDeg: comp.cameraAzimuthDeg,
    cameraElevationDeg: comp.cameraElevationDeg,
    cameraDistance: comp.cameraDistance
  });
}

// 开始测试
setTimeout(() => {
  testNextPoint();
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

console.log('\n调试说明：');
console.log('1. 观察每个经度点实际显示的位置');
console.log('2. 检查光照是否从左上角来');
console.log('3. 验证0°经度是否在正确位置');