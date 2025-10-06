# 地球贴图计划实施 TODO（修订版）

## 项目概述

在不破坏 M1/M2 物理一致性的前提下，分阶段引入地表法线贴图与高光优化（优先），高度贴图置换（可选且极小幅度），并完善质量等级/LOD 与显存预算，最终形成可回退、可控的发布路径。

预期效果：从“平面贴图”提升到“立体地球”，在强光与掠射角下细节更真实，同时保证自动化测试稳定通过。

---

## 第一阶段：法线贴图 + 高光贴图优化（优先）

### 准备
- [x] 资源：2K/8K day/night/spec/normal 已具备（见 `textureLoader.ts`）。
- [x] 渲染：`Earth.tsx` 自定义 `ShaderMaterial` 可扩展；大气增强由 `AtmosphereEffects.tsx` 负责。
- [x] 回退：全部新增特性需有参数开关，默认值安全。

### 核心任务

1) 法线贴图集成（导数法 TBN，避免切线属性依赖）
- [ ] `Earth.tsx` uniforms：`earthNormal`、`useNormalMap`、`normalMapStrength`、`earthNormalFlipX/Y`。
- [ ] fragment 中基于屏幕导数重建 TBN（需 `#extension GL_OES_standard_derivatives`）：
```glsl
// vWorldPos、vNormalW、vUv 已有
vec3 dp1 = dFdx(vWorldPos);
vec3 dp2 = dFdy(vWorldPos);
vec2 duv1 = dFdx(vUv);
vec2 duv2 = dFdy(vUv);
vec3 t = normalize(dp1 * duv2.y - dp2 * duv1.y);
vec3 b = normalize(cross(vNormalW, t));
mat3 tbn = mat3(t, b, vNormalW);

vec3 nm = texture2D(normalMap, vUv).xyz * 2.0 - 1.0;
nm.xy *= vec2(flipX ? -1.0 : 1.0, flipY ? -1.0 : 1.0);
vec3 n = normalize(mix(vNormalW, tbn * nm, normalMapStrength));
```
- [ ] 与现有光照保持一致：仅替换 n 进入 Lambert/Specular，禁止任何“按仰角关灯”。

2) 高光贴图优化（仅日面生效）
- [ ] `specMap` 仅在 `ndl>0` 时参与；确认通道与 gamma；与法线后的 n 保持一致。
- [ ] 增加“铺展 + 锐高光”双项，受 `specStrength`/`broadStrength` 控制，仍与太阳强度/颜色一致。

3) 参数/默认值与 UI（SimpleTest）
- [ ] `SimpleComposition` 补充：`useNormalMap`、`normalMapStrength`、`earthNormalFlipX`、`earthNormalFlipY`；默认 `useNormalMap=true`、`normalMapStrength=0.8`、`earthNormalFlipY=true`。
- [ ] `SimpleTest` 暴露开关与滑条，支持 URL/控制台注入，便于验证与 A/B。

4) 质量/LOD（本阶段先“固定质量”，避免抖动）
- [ ] `qualityLevel: low|medium|high`（映射 2K/8K）。
- [ ] 暂不做自动切换；第二阶段加入自动 LOD 时，务必引入“滞回 + 预取 + 平滑切换”。

### 测试与验收
- [ ] 视觉：开/关法线前后对比；掠射角高光细节；无异常“亮边/黑边”。
- [ ] 性能：记录新增开销（目标 ≤ 2ms/frame 在 8K 正常场景下）。
- [ ] 显存：8K RGBA（8192x4096）约 128MB/张；day+night+spec+normal ≈ 512MB（+mipmap 约再增 30%）。低端机建议锁定 2K。
- [ ] 自动化：`runSolarAutoTests()`/`runSolarFullTests()` 比对无回归；保持 M1 固定太阳与季相断言稳定。

---

## 第二阶段：高度贴图（可选，极低强度）

目标：提供轻度地形起伏视觉暗示，不破坏云层/大气层层级关系。

### 任务
- [ ] 顶点置换：vertex 中采样 `displacementMap`，小幅位移（建议 `0–0.02·R`）。
- [ ] 同步云层半径：防止地形“穿云”；或将云层位移与地形耦合一小部分。
- [ ] 参数：`useDisplacementMap`、`displacementScale`、`displacementMid`（默认极小）。

### 测试
- [ ] 细分度评估：保持几何分段 144×144 起步；仅在高质量档提升。
- [ ] 性能与画质权衡：确认对帧时与内存影响可接受。

---

## 第三阶段：质量等级/LOD 与发布

### 质量/LOD 策略（新增细化）
- [ ] 手动质量优先：`low/medium/high` 直连 2K/8K/8K+位移。
- [ ] 自动 LOD（可选）：
  - 滞回门限：切换必须跨越“进入阈值/退出阈值”。
  - 预取与交叉淡入：后台加载下一档，完成后再无缝切换。
  - 限次策略：一定时间窗口内最多切换 N 次，防 thrash。

