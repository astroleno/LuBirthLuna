# TODO3 — 固定太阳模式落地与部署计划（2025-09）

参考文档：
- 根目录：《固定太阳模式对比分析.md》
- docs：《固定太阳模式与相机极坐标方案暨后续规划.md》

目标：
- 以“固定太阳方向 + 旋转地球”的稳定方案替代“每帧变光”，相机绑定地心极坐标；后续以 PIP 方式固定月球在屏幕位置。

里程碑：
- M1（今日）：useFixedSun 核心落地，单光常亮；自动测试通过。
- M2（+2 天）：PIP α 版完成（小相机 + FBO + 屏幕叠加 + 配置）。
- M3（+1–2 天）：legacy 场景接入、自动测试完善、文档与示例。

任务清单（完成后请打勾销项）：

-## M1：固定太阳模式（核心）
- [x] 在 `SimpleTest` 引入 `composition.useFixedSun`（默认 true）、`composition.fixedSunDir`（默认 `[-1,0,0]`）
- [x] 统一为“单一方向光常亮”（不再按 `altDeg` 关灯）；移除“月球专用光”及相关代码
- [x] 实现 `qSun = setFromUnitVectors(-sunWorld, fixedSunDir)`，`earthRoot.quaternion.premultiply(qSun)`（绕世界轴）
- [x] 调整对齐顺序：先 `qSun`，后 `alignLongitudeOnly`（经度对齐依旧绕世界 +Y）
- [x] 确认星空不在地球组下，避免随地球旋转
- [x] 自动化测试跑通（`?autotest=1` 或 `runSolarAutoTests()`）：极昼/东西象限/春分近天顶/南北对称/午夜负仰角
- [x] 更新文档：新增《docs/自动化测试方案与结果摘要.md》，并固化一键测试入口（window.runSolarAutoTests）

验收标准（M1）：
- [x] 北极圈 66.6°N 夏至 00/06/12/18 UTC 均为白天
- [x] 赤道春分 06Z 在东象限、18Z 在西象限（正午方位角可不判）
- [x] 赤道春分 12Z 仰角 > 85°
- [x] 南半球选定经度的当地午夜仰角 < 0
- [x] 相机任意旋转下，地球构图稳定（相机不随地球转）

- [x] 集成无倾斜检测：`runNoTiltAutoTest()` 纳入 `runSolarFullTests()` 汇总（打印 [FullTest+NoTilt:JSON]）

## M2：月相联动 + PIP（α 版）

M2a：月相联动与自动测试（先做）
- [x] 月相联动：PIP 与主场景共用 `lightDirection`（随时间/季节联动），保证相位一致
- [x] 自动测试：新增 `runMoonPhaseAutoTests()` 验证新月/上弦/月圆/下弦（±1–2 天容差）与 `illumination/phaseAngle` 一致性（已通过 6/6）
- [x] 集成：将 `moonPhase` 测试结果合入 `runSolarFullTests()` 的 JSON 汇总（键名 `moonPhase`）；并挂载 `window.runMoonPhaseAutoTests`

M2b：分层 + 副相机 + 画中画（α 实装）
- [x] 图层准备：启用 PIP 时主相机仅看 layer=0；将真实月球切到 layer=2；方向光覆盖 layer 0/2（SimpleTest 已接线）
- [ ] 层与副相机：新增 PIP 相机仅渲染 layer=2 至 FBO（256–512px，可调，降帧可选）
- [ ] 屏幕叠加：圆形裁剪 + 可选描边/阴影；`toneMapped=false`、`depthTest=false`、高 `renderOrder`，放置稳定
- [ ] UI 联动：在面板暴露 `composition.pip{ x,y,size,resolution,fps }`（仅影响 PIP）
- [ ] 相机模式（可选）：`pip.camera` 支持 `observer` 与 `fixed` 两模式（α 版可先固定一种）
- [ ] 性能测试：新增 PIP 渲染耗时采样与阈值校验（目标 < 2ms/f @ 256–512px，30fps）

