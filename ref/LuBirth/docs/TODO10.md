# TODO10 — 月球屏幕锁定系统稳定性修复计划（LuBirth）

基于 `advice_gpt锁定相机.md` 的专业建议，针对当前月球屏幕锁定系统中的 roll 不稳定、旋转漂移等问题的系统性修复方案。

## 目标与问题诊断

### 🎯 **核心目标**
- 月球固定在屏幕 `(0.5, 0.75)` 位置，不随相机变化
- 月球始终保持同一面朝向屏幕，无自转/漂移
- 相机任意旋转（方位角+俯仰角+roll）时月球完全稳定

### 🚨 **当前问题诊断**
1. **Roll 不稳定**：使用 `setFromUnitVectors(+Z, moonToCamera)` 导致 roll 角度不可控
2. **旋转漂移**：相机有复合旋转时出现缓慢"转盘"漂移现象
3. **坐标系混乱**：潮汐锁定偏移的轴系定义不清楚（pre vs post multiply）
4. **位置向量污染**：`camera.position.sub()` 直接修改了相机位置

## 实施计划（按优先级）

### 🔥 **阶段1：修复 Roll 不稳定问题**
**优先级**：最高 | **预估工作量**：2-3小时

#### 1.1 替换 Billboard 算法
**文件**：`src/scenes/simple/api/components/Moon.tsx`
- **❌ 移除**：`setFromUnitVectors` 方法
- **✅ 实现**：相机 `forward/up` 构正交基方法
- **核心代码**：
```typescript
// 稳定的构基方法
const camF = new THREE.Vector3();
camera.getWorldDirection(camF);
const forward = camF.clone().multiplyScalar(-1); // 面向相机
const camU = new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion);
const camR = new THREE.Vector3().crossVectors(camU, forward).normalize();
const up = new THREE.Vector3().crossVectors(forward, camR).normalize();
const R_face = new THREE.Matrix4().makeBasis(camR, up, forward);
const q_face = new THREE.Quaternion().setFromRotationMatrix(R_face);
```

#### 1.2 修复位置计算错误
- **问题**：`camera.position.sub(月球位置)` 污染相机位置
- **解决**：使用向量拷贝或 `getWorldPosition()`

#### 1.3 验收标准
- [ ] 相机 roll 旋转时月球不再缓慢漂移
- [ ] 复合旋转（方位角+俯仰角+roll）下月球朝向稳定
- [ ] 调试模式下四元数输出稳定

---

### 🔧 **阶段2：明确旋转坐标系与乘法次序**
**优先级**：中等 | **预估工作量**：1-2小时

#### 2.1 定义潮汐锁定偏移的坐标系
**选择策略**：**"先偏移再billboard"**（物理直觉）
- **理由**：潮汐锁定面基于月球固有特征，应在 billboard 变换前应用
- **实现**：`q_final = q_face.premultiply(q_offset_local)`

#### 2.2 重构旋转应用逻辑
**文件**：`src/scenes/simple/api/components/Moon.tsx`
```typescript
// 1. 定义月球原始局部系的潮汐锁定偏移
const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1), moonYawDeg);
const qLon = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), lonDeg);
const qLat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), latDeg);
const q_offset_local = new THREE.Quaternion().multiply(qYaw).multiply(qLon).multiply(qLat);

// 2. 先应用偏移，再应用 billboard
const q_final = q_face.clone().premultiply(q_offset_local);
moon.quaternion.copy(q_final).normalize();
```

#### 2.3 验收标准
- [ ] 潮汐锁定面参数调整时行为可预测
- [ ] 旋转次序清晰，无歧义
- [ ] 调试日志显示正确的变换链

---

### ✨ **阶段3：FOV 自适应与性能优化**
**优先级**：低等 | **预估工作量**：1小时

#### 3.1 实现 FOV 自适应尺寸
**目标**：确保月球在不同 FOV 下视觉大小一致
```typescript
const d = anchorDistance;
const worldHeightAtD = 2 * d * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
const planeHeight = worldHeightAtD * (targetPixelSize / viewportHeight);
moonMesh.scale.set(planeHeight, planeHeight, 1);
```

