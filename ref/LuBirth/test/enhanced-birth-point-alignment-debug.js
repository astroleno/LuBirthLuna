// 增强版出生点对齐调试脚本
// 彻底检查出生点对齐的每个步骤

console.log('=== 增强版出生点对齐调试 ===');

// 1. 检查当前系统状态
console.log('\n1. 系统状态检查:');
console.log('当前时间:', new Date().toISOString());
console.log('出生点对齐功能状态:', window.setBirthPointAlignment ? '✓ 可用' : '✗ 不可用');
console.log('相机对象状态:', window.__R3F_Camera ? '✓ 可用' : '✗ 不可用');

// 2. 获取当前配置
function getCurrentConfig() {
    try {
        // 尝试从React状态中获取配置
        const composition = window.currentComposition || {};
        return {
            enableBirthPointAlignment: composition.enableBirthPointAlignment || false,
            birthPointLongitudeDeg: composition.birthPointLongitudeDeg || 0,
            birthPointLatitudeDeg: composition.birthPointLatitudeDeg || 0,
            birthPointAlphaDeg: composition.birthPointAlphaDeg || 10,
            cameraAzimuthDeg: composition.cameraAzimuthDeg || 180,
            cameraDistance: composition.cameraDistance || 15
        };
    } catch (e) {
        console.error('获取配置失败:', e);
        return null;
    }
}

// 3. 测试出生点对齐并详细记录
function testBirthPointAlignment(longitude, latitude, name) {
    console.log(`\n=== 测试 ${name} ===`);
    console.log(`目标经度: ${longitude}°`);
    console.log(`目标纬度: ${latitude}°`);
    
    const beforeConfig = getCurrentConfig();
    console.log('对齐前配置:', beforeConfig);
    
    if (window.__R3F_Camera) {
        const camera = window.__R3F_Camera;
        console.log('对齐前相机位置:', camera.position?.toArray?.());
        console.log('对齐前相机旋转:', camera.quaternion?.toArray?.());
    }
    
    // 执行对齐
    if (window.setBirthPointAlignment) {
        console.log('执行出生点对齐...');
        window.setBirthPointAlignment(true, longitude, latitude);
        
        // 等待一段时间让相机移动完成
        setTimeout(() => {
            const afterConfig = getCurrentConfig();
            console.log('对齐后配置:', afterConfig);
            
            if (window.__R3F_Camera) {
                const camera = window.__R3F_Camera;
                console.log('对齐后相机位置:', camera.position?.toArray?.());
                console.log('对齐后相机旋转:', camera.quaternion?.toArray?.());
            }
            
            console.log(`=== ${name} 测试完成 ===\n`);
        }, 1000);
    } else {
        console.error('❌ setBirthPointAlignment 函数不可用');
    }
}

// 4. 执行一系列测试
function runAllTests() {
    console.log('\n开始执行出生点对齐测试序列...');
    
    // 测试1: 本初子午线
    setTimeout(() => testBirthPointAlignment(0, 0, '本初子午线'), 1000);
    
    // 测试2: 上海
    setTimeout(() => testBirthPointAlignment(121.47, 31.23, '上海'), 3000);
    
    // 测试3: 纽约
    setTimeout(() => testBirthPointAlignment(-74, 40.71, '纽约'), 5000);
    
    // 测试4: 伦敦
    setTimeout(() => testBirthPointAlignment(-0.12, 51.51, '伦敦'), 7000);
    
    // 测试5: 东京
    setTimeout(() => testBirthPointAlignment(139.69, 35.69, '东京'), 9000);
}

// 5. 提供手动测试接口
window.enhancedBirthPointTest = {
    // 显示当前状态
    status: () => {
        console.log('\n=== 当前状态 ===');
        console.log('配置:', getCurrentConfig());
        if (window.__R3F_Camera) {
            const camera = window.__R3F_Camera;
            console.log('相机位置:', camera.position?.toArray?.());
            console.log('相机旋转:', camera.quaternion?.toArray?.());
        }
    },
    
    // 测试特定位置
    test: (longitude, latitude, name) => {
        testBirthPointAlignment(longitude, latitude, name || `位置(${longitude}, ${latitude})`);
    },
    
    // 运行所有测试
    runAll: runAllTests,
    
    // 重置到默认状态
    reset: () => {
        console.log('重置到默认状态...');
        window.setBirthPointAlignment?.(false);
    },
    
    // 测试本初子午线
    primeMeridian: () => testBirthPointAlignment(0, 0, '本初子午线'),
    
    // 测试上海
    shanghai: () => testBirthPointAlignment(121.47, 31.23, '上海'),
    
    // 测试纽约
    newYork: () => testBirthPointAlignment(-74, 40.71, '纽约'),
    
    // 测试伦敦
    london: () => testBirthPointAlignment(-0.12, 51.51, '伦敦'),
    
    // 测试东京
    tokyo: () => testBirthPointAlignment(139.69, 35.69, '东京')
};

console.log('\n=== 增强调试接口已创建 ===');
console.log('使用方法:');
console.log('enhancedBirthPointTest.status() - 显示当前状态');
console.log('enhancedBirthPointTest.runAll() - 运行所有测试');
console.log('enhancedBirthPointTest.primeMeridian() - 测试本初子午线');
console.log('enhancedBirthPointTest.shanghai() - 测试上海');
console.log('enhancedBirthPointTest.newYork() - 测试纽约');
console.log('enhancedBirthPointTest.london() - 测试伦敦');
console.log('enhancedBirthPointTest.tokyo() - 测试东京');

// 自动显示当前状态
setTimeout(() => {
    enhancedBirthPointTest.status();
}, 500);

console.log('\n=== 增强调试脚本加载完成 ===');