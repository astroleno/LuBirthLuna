 # 🔄 迁移指南：从双光照系统到单一光源系统

## 📋 迁移概述

本指南详细说明了如何将原项目的双光照系统迁移到简化的单一光源系统，同时保留所有核心渲染效果。

## 🎯 迁移目标

### ✅ 保留的功能
- 地球日/夜景混合渲染
- 云层系统（带光照和偏移控制）
- 大气效果（弧光、辉光、halo）
- 月球系统（位置、材质、烘焙）
- 相机控制和构图系统
- 所有贴图资源
- 渲染参数调节

### 🔄 简化的部分
- 双光照系统 → 单一光源管理
- 分层渲染逻辑 → 统一渲染管线
- 复杂的光照开关 → 简化的光照控制

## 🚀 迁移步骤

### 第一步：创建新的Scene组件

#### 1.1 复制原Scene.tsx
```bash
cp src/scene/Scene.tsx neo/src/scene/Scene.tsx
```

#### 1.2 简化光照系统
移除以下复杂逻辑：
- `earthLightEnabled` 和 `moonSeparateLight` 开关
- 双光照方向计算
- 分层光照管理

#### 1.3 统一光照方向计算
```typescript
// 原代码（复杂）
const lightDir = React.useMemo(() => {
  if (earthLightEnabled) {
    const az = THREE.MathUtils.degToRad(((comp as any)?.earthLightAzDeg ?? 180));
    const el = THREE.MathUtils.degToRad(((comp as any)?.earthLightElDeg ?? 0));
    const x = Math.cos(el) * Math.cos(az);
    const z = Math.cos(el) * Math.sin(az);
    const y = Math.sin(el);
    return new THREE.Vector3(x, y, z).normalize();
  }
  const v = mode === 'celestial' ? new THREE.Vector3(sunEQD.x, sunEQD.y, sunEQD.z) : new THREE.Vector3(12,10,16);
  return v.normalize();
}, [mode, sunEQD.x, sunEQD.y, sunEQD.z, earthLightEnabled, (comp as any)?.earthLightAzDeg, (comp as any)?.earthLightElDeg]);

// 新代码（简化）
const lightDir = React.useMemo(() => {
  if (mode === 'celestial') {
    // 天文模式：使用真实太阳位置
    return new THREE.Vector3(sunEQD.x, sunEQD.y, sunEQD.z).normalize();
  } else {
    // 手动模式：使用用户控制的光照方向
    const az = THREE.MathUtils.degToRad(comp.lightAzDeg ?? 180);
    const el = THREE.MathUtils.degToRad(comp.lightElDeg ?? 0);
    const x = Math.cos(el) * Math.cos(az);
    const z = Math.cos(el) * Math.sin(az);
    const y = Math.sin(el);
    return new THREE.Vector3(x, y, z).normalize();
  }
}, [mode, sunEQD.x, sunEQD.y, sunEQD.z, comp.lightAzDeg, comp.lightElDeg]);
```

#### 1.4 统一光照强度
```typescript
// 原代码（复杂）
const sunIE = earthLightEnabled ? Math.min(Math.max((comp as any)?.earthLightIntensity ?? (comp as any)?.sunIntensity ?? 1.3, 0), 5) : 0;
const sunIM = Math.min(Math.max((comp as any)?.sunIntensityMoon ?? ((comp as any)?.sunIntensity ?? 1.3)*0.9, 0), 5);

// 新代码（简化）
const lightIntensity = Math.min(Math.max(comp.lightIntensity ?? 1.3, 0), 5);
```

### 第二步：更新类型定义

#### 2.1 简化Composition类型
```typescript
// 原类型（复杂）
export type Composition = {
  earthLightEnabled?: boolean;
  earthLightAzDeg?: number;
  earthLightElDeg?: number;
  moonSeparateLight?: boolean;
  moonAzDeg?: number;
  moonElDeg?: number;
  sunIntensity?: number;
  earthLightIntensity?: number;
  sunIntensityMoon?: number;
  // ... 其他参数
};

// 新类型（简化）
export type Composition = {
  // 统一光照控制
  lightAzDeg?: number;      // 光源方位角 [0-360°]
  lightElDeg?: number;      // 光源仰角 [-90°到90°]
  lightIntensity?: number;  // 光照强度 [0-5]
  lightTempK?: number;      // 色温 [2000K-10000K]
  
  // 保留所有其他参数
  earthSize?: number;
  moonScreenX?: number;
  moonScreenY?: number;
  // ... 其他参数保持不变
};
```

### 第三步：更新材质系统

#### 3.1 地球材质
所有地球相关的材质都使用统一的 `lightDir` 和 `lightIntensity`：