#### 3.2 优化性能
- **减少每帧计算**：缓存不变的四元数计算
- **条件更新**：只在相机变化时重新计算
- **调试开关**：生产环境关闭详细日志

#### 3.3 验收标准
- [ ] 不同 FOV 下月球大小视觉一致
- [ ] 性能开销 < 1ms/frame
- [ ] 调试信息可控制开关

---

### 🧪 **阶段4：测试与验证**
**优先级**：必须 | **预估工作量**：1小时

#### 4.1 自动化测试用例
**文件**：`src/astro/moonScreenLockTests.ts`（新建）
- **测试1**：相机纯方位角旋转，月球朝向不变
- **测试2**：相机纯俯仰角旋转，月球朝向不变  
- **测试3**：相机复合旋转，月球朝向稳定
- **测试4**：相机 roll 旋转，月球无漂移

#### 4.2 手动验证清单
- [ ] 相机控制开启，拖拽旋转时月球稳定
- [ ] 极端角度（俯视、仰视）下月球不变形
- [ ] 长时间运行无累积误差
- [ ] 月相变化正确，潮汐锁定面正确

#### 4.3 回退方案
- **Feature Flag**：`composition.moonUseStableBillboard`
- **降级模式**：出现问题时回退到固定世界坐标旋转
- **调试模式**：`?debug=moonlock=1` 显示详细变换信息

---

## 技术细节与注意事项

### 📐 **坐标系约定**
- **世界坐标系**：Y-up，相机默认看向 -Z
- **月球局部系**：+Z 朝向观察者，+X 右，+Y 上
- **潮汐锁定面**：基于月球地理特征的固定朝向

### 🔄 **变换链**
```
月球原始朝向 → 潮汐锁定偏移 → Billboard朝向相机 → 最终世界朝向
    (identity)  →  (premultiply)  →   (makeBasis)   →   (mesh.quaternion)
```

### ⚠️ **风险与缓解**
1. **四元数归一化**：每次变换后调用 `.normalize()`
2. **浮点精度**：长时间运行可能累积误差，定期重置
3. **相机状态**：确保相机矩阵已更新（`camera.updateMatrixWorld()`）
4. **性能监控**：每帧变换成本，必要时优化为条件更新

### 🔍 **调试工具**
- **实时四元数监控**：显示 billboard 和最终四元数
- **变换可视化**：绘制月球局部坐标轴
- **稳定性指标**：测量连续帧间的旋转差异

---

## 验收标准总结

### ✅ **功能验收**
- [ ] 月球位置固定在屏幕 `(0.5, 0.75)`，不随相机变化
- [ ] 月球朝向完全稳定，无自转、漂移、抖动
- [ ] 相机任意旋转组合下月球表现一致
- [ ] 潮汐锁定面正确，月相计算准确

### ⚡ **性能验收**
- [ ] 每帧计算开销 < 1ms
- [ ] 内存使用稳定，无泄漏
- [ ] 长时间运行无累积误差

### 🛡️ **稳定性验收**
- [ ] 极端相机角度下不出错
- [ ] 窗口大小变化时正常工作
- [ ] Feature Flag 可正常切换

---

## 后续扩展计划

### 🌟 **可选增强功能**
1. **多月球支持**：支持多个屏幕锁定月球
2. **动态锚点**：支持月球锚点位置动画
3. **遮挡检测**：月球被前景物体遮挡时的处理
4. **LOD 系统**：距离相机远时降低月球细节

### 📊 **监控与分析**
1. **性能分析**：帧时间分析，热点识别
2. **用户行为**：相机旋转模式统计
3. **错误收集**：异常情况自动上报

---

**总预估工作量**：5-7小时  
**关键里程碑**：阶段1完成后应解决90%的稳定性问题  
**风险等级**：中等（主要是四元数数学复杂性）
