是的，**理论完全一致**，而且更稳：
把“展示月球”删掉，仅保留**画中画（PiP）里的真实月球**即可。主屏只渲地球与构图；月亮只由第二镜头拍、再用**圆形蒙版**叠到主屏。主镜头怎么运动都不会影响月相。

# 最小稳定工作流（无展示月球版）

1. **天文解算（世界系）**

   * `computeEphemeris(dateTime)` → `sunDirWorld`、`moonPosWorld`（或方向）。
   * 定向光固定在**世界坐标**：`directionalLight` 指向 `sunDirWorld`（绝不随构图转）。

2. **主画面构图（ShotRig）**

   * `ShotRig` 仅包含：**Earth + C\_shot**。
   * 把出生点 `(lat, lon)` → 地心单位向量 `u_obs`；目标锚点 `(80°N, 180°)` → `u_target`。
   * 四元数 `q = setFromUnitVectors(u_obs, u_target)` 施加到 `ShotRig`，完成“出生点→北极附近”的搬运；相机微调构图。
   * 这一步**不动太阳光**，昼夜正确。

3. **真实月球（仅供第二镜头）**

   * 在世界系放置 `Moon_phys` 于 `moonPosWorld`，置于**单独图层**（主镜头不可见）。
   * **潮汐锁定到地球**：令月球前向始终指向 `toEarth = normalize(EarthPos - MoonPosWorld)`（近端朝地）。
   * **相位/开口方向**：用世界系 `sunDirWorld` 与观察几何决定（可直接算 PABL，或用“太阳方向在 C\_phys 屏面投影”的角度作为绕视线轴 roll）。
   * 这保证了**不变的平行光 + 潮汐锁定**下，第二镜头看到的月相物理正确。

4. **第二镜头 C\_phys（观测者视角）**

   * 位置：`EarthCenter + u_obs * (R_earth + h)`；朝向：`lookAt(Moon_phys)`（视轴穿球心，小窗投影天然为圆）。
   * 只渲 Moon\_phys 图层；与主镜头完全解耦。

5. **画中画叠加（单渲染器·双视口）**

   * Pass A：全屏渲主画面（地球）用 `C_shot`。
   * `clearDepth()`；设置小视口/裁剪到你要的位置与尺寸。
   * Pass B：渲 Moon\_phys（`C_phys`），在片元里做**屏幕空间圆形蒙版 + 羽化**（1–2% 半径）。
   * 主/小窗共享 `toneMapping / exposure / outputColorSpace`，观感一致、实时零延迟。

6. **艺术控制（只作用于 Moon\_phys）**

   * `moonExposureEV`（EV 增益）、`moonTint + tintStrength`（色偏）、`moonTempK`（色温）、`earthshineGain`（新月地照）。
   * 在线性空间应用，进入 tone mapping 前处理；不影响地球与主画面。

7. **稳妥要点**

   * 光向量永远世界系；小窗前 `clearDepth()`；视口/裁剪按 DPR 取整；近新月时冻结 roll 或淡出；小窗分辨率 256–512 自适应。

> 总结：**删掉展示月球没问题**。画中画里的 **Moon\_phys + C\_phys** 保证“潮汐锁定 + 不变平行光”下的**真实月相**；主屏只负责地球构图。两路解耦，实时、稳。
> 下一步我给出**技术实现骨架（相机/图层/视口顺序、PABL/roll计算、蒙版片元示例与可调参数接口）**。

Tech

太好了，我们直接把“无展示月球、画中画叠加”的**技术实现骨架**给齐，照着落地即可。以下默认 three.js（TS/JS 都可），单渲染器、双相机、双视口的 PiP 方案；太阳方向固定在世界系，ShotRig 只做构图搬运。

---

# 0. 约定与层级

* 轴约定：`+Y = 地轴北极`，经度东正。
* 图层：`Layer0` 主场（地球、背景、UI）；`Layer1` 仅 Moon\_phys。
* 组：`ShotRig`（承载 Earth 与主相机 `C_shot`）；**太阳光挂在 world 根，不进 ShotRig**。

```ts
const renderer = new WebGLRenderer({ antialias: true, alpha: true });
renderer.outputColorSpace = SRGBColorSpace;
renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.autoClear = false;

const scene = new Scene();
const sunLight = new DirectionalLight(0xffffff, 1.0); // 世界系
scene.add(sunLight);
scene.add(sunLight.target);

const ShotRig = new Group(); // 构图系
scene.add(ShotRig);

const earth = makeEarthMesh(); // 你的地球材质/大气等
earth.layers.set(0);
ShotRig.add(earth);

const C_shot = new PerspectiveCamera(45, 1, 0.1, 1e9);
C_shot.layers.enable(0);
ShotRig.add(C_shot);

// 真实月球，仅供 C_phys
const moonPhys = makeMoonMesh();    // 半径/材质按需
moonPhys.layers.set(1);
scene.add(moonPhys);

const C_phys = new PerspectiveCamera(20, 1, 10, 1e9);
C_phys.layers.enable(1);
scene.add(C_phys);
```