```typescript
// 地球日/夜景材质
const earthDNMaterial = React.useMemo(() => {
  if (!earthMap) return null;
  const material = new THREE.ShaderMaterial({
    uniforms: {
      // ... 其他uniforms
      lightDir: { value: lightDir.clone() },
      lightColor: { value: lightColor.clone() },
      sunI: { value: lightIntensity }, // 使用统一强度
      // ... 其他uniforms
    },
    // ... 着色器代码
  });
  return material;
}, [earthMap, earthNight, lightDir, lightIntensity, /* 其他依赖 */]);
```

#### 3.2 云层材质
```typescript
// 云层材质
<CloudsLitSphere
  // ... 其他属性
  lightDir={lightDir}
  lightColor={lightColor}
  strength={cloudStrength}
  sunI={lightIntensity} // 使用统一强度
  // ... 其他属性
/>
```

#### 3.3 月球材质
月球材质也使用统一的光照参数：

```typescript
// 月球展示材质
const moonDisplayMaterial = React.useMemo(() => {
  // ... 材质创建逻辑
  // 月球现在使用统一的光照方向，不再需要独立的光照计算
  return material;
}, [moonMap, moonDisplacementMap, /* 其他依赖 */]);
```

### 第四步：更新App组件

#### 4.1 简化状态管理
```typescript
// 原状态（复杂）
const [comp, setComp] = React.useState<Composition>({
  earthLightEnabled: true,
  earthLightAzDeg: 180,
  earthLightElDeg: 23.44,
  moonSeparateLight: true,
  moonAzDeg: 180,
  moonElDeg: 0,
  sunIntensity: 1.3,
  earthLightIntensity: 2.0,
  sunIntensityMoon: 1.2,
  // ... 其他参数
});

// 新状态（简化）
const [comp, setComp] = React.useState<Composition>({
  lightAzDeg: 180,        // 统一光照方位角
  lightElDeg: 23.44,      // 统一光照仰角
  lightIntensity: 1.3,    // 统一光照强度
  lightTempK: 5200,       // 色温
  // ... 其他参数保持不变
});
```

#### 4.2 更新UI控制
移除双光照相关的控制元素，保留单一光照控制：

```typescript
// 移除这些控制
// - 地球光照开关
// - 月球独立光照开关
// - 分别的光照强度控制

// 保留这些控制
// - 统一光照方向控制
// - 光照强度控制
// - 色温控制
```

### 第五步：测试和验证

#### 5.1 功能测试
- [ ] 地球日/夜景切换正常
- [ ] 云层渲染正确
- [ ] 大气效果显示正常
- [ ] 月球位置和渲染正确
- [ ] 相机控制正常

#### 5.2 性能测试
- [ ] 渲染性能无明显下降
- [ ] 内存使用合理
- [ ] 光照计算效率提升

## 🔧 技术细节

### 光照方向计算
新的光照方向计算基于以下坐标系：
- **X轴**：向右为正
- **Y轴**：向上为正  
- **Z轴**：向屏幕外为正

方位角从+X轴开始，逆时针旋转：
- 0° = +X方向（右）
- 90° = -Z方向（屏幕内）
- 180° = -X方向（左）
- 270° = +Z方向（屏幕外）

仰角从水平面开始：
- 0° = 水平
- 90° = 垂直向上
- -90° = 垂直向下

### 材质层设置
所有材质都设置为默认层（layer 0），不再需要复杂的分层逻辑：

```typescript
// 原代码（复杂）
if (material && material.layers) {
  material.layers.set(1); // 地球层
}

// 新代码（简化）
// 不需要设置layer，使用默认层
```

## 🚨 注意事项

### 1. 向后兼容性
- 原有的贴图路径保持不变
- 大部分渲染参数保持兼容
- 需要更新光照相关的参数名称

### 2. 性能影响
- 光照计算复杂度降低
- 渲染管线简化
- 整体性能应该有所提升

### 3. 调试建议
- 使用浏览器开发者工具检查光照方向
- 验证材质参数传递正确
- 测试不同光照角度下的渲染效果

## 📚 参考资源

- [Three.js 光照文档](https://threejs.org/docs/#api/en/lights/Light)
- [React Three Fiber 最佳实践](https://docs.pmnd.rs/react-three-fiber/getting-started/introduction)
- [着色器编程基础](https://thebookofshaders.com/)

## 🤝 获取帮助

如果在迁移过程中遇到问题：
1. 检查控制台错误信息
2. 验证参数传递正确性
3. 对比原项目和新项目的差异
4. 提交Issue描述具体问题


🔍 检查结果总结
�� 需要移除的复杂系统：
双光照系统：
earthLightEnabled - 地球光照开关
moonSeparateLight - 月球独立光照开关
sunIE 和 sunIM - 分别的地球和月球光照强度
lightDir 和 moonLightDir - 双光照方向计算
分层光照（layer 1和layer 2）
月球烘焙系统：
MoonBaker 组件
MoonWrapper 组件
bakedMoonTexture 状态
moonBakingEnabled 开关
moonOverlayEnabled 开关
复杂的参数系统：
earthLightAzDeg / earthLightElDeg
moonAzDeg / moonElDeg
earthLightIntensity / sunIntensityMoon