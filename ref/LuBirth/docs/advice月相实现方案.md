# 月相实现设计方案 - 地球摆正反推太阳光架构

## 系统架构概述

### 核心设计理念
本系统采用"地球摆正反推太阳光方向"的独特架构：
- **地球固定垂直**：`earthTiltDeg = 0`，地球保持垂直摆放
- **地球自转驱动**：通过 `earthYawDeg` 模拟时间流逝和日照变化
- **太阳方向反推**：基于天文计算反推出太阳应该在的位置
- **季相变化模拟**：太阳方向在Y轴摆动模拟季节变化

### 与传统架构的区别
传统架构：太阳运动 → 地球自转 → 月相变化
本系统架构：地球自转 → 反推太阳位置 → 季相变化 → 月相计算

## 当前问题分析

### 1. 月球自转缺失
- **现状**：月球只有静态的经纬度调整，没有基于时间的自转
- **影响**：无法形成动态月相变化
- **代码位置**：`src/scene/Scene.tsx` 中月球渲染部分

### 2. PIP相机跟随逻辑错误
- **现状**：PIP相机独立计算位置，没有跟随月球自转
- **影响**：无法保持潮汐锁定视角
- **代码位置**：`src/scenes/simple/components/PhysicalMoonPIP.tsx`

### 3. 季相变化未融入月相计算
- **现状**：季相变化只影响太阳方向，未同步到月相
- **影响**：月相在不同季节可能不准确
- **代码位置**：`src/SimpleTest.tsx` 中季节变化逻辑

## 完整的月相实现方案

### 1. 统一参考系建立

#### 地球自转参考系
```typescript
// 以地球自转角为基础时间参考
interface EarthRotationReference {
  earthYawDeg: number;        // 地球自转角 (0-360°)
  baseTime: Date;             // 基准时间
  rotationSpeed: number;      // 自转速度 (度/小时)
}
```

#### 时间映射系统
```typescript
// 将地球自转角映射到实际时间
function earthRotationToTime(earthYawDeg: number): Date {
  // 基于 earthYawDeg 计算对应的UTC时间
  // 考虑自转周期和起始时间
}

function timeToEarthRotation(date: Date): number {
  // 将实际时间转换为地球自转角
  // 用于同步所有天体运动
}
```

### 2. 月球轨道与自转计算

#### 月球轨道位置计算
```typescript
interface MoonOrbitalState {
  orbitalAngle: number;       // 轨道角度 (0-360°)
  distance: number;           // 地月距离
  inclination: number;        // 轨道倾角
  phase: number;             // 轨道相位 (0-1)
}

function calculateMoonOrbitalState(
  earthRotation: number, 
  date: Date
): MoonOrbitalState {
  // 基于地球自转状态计算月球轨道位置
  // 考虑轨道周期 (27.3天) 和相位变化
}
```

#### 月球自转角度计算
```typescript
function calculateMoonRotationAngle(
  earthRotation: number,      // 地球自转状态
  sunDirection: THREE.Vector3, // 反推的太阳方向
  orbitalState: MoonOrbitalState, // 月球轨道状态
  date: Date                  // 实际时间
): number {
  // 1. 基于时间的轨道运动角度
  const orbitalRotation = calculateOrbitalRotation(orbitalState, date);
  
  // 2. 基于太阳方向的月相补偿角度
  const phaseCompensation = calculatePhaseCompensation(sunDirection, orbitalState);
  
  // 3. 地球自转影响补偿
  const earthRotationCompensation = calculateEarthRotationEffect(earthRotation);
  
  // 4. 季节性调整
  const seasonalAdjustment = calculateSeasonalAdjustment(date);
  
  return orbitalRotation + phaseCompensation + earthRotationCompensation + seasonalAdjustment;
}
```

### 3. 季相变化集成