---

# 1. 天文接口（世界系太阳方向 & 月球位置）

你可以接 Meeus/VSOP87 或自研模块，这里只给接口：

```ts
type Ephemeris = {
  sunDirWorld: Vector3;   // 世界单位向量（指向太阳）
  moonPosWorld: Vector3;  // 世界坐标（月球位置，按你场景比例）
};

function computeEphemeris(date: Date): Ephemeris {
  // TODO: 替换为真实天文解算
  return { sunDirWorld, moonPosWorld };
}
```

**应用到光：**

```ts
function applySunDir(sunDirWorld: Vector3) {
  // 方式 A：通过 target 指向
  sunLight.position.set(0, 0, 0);              // 或者太阳远距离
  sunLight.target.position.copy(sunDirWorld).multiplyScalar(1e6);
  sunLight.target.updateMatrixWorld();

  // 将同一向量传给所有需要的材质（地球/大气/月球）
  uniforms.lightDir.value.copy(sunDirWorld).normalize();
}
```

> 关键：**光只放世界系**，不在 `ShotRig` 下，这样构图怎么转都不影响昼夜/相位。

---

# 2. 出生点 → 屏幕“北极附近”构图（80°N, 180°）

把出生点搬运到屏幕球的锚点（地表 80°N, 180°）——**转 ShotRig**，不转光。

```ts
function latLonToLocalUnit(latDeg: number, lonDeg: number): Vector3 {
  const φ = THREE.MathUtils.degToRad(latDeg);
  const λ = THREE.MathUtils.degToRad(lonDeg);
  const x = Math.cos(φ) * Math.cos(λ);
  const y = Math.sin(φ);             // +Y 指向北
  const z = Math.cos(φ) * Math.sin(λ);
  return new Vector3(x, y, z).normalize();
}

// 出生点向量（地球本地坐标）
const u_obs_local    = latLonToLocalUnit(lat, lon);
// 目标锚点：80N, 180E（国际日期变更线）
const u_target_local = latLonToLocalUnit(80, 180);

// 要求：Earth 在 ShotRig 下本地旋转为零（或预先合并到 ShotRig）
const q = new Quaternion().setFromUnitVectors(u_obs_local, u_target_local);
ShotRig.quaternion.premultiply(q);

// 相机构图（例：地球占屏 1/3）
const EARTH_RADIUS = earthRadiusInSceneUnits;
const dist = EARTH_RADIUS * 3.0;  // 按你的 FOV 调整
C_shot.position.copy(u_target_local).multiplyScalar(dist);
C_shot.lookAt(earth.position);
```

> 若 Earth 在 ShotRig 下已有本地旋转，请把 `u_*_local` 先乘 Earth 的本地旋转或改用世界向量：
> `u_obs_world = earth.localToWorld(u_obs_local.clone()).sub(earth.position).normalize()`，
> 然后用世界版 setFromUnitVectors，再 `ShotRig.quaternion.premultiply(q_world)`。

---

# 3. Moon\_phys：位置 + 对地潮汐锁定（几何）+ 光照（相位）

```ts
function updateMoonPhys(ephem: Ephemeris) {
  // 位置
  moonPhys.position.copy(ephem.moonPosWorld);

  // 潮汐锁定：同一面朝地球
  const toEarth = new Vector3().subVectors(earth.position, moonPhys.position).normalize();
  const upHint  = new Vector3(0, 1, 0); // 近似用世界北作上方向（可替换月体北极向量）
  // 无滚转朝向地球
  const z = toEarth.clone();
  const x = new Vector3().crossVectors(upHint, z).normalize();
  const y = new Vector3().crossVectors(z, x).normalize();
  moonPhys.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(x, y, z));

  // 着色：统一用世界系 lightDir（ephem.sunDirWorld）
  moonPhys.material.uniforms.lightDir.value.copy(ephem.sunDirWorld).normalize();
}
```

> **相位自然正确**：明暗线由 `N·L`（`L = sunDirWorld`）决定；
> 因为 **C\_phys 放在出生点上空**（下一节），Moon\_phys 被对地潮汐锁定，第二镜头看到的就是“真实观测相位”，无需动光。

---

# 4. 第二镜头 C\_phys（观测者视角）

```ts
function placePhysCamera(lat: number, lon: number) {
  const u_obs = latLonToLocalUnit(lat, lon).applyQuaternion(ShotRig.quaternion); 
  // ↑ 若 Earth 被塞进 ShotRig 并旋转了，观测方向也要随 ShotRig 变换

  const R_e = EARTH_RADIUS;
  const h   = 200.0; // 观测高度（场景单位），几十~几百即可
  const camPos = new Vector3().copy(u_obs).multiplyScalar(R_e + h);

  C_phys.position.copy(camPos);
  C_phys.lookAt(moonPhys.position); // 视轴穿球心 → 小窗圆形稳定
  C_phys.updateMatrixWorld();
}
```