### 显存与格式
- [ ] 记录总显存预算；优先考虑 KTX2/BC7/BC5 压缩（如后续引入）。
- [ ] 对 sRGB/采样/各向异性做统一设置，避免平台差异。

### 文档与排查
- [ ] 更新 README：质量级别、参数说明、性能建议与常见问题。
- [ ] 故障定位：纹理路径、法线翻转、性能瓶颈检查流程。

---

## 风险与回退（更新）

技术风险
- 切线空间构建：采用导数法 TBN，避免模型切线缺失；极区 UV 变形通过法线强度限制缓解。
- 显存压力：8K×4 张 > 500MB；低端强制 2K 或降级质量。
- 着色器复杂度：严格限制分支与纹理读取次数；可按质量档裁剪。

回退策略
- 所有新参数可关闭；保留旧路径；默认值保证视觉稳定。
- 自动 LOD 可整体关闭，回退至手动质量档。

---

## 附：大气辉光“外缘无缝融合”方案（已采纳到实现计划）

现象：外层与太空背景交界有明显梯度边缘。

改进要点（针对 `AtmosphereEffects.tsx`）
- 叠加模式：保持 `transparent=true`、`depthWrite=false`、`AdditiveBlending`，两层（主层 + 近地薄壳）分开渲染。
- 外缘淡出：对主层与近壳都加入“向外半径的平滑淡出”与指数衰减，使用 `smoothstep(1-s,1,h)` 让强度在外半径处渐近 0。
- 掠射角控制：继续使用 Fresnel（视角余弦）加强边缘但配合更柔的幂次。
- 轻微抖动抗带状：在 alpha 上叠加极小蓝噪声抖动，降低 8bit 梯度条纹。
- 参数映射：将 `atmoSoftness/nearSoftness` 直接影响外缘淡出宽度；保持可调。

参考片段（主层 fragment）
```glsl
// 外缘淡出：h=0（地表）→1（外半径）
float outerSoft = mix(0.02, 0.15, clamp(mainSoftness, 0.0, 3.0) / 3.0);
float outerFade = 1.0 - smoothstep(1.0 - outerSoft, 1.0, vHeight);

// Fresnel 边缘（更柔和的幂次）
float edgeEffect = pow(vFresnel, 1.0 / max(0.6, fresnelPower));

// 指数衰减，抑制“硬边”
float heightEffect = pow(optical, mix(1.2, 0.35, clamp(mainSoftness,0.0,3.0)/3.0));

float finalIntensity = intensity * dayNightFactor * edgeEffect * heightEffect * outerFade;

// 极小屏幕噪声抖动，减少带状
float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898,78.233))) * 43758.5453);
finalIntensity = clamp(finalIntensity + (n - 0.5) * 0.002, 0.0, 1.0);
```

近地薄壳同理加入 `outerFade` 与轻微抖动，并保持 `renderOrder` 高于主层以减轻交叠痕迹。

调参建议
- 主层：`atmoIntensity 0.9–1.2`、`atmoThickness 0.05–0.08`、`atmoFresnelPower 1.2–2.0`、`atmoSoftness 0.6–1.5`。
- 近壳：`atmoNearStrength 0.6–1.0`、`atmoNearThickness 0.2–0.5`、`atmoNearSoftness 0.6–1.5`。
- 观感：在夜侧适度降低 `atmoContrast/atmoNearContrast` 以避免边缘“亮圈”。

---

## 时间规划（校准）

第一阶段（法线+高光）
- 2–3 天：实现导数法 TBN、参数与 UI、验证与性能记录。

第二阶段（置换，可选）
- 3–4 天：轻度位移 + 云层半径耦合 + 质量档约束。

第三阶段（质量/LOD 与发布）
- 1–2 天：质量档、自动 LOD（可选）、文档与回归测试。

---

## 🎯 成功标准

### 技术指标
- [ ] 法线贴图正确显示表面细节
- [ ] 高光贴图精确控制反射区域
- [ ] 性能影响 < 2ms 额外开销
- [ ] 内存使用增加 < 300MB
- [ ] 所有功能可开关控制

### 视觉指标
- [ ] 表面细节显著增强
- [ ] 光照真实感明显提升
- [ ] 高光反射更加精确
- [ ] 整体视觉质量提升 30%+

### 用户体验
- [ ] 自动质量选择工作正常
- [ ] 手动质量选择响应及时
- [ ] 低端设备仍可正常运行
- [ ] 功能开关响应迅速

---

## 📝 实施记录

### 已完成任务
- [x] 项目可行性分析
- [x] 技术架构评估
- [x] 实施计划制定

### 进行中任务
- [ ] 第一阶段实施

### 待开始任务
- [ ] 第二阶段实施
- [ ] 第三阶段实施

---

**最后更新**：2024-12-19
**负责人**：开发团队
**状态**：准备开始第一阶段实施
