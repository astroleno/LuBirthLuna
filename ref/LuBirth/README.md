 # 🌍 地球月球场景 - 单一光源版本

这是从原项目迁移的单一光源地球月球场景，保留了所有核心渲染效果，简化了光照系统架构。

## 🎯 项目特点

- **单一光源管理** - 简化的光照系统，易于控制和调节
- **完整的地球渲染** - 日/夜景混合、云层、大气效果、晨昏线
- **真实的月球系统** - 基于天文数据的月相和位置
- **灵活的相机控制** - 支持多种构图和视角
- **高质量贴图支持** - 8K/2K地球、月球、云层贴图

## 🚀 快速开始

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

## 📁 项目结构

```
neo/
├── src/
│   ├── scene/           # 场景组件
│   │   ├── Scene.tsx   # 主场景（单一光源版本）
│   │   ├── MoonBaker.tsx # 月球烘焙器
│   │   └── MoonWrapper.tsx # 月球包裹球
│   ├── astro/          # 天文计算
│   │   └── ephemeris.ts # 星历计算
│   ├── App.tsx         # 主应用组件
│   ├── main.tsx        # 应用入口
│   └── styles.css      # 样式文件
├── public/             # 静态资源
│   └── textures/       # 贴图文件
├── package.json        # 项目配置
├── tsconfig.json       # TypeScript配置
├── vite.config.ts      # Vite配置
└── README.md           # 项目说明
```

## 🎨 核心功能

### 地球渲染
- **日/夜景混合** - 基于光照方向的自动切换
- **云层系统** - 带光照的云层渲染，支持偏移控制
- **大气效果** - 弧光、辉光、近表面halo
- **晨昏线** - 可调节的晨昏线柔和度和亮度

### 月球系统
- **真实位置** - 基于天文数据的月球位置计算
- **月相显示** - 自动计算月相和光照
- **高度贴图** - 支持月球表面细节
- **烘焙渲染** - 高质量月球渲染

### 相机控制
- **灵活构图** - 支持多种地球和月球位置
- **分层渲染** - 地球和月球独立渲染层
- **视角控制** - 支持多种观察角度

## ⚙️ 配置参数

### 基础设置
- `earthSize` - 地球屏幕大小比例
- `moonScreenX/Y` - 月球屏幕位置
- `moonDist` - 月球距离
- `useTextures` - 是否启用贴图

### 光照控制
- `lightAzDeg` - 光源方位角 [0-360°]
- `lightElDeg` - 光源仰角 [-90°到90°]
- `lightIntensity` - 光照强度 [0-5]
- `lightTempK` - 色温 [2000K-10000K]

### 渲染效果
- `cloudStrength` - 云层强度
- `rimStrength` - 弧光强度
- `earthGlowStrength` - 地球辉光强度
- `terminatorSoftness` - 晨昏线柔和度

## 🔧 技术栈

- **React 18** - 用户界面框架
- **Three.js** - 3D图形库
- **React Three Fiber** - React的Three.js集成
- **TypeScript** - 类型安全的JavaScript
- **Vite** - 快速构建工具

## 📚 使用说明

### 1. 基础场景设置
```typescript
import { EarthMoonScene } from './scene/Scene';

<EarthMoonScene
  comp={{
    earthSize: 0.33,
    moonScreenX: 0.5,
    moonScreenY: 0.78,
    lightAzDeg: 180,
    lightElDeg: 23.44,
    lightIntensity: 1.3
  }}
  mode="celestial"
/>
```

### 2. 天文模式
天文模式会自动计算太阳和月球位置，适合展示真实的天文现象。

### 3. 手动模式
手动模式允许精确控制光照方向和强度，适合艺术创作和教学演示。

## 🧩 新增接口与接入指南（2024-12-19）

本版本在移除“地球辉光”渲染后，新增了三套可直接调用的接口，分别用于：

- 日期→地球/日月状态（世界系方向向量）
- 构图对齐：将某经纬度（如出生点）旋到画面上沿并居中（ShotRig）
- 日期→月相（明亮比例与相位角）

### 1) 日期→地球状态

文件：`src/scenes/simple/api/earthState.ts`

