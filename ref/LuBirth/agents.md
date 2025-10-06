# Agents 协作指南（LuBirth）

面向参与该仓库的“智能代理/协作伙伴”的执行手册。目标是按 TODO3 的阶段目标稳定推进：固定太阳模式（M1）→ 月球 PIP α（M2）→ 一致性与发布（M3）。本指南给出最短路径的入口、代码锚点、验证方法与回退策略。

## 目标与范围
- 固定太阳方向 + 旋转地球，统一使用单一方向光（常亮）。
- 相机不挂地球组，保持构图稳定；星空不在地球组下。
- 画中画 PIP：独立小相机 + 离屏渲染纹理 + 屏幕叠加。
- 自动化测试覆盖核心物理现象与回归路径，可一键输出 JSON。

## 快速入口
- 启动：`npm run dev`
- 一键自动测试：
  - 地址栏：`?autotest=1` 或 `?fulltest=1`
  - 控制台：`runSolarAutoTests()`、`runSolarFullTests()`
- 关键 URL/控制台开关（`SimpleTest` 内置）：
  - 固定太阳：地址栏 `fixedsun=1`，或控制台 `setUseFixedSun(true)`
  - 季节模式：地址栏 `season=1`，或控制台 `setUseSeasonalVariation(true)`、`setObliquityDeg(x)`、`setSeasonOffsetDays(d)`
  - PIP：地址栏 `pip=1`，或控制台 `setEnablePIP(true)`
  - 调试日志：UI 勾选“调试日志”或在代码里 `logger.setEnabled(true)`（`src/utils/logger.ts`）

## 代码地图（锚点）
- 自动测试入口：
  - `src/main.tsx` 挂载 `runSolarAutoTests()`、`runSolarFullTests()` 并解析 `?autotest=1|fulltest=1`
  - 基础集：`src/astro/autoTests.ts` → `runAutoTests()`
  - 全量集：`src/astro/fullLightingAutoTest.ts` → `runFullLightingValidation()`
- 固定太阳模式：
  - 组合类型与默认值：`src/types/SimpleComposition.ts`（`useFixedSun`、`fixedSunDir`、`enablePIP`、`pip`、`useSeasonalVariation` 等）
  - 光照方向：`src/scenes/simple/utils/lightingUtils.ts` → `useLightDirection()`（固定模式直接采 `fixedSunDir`）
  - 季节性方向：`seasonalSunDirWorldYUp()`（仅改仰角，可锁定平面方位）
  - 对齐顺序（关键）：`src/SimpleTest.tsx` → `AlignOnDemand` 先“固定太阳方位 yaw”再 `alignLongitudeOnly()`
- 便捷/调试接口：`src/SimpleTest.tsx`（控制台注入 `setSceneTime`、`setUseFixedSun`、`getFixedSunDir`、`runNoTiltAutoTest`、`runFixedSunAzimuthLockTest`、`runSeasonalAutoTest` 等）

## 执行清单与验收
- M1 固定太阳（已接入，保持一致性）
  - 单光常亮；移除“按 altDeg 关灯”的分支（已处理）。
  - 旋转顺序：先 `qSun`（世界轴，仅 yaw 对齐）→ 再 `alignLongitudeOnly`（世界 +Y）。
  - 星空不在地球组；相机不挂在地球组。
  - 自动化通过：
    - `runSolarAutoTests()` 输出 `[AutoTest] Summary`
    - `runSolarFullTests()` 输出 `[FullTest] Summary` 与 `[FullTest+NoTilt:JSON]`
  - 核心断言（节选）：
    - 北极圈 66.6°N 夏至 00/06/12/18 UTC 均为白天
    - 赤道春分 06Z 东象限、18Z 西象限；12Z 仰角 > 85°
    - 夜半样例仰角 < 0；无倾斜检测 `maxTiltDeg ≤ 0.5°`
- M2 月球 PIP（α 版，进行中）
  - 模块：`SimpleTest` 内 `MoonPIP`（离屏渲染 + 贴片叠加）。
  - 配置：`composition.enablePIP`、`composition.pip{ x,y,size,resolution,fps }`
  - 验收：PIP 月相正确、位置固定；降帧与 256–512px 分辨率下主帧时无显著上升（目标 < 2ms/f）。
- M3 一致性与发布（待办）
  - legacy 场景接入 `useFixedSun` 与 PIP。
  - 测试扩展：Az/El ↔ ENU/ECEF 往返一致性（非天顶 < 0.5°）；astronomy-engine vs 本地实现差值分布（< 0.5°）。
  - README 增补“固定太阳模式/季节/PIP”的使用说明。

## 操作步骤（常用）
- 固定太阳方位锁定验证：
  - 控制台运行：`runFixedSunAzimuthLockTest()` → 输出 `[FixedSunAzTest:JSON]`，检查 `diff <= 1.0`
- 季节摆动验证：
  - 控制台运行：`runSeasonalAutoTest()` → 输出 `[SeasonalTest:JSON]`，检查夏至/冬至仰角约 ±ε（容差 3°）
- 无倾斜验证：
  - 控制台运行：`runNoTiltAutoTest(180)` → 输出 `[NoTiltTest:JSON]`，检查 `maxTiltDeg ≤ 0.5`
- 一键汇总：
  - 控制台运行：`runSolarFullTests()` → 输出整合 JSON（full + noTilt + fixedSunAz + seasonal）

## 设计约束（不要做什么）
- 不增加第二盏“月球专用光”。
- 不将相机、星空挂到地球组内。
- 不在 `useFixedSun` 模式下改动平面方位 yaw（除非明确采用季节模式且仅改变仰角）。
- 不在渲染层重新引入“按 altDeg 关灯”。

## 坐标与数学约定
- 世界坐标：Y-up；ECEF(Z-up) → World(Y-up) 映射为 `World(x,y,z)=ECEF(x,z,y)`。
- 光照方向向量统一使用“从太阳射向地球”的方向：`-sunWorld`；固定模式直接使用 `fixedSunDir`。
- 方位角 Az：0°=北、顺时针；仰角 Alt：[-90°,90°]。

## 回退与部署
- 回退开关：`composition.useFixedSun=false` 恢复“变光”模式；`composition.enablePIP=false` 关闭 PIP。
- 发布流程：功能自测 → 自动化测试（`runSolarFullTests`）→ 目视验证通过后再发布。
- 风险缓解：
  - 旋转顺序/轴系混用 → 严格先 yaw 锁定，再经度对齐，均绕世界轴。
  - PIP 性能 → 默认低分辨率/降帧，可按需调优。

## 常见问题与排查
- 现象：相机旋转地球跟着转 → 检查相机是否被挂到地球组；应保持独立于地球组。
- 现象：星空随地球转 → 检查星空父节点是否在地球组内。
- 现象：方位角漂移 → 检查 `AlignOnDemand` 中 yaw 计算顺序；确保先按固定太阳方位对齐再 `alignLongitudeOnly`。
- 现象：自动测试无输出 → 确认在 `src/main.tsx` 中已解析 URL 参数或通过控制台调用一键函数。

---

参考资料：
- 根目录：`TODO3.md`
- 设计与规划：`docs/固定太阳模式与相机极坐标方案暨后续规划.md`、`docs/自动化测试方案与结果摘要.md`
- 其它：`docs/固定太阳模式对比分析.md`、`README.md`

