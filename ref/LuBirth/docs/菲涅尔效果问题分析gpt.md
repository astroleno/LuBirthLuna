明白了：three.js 下你同时有体积云（raymarch）与表层云（球壳贴图），还有叠加。你遇到的核心是：镜头变焦/姿态改变后，只有一小块球体进入视野，导致“边缘菲涅尔 + 近远距淡化”的观感不稳定或不明显。下面给一套对症下药的实现方案，分体积/表层两路，同时保证两者的参数与空间度量一致，这样叠加时不会“打架”。

总体原则（两路通用）
	1.	全部在世界/视空间计算：N·V、距离、阈值都用物理尺度（与球半径 R 成比例）。不要用屏幕像素或 FOV 参与公式。
	2.	先裁后算：体积云先做“视线与球体相交”，只在可见段步进；表层云天然被光栅裁切，直接用片元世界位置算淡化。
	3.	参数一套通吃（关键）：
nearStart = k1*R, nearEnd = k2*R, farStart = k3*R, farEnd = k4*R
rimStart, rimEnd 作用在 rim = (1 - dot(N,V))^p 上。
典型值：k1=0.6, k2=0.8, k3=2.2, k4=2.6, p=3.0, F0≈0.03。
	4.	软过渡：所有淡化用 smoothstep，不要硬裁；叠加时用前向合成srcAlpha, oneMinusSrcAlpha，体积云优先写，表层云随之（或反之），避免双重变白。

⸻

A. 表层云（球壳贴图）的 three.js 实装

1) ShaderMaterial（顶点把世界坐标传给片元）

const matSurface = new THREE.ShaderMaterial({
  uniforms: {
    uCamPos:   { value: new THREE.Vector3() },
    uSphereO:  { value: sphere.position.clone() },
    uRadius:   { value: R },
    uNearStart:{ value: 0.6*R }, uNearEnd:{ value: 0.8*R },
    uFarStart: { value: 2.2*R }, uFarEnd: { value: 2.6*R },
    uRimPower: { value: 3.0 },
    uRimStart: { value: 0.15 },  uRimEnd: { value: 0.6 },
    uF0:       { value: 0.03 },
    uFresBoost:{ value: 0.35 },
    uCloudTex: { value: cloudTex }, // 你的云贴图或噪声
    uTiling:   { value: 1.0 },
    uTime:     { value: 0.0 }
  },
  transparent: true,
  depthWrite: false,
  blending: THREE.NormalBlending,
  vertexShader: `
    varying vec3 vWorldPos;
    void main(){
      vec4 wp = modelMatrix * vec4(position,1.0);
      vWorldPos = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `,
  fragmentShader: `
    uniform vec3  uCamPos, uSphereO;
    uniform float uRadius;
    uniform float uNearStart, uNearEnd, uFarStart, uFarEnd;
    uniform float uRimPower, uRimStart, uRimEnd, uF0, uFresBoost;
    uniform sampler2D uCloudTex;
    uniform float uTiling, uTime;
    varying vec3  vWorldPos;

    float saturate(float x){ return clamp(x,0.0,1.0); }

    void main(){
      vec3 P = vWorldPos;
      vec3 C = uCamPos;
      vec3 N = normalize(P - uSphereO);
      vec3 V = normalize(C - P);
      float NV = saturate(dot(N,V));

      // 贴图采样（示意：极坐标或三平面均可）
      // 这里简单用极坐标，经纬展 UV
      vec2 uv = vec2(atan(N.z, N.x)/6.2831853 + 0.5, acos(N.y)/3.1415926);
      uv *= uTiling;
      vec4 cloud = texture2D(uCloudTex, uv + vec2(0.0, uTime*0.02));
      float alphaBase = cloud.r; // 你的密度/透明来源

      // 距离淡出（近、远）
      float d = length(P - C);
      float nearFade = 1.0 - smoothstep(uNearStart, uNearEnd, d);
      float farFade  =        smoothstep(uFarStart,  uFarEnd,  d);
      float distFade = min(nearFade, farFade);

      // 轮廓透明（rim）
      float rim = pow(1.0 - NV, uRimPower);
      float rimFade = smoothstep(uRimStart, uRimEnd, rim);

      // 菲涅尔（颜色微增强，alpha 仍用淡化控制）
      float F = uF0 + (1.0 - uF0) * pow(1.0 - NV, 5.0);
      vec3  rgb = cloud.rgb;
      rgb = mix(rgb, rgb * F, uFresBoost);

      float alpha = alphaBase * distFade * (1.0 - rimFade);

      if(alpha < 1e-3) discard;
      gl_FragColor = vec4(rgb, alpha);
    }
  `
});

