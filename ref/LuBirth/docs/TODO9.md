# TODO9 — 月球完全解耦系统实现方案（LuBirth）

面向"月球与主场景完全解耦，仅基于时间驱动的独立月球系统"的技术实现方案。目标是实现月球固定显示在屏幕(0.5, 0.75)，月相只依赖日期时间，与3D场景任何变化完全无关。

## 目标与范围
- **完全解耦**：月球系统不读取主场景相机、光照、地球位置等任何3D对象状态
- **时间驱动**：月相计算仅基于 `currentDate + observerLat + observerLon`
- **屏幕固定**：月球始终显示在屏幕坐标 `(x=0.5, y=0.75)`，不随主相机变化
- **视角固定**：月球使用独立的固定"月球相机视角"，保持最佳观察角度
- **性能优化**：单月球系统，无额外渲染开销，可独立优化更新频率

## 系统架构设计

### 数据流设计
```
时间输入 → 天文计算 → 月相数据 → 固定Shader → 屏幕输出
    ↓
currentDate + observerLat + observerLon
    ↓
getMoonPhase() → { sunDirection, illumination, positionAngle }
    ↓
moonViewMatrix + sunDirWorldForShading → 独立Shader计算
    ↓
固定屏幕位置(0.5, 0.75)的月球画面
```

### 核心原则
- ❌ 不读取主场景相机 (`camera`)
- ❌ 不读取主场景光照 (`directionalLight`)
- ❌ 不读取地球位置 (`earthPosition`)
- ❌ 不读取任何动态3D对象状态
- ✅ 只读取时间和观察者地理位置
- ✅ 使用固定的月球观察视角
- ✅ 输出固定屏幕坐标的月球画面

## 实施步骤（按优先级）

### 1) 固定月球视图矩阵系统 🔥 **核心**
**文件**：`src/scenes/simple/api/components/Moon.tsx`

#### 1.1 创建固定月球相机配置
```typescript
// 定义永远不变的月球观察配置
const FIXED_MOON_CAMERA = {
  position: [0, 0, 3],    // 固定观察距离
  target: [0, 0, 0],      // 总是看向月球中心  
  up: [0, 1, 0]           // 固定上方向
};

// 创建固定的视图矩阵（组件外部，避免重复计算）
const FIXED_MOON_VIEW_MATRIX = new THREE.Matrix4().lookAt(
  new THREE.Vector3(0, 0, 3),
  new THREE.Vector3(0, 0, 0), 
  new THREE.Vector3(0, 1, 0)
);
```

#### 1.2 修改Shader uniforms
```typescript
// 在 moonMaterial 的 uniforms 中添加：
uniforms: {
  // 新增：固定的月球视图矩阵
  moonViewMatrix: { value: FIXED_MOON_VIEW_MATRIX },
  
  // 保持：基于真实天文数据的太阳方向
  sunDirWorldForShading: { value: sunDirWorldForShading },
  
  // ... 其他现有 uniforms
}
```

#### 1.3 修改Fragment Shader
```glsl
// 添加新的uniform
uniform mat4 moonViewMatrix;

// 在 main() 函数中替换：
// ❌ 原来：vec3 lightDir = normalize( (viewMatrix * vec4(sunDirWorldForShading, 0.0)).xyz );
// ✅ 改为：vec3 lightDir = normalize( (moonViewMatrix * vec4(sunDirWorldForShading, 0.0)).xyz );
```

### 2) 屏幕位置固定映射 🔥 **基础**
**文件**：`src/scenes/simple/utils/positionUtils.ts`

#### 2.1 实现固定屏幕坐标映射函数
```typescript
/**
 * 计算固定屏幕坐标对应的世界位置（不依赖主相机）
 */
export function getFixedScreenWorldPosition(
  screenX: number, 
  screenY: number, 
  distance: number
): THREE.Vector3 {
  // 使用固定的投影参数
  const aspect = window.innerWidth / window.innerHeight;
  const fov = 45; // 固定FOV，与主相机保持一致
  const halfHeight = distance * Math.tan(THREE.MathUtils.degToRad(fov * 0.5));
  const halfWidth = halfHeight * aspect;
  
  // 将屏幕坐标(0-1)转换为NDC(-1到1)，再转换为世界坐标
  const ndcX = (screenX - 0.5) * 2;
  const ndcY = (screenY - 0.5) * 2;
  
  const worldX = ndcX * halfWidth;
  const worldY = ndcY * halfHeight;
  
  return new THREE.Vector3(worldX, worldY, -distance);
}
```

