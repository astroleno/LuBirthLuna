# TODO7 摄像机同步与极坐标构图计划（分系统架构）

## 背景与原则
- 两套系统严格解耦：
  - 地球/Three 系统：地球组 + 真实方向光（ephemeris 驱动）+ 银河贴图。严禁把相机/月球挂入地球组。
  - 相机/月球系统：相机独立；月球潮汐锁定“面向相机”；月相以 Uniform 着色（不依赖场景光）。
- 坐标与约定：
  - 世界坐标 Y-up；相机使用极坐标 (R, λ, φ)：先经度 λ（绕世界 +Y），后纬度 φ（绕相机右轴），避免 roll。
  - 构图优先视口偏移（principal shift / setViewOffset），保证物理不变的同时可控“地球上下位置”。

## 目标产出
- 极坐标相机控制（λ/φ/R）与“对齐出生经度/纬度俯仰”。
- 构图控制（视口偏移、银河 yaw/pitch/scale）。
- 一键验证工具与回归断言。
- 文档与预设（常用取景、平滑切换）。

## 状态与接口设计
- `CameraState`：
  - `radius: number`、`azimuthDeg: number`、`elevationDeg: number`
  - `viewOffsetY?: number`（-1..+1，屏幕主点纵向偏移）
  - `smooth?: { enable: boolean; timeConstantMs: number }`
- API：
  - `setCameraPolar(state: CameraState)`：应用 R/λ/φ 并 `lookAt(地心)`，`camera.up=(0,1,0)`。
  - `alignCameraLongitude(lonDeg: number)`：仅改 λ，使“出生经度”至屏幕中央；不改变 φ/R。
  - `setCameraElevation(elevDeg: number)`：绕相机右轴改变 φ；不引入 roll。
  - `setViewOffsetY(offset01: number)`：通过 `setViewOffset`/主点偏移实现构图；resize 时重算。
  - `setMilkyWay(yawDeg, pitchDeg, scale)`：旋转天空球材质 + 经度重复（repeat.x）。

## 实施计划（里程碑）
- M1 相机极坐标与同步
  - [ ] 新增 `CameraState` 与极坐标到 position/lookAt 的转换。
  - [ ] `alignCameraLongitude(lonDeg)` 与 `setCameraElevation(φ)` 接口。
  - [ ] UI：λ/φ/R 三滑条 + “对齐出生经度”按钮。
  - [ ] 断言：切换日期/经纬无“相机小幅扭动”；相机与月球/地球系统互不干扰。
- M2 构图与视口偏移
  - [ ] `setViewOffsetY` 接入（含 resize 兼容）。
  - [ ] UI：视口偏移滑条；导出/截图尺寸固定化，取景一致。
  - [ ] 银河：yaw/pitch/scale 与 UI 联动；贴图缺失时不回退随机星空，仅记录日志。
- M3 预设与平滑
  - [ ] 预设按钮：广角/标准/特写（R、φ、偏移）与“对齐出生经度”。
  - [ ] 平滑过渡：λ/φ/R 的时间常数插值（RAF）。
  - [ ] 断言：切换预设无抖动、无 roll。
- M4 验证与文档
  - [ ] `runCameraPolarValidation()`：输出 λ/φ/R、地球中心 NDC、viewOffset JSON。
  - [ ] 文档：两套系统说明、极坐标/构图用法、银河贴图排错指南。

## 验收清单
- 相机极坐标：
  - [ ] `setCameraPolar` 可重复调用且幂等；`lookAt(地心)`，无 roll。
  - [ ] “对齐出生经度”仅影响 λ；“纬度俯仰”仅影响 φ。
- 构图：
  - [ ] 视口偏移能改变“地球上下”构图，而不改变物理光照/姿态。
  - [ ] 银河 yaw/pitch/scale 可调；贴图缺失时仅日志，无异常。
- 月球与相机：
  - [ ] 月球潮锁面向相机；月相仅左右移动（方位角），与相机运动无耦合抖动。

## 回归/自动化
- `runMoonPhaseRenderValidation(year, month)`（已存在）：核对满/新月、左右亮面。
- `runCameraPolarValidation()`（新增）：
  - 采样 λ/φ/R 与地球中心 NDC、viewOffset，输出 JSON；
  - 规则：视口偏移变化仅影响 NDC，不改变太阳角度、地球姿态。

## 风险与缓解
- 极区退化（|φ|→90°）：限制 φ 范围或在极区切换“绕世界 ±X 轴”的替代方案；UI 限幅。
- 视口偏移与不同分辨率：监听 resize 重算 `setViewOffset`；导出用固定尺寸。
- 银河贴图加载：缺失时不渲染天空球且打印日志，避免误判。

## 现状与保留策略
- 月球系统：
  - 法线贴图默认强度 0.1，normalFlipY 默认开启；位移按 (h − mid)*scale；相位耦合默认关闭。
  - 可选：血月/色温 tint、terminator 软半径。
- 地球系统：
  - 真实方向光（ephemeris）；地球/星空独立，不挂相机/月球。

## 任务分解（开发粒度）
1) 相机极坐标模块：工具函数 + React 状态 + 单元验证。
2) 对齐操作：`alignCameraLongitude` 与 `setCameraElevation`；按按钮触发，打印关键日志。
3) 视口偏移：抽象接口 + resize 处理 + 导出一致性验证。
4) 银河：组件化封装 + 日志；缺贴图时不渲染、不报错。
5) 验证脚本：`runCameraPolarValidation()`；与月相验证合并一键输出。
6) 文档：README/TODO 更新使用说明与排错。

---

备注：本计划在不改动地球/光照真实物理的前提下，实现相机极坐标与构图自由度；并与“潮汐锁定的月球 + 独立月相着色”保持系统级解耦，避免耦合抖动与坐标混用风险。