要点：
	•	所有阈值与 uRadius 绑定，变焦/FOV 改变不影响透明分布。
	•	rim 只用于 Alpha 衰减（1 - rimFade），颜色只做轻度 Fresnel 增强，避免过白。
	•	多层球壳可以共用这套 uniform 比例，层间视觉保持一致。

⸻

B. 体积云（raymarch）对症处理

2) 仅在可见段步进（相机射线与球体相交）

当镜头只看到球的一个小边角时，如果你还从相机位置起做“固定长度”的步进，会浪费采样并引入不稳定。应先算视线与球的交段，只在 [tEnter, tExit] 内步进。

片元级计算（屏幕空间射线）
	•	将片元的视线方向 dir（视空间或世界空间）与球体（中心 O，半径 R）求交：
	•	设 ro 为相机位置，rd 为单位方向。
	•	解二次方程：dot(rd,rd)t^2 + 2 dot(rd, ro-O)t + dot(ro-O, ro-O) - R^2 = 0
	•	若无实根：该片元不在球体前方，discard。
	•	否则 tEnter = max(roots.x, 0)，tExit = roots.y（保证 tExit > tEnter）。

片元着色器（体积）

// 统一的工具函数
bool raySphere(vec3 ro, vec3 rd, vec3 O, float R, out float t0, out float t1){
  vec3 oc = ro - O;
  float b = dot(oc, rd);
  float c = dot(oc, oc) - R*R;
  float h = b*b - c; // 因为rd已单位化，这里少了a
  if(h < 0.0) return false;
  h = sqrt(h);
  t0 = -b - h;
  t1 = -b + h;
  return true;
}

// 体积片元核心
vec4 shadeVolumetric(vec3 ro, vec3 rd, vec3 O, float R,
                     float nearStart, float nearEnd, float farStart, float farEnd,
                     float rimPower, float rimStart, float rimEnd, float F0, float fresBoost)
{
  float t0, t1;
  if(!raySphere(ro, rd, O, R, t0, t1)) discard;
  float tEnter = max(t0, 0.0);
  float tExit  = t1;
  // 只在可见段步进
  float thickness = tExit - tEnter;
  if(thickness <= 1e-4) discard;

  // 自适应步长：投影厚度越薄，步数越少
  int   MAX_STEPS = int(clamp(thickness / (0.01*R), 8.0, 64.0));
  float dt = thickness / float(MAX_STEPS);

  vec3  sumRGB = vec3(0.0);
  float sumA   = 0.0;

  // 单位法线用于 rim/Fresnel
  // 注意：体积里每个采样点的“表面法线”不可用，改用“指向球心的法线”
  for(int i=0;i<MAX_STEPS;i++){
    float t = tEnter + (float(i)+0.5)*dt;
    vec3 P = ro + rd * t;
    vec3 N = normalize(P - O);
    vec3 V = normalize(ro - P);
    float NV = clamp(dot(N,V), 0.0, 1.0);

    // 密度：用噪声/3D纹理/多频噪声，这里示意
    float density = sampleCloudDensity(P); // 0~1
    if(density <= 1e-3) continue;

    // 距离淡化（与表层同一套）
    float d = length(P - ro);
    float nearFade = 1.0 - smoothstep(nearStart, nearEnd, d);
    float farFade  =        smoothstep(farStart,  farEnd,  d);
    float distFade = min(nearFade, farFade);

    // 轮廓透明（体积里同样适用，用“指向球心”的 N）
    float rim = pow(1.0 - NV, rimPower);
    float rimFade = smoothstep(rimStart, rimEnd, rim);

    // 菲涅尔增强颜色（轻度）
    float F = F0 + (1.0 - F0) * pow(1.0 - NV, 5.0);

    vec3  col   = baseCloudColor(P) * mix(1.0, F, fresBoost);
    float alpha = density * distFade * (1.0 - rimFade) * (dt / (0.05*R));
    // 上面 dt 归一到半径尺度，稳住不同厚度时的透明度

    // 前向合成
    alpha = clamp(alpha, 0.0, 1.0);
    sumRGB += (1.0 - sumA) * col * alpha;
    sumA   += (1.0 - sumA) * alpha;

    if(sumA > 0.995) break;
  }
  return vec4(sumRGB, sumA);
}

