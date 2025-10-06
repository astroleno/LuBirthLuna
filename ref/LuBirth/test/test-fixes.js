// 测试修复效果
// 在浏览器控制台中运行此脚本

console.log('=== 测试修复效果 ===');

// 步骤1：检查LocationSelector样式
console.log('步骤1：检查LocationSelector样式');
const locationSelector = document.querySelector('.location-selector');
if (locationSelector) {
  console.log('✅ 找到LocationSelector组件');
  
  const searchInput = locationSelector.querySelector('.search-input');
  if (searchInput) {
    const styles = window.getComputedStyle(searchInput);
    console.log('搜索框样式:');
    console.log('- 背景色:', styles.backgroundColor);
    console.log('- 边框色:', styles.borderColor);
    console.log('- 文字色:', styles.color);
    
    // 检查是否是暗色主题
    const isDarkTheme = styles.backgroundColor.includes('rgba(255, 255, 255, 0.06)') || 
                       styles.backgroundColor.includes('rgba(255,255,255,0.06)');
    if (isDarkTheme) {
      console.log('✅ LocationSelector使用暗色主题');
    } else {
      console.log('❌ LocationSelector仍使用亮色主题');
    }
  }
  
  const selects = locationSelector.querySelectorAll('.cascader-select');
  if (selects.length > 0) {
    const styles = window.getComputedStyle(selects[0]);
    console.log('下拉框样式:');
    console.log('- 背景色:', styles.backgroundColor);
    console.log('- 边框色:', styles.borderColor);
    console.log('- 文字色:', styles.color);
    
    const isDarkTheme = styles.backgroundColor.includes('rgba(255, 255, 255, 0.06)') || 
                       styles.backgroundColor.includes('rgba(255,255,255,0.06)');
    if (isDarkTheme) {
      console.log('✅ 下拉框使用暗色主题');
    } else {
      console.log('❌ 下拉框仍使用亮色主题');
    }
  }
} else {
  console.log('❌ 没有找到LocationSelector组件');
}

// 步骤2：测试对齐功能
console.log('\n步骤2：测试对齐功能');

// 启用出生点对齐
if (window.setBirthPointAlignment) {
  window.setBirthPointAlignment(true, 116.3974, 39.9093, 10);
  console.log('✅ 已启用出生点对齐');
  
  // 启用标记显示
  if (window.setBirthPointMarker) {
    window.setBirthPointMarker(true);
    console.log('✅ 已启用标记显示');
  }
  
  // 检查状态
  setTimeout(() => {
    const settings = window.getBirthPointAlignment();
    console.log('当前设置:', settings);
    
    if (settings.enableBirthPointAlignment) {
      console.log('✅ 出生点对齐已启用');
    } else {
      console.log('❌ 出生点对齐未启用');
    }
    
    if (settings.showBirthPointMarker) {
      console.log('✅ 标记显示已启用');
    } else {
      console.log('❌ 标记显示未启用');
    }
  }, 500);
} else {
  console.error('❌ setBirthPointAlignment函数未找到');
}

// 步骤3：测试相机旋转
setTimeout(() => {
  console.log('\n步骤3：测试相机旋转');
  
  // 设置不同的坐标来测试旋转
  if (window.setBirthPointAlignment) {
    // 测试北京坐标
    window.setBirthPointAlignment(true, 116.3974, 39.9093, 10);
    console.log('✅ 已设置北京坐标 (116.4°E, 39.9°N)');
    
    setTimeout(() => {
      // 测试上海坐标
      window.setBirthPointAlignment(true, 121.5, 31.2, 10);
      console.log('✅ 已设置上海坐标 (121.5°E, 31.2°N)');
      
      setTimeout(() => {
        // 测试广州坐标
        window.setBirthPointAlignment(true, 113.3, 23.1, 10);
        console.log('✅ 已设置广州坐标 (113.3°E, 23.1°N)');
        
        console.log('请观察相机是否发生旋转');
      }, 1000);
    }, 1000);
  }
}, 2000);

// 步骤4：检查左下角文字
setTimeout(() => {
  console.log('\n步骤4：检查左下角文字');
  
  const creditText = document.querySelector('.credit');
  if (creditText) {
    console.log('❌ 左下角文字仍然存在:', creditText.textContent);
  } else {
    console.log('✅ 左下角文字已删除');
  }
  
  const captionText = document.querySelector('.caption');
  if (captionText) {
    console.log('✅ 版本信息正常显示:', captionText.textContent);
  } else {
    console.log('❌ 版本信息未显示');
  }
}, 3000);

// 步骤5：综合检查
setTimeout(() => {
  console.log('\n步骤5：综合检查');
  
  console.log('修复效果总结:');
  console.log('1. LocationSelector样式: 需要刷新页面查看效果');
  console.log('2. 对齐功能: 已重新启用，使用保守的旋转角度');
  console.log('3. 左下角文字: 已删除');
  console.log('4. 相机旋转: 已启用，缩放因子0.1');
  
  console.log('\n如果样式还是没有改变，请:');
  console.log('1. 刷新页面 (Ctrl+F5 强制刷新)');
  console.log('2. 清除浏览器缓存');
  console.log('3. 检查控制台是否有CSS错误');
}, 4000);

console.log('\n观察要点:');
console.log('1. 刷新页面后检查LocationSelector是否使用暗色主题');
console.log('2. 检查红色标记是否出现在地球表面');
console.log('3. 检查相机是否发生轻微旋转');
console.log('4. 检查左下角文字是否已删除');