> 这样，**太阳方向不变**的前提下，`C_phys` 拍到的就是“出生点真实月相”。
> 如需极致拟真倾角（亮缘位置角 PABL）去对齐月海图案，可按“把太阳方向投影到 C\_phys 屏幕面”的方法求 roll 后绕视线轴加一个小滚转（可选）。

---

# 5. 画中画（双视口 + 圆形蒙版）

最稳顺序：**主场 → 清深度 → 小窗**。

```ts
function renderFrame(ephem: Ephemeris, pipRect: {x:number,y:number,w:number,h:number}) {
  // 主场
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, W, H);
  renderer.clear(true, true, true);
  // 主相机只看 Layer0
  C_shot.layers.set(0);
  renderer.render(scene, C_shot);

  // 小窗（只看 Moon_phys）
  renderer.clearDepth(); // 防被主场景深度遮挡
  renderer.setScissorTest(true);
  const {x,y,w,h} = pipRectIntAligned(pipRect); // 乘 DPR 并取整像素
  renderer.setViewport(x, y, w, h);
  renderer.setScissor(x, y, w, h);

  // 方案 A：直接渲 Sphere（边缘天然是圆）
  C_phys.layers.set(1);
  renderer.render(scene, C_phys);

  renderer.setScissorTest(false);
}
```

> 如果你想要**圆边羽化**，在小窗 pass 后，再画一个覆盖该视口的“屏幕空间四边形”做 alpha 羽化即可（一次 draw）。大多场景，直接渲球的圆缘 + MSAA 已够干净。

**像素对齐：**

```ts
function pipRectIntAligned(r:{x:number,y:number,w:number,h:number}) {
  const dpr = Math.min(window.devicePixelRatio, 2);
  return {
    x: Math.round(r.x * dpr),
    y: Math.round(r.y * dpr),
    w: Math.round(r.w * dpr),
    h: Math.round(r.h * dpr),
  };
}
```

---

# 6. 月亮颜色/亮度（只作用 Moon\_phys）

在线性空间做最后的“艺术控”最稳（不影响地球）。示例：自定义 `ShaderMaterial` 的末端调色：

```glsl
// 线性空间色彩
vec3 col = baseColor * max(0.0, dot(normalWS, normalize(lightDirWS)));

// EV 曝光（摄影等效）
col *= exp2(u_moonExposureEV);

// 色温（可选：黑体近似）
col *= kelvinToRGB(u_moonTempK);

// Tint
col = mix(col, col * u_moonTint, u_tintStrength);

//（可选）地照
col += u_earthshineGain * earthshineApprox(...);

outColor = vec4(col, 1.0);
```

UI 侧暴露：

* `moonExposureEV`（-4…+4）
* `moonTempK`（3500…8500K）
* `moonTint (vec3)` + `tintStrength (0…1)`
* `earthshineGain (0…0.2)`

---

# 7. 帧循环与次序

```ts
function tick(dt: number, date: Date) {
  const eph = computeEphemeris(date);
  applySunDir(eph.sunDirWorld);

  // 月球物理与相机
  moonPhys.material.uniforms.lightDir.value.copy(eph.sunDirWorld);
  moonPhys.position.copy(eph.moonPosWorld);
  tideLockToEarth(moonPhys, earth);

  placePhysCamera(lat, lon); // 出生点视角（已考虑 ShotRig 旋转）

  // 主相机构图可随用户交互微调；ShotRig 只在切换“出生点→锚点”时旋一次

  renderFrame(eph, { x: W - s - m, y: H - s - m, w: s, h: s }); // 右上小窗
  requestAnimationFrame(tick);
}
```

---

# 8. 稳妥性与边界

* **新月保护**：当 `sunDir` 在 `C_phys` 屏面投影长度 < ε（近新月），可冻结上一帧“亮缘倾角”或直接淡出（<1% 亮度肉眼几乎不可见）。
* **统一色调**：主/小窗共享 `renderer.toneMapping / exposure / outputColorSpace`。
* **清深度**：小窗前 `clearDepth()` 必做。
* **DPR 与抗锯齿**：小窗 256–512px 起步；高分屏按 DPR 放大。
* **性能**：全流程无后处理管线、无 RT，延迟最低、最稳。

---

## 你能得到什么

* **天文正确**：太阳方向世界系固定；C\_phys 在出生点视角 → 月相自动正确。
* **构图可控**：ShotRig 旋一次即可把出生点搬到 80N/180° 的屏幕锚点；主相机随意微调。
* **实时稳**：画中画同帧更新、不受主镜头影响；代码路径短、坑最少。
* **艺术可调**：月亮亮度/色温/色偏/地照全部可独立实时调节。

如果你要，我可以把上面骨架合成一个最小 demo（单文件）版本，直接拷到你的工程跑；或者把“亮缘位置角（PABL）的屏幕投影计算”也加上去用于极致对齐月海图案。
