您说得非常对，我之前的解释可能引起了误解。月相的计算确实应该是**完全独立**的，仅由 `currentDate` 决定，而不接受场景中主光源（我称之为“系统光”）的影响。

我们现在遇到的问题，并非是因为引入了系统光，而是**用于模拟月相的内部虚拟光照计算出了错**。

让我重新为您梳理一下：

1.  **月相如何独立工作**：您的代码设计是正确的。它通过 `useCameraLockedPhase` 标志，让月球材质**忽略**外部传入的 `sunDirWorldForShading`（系统光），而是使用一个内部根据日期计算出的、专属于月球自己的光照方向 `sdirWorld`。这个 `sdirWorld` 是一个虚拟的、只作用于月球着色器的“太阳方向”。

2.  **问题的根源**：问题就出在这个**虚拟太阳方向 `sdirWorld` 的计算上**。为了让月相看起来和真实世界中特定日期的月相一致，我们必须：
    a.  根据日期，计算出真实世界里太阳、地球、月球的相对角度。这就是 `getMoonPhase` 函数的作用。
    b.  在我们的3D场景中，根据这个角度，构建一个从正确方向“照亮”月球的虚拟光照向量。

    **您的代码在这两步都出现了偏差：**
    *   **第 (a) 步错误**：`getMoonPhase` 使用了 `phase_angle`，它只能返回 0-180 度的值，无法区分月相是正在变满（盈）还是正在变缺（亏）。
    *   **第 (b) 步错误**：`Moon.tsx` 中将角度转换为光照向量的数学公式 `(-sin(a), 0, cos(a))` 也是不正确的，它导致了“左满左”的错误效果。

### 解决方案

我们要做的是修复这个**独立的、内部的、基于日期的虚拟光照计算**，而不是引入外部光。以下是修正后的代码，注释会更清晰地解释每一步。

---

### 第 1 步：修正 `moonPhase.ts` 以获取完整的月相周期

我们需要一个能代表 0-360 度完整周期的角度。`astronomy-engine` 库中的 `elongation` 值正是我们需要的。

**文件: `moonPhase.ts` (修正版)**
```typescript
import { toUTCFromLocal } from '../../../astro/ephemeris';
import { AstroTime, Body, Illumination } from 'astronomy-engine';

export type MoonPhaseInfo = {
  illumination: number; // 0..1
  phaseAngleRad: number; // 代表完整月相周期的角度 (0-2π)，基于 elongation
};

export function getMoonPhase(localISO: string, latDeg: number, lonDeg: number): MoonPhaseInfo {
  try {
    const utc = toUTCFromLocal(localISO, lonDeg);
    const info = Illumination(Body.Moon, new AstroTime(utc));
    const illumination = Math.min(1, Math.max(0, info.phase_fraction));
    
    // [🔧 关键修复]
    // 使用 elongation (0-360度) 代替 phase_angle (0-180度)。
    // elongation 能完整描述月相周期: 0°=新月, 90°=上弦月(右半亮), 180°=满月, 270°=下弦月(左半亮)。
    // 这就是我们需要的、能区分“盈”和“亏”的独立天文数据。
    let fullCycleAngleDeg = info.elongation;
    
    // 转换为弧度
    const phaseAngleRad = (fullCycleAngleDeg * Math.PI) / 180;
    
    return { illumination, phaseAngleRad };
  } catch (err) {
    console.error('[getMoonPhase] failed:', err);
    // 默认返回上弦月
    return { illumination: 0.5, phaseAngleRad: Math.PI / 2 };
  }
}
```

### 第 2 步：修正 `Moon.tsx` 中虚拟光照方向的计算公式

现在我们拿到了正确的 `phaseAngleRad` (0 到 2π)，我们需要用正确的数学公式在 `Moon.tsx` 中生成虚拟光照方向 `sdirWorld`。

**文件: `Moon.tsx` (修正版)**

您需要修改两处完全相同的逻辑：一处在 `useMemo` 钩子中，另一处在 `useFrame` 钩子中。

**找到这两处中的旧代码块：**
```javascript
// ...
// 修复公式：-sin(a)·R + cos(a)·F
// 实现左满右：盈月左亮，满月全亮，亏月右亮
const S = new THREE.Vector3()
  .add(R.clone().multiplyScalar(-Math.sin(a)))
  .add(F.clone().multiplyScalar(Math.cos(a)))
  .normalize();
// ...
```

**将这两处都替换为以下修正后的代码块：**
```javascript
// ...
const a = phaseAngleRad; // a 是 elongation: 0≈新月, π/2≈上弦月, π≈满月, 3π/2≈下弦月

// [🔧 关键修复] 更新虚拟太阳方向的计算公式以匹配 elongation 角度。
// 新公式: -sin(a)·R - cos(a)·F
// 这个公式能正确模拟在北半球观察到的“右满左”月相光照：
// - a = 0 (新月): S ≈ -F (虚拟太阳在月球前方，我们看到暗面)
// - a = π/2 (上弦月): S ≈ -R (虚拟太阳在相机右侧，照亮月球右半边)
// - a = π (满月): S ≈ F (虚拟太阳在相机后方，照亮整个正面)
// - a = 3π/2 (下弦月): S ≈ R (虚拟太阳在相机左侧，照亮月球左半边)
const S = new THREE.Vector3()
  .add(R.clone().multiplyScalar(-Math.sin(a)))  // R分量: 控制左右光照
  .add(F.clone().multiplyScalar(-Math.cos(a)))  // F分量: 控制前后光照 (注意这里的符号已从 '+' 修正为 '-')
  .normalize();
// ...
```

### 总结

通过这两步修正：

1.  我们从天文库获取了能**完整描述月相周期**的角度 `elongation`。
2.  我们使用了**正确的数学公式**，将这个角度转换成了一个**仅用于月球自身的、独立的虚拟光照方向**。

这样，您的月球组件就能完全根据日期，正确地展示从新月到上弦月（右亮）、满月、再到下弦月（左亮）的完整、正确的月相变化，同时保持其与场景主光源完全独立。