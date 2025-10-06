// 调试脚本：专门分析地球自转角度问题
// 运行方法：在浏览器控制台中粘贴执行

function debugEarthRotationIssue() {
    console.log('=== 地球自转角度问题分析 ===');
    
    // 获取当前状态
    const composition = window.__COMPOSITION || {};
    const earthRoot = window.__EARTH_ROOT;
    
    console.log('当前状态：', {
        'dateISO': window.__DATE_ISO || '未知',
        'latDeg': window.__LAT_DEG || '未知',
        'lonDeg': window.__LON_DEG || '未知',
        'earthYawDeg': composition.earthYawDeg || '未知'
    });
    
    // 1. 分析时区转换
    const dateISO = window.__DATE_ISO || '2025-09-12T13:00';
    const latDeg = window.__LAT_DEG || 31.2;
    const lonDeg = window.__LON_DEG || 121.5;
    
    console.log('\n=== 1. 时区转换分析 ===');
    
    // 解析本地时间
    const match = dateISO.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
    if (!match) {
        console.error('日期格式错误:', dateISO);
        return;
    }
    
    const [, year, month, day, hour, minute] = match;
    const localHour = parseInt(hour, 10);
    const localMinute = parseInt(minute, 10);
    
    // 计算时区偏移
    const timezoneOffsetHours = Math.round(lonDeg / 15);
    
    // 计算UTC时间
    const localTotalMinutes = localHour * 60 + localMinute;
    const utcTotalMinutes = localTotalMinutes - timezoneOffsetHours * 60;
    const utcHours = Math.floor(utcTotalMinutes / 60);
    const utcMinutes = utcTotalMinutes % 60;
    
    // 处理UTC时间跨日
    let adjustedUtcHours = utcHours;
    if (adjustedUtcHours < 0) adjustedUtcHours += 24;
    if (adjustedUtcHours >= 24) adjustedUtcHours -= 24;
    
    // 计算地球自转角度
    const earthRotation = (adjustedUtcHours * 15 + utcMinutes * 0.25) % 360;
    
    console.log('时区转换详情：', {
        '本地时间': `${localHour}:${minute.toString().padStart(2, '0')}`,
        '经度': `${lonDeg}°E`,
        '时区偏移': `${timezoneOffsetHours}h`,
        'UTC时间': `${adjustedUtcHours}:${utcMinutes.toString().padStart(2, '0')}`,
        '地球自转角度': `${earthRotation.toFixed(1)}°`
    });
    
    // 2. 检查地球实际旋转状态
    if (earthRoot) {
        const earthQuaternion = earthRoot.quaternion;
        const earthRotationY = THREE.MathUtils.radToDeg(Math.atan2(
            earthQuaternion.x, earthQuaternion.w
        )) * 2;
        
        console.log('\n=== 2. 地球实际旋转状态 ===');
        console.log('实际旋转角度：', {
            '计算值': `${earthRotation.toFixed(1)}°`,
            '实际值': `${earthRotationY.toFixed(1)}°`,
            '差异': `${(earthRotationY - earthRotation).toFixed(1)}°`
        });
    }
    
    // 3. 模拟不同时间点的计算
    console.log('\n=== 3. 不同时间点模拟 ===');
    
    const testTimes = ['05:00', '10:00', '13:00', '22:00'];
    testTimes.forEach(timeStr => {
        const [testHour, testMinute] = timeStr.split(':').map(Number);
        const testLocalMinutes = testHour * 60 + testMinute;
        const testUtcMinutes = testLocalMinutes - timezoneOffsetHours * 60;
        const testUtcHours = Math.floor(testUtcMinutes / 60);
        const testUtcMins = testUtcMinutes % 60;
        
        // 处理跨日
        let adjustedTestUtcHours = testUtcHours;
        if (adjustedTestUtcHours < 0) adjustedTestUtcHours += 24;
        if (adjustedTestUtcHours >= 24) adjustedTestUtcHours -= 24;
        
        const testEarthRotation = (adjustedTestUtcHours * 15 + testUtcMins * 0.25) % 360;
        
        console.log(`${timeStr}: UTC ${adjustedTestUtcHours}:${testUtcMins.toString().padStart(2, '0')} → 地球旋转 ${testEarthRotation.toFixed(1)}°`);
    });
    
    // 4. 关键问题分析
    console.log('\n=== 4. 问题分析 ===');
    
    // 检查5:00 AM的特殊情况
    const test5Hour = 5;
    const test5Minute = 0;
    const test5LocalMinutes = test5Hour * 60 + test5Minute;
    const test5UtcMinutes = test5LocalMinutes - timezoneOffsetHours * 60;
    const test5UtcHours = Math.floor(test5UtcMinutes / 60);
    
    console.log('5:00 AM特殊情况：', {
        '本地时间': '05:00',
        '时区偏移': `${timezoneOffsetHours}h`,
        'UTC小时': test5UtcHours,
        '是否跨日': test5UtcHours < 0 ? '是（前一天）' : '否'
    });
    
    if (test5UtcHours < 0) {
        console.log('🚨 发现问题：5:00 AM的UTC时间为负数，说明是前一天的21:00');
        console.log('这可能导致地球旋转角度计算错误，因为地球显示的是"前一天"的位置');
    }
    
    console.log('\n=== 分析完成 ===');
}

// 添加到全局作用域
window.debugEarthRotationIssue = debugEarthRotationIssue;

console.log('地球自转调试脚本已加载，运行 debugEarthRotationIssue() 开始分析');