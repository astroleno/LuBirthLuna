// 坐标系调试测试脚本
// 在浏览器控制台中运行此脚本来调试坐标系问题

console.log('=== 坐标系调试测试 ===');

// 1. 首先启用出生点对齐和标记
console.log('\n1. 启用出生点对齐和标记');
setBirthPointAlignment(true, 121.47, 31.23, 10); // 上海
setBirthPointMarker(true, 0.15, '#ff0000');

// 2. 等待一下让效果生效
setTimeout(() => {
  console.log('当前对齐状态:', getBirthPointAlignment());
  console.log('请观察：上海是否出现在正确的位置（应该是屏幕右侧）');
}, 1000);

// 3. 测试不同相位差
setTimeout(() => {
  console.log('\n2. 测试相位差修正 +90°');
  setLongitudePhaseShift(90);
  console.log('相位差设为90°，观察上海位置变化');
}, 2000);

// 4. 测试另一个相位差
setTimeout(() => {
  console.log('\n3. 测试相位差修正 -90°');
  setLongitudePhaseShift(-90);
  console.log('相位差设为-90°，观察上海位置变化');
}, 3000);

// 5. 重置相位差
setTimeout(() => {
  console.log('\n4. 重置相位差');
  setLongitudePhaseShift(0);
  console.log('相位差重置为0°');
}, 4000);

// 6. 测试其他城市
setTimeout(() => {
  console.log('\n5. 测试纽约 (经度-74.01°, 纬度40.71°)');
  setBirthPointAlignment(true, -74.01, 40.71, 10);
  console.log('请观察：纽约是否出现在屏幕左侧');
}, 5000);

// 7. 测试本初子午线
setTimeout(() => {
  console.log('\n6. 测试本初子午线 (经度0°, 纬度0°)');
  setBirthPointAlignment(true, 0, 0, 10);
  console.log('请观察：本初子午线是否出现在屏幕中心');
}, 6000);

// 8. 测试国际日期变更线
setTimeout(() => {
  console.log('\n7. 测试国际日期变更线 (经度180°, 纬度0°)');
  setBirthPointAlignment(true, 180, 0, 10);
  console.log('请观察：国际日期变更线是否出现在屏幕左侧边缘');
}, 7000);

// 9. 测试默认对齐
setTimeout(() => {
  console.log('\n8. 测试默认对齐 (0,0)');
  setBirthPointAlignment(true, 0, 0, 10);
  console.log('请观察：默认(0,0)位置，应该显示在大西洋中部');
}, 8000);

// 10. 关闭对齐，回到默认视图
setTimeout(() => {
  console.log('\n9. 关闭对齐，回到默认视图');
  setBirthPointAlignment(false);
  console.log('已关闭对齐，观察默认相机位置');
}, 9000);

console.log('\n测试完成！请根据观察结果，我们一起来分析问题。');

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

function setLongitudePhaseShift(shift) {
  if (window.updateComposition) {
    window.updateComposition({
      longitudePhaseShift: shift
    });
  }
}

function getBirthPointAlignment() {
  if (window.getCurrentComposition) {
    const comp = window.getCurrentComposition();
    return {
      enabled: comp.enableBirthPointAlignment,
      longitude: comp.birthPointLongitudeDeg,
      latitude: comp.birthPointLatitudeDeg,
      alpha: comp.birthPointAlphaDeg,
      phaseShift: comp.longitudePhaseShift,
      showMarker: comp.showBirthPointMarker
    };
  }
  return null;
}