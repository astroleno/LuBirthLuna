

地球状态接口 src/scenes/simple/api/earthState.ts
实现与文档一致：导出 getEarthState(localISO, latDeg, lonDeg)，返回 { sunDirEQD, moonDirEQD, illumination }。
使用 toUTCFromLocal 与 computeEphemeris，带 try-catch，失败有兜底返回，日志完整。
构图对齐接口 src/scenes/simple/api/shotRig.ts
实现与文档一致：导出 createShotRig()，返回 { rig, alignToLatLon(earth, camera, params) }。
算法为两步四元数（法线旋到 +Y，再绕 +Y 调整经线朝向 -Z），带 try-catch，日志完整。
月相接口 src/scenes/simple/api/moonPhase.ts
实现与文档一致：导出 getMoonPhase(localISO, latDeg, lonDeg)，返回 { illumination, phaseAngleRad }。
通过 computeEphemeris 的 illumination 反推相位角，边界夹紧、try-catch 与兜底返回完备。
在 UI/场景中的整合情况
src/SimpleTest.tsx
已接入 getEarthState：日期/经纬变化自动更新 sunEQD 驱动单光照；按钮“应用日期/更新光照”显式触发；都有 try-catch。
已接入 getMoonPhase：按钮“计算月相”调用并弹出结果；try-catch 保护和日志齐全。
已接入 createShotRig：AlignOnDemand 在 Canvas 内按需执行 alignToLatLon(earthRoot, camera, {80,180})，try-catch 保护、日志齐全。
说明：earthRoot 命名与查找正确，地球组存在；构图逻辑只做一次性对齐，不破坏锁定构图的交互设定。
src/scenes/simple/SimpleEarthMoonScene.tsx
组件接口支持 sunEQD/moonEQD/observerEQD，当前只使用了 sunEQD 来计算光照，未直接调用三套 API（合理：它作为“渲染层”，由上层传入天文结果）。
日志与 useEffect 调试信息存在；渲染使用的光源、材质与 UI 参数均正常。
一致性与健壮性
类型、入参与返回值：与 README.md 中“新增接口与接入指南”完全一致。
错误处理与日志：API 与调用点均有 try-catch 与 console.error，关键路径有调试输出，符合要求。
数据流：日期/经纬 → getEarthState → sunEQD → 单光照方向，链路通畅。
可选的改进建议（不影响当前正确性）
在 SimpleEarthMoonScene 中当前 props 已支持 moonEQD/observerEQD，但未使用：
可后续利用 moonEQD 做月球相位或指向（若将来材质/构图需要）。
observerEQD 可用于更真实的大气/方向性效果（根据需求决定是否接入）。
createShotRig 返回的 rig 目前未挂入场景：如未来需要统一管理相机与地球联动，可考虑将 earthRoot/相机纳入 rig，但当前一次性对齐方案已满足需求。
getEarthState 的 moonDirEQD 目前未在 UI 中使用，留待后续月球真实朝向/地照增强。
结论：三个模块接口“实现正确、类型匹配、调用到位、日志与错误处理完善”，已与当前 UI 和单光照渲染链路完成整合，可直接用于演示与调参。
我接下来可以按你的优先级，把 moonEQD 用于月球方向/相位可视化，或把 rig 结构化接入以便后续构图动画。