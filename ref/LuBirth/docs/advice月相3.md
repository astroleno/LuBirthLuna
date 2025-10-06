目的与范围

- 确保“潮汐锁定”外观正确（同一面朝向地球），同时月相（明暗比例与开口朝向）在指定日期/时间准确。
- 满足现有约束：单一太阳光、不把相机/星空挂地球组、固定太阳模式不改 yaw（除季节仰角）。

核心概念

- 月相由太阳向量与月球向量的夹角决定，和地球自转无关。
- 潮汐锁定表现为：月球局部坐标的“前向”（指向近地点面的法线）始终朝向地球中心。
- PIP 用独立小相机离屏渲染，仅对准月球方向，叠加到屏幕固定位置。

坐标与向量约定

- 世界坐标：Y-up；ECEF(Z-up) → World(Y-up): World(x,y,z)=ECEF(x,z,y)。
- 光照方向统一为“从太阳射向地球”的方向：L(t) = -S(t)。
- 月球方向向量取“地心指向月心”的单位向量：M(t)。

月相计算（与渲染）

- 相位角：alpha = acos( dot(L, M) )。
- 亮面比例：k = (1 + cos(alpha)) / 2（用于数值校验; 实际渲染由方向光+朗伯即可呈现）。
- 渲染层不需要“按 altDeg 关灯”；单一方向光常亮即可得到正确月相明暗边界。

潮汐锁定的姿态定义

- 目标：让月球局部 +Z（或定义的“前向”）指向地球。
- 基础对齐（必做）：
    - z_axis = normalize(-M)（从月心看向地心）。
    - x_axis = normalize(cross(WorldUp, z_axis))（若与 z 平行需选备用 up）。
    - y_axis = cross(z_axis, x_axis)。
    - 月球姿态四元数由上述正交基构造，即可实现“永远同一面朝地球”的外观。
- 北向对齐（可选增强，用于减少月面滚转不稳定）：
    - 选一条稳定参考作为“月球北”的投影方向做轴向微调（roll），如 IAU 月球自转轴方向或其在世界坐标上的投影。
    - α 版可先锁 up = World +Y，PIP 更稳；后续 Beta 用 IAU 极轴提高真实感。

PIP 相机规范

- 独立节点，不挂主相机、不挂地球组。
- 位置与朝向：
    - pipPos = -M(t) * d（d 为合适观测距离），lookAt(moonCenter, up=World +Y)。
    - 或放在 moonPos + normalize(moonPos - mainCamPos)*d，只要 lookAt(moonCenter) 即可，关键是视线与 L、M 的相对
关系。
- 叠加：离屏渲染到纹理，按 composition.pip{x,y,size,resolution,fps} 叠加。

实现路线

- 路线 A（α：PIP 独立几何，低风险/高性价比）
    - PIP 离屏场景放一个“仅供 PIP 使用”的月球球体在原点。
    - 使用主场景的方向光向量 L(t)（不新增灯），PIP 相机按上节规则对准原点。
    - 月相立即正确；是否实现潮汐锁定在 PIP 场景中用“z 朝向地球”的构造即可。
    - 主场景可暂不移动“真实月球”，物理一致性延后到路线 B。
- 路线 B（Beta：主场景几何与 PIP 一致，完整外观）
    - 在主场景用 M(t) 放置月球位置与姿态：
    - 位置：`moonPos = EarthPos + M(t) * R_moon`（R_moon 可简化为平均地月距离；如不做远近变化可固定）。
    - 姿态：用“潮汐锁定基础对齐”四元数；可在此基础上加入 IAU 极轴 roll。
- PIP 复用同一 M(t) 与 L(t)；主画面与 PIP 在任意时刻的相位、开口、可见面一致。
- 路线 C（Plus：进阶真实感，按需）
    - 顶点：使用 astronomy-engine 获取地心/观测者拓扑的 S(t)、M(t) 与月球自转极轴（RA/Dec/W）参数，加入近地点远地点
与章动/岁差近似，呈现视-纬/视-经 libration 与 parallactic angle。
    - PIP 叠加阶段可应用“亮缘位置角”对纹理做小幅旋转，匹配视觉滚转。

数据流与代码锚点

- 向量服务（新增接口约定）：
    - getSunDirWorld(t): Vec3 → L(t) = -S(t)（World Y-up）
    - getMoonDirWorld(t): Vec3 → M(t)（World Y-up）
- 使用点：
    - 光照：src/scenes/simple/utils/lightingUtils.ts 的 useLightDirection() 取 L(t)；固定太阳模式则取 fixedSunDir。
    - PIP：SimpleTest 内 MoonPIP 使用 L(t) 与 M(t) 做相机与姿态。
    - 旋转顺序：src/SimpleTest.tsx → AlignOnDemand 仍保持“先 yaw 锁定太阳方位，再 alignLongitudeOnly()”，不因 PIP
改动。
- 组合参数：src/types/SimpleComposition.ts 中保留 enablePIP、pip{...}、useFixedSun 与季节相关开关。

验收与自动化

- 月相关：
    - 新月/上弦/满月/下弦样例：检查 k 接近 0/0.5/1/0.5（容差 ±0.05），开口朝向合理。
    - 经度/时区变化：同一 UTC 时间，k 不变；仅开口“朝向”与地平坐标相关（若未实现 parallactic angle，PIP up 锁定则开
口相对屏幕稳定）。
- 潮汐锁定：
    - 视线变动时，近地点面始终朝地球：从主相机绕月球转动，地球方向的月面纹理不“转走”（PIP 或主场景检视）。
    - 自动测试接口建议：
    - `runMoonPhaseSanityTest(dates[])` → 输出 `[MoonPhaseTest:JSON]`，校验 `k` 与 alpha 一致性，`maxErrDeg <=
3°`（近似）或 `<=0.5°`（ephemeris）。
    - `runMoonTidalLockTest(n)` → 随机相机路径验证“sub-Earth 向量与月球局部 +Z”夹角 ≤ 1°。
- 集成到现有一键：在 runSolarFullTests() 后输出月相与潮汐锁定校验摘要，不影响现有太阳测试。

性能与稳健性

- PIP：256–512px，15–30 fps；目标 < 2ms/f（不额外开灯、不投影）。
- 抖动抑制：对 M(t) 与 L(t) 插值/平滑（如样条/指数平滑），PIP 相机加轻微阻尼。
- 危险操作避免：不新增月球专用光；不把相机/星空挂地球组；固定太阳模式不改 yaw。

故障与排查

- 月相开口不对：检查 L(t) 与 M(t)是否同一坐标系（Y-up 映射）、未误用 S(t)。
- 相位随经度变：误用地平坐标驱动相位；应始终用地心向量。
- “同一面”不成立：潮汐锁定构造未用 z_axis = -M，或 roll 干扰了前向。
- PIP 跟主相机转：相机层级错误或错误绑定主相机姿态。

回退与开关

- 关闭 PIP：composition.enablePIP = false。
- 回到变光模式：composition.useFixedSun=false。
- 仅验证太阳：沿用既有 runSolarAutoTests()、runSolarFullTests()。

推荐路线总结

- 现在实施：路线 A（α）— PIP 独立几何 + 正确月相 + 基础潮汐锁定（z 轴指地球），不改主场景结构，快速稳妥可验收。
- 下一个里程碑：路线 B（Beta）— 主场景月球按 M(t) 放置与潮汐锁定；PIP 与主场景一致；在自动化中加入月相与锁定测试。
- 可选提升：路线 C（Plus）— astronomy-engine 精确方向与月面滚转/章动；PIP 亮缘位置角旋转；将阈值收紧至 0.5°。