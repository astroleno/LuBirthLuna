// 调试脚本：验证黄昏点对齐的准确性
// 运行方法：在浏览器控制台中粘贴执行

function debugTerminatorAlignment() {
    console.log('=== 黄昏点对齐调试开始 ===');
    
    // 获取当前状态
    const composition = window.__COMPOSITION || {};
    const sunWorld = window.__SUN_WORLD || { x: 0, y: 0, z: 1 };
    const dateISO = window.__DATE_ISO || new Date().toISOString();
    const latDeg = window.__LAT_DEG || 31.2;
    const lonDeg = window.__LON_DEG || 121.5;
    
    console.log('输入数据：', {
        dateISO,
        latDeg,
        lonDeg,
        sunWorld,
        cameraAzimuth: composition.cameraAzimuthDeg
    });
    
    // 1. 计算黄昏点经度
    const lightDir = new THREE.Vector3(-sunWorld.x, -sunWorld.y, -sunWorld.z).normalize();
    const lonDusk = THREE.MathUtils.radToDeg(Math.atan2(-lightDir.x, lightDir.z));
    while (lonDusk > 180) lonDusk -= 360;
    while (lonDusk < -180) lonDusk += 360;
    
    console.log('1. 黄昏点经度计算：', {
        lightDir: { x: lightDir.x.toFixed(4), y: lightDir.y.toFixed(4), z: lightDir.z.toFixed(4) },
        lonDusk: lonDusk.toFixed(2) + '°'
    });
    
    // 2. 计算理论转动角度
    const theoreticalYaw = lonDusk - lonDeg;
    const normalizedYaw = ((theoreticalYaw % 360) + 360) % 360;
    const finalYaw = normalizedYaw > 180 ? normalizedYaw - 360 : normalizedYaw;
    
    console.log('2. 理论转动角度：', {
        上海经度: lonDeg + '°',
        黄昏点经度: lonDusk.toFixed(2) + '°',
        计算差值: theoreticalYaw.toFixed(2) + '°',
        规范化角度: finalYaw.toFixed(2) + '°'
    });
    
    // 3. 获取实际相机状态
    setTimeout(() => {
        try {
            const cam = window.__R3F_Camera;
            if (!cam) {
                console.error('无法获取相机对象');
                return;
            }
            
            // 计算相机实际指向的经度
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
            const actualCenterLon = THREE.MathUtils.radToDeg(Math.atan2(forward.x, forward.z));
            let normalizedActualLon = actualCenterLon;
            while (normalizedActualLon > 180) normalizedActualLon -= 360;
            while (normalizedActualLon < -180) normalizedActualLon += 360;
            
            console.log('3. 实际相机状态：', {
                相机方位角: composition.cameraAzimuthDeg + '°',
                相机前向向量: { x: forward.x.toFixed(4), y: forward.y.toFixed(4), z: forward.z.toFixed(4) },
                实际中心经度: normalizedActualLon.toFixed(2) + '°'
            });
            
            // 4. 误差分析
            const expectedCenterLon = lonDusk;
            const error = normalizedActualLon - expectedCenterLon;
            const absError = Math.abs(error);
            
            console.log('4. 误差分析：', {
                期望中心经度: expectedCenterLon.toFixed(2) + '°',
                实际中心经度: normalizedActualLon.toFixed(2) + '°',
                绝对误差: absError.toFixed(2) + '°',
                误差方向: error > 0 ? '偏东' : '偏西'
            });
            
            // 5. 地球自转状态检查
            const earthRoot = window.__EARTH_ROOT;
            if (earthRoot) {
                const earthQuaternion = earthRoot.quaternion;
                const earthRotationY = THREE.MathUtils.radToDeg(Math.atan2(
                    earthQuaternion.x, earthQuaternion.w
                )) * 2;
                
                console.log('5. 地球自转状态：', {
                    地球旋转角度: earthRotationY.toFixed(2) + '°',
                    四元数: {
                        x: earthQuaternion.x.toFixed(4),
                        y: earthQuaternion.y.toFixed(4),
                        z: earthQuaternion.z.toFixed(4),
                        w: earthQuaternion.w.toFixed(4)
                    }
                });
            }
            
            console.log('=== 调试完成 ===');
            
        } catch (error) {
            console.error('调试脚本执行失败：', error);
        }
    }, 100); // 等待一帧确保相机状态更新
}

// 添加到全局作用域
window.debugTerminatorAlignment = debugTerminatorAlignment;

console.log('调试脚本已加载，运行 debugTerminatorAlignment() 开始调试');