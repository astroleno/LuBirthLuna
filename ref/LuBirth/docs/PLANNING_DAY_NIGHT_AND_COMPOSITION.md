# 昼夜计算与月相/构图协调规划

## 目标
- 保持地球始终不旋转（画面中的大陆纹理与地轴保持稳定），仅通过“平行光方向”表达昼夜变化。
- 旋转月球以匹配正确的月相与相位方向（明暗分界线朝向太阳）。
- 将“出生点”旋转到地球北极附近，同时联动旋转相机和月球，保持既定的地月合影构图。
- 整体与单光照系统耦合，支持日期时间驱动。

## 可行实现方式

### 1) 昼夜计算（地球不动，调光照方向）
- 输入：日期时间（UTC/local）→ 天文算法 `computeEphemeris(date)` 获取太阳方向向量 `sunDirWorld`（世界空间）。
- 约束：不改变地球自转与地轴在画面中的姿态，`Earth` 网格的worldMatrix保持稳定。
- 实现：
  - 平行光 `directionalLight.direction = sunDirWorld`。
  - 着色器内的 `lightDir` uniform 使用相同向量。
  - UI中可切换“天相模式/调试模式”：
    - 天相模式：`sunDirWorld` 来自 `computeEphemeris`。
    - 调试模式：使用方位角/仰角滑杆计算 `sunDirWorld`。

### 2) 月球月相匹配
- 需求：月球的明暗分界线与太阳方向一致；月球表面坐标系允许绕自身旋转以匹配相位视觉。
- 实现：
  - 方向：`moonLightDir = sunDirWorld`（同一太阳方向）。
  - 月相旋转：
    - 将月球局部的“0经线”绕视线方向/自身法线做补偿旋转，使明暗边界与太阳方向对齐且视觉美观。
    - 在 `Moon` 材质中增加 `moonLightIntensity`、`moonLightTempK`（已在计划中），并将 `lightDir` 用于日夜混合。

### 3) 出生点旋转到北极附近 + 构图保持
- 目标：将“出生点”（相机参考位）旋转到地球北极附近，以获得更好的地月合影角度；同时保持原有构图（地球下1/3 + 右上小月亮）。
- 实现：
  - 定义基准构图：
    - 地球屏幕上沿位置 `earthTopY`，地球屏占比 `earthSize`。
    - 月球距离 `moonDistance` 与屏幕位置（右上象限）。
  - 操作步骤：
    1. 计算将相机轨道中心绕地球世界上方向（或地轴）旋转一定角度，使“观察者参考点”位于北极附近。
    2. 将月球围绕地球的相位/轨道面做对应旋转，使相对太阳方向一致，并保持月球落在右上象限。
    3. 最后微调相机的局部偏航/俯仰，保证屏幕构图符合预设。
  - 技术要点：
    - 使用四元数组合旋转（避免万向节锁）。
    - 将“构图锁定”作为约束（禁止OrbitControls旋转）。

## 数据流与接口规划
- 新增 `src/astro/ephemeris.ts` 导出：`computeEphemeris(date)`，返回 `{ sunDirWorld, moonDirWorld? }`。
- `SimpleTest`：
  - 天相模式下从 `computeEphemeris` 推导 `sunDirWorld` → 传入场景。
  - 调试模式下从UI方位/仰角计算 `sunDirWorld`。
- `SceneContent`：
  - 使用统一的 `sunDirWorld` 设置 `directionalLight` 与传给 `Earth/Moon/AtmosphereEffects`。
  - `Moon` 接收 `moonPhaseYawDeg`（可选），用于月相补偿。

## 任务拆解
1. 接入 `computeEphemeris`，用日期控制太阳方向（不动地球）
2. `Moon` 材质接入 `lightDir`、`moonLightIntensity`、`moonLightTempK`
3. 增加月相补偿旋转 `moonPhaseYawDeg`（UI+材质/几何旋转）
4. 添加“出生点旋转到北极附近”的相机/场景变换（锁定构图）
5. 预设保存/加载：保存“天相+构图”参数集

## 风险与验证
- 风险：
  - 太阳与相机旋转叠加引起视觉方向错觉
  - 月球相位与法线空间不一致导致明暗边界偏移
- 验证：
  - 打开 `?debug=1` 打印 `sunDirWorld`、`cameraQuat`、`moonQuat`
  - 对比“原Scene.tsx”的视觉基调（弧光/地光）

## 时间评估
- 接入天相方向与Moon相位：0.5 天
- 北极出生点与构图锁定：0.5 天
- 预设与交互打磨：0.5 天
