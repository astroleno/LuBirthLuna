# TODO8 — 月球不使用 PIP 的屏幕锚定与内部着色方案（LuBirth）

面向“固定屏幕位置展示月相（含潮汐锁定面）+ 镜头可绕地球旋转 + 月球独立内部着色（不吃场景光）”的最短路径实施清单与约束。目标是在不走 PIP 的情况下保持细节与性能稳定。

## 目标与范围
- 屏幕锚定：月球固定在屏幕坐标 `(x=0.5, y=0.75)`，深度可配置。
- 内部着色：月球仅使用自身 Shader 计算朗伯光照与相位，不接受 three.js 场景光。
- 潮汐锁定：贴图经度 `-90°` 为真实潮锁基准（近地点面朝地球），与坐标系统一。
- 镜头自由：相机可绕地球旋转，月相与潮锁呈现不随相机轨道而漂移或镜像。
- 无 PIP：同一画布直渲染月球，避免离屏分辨率损失与带宽开销。

## 坐标与符号约定（统一基线）
- 世界系（World）：Y-up，ECEF(Z-up) → World(Y-up) 映射为 `World(x,y,z)=ECEF(x,z,y)`，右手系。
- 月球局部系（L，用于相位/潮锁/着色，不随相机）：
  - `Z_L = normalize(Earth_world − Moon_world)`（Moon→Earth，正对近地点面）。
  - 取参考上方向 `U_ref`：将 `World +Y` 投影到月盘切平面（与 `Z_L` 正交）。退化时回退 ENU.Up 或 Camera.Up，确保稳定。
  - `R_L = normalize(cross(Z_L, U_ref))`（右向），`U_L = cross(R_L, Z_L)`，保持右手系。
- 光向量语义：统一使用“点到光”方向 `S_world = normalize(Sun_world − Moon_world)`；Lambert 点乘使用 `dot(n, S)`，避免左右镜像。
- 贴图经度 `-90°`：作为 L→纹理空间的固定偏移（非相机驱动）。潮锁/相位始终以 L 系为准。
- 视觉语义“左满右”：当投影到屏幕时，盈月右亮、亏月左亮。保证方法：`R_L` 投影到屏幕指向右，同时采用“点到光”。

## 渲染与叠加（无 PIP）
- 直渲染：使用同一 Canvas 绘制月球；通过 NDC 反投影，将月球放置到 `(0.5,0.75)` 射线上的指定距离。
- 前置叠加：月球 Mesh 设置 `renderOrder` 高于地球；`depthTest=false`、`depthWrite=false`，确保不被主场景遮挡（如需地球遮挡，另见“遮挡处理”）。
- 几何面向：可 billboard（面向相机）以保证月盘正对屏幕，但“相位/潮锁/贴图取向”仅由 L 系与 `S_world` 决定，不读取相机基向量。

## 实施步骤（Actionable）
1) 统一月球物理向量与 L 系（Moon.tsx）
- 构建 `Z_L / R_L / U_L`：以 Moon/Earth/Sun 三者关系与 `World +Y` 投影为准。
- 光向量改为“点到光” `S_world = Sun − Moon`，并在着色器中使用 `dot(n, S)`。
- 取消“相机锁相位”为默认路径；提供开关，仅用于调试对照。
- 贴图经纬度：将 `lon=-90°` 作为 L→纹理固定偏移；不要由相机/相位逻辑修改贴图零经线。

2) 屏幕锚定与渲染顺序（SimpleTest.tsx / positionUtils）
- 按 NDC `(0.5,0.75)` 反投影生成世界位置；深度由配置 `composition.moonDistance` 控制。
- 设置 `renderOrder`、`depthTest=false`、`depthWrite=false`，确保覆盖显示。
- 保持月球“不吃场景光”，仅依赖 Shader uniform 的 `S_world` 与 L 系。