#### 2.2 修改 useMoonPosition 函数
```typescript
export function useMoonPosition(composition: any, camera: THREE.Camera) {
  return React.useMemo(() => {
    try {
      const moonScreen = {
        x: composition?.moonScreenX ?? 0.5,
        y: composition?.moonScreenY ?? 0.75,
        dist: composition?.moonDistance ?? 14
      };
      
      // ❌ 移除依赖相机的计算：
      // const ndc = new THREE.Vector3(moonScreen.x * 2 - 1, moonScreen.y * 2 - 1, 0.5);
      // const p = ndc.unproject(camera);
      // const dir = p.sub(camera.position).normalize();
      // const moonPos = camera.position.clone().add(dir.multiplyScalar(moonScreen.dist));
      
      // ✅ 使用固定屏幕坐标映射：
      const moonPos = getFixedScreenWorldPosition(
        moonScreen.x, 
        moonScreen.y, 
        moonScreen.dist
      );
      
      return {
        position: moonPos.toArray() as [number, number, number],
        screen: moonScreen,
        distance: moonScreen.dist
      };
    } catch (error) {
      console.error('[FixedMoonPosition] Error:', error);
      return {
        position: [0, 2, -14] as [number, number, number], // 固定兜底位置
        screen: { x: 0.5, y: 0.75, dist: 14 },
        distance: 14
      };
    }
  }, [composition?.moonScreenX, composition?.moonScreenY, composition?.moonDistance]); 
  // 注意：移除camera依赖
}
```

### 3) 渲染层级与深度控制 🔧 **保障**
**文件**：`src/SimpleTest.tsx`

#### 3.1 设置月球渲染优先级
```typescript
<Moon
  // ... 现有props
  
  // 新增渲染控制props
  renderOrder={999}        // 高于地球等其他对象
  depthTest={false}        // 不进行深度测试
  depthWrite={false}       // 不写入深度缓冲
  
  // 确保使用固定系统
  enableTidalLock={false}  // 禁用传统潮汐锁定
  enableUniformShading={true} // 启用独立着色系统
/>
```

#### 3.2 在Moon组件中应用渲染设置
```typescript
// 在 Moon.tsx 的 mesh 上设置：
<mesh 
  ref={meshRef}
  name={name}
  position={position}
  renderOrder={renderOrder || 999}
>
  <sphereGeometry args={[radius, 64, 64]} />
  <primitive 
    object={moonMaterial} 
    attach="material"
    depthTest={false}
    depthWrite={false}
  />
</mesh>
```

### 4) 配置参数与开关 🎛️ **控制**
**文件**：`src/types/SimpleComposition.ts`

#### 4.1 添加新的配置参数
```typescript
export interface SimpleComposition {
  // ... 现有参数
  
  // 月球独立系统控制
  moonUseFixedSystem?: boolean;     // 是否启用完全解耦的月球系统（默认true）
  moonFixedDistance?: number;       // 固定观察距离（默认3）
  moonUpdateFrequency?: number;     // 月球系统更新频率（毫秒，默认1000）
  
  // 调试输出控制
  moonDebugOutput?: boolean;        // 是否输出月球系统调试信息
}

// 在默认配置中添加：
export const DEFAULT_SIMPLE_COMPOSITION: SimpleComposition = {
  // ... 现有默认值
  
  moonUseFixedSystem: true,
  moonFixedDistance: 3,
  moonUpdateFrequency: 1000,
  moonDebugOutput: false,
};
```

### 5) 调试与验证系统 🔍 **验证**
**文件**：`src/SimpleTest.tsx`

