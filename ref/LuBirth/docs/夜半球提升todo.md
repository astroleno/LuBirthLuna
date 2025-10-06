# 夜半球提升计划

## 目标
解决夜半球太暗的问题，提升夜景视觉效果，让夜半球既能看到地球细节又保持真实感。

## 实现方案
采用"正常地球贴图叠加 + 参数优化 + 半球光"的分层方案。

---

## 任务清单

### 1. 完善现有参数的类型定义和UI控制

#### 1.1 添加 nightFalloff 参数
- [ ] 在 `SimpleComposition` 类型中添加 `nightFalloff` 参数
- [ ] 设置默认值 1.6
- [ ] 在 `DEFAULT_SIMPLE_COMPOSITION` 中添加默认值
- [ ] 在 `convertToSimpleComposition` 中添加转换逻辑
- [ ] 在 SimpleTest UI 中添加控制滑块
- [ ] 在 SimpleTest 中传递参数给 Earth 组件

#### 1.2 添加 terminatorLift 参数
- [ ] 在 `SimpleComposition` 类型中添加 `terminatorLift` 参数
- [ ] 设置默认值 0.01
- [ ] 在 `DEFAULT_SIMPLE_COMPOSITION` 中添加默认值
- [ ] 在 `convertToSimpleComposition` 中添加转换逻辑
- [ ] 在 SimpleTest UI 中添加控制滑块
- [ ] 在 SimpleTest 中传递参数给 Earth 组件

#### 1.3 添加 terminatorTint 参数
- [ ] 在 `SimpleComposition` 类型中添加 `terminatorTint` 参数
- [ ] 设置默认值 `[1.0, 0.85, 0.75, 0.1]` (暖色调，低透明度)
- [ ] 在 `DEFAULT_SIMPLE_COMPOSITION` 中添加默认值
- [ ] 在 `convertToSimpleComposition` 中添加转换逻辑
- [ ] 在 SimpleTest UI 中添加颜色选择器
- [ ] 在 SimpleTest 中传递参数给 Earth 组件

### 2. 实现终止线色调效果

#### 2.1 着色器实现
- [ ] 在 Earth 组件中添加 `terminatorTint` uniform
- [ ] 在片段着色器中实现暖色调叠加逻辑
- [ ] 在终止线区域应用暖色调，模拟大气散射效果

#### 2.2 效果优化
- [ ] 调整暖色调的强度和范围
- [ ] 确保在不同太阳高度下效果稳定
- [ ] 性能测试，确保影响 < 0.5ms

### 3. 实现月光下地球贴图叠加

#### 3.1 添加月光贴图参数
- [ ] 在 `SimpleComposition` 类型中添加 `nightEarthMapIntensity` 参数
- [ ] 设置默认值 0.3 (30% 亮度)
- [ ] 在 `DEFAULT_SIMPLE_COMPOSITION` 中添加默认值
- [ ] 在 `convertToSimpleComposition` 中添加转换逻辑

#### 3.2 着色器实现
- [ ] 在 Earth 组件中添加 `nightEarthMapIntensity` uniform
- [ ] 在片段着色器中实现夜半球叠加正常地球贴图的逻辑
- [ ] 应用冷色调调整，模拟月光效果
- [ ] 与现有夜景贴图进行混合

#### 3.3 UI控制
- [ ] 在 SimpleTest UI 中添加"月光地球贴图强度"滑块
- [ ] 在 SimpleTest 中传递参数给 Earth 组件

### 4. 参数整合和优化

#### 4.1 参数平衡
- [ ] 调整各参数的默认值，确保效果协调
- [ ] 测试不同参数组合的效果
- [ ] 优化参数范围，避免过曝或过暗

#### 4.2 性能优化
- [ ] 确保所有新增效果的性能影响 < 1ms
- [ ] 优化着色器计算，减少不必要的计算
- [ ] 测试在不同设备上的性能表现

### 5. 半球光环境光 (最后一步)

#### 5.1 添加半球光参数
- [ ] 在 `SimpleComposition` 类型中添加 `nightAmbientIntensity` 参数
- [ ] 设置默认值 0.2 (20% 强度)
- [ ] 在 `DEFAULT_SIMPLE_COMPOSITION` 中添加默认值
- [ ] 在 `convertToSimpleComposition` 中添加转换逻辑

#### 5.2 实现半球光
- [ ] 在 SimpleTest 中添加 HemisphereLight
- [ ] 设置半球光参数：强度、颜色、方向
- [ ] 确保半球光只在夜半球生效

#### 5.3 UI控制
- [ ] 在 SimpleTest UI 中添加"夜景环境光强度"滑块
- [ ] 在 SimpleTest UI 中添加"夜景环境光颜色"选择器

---

## 验收标准

### 视觉效果
- [ ] 夜半球不再过暗，能看到地球地形轮廓
- [ ] 终止线区域有自然的暖色调过渡
- [ ] 夜景贴图与月光地球贴图混合自然
- [ ] 整体效果接近真实的地球夜景

### 性能要求
- [ ] 所有新增效果的总性能影响 < 1.5ms
- [ ] 在不同设备上都能稳定运行
- [ ] 内存使用无明显增加

### 用户体验
- [ ] 所有参数都有直观的UI控制
- [ ] 参数范围合理，不会产生极端效果
- [ ] 默认值提供良好的视觉效果

---

## 技术细节

### 着色器实现要点
```glsl
// 夜半球叠加正常地球贴图
vec3 nightEarthCol = dayTex * nightEarthMapIntensity;
nightEarthCol = mix(nightEarthCol, dayTex * 0.1, 0.5); // 月光效果

// 终止线暖色调
vec3 warmTint = terminatorTint.rgb * terminatorTint.a;
vec3 tintedCol = mix(originalCol, warmTint, terminatorZone);

// 与夜景贴图混合
vec3 finalNightCol = mix(nightEarthCol, nightTex, nightMapWeight);
```

### 参数范围建议
- `nightFalloff`: 0.5 - 3.0 (默认 1.6)
- `terminatorLift`: 0.0 - 0.05 (默认 0.01)
- `terminatorTint`: [0.8-1.2, 0.7-1.0, 0.6-0.9, 0.0-0.3] (默认 [1.0, 0.85, 0.75, 0.1])
- `nightEarthMapIntensity`: 0.0 - 0.8 (默认 0.3)
- `nightAmbientIntensity`: 0.0 - 0.5 (默认 0.2)

---

## 实施顺序
1. 先完善现有参数的类型定义和UI控制
2. 实现终止线色调效果
3. 实现月光下地球贴图叠加
4. 参数整合和优化
5. 最后添加半球光环境光

这样可以逐步提升夜半球效果，每个步骤都有明确的验收标准。
