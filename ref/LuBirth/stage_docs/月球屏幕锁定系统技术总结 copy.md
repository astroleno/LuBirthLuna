# 月球屏幕锁定系统技术总结（LuBirth）

## 项目背景

基于 `TODO10` 计划，我们成功实现了月球屏幕锁定系统，解决了相机旋转时月球自转、贴图拉伸等关键问题。

## 核心问题与解决方案

### 🚨 **原始问题**

1. **月球自转问题**：相机旋转时月球跟着自转，无法保持固定朝向
2. **贴图拉伸问题**：UV旋转导致月球贴图变形
3. **相机突变问题**：仰角-85度时出现突变
4. **执行顺序冲突**：多个useFrame钩子相互覆盖

### ✅ **最终解决方案**

**方案B：几何旋转方案**（成功采用）

```typescript
// 核心实现
meshRef.current.lookAt(camera.position);  // 先面向相机
const qOffset = qYaw * qLon * qLat;       // 组合潮汐锁定偏移
meshRef.current.quaternion.multiply(qOffset); // 应用到几何旋转
```

## 技术路径演进

### 阶段1：问题诊断与基础修复

#### 1.1 修复Roll不稳定
- **问题**：使用 `setFromUnitVectors` 导致roll角度不可控
- **解决**：实现稳定的构基方法，使用相机 `forward/up` 构建正交基
- **技术**：`makeBasis(camR, up, forward)` 确保稳定的坐标系

#### 1.2 修复执行顺序冲突
- **问题**：多个 `useFrame` 钩子执行顺序不确定，相互覆盖
- **解决**：合并所有 `useFrame` 逻辑到单一函数中
- **技术**：明确的条件分支 `if (enableScreenAnchor) {} else if (enableTidalLock) {}`

### 阶段2：UV旋转方案尝试与失败

#### 2.1 方案A：UV旋转方案
- **思路**：简化几何为纯billboard，潮汐锁定通过Shader UV旋转实现
- **实现**：
  ```glsl
  // Vertex Shader
  vec3 uvHomogeneous = uvRotation * vec3(uv, 1.0);
  vUvRotated = uvHomogeneous.xy;
  ```
- **问题**：任何UV旋转都会产生拉伸变形
- **原因**：球面纹理不适合UV旋转，超出[0,1]范围导致采样问题

#### 2.2 UV旋转算法优化尝试
- **矩阵方法**：3x3变换矩阵 → 拉伸问题
- **直接角度计算**：`cos/sin` 直接计算 → 仍有拉伸
- **小角度测试**：5度旋转 → 轻微拉伸
- **结论**：UV旋转方案不适合球面纹理

### 阶段3：几何旋转方案成功

#### 3.1 方案B：几何旋转方案
- **思路**：在几何层面实现潮汐锁定，保持原始UV不变
- **实现**：
  ```typescript
  // 先面向相机（纯Billboard）
  meshRef.current.lookAt(camera.position);
  
  // 再应用潮汐锁定偏移
  const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), THREE.MathUtils.degToRad(moonYawDeg || 0));
  const qLon = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(lonDeg || 0));
  const qLat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(latDeg || 0));
  
  const qOffset = new THREE.Quaternion().multiply(qYaw).multiply(qLon).multiply(qLat);
  meshRef.current.quaternion.multiply(qOffset);
  ```

#### 3.2 相机仰角限制
- **问题**：仰角-85度时出现突变
- **解决**：限制OrbitControls的仰角范围
- **实现**：
  ```typescript
  <OrbitControls 
    minPolarAngle={THREE.MathUtils.degToRad(10)}   // 最小仰角10度
    maxPolarAngle={THREE.MathUtils.degToRad(170)}  // 最大仰角170度
  />
  ```

## 核心技术要点

