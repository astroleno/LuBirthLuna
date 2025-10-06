# 地月合照（客户端特写）改造 TODO

> 目标：基于客户端特写场景，固定地球对准“上海”，隐藏原月球，并用 jade-v6 风格“双层球体”替代月球渲染，保证结构稳定、性能可控、可回退。

## 0. 准备与约定
- [ ] 所有代码改动仅在 `@src/` 与 `@public/` 内进行；`ref/**` 一律只读
- [ ] 统一别名 `@ -> ./src`（`vite.config.ts` 已配置）

## 1. 固定“上海特写”视角（进入即生效、无任何动画）
- [ ] 默认出生点即为上海：纬度 31.23，经度 121.47（初始化 composition）
- [ ] 初始化即写入最终相机与地球参数（不走对齐/放大按钮或过渡）：
  - [ ] yaw/pitch 直接计算并设置（无需过渡）：
    - yaw：`yaw = normalize((L + seam) - lonDusk)`（沿用现有实现口径）
    - pitch：`pitch = -(targetLat - obsLat)`（targetLat≈28）
  - [ ] 放大参数直接生效：`earthSize ≈ 1.68`，`cameraDistance ≈ 15`，`viewOffsetY = 0`
- [ ] 锁定相机交互（OrbitControls 关闭或限制范围）以保持理想构图

## 2. 隐藏原月球渲染
- [ ] 在主场景（`src/SimpleTest.tsx`）中将 `<Moon />` 受控隐藏（`showMoon = false` 或条件短路）
- [ ] 保留月相/光照计算逻辑（以免影响地球光照统一性）

## 3. 新增 jade-v6 双层球体作为“替代月球”
- [ ] 新建组件 `src/components/JadeMoonSphere.tsx`
  - [ ] 内层：`SphereGeometry` + 月球漫反射/法线/位移（可选）
  - [ ] 外层：`MeshPhysicalMaterial` 开启 `transmission/ior/thickness/clearcoat` 等；半径 = 内层半径 × (1 + `outerOffset`)
  - [ ] 提供参数：`innerColor/roughness/metalness/emissive...`、`outerColor/roughness/transmission/ior/thickness/clearcoat/outerOffset/...`、`environmentIntensity`、`showHdrBackground`
  - [ ] 防闪烁：`outerOffset ≈ 0.001~0.003` + 合理 `depthWrite/depthTest`
- [ ] 纹理与环境
  - [ ] 内层使用项目现有月球贴图（`public/textures/2k_moon*.{jpg}`）
  - [ ] 可选使用 HDR 环境（若缺文件则自动降级禁用）

## 4. 位置与“屏幕锚定”（对齐原月球体验）
- [ ] 复用现有“屏幕锚定”参数：`moonScreenX / moonScreenY / moonDistance`
- [ ] 在每帧计算中将 `JadeMoonSphere` 放置到相机前方对应的屏幕坐标与距离（沿用原月球 `enableScreenAnchor` 的实现口径）

## 5. 接入主场景（开场即替换）
- [ ] 在 `src/SimpleTest.tsx`：
  - [ ] 默认隐藏 `<Moon />`，直接渲染 `<JadeMoonSphere />`（开场即替换，无需开关）
  - [ ] 参数映射：与 jade-v6 相同命名优先，便于后续联动调参

## 6. 参数面板（简化：无切换动画/按钮）
- [ ] 在现有 UI 面板新增/复用参数：
  - [ ] 外层壳参数：`outerTransmission/ior/thickness/clearcoat/outerOffset/...`
  - [ ] HDR 背景开关与强度：`showHdrBackground/environmentIntensity`
  - [ ]（可选）展示但默认隐藏原 `<Moon />` 的回退开关，不做动画流程

## 7. 验证清单
- [ ] 打开客户端特写后一键视角：地球对准上海、构图稳定
- [ ] jade 月球位于预期屏幕位置；内外层视觉正常、无闪烁
- [ ] HDR 存在时折射/反射如期；禁用 HDR 时无报错
- [ ] 性能：在目标设备上帧率可接受；提供降级透明材质开关

## 8. 交付与文档
- [ ] 在 `README.md` 增加“地月合照（客户端特写）”章节
  - [ ] 使用方法、关键参数、回退方式、性能建议
- [ ] 将本 `TODO.md` 勾选完成项后随代码提交

---

附：资源与路径
- 组件：`src/vendor/jadev6/*`（已就绪，供参考参数与材质口径）
- 演示页：`src/pages/JadeV6DemoPage.tsx`（仅参考 UI 交互与参数命名）
- HDR：`public/textures/qwantani_moon_noon_puresky_1k.hdr`（缺则暂禁用 HDR）
