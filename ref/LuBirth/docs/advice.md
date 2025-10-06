基于我对代码的彻底分析，现在我来总结需要移除的复杂系统：
�� 需要移除的复杂系统总结
�� 核心问题识别
1. 双光照系统 - 最复杂的部分
位置： src/scene/Scene.tsx 第318-356行
需要移除的变量和逻辑：
earthLightEnabled - 地球光照开关
moonSeparateLight - 月球独立光照开关
sunIE - 地球光照强度（当earthLightEnabled为false时强制为0）
sunIM - 月球光照强度（完全独立，不受地球光照影响）
lightDir - 地球光照方向计算（复杂的条件判断）
moonLightDir - 月球独立光照方向计算（更复杂的条件判断）
当前逻辑复杂度：
Apply to MIGRATION_GU...
2. 分层渲染系统 - 遍布整个文件
位置： 整个Scene.tsx文件，约30+处layer设置
需要移除的layer逻辑：
camera.layers.enable(1) 和 camera.layers.enable(2) - 相机分层
material.layers.set(1) - 地球层材质
material.layers.set(2) - 月球层材质
mesh.layers.set(1) - 地球层网格
mesh.layers.set(2) - 月球层网格
group.layers.set(1) - 地球层组
group.layers.set(2) - 月球层组
当前复杂度： 每个渲染对象都需要设置layer，约30+处layer设置代码
3. 月球烘焙系统 - 完整的子系统
位置： src/scene/Scene.tsx 第912-925行，以及MoonBaker.tsx和MoonWrapper.tsx
需要移除的组件和逻辑：
<MoonBaker> 组件 - 完整的月球烘焙器
<MoonWrapperWithPosition> 组件 - 月球包裹球定位器
<MoonWrapper> 组件 - 月球包裹球显示
bakedMoonTexture 状态管理
moonBakingEnabled 开关
moonOverlayEnabled 开关
moonRenderTargetSize 参数
onBaked 回调函数
相关文件：
src/scene/MoonBaker.tsx - 整个文件可以删除
src/scene/MoonWrapper.tsx - 整个文件可以删除
4. 复杂的参数系统 - 类型定义和状态管理
位置： src/scene/Scene.tsx 第962-1000行，以及App.tsx
需要移除的参数：
Apply to MIGRATION_GU...
5. 双光照渲染逻辑 - 材质和着色器
位置： src/scene/Scene.tsx 第738-775行
需要移除的渲染逻辑：
Apply to MIGRATION_GU...
�� 简化后的目标架构
单一光照系统
Apply to MIGRATION_GU...
统一渲染管线
移除所有layer设置
所有材质使用默认layer (0)
所有网格使用默认layer (0)
相机使用默认layer设置
简化的月球系统
移除月球烘焙器
移除月球包裹球
月球使用标准材质渲染
月球与地球使用相同的光照方向
�� 修改优先级
�� 高优先级（必须完成）
移除双光照变量和计算逻辑 - 核心简化
移除分层渲染系统 - 架构简化
移除月球烘焙系统 - 功能简化
�� 中优先级（建议完成）
简化Composition类型定义 - 类型安全
更新材质参数传递 - 功能完整性
清理App.tsx中的相关状态 - 状态管理
�� 低优先级（可选完成）
删除MoonBaker.tsx和MoonWrapper.tsx文件 - 代码清理
优化错误处理和调试信息 - 稳定性
更新文档和注释 - 可维护性