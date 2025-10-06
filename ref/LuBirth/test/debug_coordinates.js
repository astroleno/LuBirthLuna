// 调试坐标系统的简单脚本
console.log("=== 坐标系统调试 ===");

// 假设我们有Three.js的MathUtils
const MathUtils = {
  degToRad: (deg) => deg * Math.PI / 180,
  radToDeg: (rad) => rad * 180 / Math.PI
};

// 上海坐标
const shanghai = { lon: 121.47, lat: 31.23 };

console.log("上海经纬度:", shanghai);

// 1. 计算上海的世界坐标（标准球面坐标转换）
const lat = MathUtils.degToRad(shanghai.lat);
const lon = MathUtils.degToRad(shanghai.lon);

const worldPoint = {
  x: Math.cos(lat) * Math.sin(lon),  // 东西方向
  y: Math.sin(lat),                  // 上下方向  
  z: -Math.cos(lat) * Math.cos(lon)  // 南北方向（负号）
};

console.log("上海世界坐标:", worldPoint);

// 2. 如果相机要"看到"上海，相机应该在哪里？
// 关键理解：相机应该从上海的"外侧"看向地心方向，这样上海就在视野中心

// 方法1：相机位置 = 出生点方向 * 距离（比如15个单位）
const cameraDistance = 15;
const cameraPosition = {
  x: worldPoint.x * cameraDistance,
  y: worldPoint.y * cameraDistance, 
  z: worldPoint.z * cameraDistance
};

console.log("相机位置:", cameraPosition);

// 3. 相机朝向：从相机位置看向地心(0,0,0)
// lookAt向量 = 目标点 - 相机位置 = (0,0,0) - cameraPosition
const lookAtDirection = {
  x: 0 - cameraPosition.x,
  y: 0 - cameraPosition.y,
  z: 0 - cameraPosition.z
};

console.log("相机朝向向量:", lookAtDirection);

// 4. 转换为欧拉角
// 对于Three.js相机，我们需要计算yaw和pitch
const yaw = MathUtils.radToDeg(Math.atan2(lookAtDirection.x, lookAtDirection.z));
const pitch = MathUtils.radToDeg(Math.asin(-lookAtDirection.y / Math.sqrt(
  lookAtDirection.x * lookAtDirection.x + 
  lookAtDirection.y * lookAtDirection.y + 
  lookAtDirection.z * lookAtDirection.z
)));

console.log("相机欧拉角:", { yaw, pitch });

// 5. 验证：这个角度应该让相机正对上海
console.log("=== 验证 ===");
console.log("预期：相机yaw应该接近上海经度121.47°");
console.log("实际yaw:", yaw);
console.log("差值:", Math.abs(yaw - shanghai.lon));