导出：

```ts
type EarthState = {
  sunDirEQD: { x: number; y: number; z: number };
  moonDirEQD: { x: number; y: number; z: number };
  illumination: number; // 月面明亮比例 0..1
};

function getEarthState(localISO: string, latDeg: number, lonDeg: number): EarthState;
```

说明：
- 传入“本地时间字符串（形如 YYYY-MM-DDTHH:mm）+ 观察者经纬度”，自动换算为 UTC 并调用 `astronomy-engine`，返回世界系（EQD）中的太阳/日月方向向量（已归一化）与月相明亮比例。
- 这些向量可直接用于单光照系统（如 `directionalLight` 的方向或材质 uniform）。

使用示例：

```ts
import { getEarthState } from '@/scenes/simple/api/earthState';

const state = getEarthState('2024-12-19T12:00', 31.2, 121.5);
// state.sunDirEQD 可直接作为光照方向来源
```

### 2) 构图对齐 ShotRig（将经纬度旋到屏幕上沿并居中）

文件：`src/scenes/simple/api/shotRig.ts`

导出：

```ts
type ShotRigParams = { targetLatDeg: number; targetLonDeg: number };

function createShotRig(): {
  rig: THREE.Group;
  alignToLatLon: (earth: THREE.Object3D, camera: THREE.Camera, params: ShotRigParams) => void;
};
```

说明：
- 两步四元数对齐：先把目标地面法线旋到世界 +Y（画面上沿），再绕世界 +Y 旋转，使经线指向屏幕正前，从而保证“目标经纬位于画面上沿且地球居中”。
- 适用于一键“出生点→80°N, 180°E 并居中”的构图需求。

使用示例：

```ts
import { createShotRig } from '@/scenes/simple/api/shotRig';

const { rig, alignToLatLon } = createShotRig();
// 假设 earthMesh 是地球根节点对象，camera 为主相机
alignToLatLon(earthMesh, camera, { targetLatDeg: 80, targetLonDeg: 180 });
```

### 3) 日期→月相

文件：`src/scenes/simple/api/moonPhase.ts`

导出：

```ts
type MoonPhaseInfo = {
  illumination: number;     // 0..1 明亮比例
  phaseAngleRad: number;    // 相位角（弧度）
};

function getMoonPhase(localISO: string, latDeg: number, lonDeg: number): MoonPhaseInfo;
```

说明：
- 基于 `astronomy-engine` 的太阳/月球几何关系计算得到月相；明亮比例与相位角可直接驱动 UI 或材质参数。

使用示例：

```ts
import { getMoonPhase } from '@/scenes/simple/api/moonPhase';

const phase = getMoonPhase('2024-12-19T12:00', 31.2, 121.5);
// phase.illumination / phase.phaseAngleRad
```

### 4) 接入主程序建议

在 `SimpleTest.tsx` 中：
- 使用 `getEarthState()` 更新光照方向（例如保存到 `sunEQD` 状态后传入 `useLightDirection`）。
- 提供按钮调用 `createShotRig().alignToLatLon(earth, camera, { targetLatDeg: 80, targetLonDeg: 180 })` 完成一键构图。
- 使用 `getMoonPhase()` 将 `illumination/phaseAngle` 同步到 UI，或透传给月球材质以控制明暗过渡与高光。

### 5) 变更说明

- 按需求“完全移除地球辉光渲染”。保留大气弧光与近表面软光晕。UI 如需同步隐藏辉光滑条，可在 `SimpleTest.tsx` 去除对应控件。

## 🎯 迁移说明

### 从原项目迁移的优势
- **架构简化** - 从复杂的双光照系统简化为单一光源
- **功能完整** - 保留了所有核心渲染效果
- **易于维护** - 简化的代码结构，更容易理解和修改
- **性能提升** - 减少光照计算复杂度

### 主要变化
1. **光照系统** - 统一为单一光源管理
2. **参数简化** - 减少了光照相关的复杂参数
3. **代码清理** - 移除了双光照相关的复杂逻辑

## 🤝 贡献

欢迎提交Issue和Pull Request来改进这个项目！

## 📄 许可证

本项目采用MIT许可证。