# 菲涅尔效果改进计划

## 问题分析
当前菲涅尔效果在放大模式下不够明显，主要原因：
1. 使用视图坐标而非真实相机位置
2. 参数未与球半径成比例
3. 多层叠加效果不一致
4. 缺少射线-球体相交优化

## 改进方案

### Phase 1: 基础修复（高优先级）
- [x] **1.1 添加真实相机位置uniform**
  - 在Clouds.tsx中添加uCamPos uniform
  - 每帧同步camera.getWorldPosition()
  
- [x] **1.2 改进菲涅尔计算使用真实相机位置**
  - 替换 `-vViewPosition` 为 `uCamPos`
  - 使用正确的视向量计算 `vec3 V = normalize(P - C)`
  
- [x] **1.3 参数比例化**
  - nearStart = 0.6 * radius
  - nearEnd = 0.8 * radius  
  - farStart = 2.2 * radius
  - farEnd = 2.6 * radius
  - rimPower = 3.0
  - rimStart = 0.15, rimEnd = 0.6

### Phase 2: 算法优化（中优先级）
- [x] **2.1 统一多层参数**
  - 所有云层使用相同的菲涅尔参数
  - 确保视觉效果一致
  
- [x] **2.2 改进混合策略**
  - Fresnel只用于颜色轻度增强
  - Alpha由distFade * (1 - rimFade)控制
  - 避免层间叠加发白
  
- [x] **2.3 添加球心位置uniform**
  - 支持球体不在原点的情况
  - 提高计算准确性

### Phase 3: 高级优化（低优先级）
- [ ] **3.1 实现射线-球体相交计算**
  - 只在可见区域计算菲涅尔
  - 提高放大模式效果
  
- [ ] **3.2 自适应参数调整**
  - 根据相机距离动态调整参数
  - 优化不同视角效果
  
- [ ] **3.3 性能优化**
  - 添加discard优化
  - 减少不必要的计算

## 测试验证
- [ ] 在dev模式下测试基础菲涅尔效果
- [ ] 在放大模式下测试边缘透明
- [ ] 验证多层叠加一致性
- [ ] 性能测试（FPS监控）

## 参数目标值
```typescript
// 推荐起始参数
const R = radius; // 地球半径
const params = {
  nearStart: 0.6 * R,   // 近处淡化开始
  nearEnd: 0.8 * R,     // 近处淡化结束
  farStart: 2.2 * R,    // 远处淡化开始
  farEnd: 2.6 * R,      // 远处淡化结束
  rimPower: 3.0,        // 菲涅尔幂次
  rimStart: 0.15,       // 边缘效果开始
  rimEnd: 0.6,          // 边缘效果结束
  fresnelStrength: 0.35 // 菲涅尔强度
};
```

## 成功标准
1. 放大模式下边缘透明效果明显
2. 多层云层菲涅尔效果一致
3. 不同相机角度下效果稳定
4. 性能影响在可接受范围内