验收标准（M2）：
- [ ] PIP 月相与主场景一致，随时间/季节正确变化；位置/大小受 UI 控制且仅影响 PIP
- [ ] 主相机旋转/缩放不影响 PIP；主画面无“第二个月球”（图层屏蔽或不可见）
- [ ] 在降帧（30fps）与 256–512px 分辨率下，主渲染帧时无显著上升（PIP 平均 < 2ms/f）

## M3：一致性与发布
- [ ] legacy 场景接入 `useFixedSun` 与 PIP，保持功能一致
- [ ] 自动测试扩展：
  - [ ] Az/El ↔ ENU/ECEF 往返一致性（非天顶 < 0.5°）
  - [ ] astronomy-engine vs 本地实现差值分布（< 0.5°）
- [ ] 完整文档与示例，README 增补“固定太阳模式”说明

部署与回退计划：
- 发布策略：先开 `useFixedSun` 为默认，保留 `useFixedSun=false` 回退路径；PIP 默认为关闭（配置开启）。
- 回退机制：出现异常可一键关闭 `useFixedSun` 恢复旧的“变光”模式；PIP 出现异常默认不影响主画面。
- 验收流程：功能自测 + 自动化测试 + 目视验证三项均通过方可发布。

风险与缓解：
- 旋转顺序/轴系混用风险：统一“先 qSun 再经度对齐”，两者都绕世界轴；相机不挂地球组。
- PIP 性能风险：默认低分辨率/降帧，可在配置中调优。
- 交互冲突：对齐、相机控制、PIP 都在独立模块；通过开关/层隔离。

备注：
- 每完成一个勾选项，请在本文件对应条目前打勾并提交；保持文档和实现同步。

---

进度快照（保存阶段） — 2025-09-05

- 固定太阳模式（M1）
  - 已启用并默认可用；对齐顺序为“先太阳方位仅绕 Y 偏航、再经度对齐（绕 Y）”，无倾斜约束已验证。
  - useLightDirection 在固定模式下直接采用 `fixedSunDir`，不再随 ephemeris 方位旋转。
  - 自动化：`runSolarFullTests()` 汇总包含基础光照校验、无倾斜、固定方位锁定、向量一致性。

- 季节模式（接入到固定太阳）
  - 将季节摆动转嫁到太阳方向：`δ = ε · cos(2π · ((doy − 172) + seasonOffset)/365.2422)`。
  - 方位角锁定：基于当前 `fixedSunDir` 计算 yaw，仅改变仰角，不改变平面方位角。
  - UI：新增季节模式开关与“黄赤交角(°)/季节偏移(天)”输入；亦可通过 URL（`season=1`）或控制台函数设置。

- 画中画 PIP（α版）
  - 实装：小相机离屏 + 圆形贴片叠加；锁定到相机右上角；移除对 `useFrame` 的依赖，改用 RAF 循环渲染。
  - 当前为占位球体（简材质），后续接入真实月相/贴图与样式（描边/圆角/分辨率/降帧）。

- 测试脚本（控制台/URL）
  - 基础集：`?autotest=1` / `runSolarAutoTests()`。
  - 全量集：`?fulltest=1` / `runSolarFullTests()`（包含 `summary/noTilt/fixedSunAz/seasonal`）。
  - 单项：`runNoTiltAutoTest(frames)`、`runFixedSunAzimuthLockTest()`、`runSeasonalAutoTest()`。

- 已知与待办（保持不变，下一阶段处理）
  - PIP：接入真实月相/贴图，增加位置/尺寸/分辨率/降帧 UI；性能采样与阈值校验。
  - 相机极坐标：按 M3 规划在固定太阳模式稳定后实施。
  - 文档：在发布前汇总 README 中的固定太阳/季节/PIP 使用说明。

注：本快照用于保存当前阶段状态，不改变既有勾选项；后续销项按 M2/M3 推进。