要点：
	•	相交裁剪让你只在“可见球冠”内步进，镜头再怎么摆动也稳定。
	•	步长 dt 与厚度 thickness、半径 R 关联，避免“只剩小条时过曝/过暗”。
	•	体积里没有真实表面法线，用指向球心的法线来定义 rim 与 Fresnel，和表层保持一致的视觉趋势。

3) 深度软融合（Soft Particles）

当体积云与球面或地表相交，增加：

float sceneZ = texture2D(uDepthTex, vUv).r; // 线性化后使用
float cloudZ = computeLinearDepth(tEnter or 当前采样点);
float soft = saturate((sceneZ - cloudZ) / softRange);
alpha *= soft;

这能避免云与地物交界处的硬边。

⸻

C. 叠加的一致性与调参手册
	1.	同源参数：表层与体积共用nearStart/nearEnd/farStart/farEnd/rimPower/rimStart/rimEnd/F0/fresBoost/R。把它们放在一个单例 Uniform 块里（three.js 可手动同步）。
	2.	排序与混合：
	•	先画体积云（depthWrite=false，depthTest=true），再画表层云；
	•	或者相反，取决于你的美术目标，但统一用 NormalBlending。
	3.	边缘强化但不泛白：Fresnel 只轻度用于颜色，透明度的主导权给 rimFade。
	4.	LOD：当 thickness 小于阈值（例如 < 0.05*R），体积云可切换为一次采样近似，或直接只显示表层云，提高帧率。
	5.	抗闪烁：体积步进加入蓝噪抖动（屏幕空间或世界空间）的微扰，并配合轻度 TAA；参数轻抖可以用指数平滑。

⸻

D. three.js 侧代码要点（体积+表层联动）

// 每帧更新相机位置到两个材质
function syncCloudUniforms() {
  const camPos = camera.getWorldPosition(new THREE.Vector3());
  matSurface.uniforms.uCamPos.value.copy(camPos);
  matVolume.uniforms.uCamPos.value.copy(camPos);

  // 若球体可移动，记得同步中心与半径
  matSurface.uniforms.uSphereO.value.copy(sphere.position);
  matVolume.uniforms.uSphereO.value.copy(sphere.position);
  matSurface.uniforms.uRadius.value = R;
  matVolume.uniforms.uRadius.value = R;
}

// 渲染循环
renderer.setAnimationLoop(() => {
  syncCloudUniforms();
  // 先体积，再表层（或反之）
  renderer.render(sceneVolumetric, camera);
  renderer.render(sceneSurface, camera);
});


⸻

E. 推荐默认参数（起步即有感）
	•	k1=0.6, k2=0.8, k3=2.2, k4=2.6
	•	rimPower=3.0, rimStart=0.15, rimEnd=0.6
	•	F0=0.03, fresBoost=0.35
	•	体积步进：MAX_STEPS≈ clamp(thickness / (0.01*R), 8, 64)，softRange≈ 0.03*R

⸻

F. 常见坑位与对策
	•	FOV 变化引起“边缘忽明忽暗”：多半是阈值用了屏幕单位或贴图 mip 级切换过激。改为世界尺度阈值，并增加 smoothstep 过渡。
	•	层间冲突（表层+体积叠加处发白）：Fresnel 同时放大了颜色和 Alpha。把 Alpha 的 Fresnel 去掉，仅在颜色做轻度增强；Alpha 由 distFade*(1-rimFade) 控。
	•	“只剩小条时”体积过浓：没有按相交厚度归一。用上面 alpha *= dt / (0.05*R) 一类的归一保尺度。
	•	性能不稳：进入/离开球边缘时步数大幅变化。用 thickness 自适应步数，并设上/下限；必要时在小厚度分支做单采样近似。

⸻

如果你把现有材质里的关键变量名贴出来（或我上面的 GLSL/JS 片段替换到你的工程里），我可以直接对你的变量/宏开关/define 重写一版可粘贴的 ShaderMaterial，并给你一组测试用的最小可复现场景（体积与表层叠加、绕球旋转 + 变焦），方便你即刻比对效果。