3) 潮汐锁定四元数（Moon.tsx）
- 基础对齐：使月球局部 `+Z` 朝向 `Z_L`（Moon→Earth），而非相机。
- 贴图修正：在此基础上串联 `lon=-90°` 与 `lat` 微调。相机轨道不改变潮锁面。

4) 控制与配置（SimpleTest UI）
- 暴露开关：`moonUseCameraLockedPhase`（默认 false）、`moonUrefMode`（`worldY` / `enuUp` / `cameraUp`）。
- 只读输出：当前 `phaseAngleDeg`、`lightingSide`、`Z_L/R_L/U_L` 简要向量，用于调试。

5) 诊断与日志
- 在 `debug=1` 下输出：
  - `Z_L/R_L/U_L` 正交性与与 `+Y` 投影角度。
  - `S_world` 与亮暗界推断（left/right/front/back）。
  - 可选输出“L→纹理”的经纬度映射检查（验证 `-90°` 偏移）。

6) 验收与自动化
- 轨道不变性：相机绕地球 360°，月盘位置不动、亮侧不换边（仅倾角随季节/纬度合理变化）。
- 月相序列：按日推进，满足“右盈→满→左亏”；日志 `lightingSide` 与期望一致。
- 渲染一致性：相对 PIP 方案，无分辨率/锐度损失；边缘抗锯齿符合主画面 dpr。
- 自动测试：
  - 复用 `runMoonPhaseRenderValidation(y,m)`；新增“MoonLightingHandednessTest”：取 `phase≈90°/270°`，断言 `right/left`。
  - 输出 JSON：`[MoonNoPIP:JSON]`，记录 `when, phaseAngleDeg, side, Z_L, U_refMode`。

7) 遮挡处理（可选）
- 若需地球遮挡月球：
  - 方案A：读取主场景深度贴图，在月球片元中比较深度并 discard（增加一次深度采样）。
  - 方案B：双相机同画布叠加：主相机渲地球，叠加相机只渲月球并共享深度（不开启清深度），在排序上保证月球后绘制、照样不吃场景光。

8) 性能与质量
- 直渲染避免 RTT；按需开启各向异性、正确设置法线贴图色彩空间。
- dpr 与抗锯齿跟随主画面设置，保障细节。

## 代码锚点
- `src/scenes/simple/api/components/Moon.tsx`（L 系构建、潮锁、内部 Shader 光照）
- `src/SimpleTest.tsx`（屏幕锚定、渲染顺序、UI 开关与日志）
- `src/scenes/simple/utils/positionUtils.ts`（NDC 反投影辅助）
- `src/types/SimpleComposition.ts`（默认项与开关：`moonUseCameraLockedPhase` 默认 false、新增 `moonUrefMode`）
- `src/astro/ephemeris.ts`（`Sun_world`/`Moon_world` 向量来源，保持“点到光/点到地”一致）

## 约束与不做什么
- 不使用 PIP/离屏渲染；不接入 three 场景光。
- 不将相机、星空、月球挂在地球组内。
- 不以相机基向量驱动贴图零经线与潮锁面方向（仅用于 billboarding）。

## 回退与切换
- 回退开关：保留旧 PIP 路径的 Feature Flag（默认关闭）。如需回退，启用 PIP 并禁用直渲染叠加。
- 风险缓解：当 `Z_L` 与 `U_ref` 近共线时自动切换 `U_ref` 源（`worldY`→`enuUp`→`cameraUp`），避免“上方向”抖动。

## 里程碑（建议）
- M1（坐标与渲染）：完成 L 系与“点到光”统一，直渲染叠加、潮锁与贴图 -90° 串联，默认关闭相机锁相位。
- M2（验证与细化）：补充 Handedness 测试与 JSON 输出；完善 `U_ref` 策略与极端角度稳定化。
- M3（遮挡&收尾，可选）：若有遮挡需求接入深度比较；完善 README/指南，记录使用方法与切换策略。

---
参考：`TODO3.md`、`src/SimpleTest.tsx`、`src/scenes/simple/api/components/Moon.tsx`、`src/astro/ephemeris.ts`。
