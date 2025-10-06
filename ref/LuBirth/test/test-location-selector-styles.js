// 测试LocationSelector样式统一性
// 在浏览器控制台中运行此脚本

console.log('=== 测试LocationSelector样式统一性 ===');

// 步骤1：启用出生点对齐
console.log('步骤1：启用出生点对齐');
if (window.setBirthPointAlignment) {
  window.setBirthPointAlignment(true, 116.3974, 39.9093, 10);
  console.log('✅ 已启用出生点对齐');
} else {
  console.error('❌ setBirthPointAlignment函数未找到');
}

// 步骤2：检查LocationSelector样式
setTimeout(() => {
  console.log('\n步骤2：检查LocationSelector样式');
  
  // 查找LocationSelector组件
  const locationSelector = document.querySelector('.location-selector');
  if (locationSelector) {
    console.log('✅ 找到LocationSelector组件');
    
    // 检查搜索框样式
    const searchInput = locationSelector.querySelector('.search-input');
    if (searchInput) {
      const styles = window.getComputedStyle(searchInput);
      console.log('搜索框样式:');
      console.log('- 背景色:', styles.backgroundColor);
      console.log('- 边框色:', styles.borderColor);
      console.log('- 文字色:', styles.color);
      console.log('- 圆角:', styles.borderRadius);
      console.log('- 内边距:', styles.padding);
    }
    
    // 检查下拉框样式
    const selects = locationSelector.querySelectorAll('.cascader-select');
    if (selects.length > 0) {
      const styles = window.getComputedStyle(selects[0]);
      console.log('下拉框样式:');
      console.log('- 背景色:', styles.backgroundColor);
      console.log('- 边框色:', styles.borderColor);
      console.log('- 文字色:', styles.color);
      console.log('- 圆角:', styles.borderRadius);
      console.log('- 内边距:', styles.padding);
    }
    
    // 检查分隔线样式
    const divider = locationSelector.querySelector('.location-divider');
    if (divider) {
      console.log('✅ 分隔线已显示');
    }
    
    // 检查当前选择显示
    const selectedLocation = locationSelector.querySelector('.selected-location');
    if (selectedLocation) {
      console.log('✅ 当前选择显示已显示');
    }
  } else {
    console.log('❌ 没有找到LocationSelector组件');
  }
}, 1000);

// 步骤3：测试搜索功能
setTimeout(() => {
  console.log('\n步骤3：测试搜索功能');
  
  const searchInput = document.querySelector('.search-input');
  if (searchInput) {
    // 测试搜索
    searchInput.value = '北京';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    searchInput.dispatchEvent(new Event('focus', { bubbles: true }));
    console.log('✅ 已输入搜索关键词: 北京');
    
    // 检查搜索结果
    setTimeout(() => {
      const searchResults = document.querySelector('.search-results');
      if (searchResults) {
        console.log('✅ 搜索结果已显示');
        
        const resultItems = searchResults.querySelectorAll('.search-result-item');
        console.log('找到', resultItems.length, '个搜索结果');
        
        if (resultItems.length > 0) {
          // 点击第一个结果
          resultItems[0].click();
          console.log('✅ 已选择第一个搜索结果');
          
          // 检查坐标是否更新
          setTimeout(() => {
            const settings = window.getBirthPointAlignment();
            console.log('选择后的坐标:', {
              longitude: settings.birthPointLongitudeDeg,
              latitude: settings.birthPointLatitudeDeg
            });
          }, 500);
        }
      } else {
        console.log('❌ 搜索结果未显示');
      }
    }, 500);
  } else {
    console.log('❌ 没有找到搜索框');
  }
}, 2000);

// 步骤4：测试下拉框功能
setTimeout(() => {
  console.log('\n步骤4：测试下拉框功能');
  
  const selects = document.querySelectorAll('.cascader-select');
  if (selects.length >= 3) {
    const provinceSelect = selects[0];
    const citySelect = selects[1];
    const districtSelect = selects[2];
    
    // 测试省份选择
    provinceSelect.value = '北京市';
    provinceSelect.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('✅ 已选择省份: 北京市');
    
    // 检查城市下拉框是否启用
    setTimeout(() => {
      if (!citySelect.disabled) {
        console.log('✅ 城市下拉框已启用');
        
        // 测试城市选择
        citySelect.value = '北京市';
        citySelect.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('✅ 已选择城市: 北京市');
        
        // 检查区县下拉框是否启用
        setTimeout(() => {
          if (!districtSelect.disabled) {
            console.log('✅ 区县下拉框已启用');
            
            // 测试区县选择
            const options = districtSelect.querySelectorAll('option');
            if (options.length > 1) {
              districtSelect.value = options[1].value;
              districtSelect.dispatchEvent(new Event('change', { bubbles: true }));
              console.log('✅ 已选择区县:', options[1].value);
              
              // 检查坐标是否更新
              setTimeout(() => {
                const settings = window.getBirthPointAlignment();
                console.log('选择后的坐标:', {
                  longitude: settings.birthPointLongitudeDeg,
                  latitude: settings.birthPointLatitudeDeg
                });
              }, 500);
            }
          } else {
            console.log('❌ 区县下拉框未启用');
          }
        }, 500);
      } else {
        console.log('❌ 城市下拉框未启用');
      }
    }, 500);
  } else {
    console.log('❌ 没有找到足够的下拉框');
  }
}, 3000);

// 步骤5：检查样式一致性
setTimeout(() => {
  console.log('\n步骤5：检查样式一致性');
  
  // 比较LocationSelector和主界面输入框的样式
  const locationInput = document.querySelector('.search-input');
  const mainInput = document.querySelector('.input[type="number"]');
  
  if (locationInput && mainInput) {
    const locationStyles = window.getComputedStyle(locationInput);
    const mainStyles = window.getComputedStyle(mainInput);
    
    console.log('样式一致性检查:');
    console.log('- 背景色一致:', locationStyles.backgroundColor === mainStyles.backgroundColor);
    console.log('- 边框色一致:', locationStyles.borderColor === mainStyles.borderColor);
    console.log('- 文字色一致:', locationStyles.color === mainStyles.color);
    console.log('- 圆角一致:', locationStyles.borderRadius === mainStyles.borderRadius);
    console.log('- 内边距一致:', locationStyles.padding === mainStyles.padding);
    
    const isConsistent = 
      locationStyles.backgroundColor === mainStyles.backgroundColor &&
      locationStyles.borderColor === mainStyles.borderColor &&
      locationStyles.color === mainStyles.color &&
      locationStyles.borderRadius === mainStyles.borderRadius &&
      locationStyles.padding === mainStyles.padding;
    
    if (isConsistent) {
      console.log('✅ LocationSelector样式与主界面完全一致！');
    } else {
      console.log('❌ LocationSelector样式与主界面不一致');
    }
  } else {
    console.log('❌ 无法比较样式');
  }
}, 4000);

console.log('\n观察要点:');
console.log('1. 检查LocationSelector是否使用暗色主题');
console.log('2. 检查搜索框和下拉框样式是否与主界面一致');
console.log('3. 检查搜索功能是否正常工作');
console.log('4. 检查下拉框联动是否正常工作');
console.log('5. 检查坐标更新是否正常');