#### 季节性太阳方向
```typescript
interface SeasonalSunDirection {
  direction: THREE.Vector3;  // 太阳方向向量
  elevation: number;         // 太阳高度角
  azimuth: number;           // 太阳方位角
  season: string;            // 季节标识
}

function calculateSeasonalSunDirection(
  date: Date,
  latitude: number,
  longitude: number,
  obliquity: number = 23.44   // 黄赤交角
): SeasonalSunDirection {
  // 基于天文计算考虑季节变化的太阳方向
  // 使用现有的 seasonalSunDirWorldYUp 函数
}
```

#### 季节对月相的影响
```typescript
function calculateSeasonalMoonPhaseAdjustment(
  seasonalSun: SeasonalSunDirection,
  moonOrbitalState: MoonOrbitalState
): number {
  // 计算季节变化对月相观测的影响
  // 主要考虑太阳高度角变化对光照角度的影响
}
```

### 4. PIP相机跟随系统

#### 潮汐锁定相机定位
```typescript
interface TidalLockCamera {
  position: THREE.Vector3;   // 相机位置
  target: THREE.Vector3;     // 观察目标
  up: THREE.Vector3;         // 相机上方向
  distance: number;          // 观察距离
}

function calculateTidalLockCamera(
  moonPosition: THREE.Vector3,
  moonRotation: number,      // 月球当前自转角度
  earthPosition: THREE.Vector3,
  baseDistance: number = 5.0
): TidalLockCamera {
  // 基于月球自转状态计算相机位置
  // 保持潮汐锁定视角（始终观察月球的同一面）
  
  // 1. 计算月球局部坐标系中的相机偏移
  const localOffset = new THREE.Vector3(0, 0, baseDistance);
  
  // 2. 应用月球自转
  const moonQuaternion = new THREE.Quaternion();
  moonQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), moonRotation);
  localOffset.applyQuaternion(moonQuaternion);
  
  // 3. 计算世界坐标中的相机位置
  const cameraPosition = moonPosition.clone().add(localOffset);
  
  return {
    position: cameraPosition,
    target: moonPosition,
    up: new THREE.Vector3(0, 1, 0),
    distance: baseDistance
  };
}
```

### 5. 渲染分层控制

#### 分层渲染策略
```typescript
interface RenderLayers {
  MAIN_SCENE: number;         // 0 - 主场景
  PIP_CAMERA: number;         // 2 - PIP相机专用
}

function setupRenderLayers() {
  // 主场景月球
  moonMesh.layers.set(RenderLayers.MAIN_SCENE);
  
  // PIP专用月球
  pipMoonMesh.layers.set(RenderLayers.PIP_CAMERA);
  
  // 主相机
  mainCamera.layers.set(RenderLayers.MAIN_SCENE);
  
  // PIP相机
  pipCamera.layers.set(RenderLayers.PIP_CAMERA);
}
```

#### PIP启用时的渲染控制
```typescript
function handlePIPRendering(enablePIP: boolean) {
  if (enablePIP) {
    // 隐藏主场景月球
    mainSceneMoon.visible = false;
    
    // 激活PIP月球渲染
    pipMoonMesh.visible = true;
    
    // 启动PIP相机
    pipCamera.active = true;
  } else {
    // 显示主场景月球
    mainSceneMoon.visible = true;
    
    // 停止PIP月球渲染
    pipMoonMesh.visible = false;
    
    // 关闭PIP相机
    pipCamera.active = false;
  }
}
```

## 实现步骤

### 第一阶段：基础架构搭建
1. **建立统一参考系**
   - 实现地球自转角度与时间的双向映射
   - 创建统一的时间管理系统

2. **月球轨道计算**
   - 实现基于时间的月球轨道位置计算
   - 集成地球自转状态的影响

### 第二阶段：月相自转实现
1. **月球自转逻辑**
   - 实现完整的月球自转角度计算
   - 集成时间、轨道、太阳方向因素

2. **季相变化集成**
   - 将季节性太阳方向变化融入月相计算
   - 确保不同季节的月相准确性

### 第三阶段：PIP相机系统
1. **相机跟随逻辑**
   - 实现基于月球自转的相机定位
   - 确保潮汐锁定视角的稳定性

