// 出生点对齐修复验证脚本
// 在浏览器控制台中运行此脚本以验证修复效果

console.log('=== 出生点对齐修复验证 ===');

// 1. 检查当前坐标系统
console.log('\n1. 当前坐标系统:');
console.log('地球贴图0°经度 → 东经20°（巴尔干半岛）');
console.log('本初子午线（0°）→ 系统内部-20°');
console.log('上海（121.47°）→ 系统内部101.47°');

// 2. 测试出生点对齐功能
console.log('\n2. 测试出生点对齐:');

// 测试本初子午线对齐
if (window.setBirthPointAlignment) {
    console.log('测试本初子午线对齐...');
    window.setBirthPointAlignment(true, -20, 0);
    console.log('✓ 本初子午线对齐命令已发送');
    
    // 等待3秒后测试上海对齐
    setTimeout(() => {
        console.log('\n测试上海对齐...');
        window.setBirthPointAlignment(true, 101.47, 31.23);
        console.log('✓ 上海对齐命令已发送');
        
        // 再等待3秒后测试纽约对齐
        setTimeout(() => {
            console.log('\n测试纽约对齐...');
            window.setBirthPointAlignment(true, -74, 40.71);
            console.log('✓ 纽约对齐命令已发送');
        }, 3000);
    }, 3000);
} else {
    console.error('❌ setBirthPointAlignment 函数不可用');
}

// 3. 检查当前配置
console.log('\n3. 当前配置检查:');
if (window.__R3F_Camera) {
    const camera = window.__R3F_Camera;
    console.log('相机位置:', camera.position?.toArray?.());
    console.log('相机FOV:', camera.fov);
} else {
    console.log('❌ 相机对象不可用');
}

// 4. 提供手动测试函数
window.testBirthPointAlignment = {
    // 对齐到本初子午线
    primeMeridian: () => {
        console.log('对齐到本初子午线...');
        window.setBirthPointAlignment?.(true, -20, 0);
    },
    
    // 对齐到上海
    shanghai: () => {
        console.log('对齐到上海...');
        window.setBirthPointAlignment?.(true, 101.47, 31.23);
    },
    
    // 对齐到纽约
    newYork: () => {
        console.log('对齐到纽约...');
        window.setBirthPointAlignment?.(true, -74, 40.71);
    },
    
    // 对齐到伦敦
    london: () => {
        console.log('对齐到伦敦...');
        window.setBirthPointAlignment?.(true, -0.12, 51.51);
    },
    
    // 对齐到东京
    tokyo: () => {
        console.log('对齐到东京...');
        window.setBirthPointAlignment?.(true, 139.69, 35.69);
    },
    
    // 显示当前状态
    showStatus: () => {
        console.log('当前出生点配置:');
        console.log('经度:', window.setBirthPointAlignment ? '可用' : '不可用');
        console.log('相机:', window.__R3F_Camera ? '可用' : '不可用');
    }
};

console.log('\n4. 手动测试函数已创建:');
console.log('testBirthPointAlignment.primeMeridian() - 对齐到本初子午线');
console.log('testBirthPointAlignment.shanghai() - 对齐到上海');
console.log('testBirthPointAlignment.newYork() - 对齐到纽约');
console.log('testBirthPointAlignment.london() - 对齐到伦敦');
console.log('testBirthPointAlignment.tokyo() - 对齐到东京');
console.log('testBirthPointAlignment.showStatus() - 显示状态');

console.log('\n=== 验证脚本加载完成 ===');