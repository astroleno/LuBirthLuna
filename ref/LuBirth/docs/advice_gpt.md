可以，实现而且很常见：不转地球与相机，只“反推”并设置太阳（方向光）方向。核心就是把“时间与经纬度 → 太阳在世界坐标中的单位向量”，然后把方向光指向这个向量即可。

下面给你一套稳妥的实现思路（Two paths），按你工程需要二选一或混用。

方案 A：用方位角/高度角 → ENU → ECEF → World

这条路最直观，特别适合你已经能算出太阳方位角 Az（从北向东，0°=正北）与高度角 El的情况。
	1.	先在当地地平坐标系 ENU（East-North-Up）里得到太阳单位向量

	•	约定：Az 从北顺时针到东；El 为地平面以上为正。
	•	ENU 向量：
\begin{aligned}
E &= \cos El \cdot \sin Az\\
N &= \cos El \cdot \cos Az\\
U &= \sin El
\end{aligned}

	2.	ENU → ECEF（地球固连坐标）
给定观测点大地经纬度 (\varphi,\ \lambda)（北纬为正、东经为正），ENU 到 ECEF 的基向量为：
\begin{aligned}
\hat e &= \big[-\sin\lambda,\ \cos\lambda,\ 0\big]\\
\hat n &= \big[-\sin\varphi\cos\lambda,\ -\sin\varphi\sin\lambda,\ \cos\varphi\big]\\
\hat u &= \big[\cos\varphi\cos\lambda,\ \cos\varphi\sin\lambda,\ \sin\varphi\big]
\end{aligned}
则
\vec s_{ecef} = E\,\hat e + N\,\hat n + U\,\hat u
（结果已是单位向量）
	3.	ECEF → World（你的 three.js 世界坐标）

	•	若你的地球模型已按 ECEF 对齐（Z=北极，X=经度 0°/赤道交点，Y=东经 90°/赤道交点），那 \vec s_{world}=\vec s_{ecef}。
	•	若模型有额外摆放旋转，设有固定矩阵 M_{world\leftarrow ecef}，则：
\vec s_{world} = M_{world\leftarrow ecef}\ \vec s_{ecef}

	4.	设置方向光
three.js 中方向光从位置朝向 target 发射；等价地把光“来自”\vec s_{world} 方向：

dirLight.position.copy( s_world.clone().multiplyScalar(1e7) ); // 放远一些
dirLight.target.position.set(0,0,0); // 地球中心或你的目标点
dirLight.target.updateMatrixWorld();

夜晚（El<0）仍有向量，但你可根据 El 关闭阴影/降低强度。

方案 B：太阳天球向量（ECI） → GMST 旋转 → ECEF → World

这条路不依赖方位角/高度角，只用时间算太阳在惯性系的向量，更“天文学正宗”。
	1.	UTC 时间 → 儒略日 JD → 太阳在 ECI/ICRF 的单位向量 \vec s_{eci}
可用简化太阳历书（或现成库）得到太阳赤经/赤纬，或直接向量。
	2.	计算 格林尼治平恒星时 GMST（近似足够渲染）：
\theta_{\mathrm{GMST}} = 280.46061837^\circ + 360.98564736629^\circ\cdot(JD-2451545.0)\ +\ \dots
对 360^\circ 取模。
	3.	ECI → ECEF：绕 Z 轴旋转 \theta_{\mathrm{GMST}}
\vec s_{ecef} = R_z(\theta_{\mathrm{GMST}})\ \vec s_{eci}
	4.	ECEF → World 同上，最后设置方向光。

工程要点与坑
	•	坐标/角度约定：Az 的 0° 是否指北、是否顺时针；经度东西正负；全部转弧度再进三角函数。
	•	时间尺度：视觉渲染用 UTC 即可；高精度再考虑 UT1（ΔUT1）、章动/岁差。
	•	大气折射：若要贴近现实地平线附近的日出/日落，可在计算 El 后做 ~0.6° 修正；只做方向光通常可忽略。
	•	模型对齐：强烈建议把地球网格对齐到 ECEF 轴向；否则固定一个 M_{world\leftarrow ecef} 作为全局常量。
	•	夜间处理：El<0 时可把光强设为 0，或切换到环境光/星空贴图。阴影也应关闭节省性能。
	•	月相与潮汐锁定（若你后续要合成月相）：月球相位取决于太阳方向与月球-相机几何，但与本题“只调太阳方向”不冲突。

three.js 简例（走方案 A）

假设你用某库已得到 az、el（弧度），地球模型为 ECEF 对齐，观测点 lat,lon（弧度）：

function sunDirWorldFromAzEl(lat, lon, az, el) {
  // ENU components
  const E = Math.cos(el) * Math.sin(az);
  const N = Math.cos(el) * Math.cos(az);
  const U = Math.sin(el);

  // ENU basis in ECEF
  const ex = -Math.sin(lon),  ey =  Math.cos(lon),  ez = 0;
  const nx = -Math.sin(lat)*Math.cos(lon),
        ny = -Math.sin(lat)*Math.sin(lon),
        nz =  Math.cos(lat);
  const ux =  Math.cos(lat)*Math.cos(lon),
        uy =  Math.cos(lat)*Math.sin(lon),
        uz =  Math.sin(lat);

  // ENU -> ECEF
  const sx = E*ex + N*nx + U*ux;
  const sy = E*ey + N*ny + U*uy;
  const sz = E*ez + N*nz + U*uz;

  // normalize (数值稳健)
  const norm = Math.hypot(sx, sy, sz);
  return new THREE.Vector3(sx/norm, sy/norm, sz/norm);
}

// 使用
const sWorld = sunDirWorldFromAzEl(lat, lon, az, el);
dirLight.position.copy(sWorld.clone().multiplyScalar(1e7));
dirLight.target.position.set(0,0,0);
dirLight.target.updateMatrixWorld();

// 夜间处理（例如：el < 0 认为太阳在地平线下）
dirLight.intensity = (el > 0 ? 1.0 : 0.0);
dirLight.castShadow = (el > 0);

结论
	•	可以实现：保持地球与相机不动，只通过计算得到的太阳方向来设置方向光即可。
	•	给你的可落地路径有两条：
	•	已有 Az/El 就走 ENU→ECEF→World；
	•	想从时间直接推就走 ECI→(GMST)→ECEF→World。
	•	注意角度约定、坐标对齐与夜间处理，你的画面会稳定且物理一致。