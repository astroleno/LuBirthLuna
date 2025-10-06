# TODO12: 相机控制地球位置方案分析

## 问题背景

当前系统存在坐标系问题：
- 点击对齐诞生点到上海后跑到巴尔干半岛
- 不带具体点(默认 0,0)对齐变成美国中部  
- 载入时显示青藏高原

## 当前架构分析

### 现有方案：移动地球位置
- 地球位置通过 `useEarthPosition()` 根据屏幕需要计算
- 地球不在原点 [0,0,0]，而是在 [0, earthY, 0]
- 相机看向原点或根据出生点计算位置

### 问题根源
1. 坐标系复杂，地球位置移动导致所有计算复杂化
2. 出生点对齐、光照系统都基于地球在原点的假设
3. 实际地球位置移动，导致坐标映射错误

## 方案12：相机控制地球位置

### 核心思想
**地球固定在原点 [0,0,0]，通过改变相机位置和视角来控制地球在屏幕上的显示位置**

### 需要修改的具体位置

#### 1. `/src/scenes/simple/utils/positionUtils.ts`

**useEarthPosition() 函数 (第152-182行)**
```typescript
// 当前：地球位置根据屏幕需要计算
return {
  position: [0, earthY, 0] as [number, number, number],
  // ...
};

// 需要改为：地球固定在原点
return {
  position: [0, 0, 0] as [number, number, number],
  // ...
};
```

**useCameraControl() 函数 (第13-149行)**
```typescript
// 当前：相机看向 [0,0,0] 或根据出生点计算位置
// 需要改为：相机位置要考虑地球屏幕位置的偏移

// 传统极坐标模式需要考虑 earthTopY 参数
const azDeg = composition?.cameraAzimuthDeg ?? 180;
const elDeg = composition?.cameraElevationDeg ?? 0;
// 如何根据 earthTopY 调整相机位置？
```

#### 2. `/src/scenes/simple/SimpleEarthMoonScene.tsx`

**地球组位置 (第86-93行)**
```typescript
// 当前：position={earthInfo.position}
<group 
  position={earthInfo.position}
  // ...
>

// 需要改为：地球固定在原点
<group 
  position={[0, 0, 0]}
  // ...
>
```

#### 3. `/src/SimpleTest.tsx`

**地球组位置 (第179-181行)**
```typescript
// 当前：position={earthInfo.position}
<group 
  position={earthInfo.position}
  name="earthRoot"
  // ...
>

// 需要改为：地球固定在原点  
<group 
  position={[0, 0, 0]}
  name="earthRoot"
  // ...
>
```

#### 4. `/src/types/SimpleComposition.ts`

**可能需要的新参数**
```typescript
// 现有参数
earthTopY: number;  // 地球上沿位置 (0-1)

// 可能需要的参数
cameraOffsetY?: number;  // 相机Y位置偏移
cameraPitchOffset?: number;  // 相机俯仰角偏移
```

## 核心挑战：相机控制地球屏幕位置

### 问题
如果地球固定在 [0,0,0]，如何让它显示在屏幕的特定位置（比如上1/3处）？

### 解决方案选项

#### 方案A：相机位置偏移
根据 `earthTopY` 计算相机Y位置
```typescript
// 根据地球屏幕位置计算相机Y位置
const cameraY = calculateCameraYFromEarthTopY(earthTopY, cameraDistance);
camera.position.set(x, cameraY, z);
```

#### 方案B：相机俯仰角调整
通过相机俯仰角调整地球屏幕位置
```typescript
// 根据地球屏幕位置计算相机俯仰角
const pitch = calculatePitchFromEarthTopY(earthTopY);
// 应用俯仰角到相机
```

#### 方案C：视口偏移
使用现有的 `viewOffsetY` 机制
```typescript
// 保持相机位置不变，使用视口偏移微调
const offsetY = calculateViewOffsetFromEarthTopY(earthTopY);
```

#### 方案D：组合方案
相机位置 + 视口偏移组合使用

## 影响分析

### 优点
1. 简化坐标系：地球固定在原点，所有计算基于原点
2. 出生点对齐系统无需修改（本来就是基于原点）
3. 光照系统更简单（太阳方向计算基于原点）
4. 坐标映射更直观

### 风险
1. 需要重新计算相机位置与地球屏幕位置的映射关系
2. 可能影响现有的相机控制逻辑
3. 需要确保不会破坏用户精心设计的阳光系统

### 保持不变的系统
- ✅ 阳光系统（ celestial 模式，季节变化，黄赤交角）
- ✅ 月球系统
- ✅ 纹理和材质系统
- ✅ 大气效果系统

## 实施建议

### 第一步：理论计算
1. 推导相机位置与地球屏幕位置的数学关系
2. 确定最佳的相机控制策略（位置偏移 vs 俯仰角 vs 视口偏移）

### 第二步：逐步实施
1. 修改 `useEarthPosition()` 让地球固定在原点
2. 修改相机控制逻辑，实现地球屏幕位置控制
3. 测试出生点对齐功能
4. 验证光照系统正常工作

### 第三步：验证测试
1. 测试默认视图（应该显示正确的地理区域）
2. 测试 0,0 对齐（应该对齐到大西洋中部）
3. 测试上海对齐（应该准确对齐到上海）
4. 测试光照方向（保持从左上角来）

## 关键问题讨论

1. **相机控制策略**：哪种方案最适合控制地球屏幕位置？
2. **数学推导**：如何建立 earthTopY 与相机位置的映射关系？
3. **兼容性**：如何确保不破坏现有的阳光和季节系统？

## 下一步行动

1. [ ] 讨论确定最佳的相机控制策略
2. [ ] 推导相机位置计算公式
3. [ ] 制定详细的实施计划
4. [ ] 逐步实施和测试

---

**创建时间**: 2025-01-07
**最后更新**: 2025-01-07
**优先级**: 高
**状态**: 分析阶段，待讨论