2. **分层渲染控制**
   - 实现主场景与PIP的分层渲染
   - 处理PIP启用/禁用的切换逻辑

### 第四阶段：同步与优化
1. **时间同步**
   - 确保所有组件使用统一时间源
   - 实现平滑的状态过渡

2. **性能优化**
   - 优化渲染性能
   - 添加调试和监控工具

## 关键算法

### 月相角度计算算法
```typescript
function calculateMoonPhaseAngle(
  earthRotation: number,
  sunDirection: THREE.Vector3,
  date: Date
): number {
  // 1. 计算月球轨道相位
  const orbitalPhase = calculateOrbitalPhase(date);
  
  // 2. 计算太阳-月球-地球夹角
  const sunMoonAngle = calculateSunMoonAngle(sunDirection, orbitalPhase);
  
  // 3. 计算地球自转补偿
  const earthCompensation = earthRotation * EARTH_ROTATION_COMPENSATION_FACTOR;
  
  // 4. 计算季节调整
  const seasonalAdjustment = calculateSeasonalAdjustment(date);
  
  // 5. 合成最终角度
  return (orbitalPhase + sunMoonAngle + earthCompensation + seasonalAdjustment) % 360;
}
```

### 潮汐锁定相机算法
```typescript
function updateTidalLockCamera(
  moonMesh: THREE.Mesh,
  camera: THREE.PerspectiveCamera,
  earthRotation: number
): void {
  // 1. 获取月球当前旋转状态
  const moonRotation = moonMesh.rotation.y;
  
  // 2. 计算相机相对位置
  const cameraOffset = new THREE.Vector3(0, 0, CAMERA_DISTANCE);
  cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), moonRotation);
  
  // 3. 更新相机位置
  camera.position.copy(moonMesh.position).add(cameraOffset);
  
  // 4. 确保相机对准月球中心
  camera.lookAt(moonMesh.position);
}
```

## 验证与测试

### 功能验证
1. **月相变化验证**
   - 新月、上弦月、满月、下弦月的正确显示
   - 月相周期的准确性 (29.53天)

2. **季节变化验证**
   - 不同季节的月相表现
   - 季节过渡的平滑性

3. **PIP同步验证**
   - PIP与主场景月相的一致性
   - 潮汐锁定视角的稳定性

### 性能测试
1. **渲染性能**
   - 帧率监控
   - 内存使用优化

2. **交互响应**
   - 时间切换的响应速度
   - PIP启用/禁用的切换性能

## 预期效果

### 完整功能
- ✅ 地球自转驱动的动态月相变化
- ✅ 季节变化对月相的正确影响
- ✅ PIP中稳定的潮汐锁定视角
- ✅ 主场景与PIP的完美同步
- ✅ 真实天文数据的准确反映

### 技术特点
- **统一参考系**：所有天体运动基于地球自转参考系
- **物理准确**：考虑轨道力学、季相变化、潮汐锁定
- **性能优化**：分层渲染、高效计算、平滑过渡
- **可扩展性**：模块化设计，易于后续功能扩展

## 文件结构规划

```
src/
├── scene/
│   ├── Scene.tsx                    # 主场景渲染
│   └── MoonSystem.ts                # 月球系统管理
├── scenes/simple/
│   ├── components/
│   │   ├── Moon.tsx                 # 月球组件
│   │   └── PhysicalMoonPIP.tsx      # PIP系统
│   ├── utils/
│   │   ├── moonPhaseCalculator.ts   # 月相计算引擎
│   │   ├── orbitalMechanics.ts     # 轨道力学计算
│   │   └── tidalLockCamera.ts       # 潮汐锁定相机
│   └── api/
│       └── moonState.ts             # 月球状态管理
├── astro/
│   ├── ephemeris.ts                 # 天文计算
│   └── seasons.ts                   # 季节计算
└── types/
    └── MoonSystemTypes.ts           # 类型定义
```

这个设计方案提供了一个完整的、在"地球摆正反推太阳光"架构下实现准确月相系统的技术路径。