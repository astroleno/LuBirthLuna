// 简化版调试脚本 - 直接在浏览器控制台运行
console.log('=== 开始黄昏点对齐调试 ===');

// 1. 获取基础数据
const composition = window.__COMPOSITION || {};
const sunWorld = window.__SUN_WORLD || { x: 0, y: 0, z: 1 };
const latDeg = 31.2; // 上海纬度
const lonDeg = 121.5; // 上海经度

console.log('基础数据：', {
    '当前相机角度': composition.cameraAzimuthDeg + '°',
    '太阳世界坐标': `(${sunWorld.x.toFixed(3)}, ${sunWorld.y.toFixed(3)}, ${sunWorld.z.toFixed(3)})`
});

// 2. 计算黄昏点经度
const lightDir = new THREE.Vector3(-sunWorld.x, -sunWorld.y, -sunWorld.z).normalize();
const lonDusk = THREE.MathUtils.radToDeg(Math.atan2(-lightDir.x, lightDir.z));
const normalizedLonDusk = ((lonDusk % 360) + 360) % 360;
const finalLonDusk = normalizedLonDusk > 180 ? normalizedLonDusk - 360 : normalizedLonDusk;

console.log('黄昏点计算：', {
    '光照方向': `(${lightDir.x.toFixed(3)}, ${lightDir.y.toFixed(3)}, ${lightDir.z.toFixed(3)})`,
    '黄昏点经度': finalLonDusk.toFixed(2) + '°'
});

// 3. 计算理论转动角度
const expectedYaw = finalLonDusk - lonDeg;
const normalizedYaw = ((expectedYaw % 360) + 360) % 360;
const finalExpectedYaw = normalizedYaw > 180 ? normalizedYaw - 360 : normalizedYaw;

console.log('理论转动角度：', {
    '上海经度': lonDeg + '°E',
    '黄昏点经度': finalLonDusk.toFixed(2) + '°',
    '差值': expectedYaw.toFixed(2) + '°',
    '规范化角度': finalExpectedYaw.toFixed(2) + '°'
});

// 4. 检查实际相机指向
setTimeout(() => {
    try {
        const cam = window.__R3F_Camera;
        if (!cam) {
            console.log('无法获取相机对象');
            return;
        }
        
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
        const actualCenterLon = THREE.MathUtils.radToDeg(Math.atan2(forward.x, forward.z));
        const normalizedActualLon = ((actualCenterLon % 360) + 360) % 360;
        const finalActualLon = normalizedActualLon > 180 ? normalizedActualLon - 360 : normalizedActualLon;
        
        console.log('实际相机指向：', {
            '相机前向向量': `(${forward.x.toFixed(3)}, ${forward.y.toFixed(3)}, ${forward.z.toFixed(3)})`,
            '实际中心经度': finalActualLon.toFixed(2) + '°'
        });
        
        // 5. 误差分析
        const error = finalActualLon - finalLonDusk;
        console.log('误差分析：', {
            '期望指向': finalLonDusk.toFixed(2) + '°',
            '实际指向': finalActualLon.toFixed(2) + '°',
            '误差': error.toFixed(2) + '°',
            '误差评价': Math.abs(error) < 5 ? '良好' : Math.abs(error) < 10 ? '一般' : '需要检查'
        });
        
        console.log('=== 调试完成 ===');
        
    } catch (error) {
        console.error('相机检查失败：', error);
    }
}, 100);