### 1. 屏幕锚定位置计算
```typescript
// 屏幕坐标 → 世界空间射线
const ndcX = (screenX - 0.5) * 2;
const ndcY = (screenY - 0.5) * 2;
const ndcPoint = new THREE.Vector3(ndcX, ndcY, 0.5);
const worldPoint = ndcPoint.unproject(camera);
const direction = worldPoint.sub(camera.position).normalize();
const finalPosition = camera.position.clone().add(direction.multiplyScalar(distance));
```

### 2. 稳定的Billboard算法
```typescript
// 简单的面向相机，避免复杂的构基计算
meshRef.current.lookAt(camera.position);
```

### 3. 潮汐锁定偏移计算
```typescript
// 三个轴的旋转组合
const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), yawRad);
const qLon = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), lonRad);
const qLat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), latRad);
const qOffset = new THREE.Quaternion().multiply(qYaw).multiply(qLon).multiply(qLat);
```

### 4. 深度控制
```typescript
// 屏幕锚定时禁用深度测试，确保月球始终在前景
depthTest: enableScreenAnchor ? false : true,
depthWrite: enableScreenAnchor ? false : true
```

## 性能优化

### 1. 条件更新
- 只在 `enableScreenAnchor` 为true时执行屏幕锚定逻辑
- 避免不必要的每帧计算

### 2. 错误处理
- 位置计算失败时的兜底方案
- 调试信息控制（通过URL参数）

### 3. 内存管理
- 使用 `copy()` 避免污染原始向量
- 及时清理临时对象

## 调试与验证

### 调试工具
```typescript
// URL参数控制调试信息
?debug=1  // 开启详细日志
```

### 关键验证点
1. **位置固定**：月球锚定在屏幕指定位置
2. **旋转稳定**：相机旋转时月球不自转
3. **贴图正常**：无拉伸变形
4. **潮汐锁定**：正确的朝向，可调整参数
5. **相机稳定**：仰角限制范围内无突变

## 技术教训

### 1. UV旋转不适合球面纹理
- **教训**：球面纹理的UV坐标有特殊含义，旋转会导致采样错误
- **解决方案**：在几何层面处理旋转，保持UV不变

### 2. 执行顺序的重要性
- **教训**：多个useFrame钩子的执行顺序不确定
- **解决方案**：合并到单一useFrame中，明确条件分支

### 3. 简单方案往往更可靠
- **教训**：复杂的矩阵变换容易出错
- **解决方案**：使用Three.js内置的 `lookAt()` 方法

## 系统架构

### 组件层次
```
SimpleTest.tsx
├── OrbitControls (相机控制)
├── SimpleEarthMoonScene.tsx
│   ├── Earth (地球)
│   └── Moon (月球) ← 核心组件
│       ├── 屏幕锚定逻辑
│       ├── 几何旋转潮汐锁定
│       └── 自定义Shader材质
```

### 数据流
```
composition.moonScreenX/Y → getScreenAnchoredPosition() → 世界坐标位置
composition.moonLonDeg → 潮汐锁定偏移 → 几何旋转
camera.position → lookAt() → Billboard朝向
```

## 未来优化方向

### 1. FOV自适应
- 根据相机FOV调整月球大小，保持视觉一致性

### 2. 性能优化
- 条件更新优化
- 缓存计算结果

### 3. 自动化测试
- 创建回归测试用例
- 验证各种相机角度下的稳定性

## 总结

通过系统性的问题诊断和方案迭代，我们成功实现了稳定的月球屏幕锁定系统。关键成功因素：

1. **问题定位准确**：通过调试工具快速定位根本原因
2. **方案迭代及时**：UV旋转方案失败后及时回退到几何方案
3. **技术选择合理**：选择简单可靠的Three.js内置方法
4. **测试验证充分**：多角度测试确保稳定性

最终方案在功能、性能和稳定性方面都达到了预期目标，为后续的PIP系统开发奠定了坚实基础。

---

**文档版本**：v1.0  
**创建时间**：2024年12月  
**技术栈**：React + Three.js + @react-three/fiber + @react-three/drei  
**相关文档**：`TODO10.md`、`advice_gpt锁定相机.md`
