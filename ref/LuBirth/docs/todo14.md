# 出生点对齐系统重构任务清单

基于深度代码分析和架构问题诊断，按照分阶段重构计划执行系统性修复。

## 已完成任务 ✅

- [x] **分析现有相机对齐机制的问题** - 确认责任错位、应用断链、状态竞争等根本性架构问题

## 阶段A：收敛读写来源（无UI变更）

目标：统一地球姿态读取源，消除多源冲突

- [ ] **修改birthPointAlignment.ts统一从earthRoot.quaternion读取**
  - 替换当前从 `composition.earthYawDeg` 和 `__EARTH_QUAT` 读取的逻辑
  - 改为只从 `scene.getObjectByName('earthRoot').quaternion` 获取地球姿态
  - 实现相机反解：`w = rotate(p, earthRoot.quaternion)` 后计算yaw/pitch

- [ ] **删除__EARTH_QUAT和composition.earthYawDeg的姿态读取分支**
  - 清理 `SimpleTest.tsx:111` 的全局变量设置
  - 移除birthPointAlignment.ts中对全局状态的依赖
  - 屏蔽所有将这些变量用作姿态源的代码路径

- [ ] **修改AlignOnDemand确保只绕世界+Y轴旋转，不重置四元数**
  - 保留"仅绕世界 +Y 计算 deltaYaw 并 rotateOnWorldAxis"实现
  - 确保不调用 `quaternion.identity()`
  - 出生对齐模式下继续 `return` 跳过

- [ ] **验证出生对齐时无地球旋转日志，非对齐时只输出deltaYaw**
  - 确认出生对齐时不出现任何"转地球"日志，仅"相机应用"日志
  - 非出生对齐模式下AlignOnDemand只输出deltaYaw，不重置四元数

## 阶段B：Effect依赖与控制链路精简

目标：消除循环依赖，统一相机控制入口

- [ ] **精简出生对齐effect依赖数组，移除循环触发源**
  - 依赖数组仅保留：`enableBirthPointAlignment`、经纬度、`alphaDeg`
  - 移除 `earthYawDeg/dateISO/latDeg/lonDeg` 等实时更新依赖
  - 避免循环触发问题

- [ ] **统一相机控制入口，新增mode选择机制**
  - 在现有 `useCameraControl` 基础上新增 `mode` 选择：`birthpoint | manual | auto`
  - 出生对齐时相机位置/朝向只由对齐计算写入
  - 禁止同时存在"直接操作相机"的其它高频路径

- [ ] **验证相机角度不被10秒实时更新覆盖，无抖动跳回**
  - 出生对齐开启后，相机角度不被实时更新覆盖
  - 关闭后恢复原自动/手动逻辑
  - 连续60秒观察无抖动/跳回现象

## 阶段C：诊断工具与自动化回归

目标：建立质量保证机制

- [ ] **新增runBirthAlignDiagnostics()控制台命令**
  - 输入：测试集（内置样例：赤道0/90/180/-90，经纬边界80N/80S等）
  - 输出：JSON数组，包含lon/lat/alpha、earthRoot.quaternion、反解yaw/pitch、误差角
  - 打印 `[BirthAlignTest:JSON]` 便于保存回归

- [ ] **在main.tsx注入诊断命令，验证误差≤0.5°**
  - 在main.tsx注入命令，提供URL参数与控制台用法
  - 内置样例 `max(errorDeg) ≤ 0.5°`
  - 极值场景（高纬、alpha大角）`≤ 1.0°`
  - 多次运行结果一致（抖动 < 0.1°）

## 阶段D：一致性与边界用例

目标：全面验证系统稳定性

- [ ] **验证固定太阳/季节/PIP组合下的一致性表现**
  - 固定太阳模式 on/off
  - 季节性 on（仅光照变化，不写地球）
  - PIP on/off
  - 相机不挂地球组；星空不在地球组；切换场景时不丢姿态

- [ ] **增补文档与README使用说明**
  - 更新使用文档
  - 提供调试指南
  - 记录回退开关使用方法

## 顶层约束更新

- [ ] **更新CLAUDE.md添加顶层设计约束原则**
  - 太阳光固定原则
  - 地球自转原则  
  - 时区支持原则
  - 月球解耦原则
  - 纹理映射原则
  - 相机控制原则

## 验收清单

最终验收标准：
- [ ] 出生对齐下无任何地球旋转写入
- [ ] 相机角度不被实时更新覆盖
- [ ] 诊断命令 `max(errorDeg) ≤ 0.5°`
- [ ] 固定太阳/季节/PIP组合下表现一致
- [ ] 文档更新完成并与实现一致

## 风险控制

回退开关：
- `composition.enableBirthPointAlignment=false` 关闭出生对齐
- `composition.useFixedSun=false` 关闭固定太阳
- `composition.enablePIP=false` 关闭PIP

监控手段：
- 关键写入点加入带调用栈的日志
- 开发态对 `earthRoot.rotate*`、`quaternion.set` 做代理包装记录来源

---
*基于重构规划文档生成 - 预估工时：2-2.5天*