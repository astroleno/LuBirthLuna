// 测试positionUtils坐标系的实际映射
console.log("=== positionUtils坐标系测试 ===");

const testAngles = [
  { name: "0度", az: 0 },
  { name: "90度", az: 90 },
  { name: "180度", az: 180 },
  { name: "-90度", az: -90 },
  { name: "121.5度(上海)", az: 121.5 }
];

testAngles.forEach(test => {
  const azRad = test.az * Math.PI / 180;
  const el = 0; // 赤道
  const R = 15;
  
  // positionUtils的公式
  const x = R * Math.sin(azRad) * Math.cos(el);
  const y = R * Math.sin(el); 
  const z = R * Math.cos(azRad) * Math.cos(el);
  
  console.log(`${test.name} (az=${test.az}°):`, {
    x: x.toFixed(3),
    y: y.toFixed(3),
    z: z.toFixed(3),
    方向: getDirection(x, z)
  });
});

function getDirection(x, z) {
  if (Math.abs(x) > Math.abs(z)) {
    return x > 0 ? "正东(+X)" : "正西(-X)";
  } else {
    return z > 0 ? "正南(+Z)" : "正北(-Z)";
  }
}

console.log("\n=== 地理坐标对应关系 ===");
console.log("0°经度（本初子午线）应该对应哪个方向？");
console.log("90°E（印度）应该对应哪个方向？");
console.log("121.5°E（上海）应该对应哪个方向？");