#!/usr/bin/env node

// Test multiple moon phases to verify the fix
class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  
  normalize() {
    const length = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    if (length > 0) {
      this.x /= length;
      this.y /= length;
      this.z /= length;
    }
    return this;
  }
}

const THREE = { Vector3 };

function calculateIllumination(phaseAngle) {
  // 对于月相，0°=新月，180°=满月，所以需要调整角度
  // 照明比例应该基于太阳-地球-月球的夹角，而不是月相角度
  const elongationAngle = (180 - phaseAngle) * Math.PI / 180;
  const illumination = (1 + Math.cos(elongationAngle)) / 2;
  return Math.max(0, Math.min(1, illumination));
}

function getMoonPhaseName(phaseAngle) {
  const phases = [
    { name: '新月', minAngle: 0, maxAngle: 22.5 },
    { name: '蛾眉月', minAngle: 22.5, maxAngle: 67.5 },
    { name: '上弦月', minAngle: 67.5, maxAngle: 112.5 },
    { name: '盈凸月', minAngle: 112.5, maxAngle: 157.5 },
    { name: '满月', minAngle: 157.5, maxAngle: 202.5 },
    { name: '亏凸月', minAngle: 202.5, maxAngle: 247.5 },
    { name: '下弦月', minAngle: 247.5, maxAngle: 292.5 },
    { name: '残月', minAngle: 292.5, maxAngle: 337.5 },
    { name: '新月', minAngle: 337.5, maxAngle: 360 }
  ];
  
  const phase = phases.find(p => phaseAngle >= p.minAngle && phaseAngle < p.maxAngle);
  return phase?.name || '未知';
}

// Test key phases
const testCases = [
  { angle: 0, name: '新月' },
  { angle: 90, name: '上弦月' },
  { angle: 180, name: '满月' },
  { angle: 270, name: '下弦月' },
  { angle: 177, name: '接近满月' }
];

console.log('月相照明比例测试:');
console.log('==================');
testCases.forEach(({ angle, name }) => {
  const illumination = calculateIllumination(angle);
  const phaseName = getMoonPhaseName(angle);
  console.log(`${name} (${angle}°): 照明比例 = ${illumination.toFixed(3)}`);
});

console.log('\n验证:');
console.log('- 新月(0°) 应该接近 0.000');
console.log('- 上弦月(90°) 应该接近 0.500');
console.log('- 满月(180°) 应该接近 1.000');
console.log('- 下弦月(270°) 应该接近 0.500');