#### 5.1 添加月球系统状态输出
```typescript
// 在控制面板中添加月球系统状态显示
<div className="row" style={{ marginBottom: 16, padding: '12px', background: 'rgba(0,255,255,0.05)', borderRadius: '4px' }}>
  <div className="col">
    <span className="label">🌙 月球系统状态</span>
  </div>
  <div className="col">
    <span className="label">位置: 固定屏幕({composition.moonScreenX.toFixed(2)}, {composition.moonScreenY.toFixed(2)})</span>
  </div>
  <div className="col">
    <span className="label">月相: {moonPhaseInfo}</span>
  </div>
  <div className="col">
    <span className="label">系统: {composition.moonUseFixedSystem ? '✅ 完全解耦' : '⚠️ 传统模式'}</span>
  </div>
</div>
```

#### 5.2 添加验证函数
```typescript
// 在 NoTiltProbe 组件中添加月球系统验证
(window as any).validateMoonSystem = () => {
  const moonDebug = (window as any).moonPhaseDebug;
  const result = {
    timestamp: new Date().toISOString(),
    screenPosition: { x: composition.moonScreenX, y: composition.moonScreenY },
    moonPhase: moonDebug?.lightingSideFromRealVector || 'unknown',
    sunDirection: moonDebug?.sunDirection || [0,0,0],
    isTimeDependent: true, // 月相只依赖时间
    isCameraIndependent: true, // 不依赖主相机
    isSceneIndependent: true   // 不依赖3D场景
  };
  
  console.log('[MoonSystemValidation]', result);
  return result;
};
```

### 6) 性能优化（可选） ⚡ **优化**
**文件**：`src/scenes/simple/api/components/Moon.tsx`

#### 6.1 月球系统独立更新频率
```typescript
// 使用独立的更新频率，减少不必要的计算
const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());

useEffect(() => {
  const updateFrequency = composition?.moonUpdateFrequency ?? 1000;
  
  const interval = setInterval(() => {
    setLastUpdateTime(Date.now());
  }, updateFrequency);
  
  return () => clearInterval(interval);
}, [composition?.moonUpdateFrequency]);

// 月相计算使用这个更新时间而不是实时
const sunDirectionInfo = useMemo(() => {
  // ... 现有月相计算逻辑
}, [currentDate, observerLat, observerLon, lastUpdateTime]);
```

## 验收标准

### 功能验收
- [ ] **相机独立性**：主相机任意旋转、移动，月球位置和月相不变
- [ ] **时间驱动性**：修改日期时间，月相正确变化；修改其他参数，月相不变
- [ ] **屏幕固定性**：月球始终显示在设定的屏幕坐标，不受窗口大小影响
- [ ] **月相准确性**：与修改前的月相计算结果完全一致
- [ ] **渲染正确性**：月球正确叠加在主场景之上，无深度冲突

### 性能验收
- [ ] **无额外开销**：帧率与修改前基本一致（误差<5%）
- [ ] **内存稳定**：无内存泄漏，长时间运行稳定
- [ ] **更新优化**：月球系统可以独立控制更新频率

### 代码质量验收
- [ ] **解耦彻底**：月球系统代码不包含对主场景对象的引用
- [ ] **配置灵活**：通过参数可以在新旧系统间切换
- [ ] **调试友好**：提供充分的调试输出和验证函数

## 回退方案
- **Feature Flag**：通过 `moonUseFixedSystem` 参数控制是否启用新系统
- **兼容性保证**：保留原有的月球渲染逻辑作为回退选项
- **渐进迁移**：可以先在特定条件下启用新系统，验证稳定后全面切换

## 风险评估与缓解
- **风险1**：固定视图矩阵可能导致月相显示角度不佳
  - **缓解**：提供可配置的月球相机参数，支持微调观察角度
- **风险2**：屏幕坐标映射在不同设备上可能有差异
  - **缓解**：使用相对坐标系统，支持不同屏幕比例的适配
- **风险3**：月相计算精度可能受到固定视角影响
  - **缓解**：保持现有的天文计算逻辑不变，只改变视觉呈现方式

---
**实施优先级**：1) 固定视图矩阵 → 2) 屏幕位置映射 → 3) 渲染控制 → 4) 配置系统 → 5) 调试验证 → 6) 性能优化

**预期完成时间**：核心功能 2-3 小时，完整系统 4-6 小时

参考文档：`TODO8.md`、`src/scenes/simple/api/components/Moon.tsx`、`src/scenes/simple/api/moonPhase.ts`
