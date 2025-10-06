# 3D 歌词改造 TODO（地月客户端特写）

> 目标：放大特写模式下，按时间轴展示歌词；每句“左右交替”布局，并在“月亮前/月亮后”切换；全程“位于地球之后”。

## 1. 数据与时间轴
- [ ] 解析 `src/constants.ts` 中的 `LRC_LYRICS` → [{ timeSec, text }]
- [ ] 建立时间驱动（复用 LocalAudioPlayer 或已有 currentTime）
- [ ] 维护 prev/current/next 三行窗口，减少渲染负担

## 2. 渲染与清晰度
- [ ] 新建 `src/components/lyrics/Lyrics3DOverlay.tsx`
  - [ ] 使用 drei `<Text />` 或现有 `Simple3DText`
  - [ ] DPR 与抗锯齿：Canvas dpr={[1,2]}；Text curveSegments/letterSpacing 参数
  - [ ] Billboard/每帧 lookAt(camera.position)

## 3. 布局与深度规则
- [ ] 输入：`camera`、`moonWorldPos`、`earthWorldDepth`
- [ ] 左右交替：行号 i 偶数左、奇数右；x = ±offsetX
- [ ] 前/后月亮：
  - [ ] “前”：深度 = moonDepth − ε
  - [ ] “后”：深度 = moonDepth + ε
- [ ] 永远在地球之后：finalDepth = max(earthDepth + δFloor, 目标深度)
- [ ] 放大特写口径：
  - [ ] 先用 `project()` 求月亮屏幕坐标；
  - [ ] 反投到世界点作为基准，再叠加左右/前后偏移；
  - [ ] 提供屏幕/世界两种布局模式开关

## 4. 动画与状态
- [ ] 进入/退出动画：淡入淡出 + 位移（react-spring 或逐帧补间）
- [ ] 当前行高亮：颜色/粗细/发光
- [ ] 仅渲染 prev/current/next；历史卸载或降透明

## 5. 参数面板（左上角）
- [ ] `offsetX`（左右距离）
- [ ] `offsetY`（基线高度）
- [ ] `deltaFrontBack`（前/后与月亮的深度差 ε）
- [ ] `earthFloorDelta`（强制在地球之后的最小裕度）
- [ ] `enterMs / exitMs`（动画时长）
- [ ] `fontSize / colorActive / colorInactive`
- [ ] `layoutMode`：screen-anchored | world-anchored

## 6. 集成与开关
- [ ] 在 `src/client/SimpleClient.tsx` 的“特写模式”挂载 Lyrics3DOverlay
- [ ] 保留开关：`composition.showLyrics`
- [ ] 与 UI 面板联动：可启用/禁用、调参数

## 7. 验收清单
- [ ] 歌词按时间轴出现、切换动画顺滑
- [ ] 左右交替与前/后月亮切换符合预期
- [ ] 全程位于地球之后，无穿模；可见性良好
- [ ] 性能稳定（仅 3 行渲染）

---

附注：
- 如需强“总可见”，可在“月后”时降低深度但仍保证 `> earthDepth + δFloor`，并适当提高 renderOrder；权衡真实遮挡与演示效果。
