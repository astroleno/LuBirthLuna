好的，直接给“能落地”的修正方案。核心点：把原来用 dot(N,V) 驱动的边缘透明，改成基于“可见锥体”的角距来驱动。这样不管镜头变焦/俯仰，只要相机在球外，都会得到“中心不透明、边缘透明”的稳定结果；体积云与表层云用同一套标量，叠加也不打架。

1) 先把“可见锥体 rim”算出来（统一公式）

设
	•	相机位置 C，球心 O，半径 R；
	•	屏幕上某个像素/片元对应的视线方向 rd（从相机出发，单位向量）；
	•	“可见锥体”中心方向 Dc = normalize(O - C)；
	•	“可见半角”（球在相机处张的角半径）

thetaV = asin( clamp(R / length(O - C), 0.0, 1.0) );   // [0, π/2]


	•	该像素/片元视线与 Dc 的夹角

theta = acos( clamp(dot(rd, Dc), -1.0, 1.0) );         // [0, π]



则“从球心视线到该像素的角距（归一化到球像边缘）”：

u = clamp(theta / max(thetaV, 1e-5), 0.0, 1.0);  // 0 在中心，1 在几何边缘

把 u 作为“边缘因子”，再做平滑/指数：

rimRaw  = pow(u, rimPower);                       // rimPower≈2~4
rimFade = smoothstep(rimStart, rimEnd, rimRaw);   // 例如 rimStart=0.2, rimEnd=0.85
alpha  *= (1.0 - rimFade);                        // 越靠边越透明

注意：这里完全不再用 dot(N,V) 决定“边缘”，因此相机只看见球的一角时也不会反向。

⸻

2) three.js 表层云（球壳贴图）改法

你的 ShaderMaterial 里，顶点阶段把世界坐标传下；片元阶段改为用相机→片元的视线计算 rd，用相机→球心的方向当 Dc。

片元关键替换段（GLSL）

uniform vec3  uCamPos;     // 相机世界坐标
uniform vec3  uSphereO;    // 球心
uniform float uRadius;     // 球半径
uniform float uRimPower;   // 2~4
uniform float uRimStart;   // 0.2
uniform float uRimEnd;     // 0.85

varying vec3  vWorldPos;   // 片元的世界坐标

float saturate(float x){ return clamp(x,0.0,1.0); }

void main() {
  vec3 C  = uCamPos;
  vec3 O  = uSphereO;
  vec3 P  = vWorldPos;

  // 视线方向 rd：从相机看向片元（单位向量）
  vec3 rd = normalize(P - C);

  // 可见锥体中心与半角
  vec3 Dc     = normalize(O - C);
  float dist  = length(O - C);
  float thetaV = asin( clamp(uRadius / max(dist, 1e-5), 0.0, 1.0) );

  // 当前像素的角距（归一化）
  float theta = acos( clamp(dot(rd, Dc), -1.0, 1.0) );
  float u     = clamp(theta / max(thetaV, 1e-5), 0.0, 1.0);

  // 可见锥体 rim：中心0，边缘1
  float rimRaw  = pow(u, uRimPower);
  float rimFade = smoothstep(uRimStart, uRimEnd, rimRaw);

  // ……你的云密度/颜色……
  // alphaBase = 由贴图/噪声得到

  // 距离淡入淡出（可保留你已有 near/far 渐变）
  // float distFade = …

  float alpha = alphaBase * (1.0 - rimFade) /* * distFade */;

  if(alpha < 1e-3) discard;
  gl_FragColor = vec4(rgb, alpha);
}

提示
	•	颜色上的菲涅尔（Schlick）可以保留，但不要再把 dot(N,V) 当作“透明度边缘”的主驱动；透明度边缘改用上面 rimFade。
	•	仍建议保留近/远距离淡化 distFade（与半径成比例），这样拉近/拉远也更稳。

⸻

3) 体积云（raymarch）改法

你的体积着色器里，原本每个采样点常用 N=normalize(P-O) 与 V 去做 dot(N,V)。改为对每个像素统一用视线 rd 与 Dc 做角距；不用每步重算。仍然只在球体相交段 [tEnter, tExit] 步进。

像素级、步进前先算好

// 已有：相机 ro=C，像素视线 rd（单位），球 O、R
float t0, t1;
if(!raySphere(ro, rd, O, R, t0, t1)) discard;
float tEnter = max(t0, 0.0), tExit = t1;
float thickness = tExit - tEnter;

// 可见锥体 rim 因子（与该像素无关的采样点共用）
vec3 Dc     = normalize(O - ro);
float dist  = length(O - ro);
float thetaV = asin( clamp(R / max(dist, 1e-5), 0.0, 1.0) );
float theta  = acos( clamp(dot(rd, Dc), -1.0, 1.0) );
float u_rim  = clamp(theta / max(thetaV, 1e-5), 0.0, 1.0);

// 预先得到透明度边缘淡出
float rimRaw  = pow(u_rim, uRimPower);
float rimFade = smoothstep(uRimStart, uRimEnd, rimRaw);

步进循环里用 rimFade 直接衰减 alpha

vec3  sumRGB = vec3(0.0);
float sumA   = 0.0;

int   MAX_STEPS = int(clamp(thickness / (0.01*R), 8.0, 64.0));
float dt = thickness / float(MAX_STEPS);

for(int i=0;i<MAX_STEPS;i++){
  float t = tEnter + (float(i)+0.5)*dt;
  vec3 P = ro + rd * t;

  float density = sampleCloudDensity(P); // 0~1
  if(density <= 1e-3) continue;

  // 近/远距离淡化（保留、与R关联）
  float d = length(P - ro);
  float nearFade = 1.0 - smoothstep(nearStart, nearEnd, d);
  float farFade  =        smoothstep(farStart,  farEnd,  d);
  float distFade = min(nearFade, farFade);

  float alpha = density * (1.0 - rimFade) * distFade * (dt / (0.05*R));
  alpha = clamp(alpha, 0.0, 1.0);

  vec3 col = baseCloudColor(P);
  sumRGB += (1.0 - sumA) * col * alpha;
  sumA   += (1.0 - sumA) * alpha;
  if(sumA > 0.995) break;
}

return vec4(sumRGB, sumA);

这样体积云与表层云在“只看到一小块时”的边缘判断是一致的：都以像素视线的角距为准，而不是 N·V。

⸻

4) 参数建议与调参顺序
	1.	先只开“可见锥体 rim”，关闭其它影响透明的项（噪声阈值、阴影、Mie/Rayleigh、Bloom）。
	2.	设定：rimPower=3.0，rimStart=0.2，rimEnd=0.85。
	3.	确认无论缩放/俯仰，都得到“中心不透明、边缘透明”的趋势；再逐步恢复近/远距离淡化与颜色菲涅尔加强。
	4.	近/远距离阈值用物理尺度：
	•	nearStart=0.6R, nearEnd=0.8R, farStart=2.2R, farEnd=2.6R 起步即可。
	5.	若球像极小（远处）或极大（近处），可针对 thetaV 做轻微压缩：
thetaV *= 0.98 之类，避免数值边界带来的“过早/过迟”透明。

⸻

5) 常见坑的对治
	•	反向透明仍出现：确认用于 rim 的向量是 rd 与 Dc，而不是 N 或 V。很多项目里误把 normalize(C-P) 当 rd 用，方向反了会反相。
	•	变焦时边缘抖：保证 thetaV 用 asin(R/dist)，不要硬估投影半径；所有过渡用 smoothstep。
	•	体积与表层叠加发白：颜色的菲涅尔增强与透明的 rim 同时放大。把透明只交给 rim，颜色的 Schlick 仅轻度增强（fresBoost<=0.35）。
	•	只剩极薄一条时过密：体积透明记得乘 (dt / (0.05*R)) 之类的厚度归一，并对 MAX_STEPS 做上下限与抖动。

⸻

6) 接下来怎么落到你项目里
	•	我上面给的是“替换段”，不改你工程结构；把所有用 dot(N,V) 决定“边缘透明”的地方，统一换成“可见锥体 rim”的计算。
	•	两路（体积/表层）共用 uSphereO、uRadius、uCamPos、uRimPower、uRimStart、uRimEnd 等 uniform，避免叠加不一致。
	•	如果你方便贴出当前表层/体积 shader 的关键片段（uniform 名、获取 rd 的方式），我可以直接按你的命名改成可粘贴版本。

按这个改完，放大/俯仰之后，“只见一小块”的场景会稳定地中心更实、边缘更透，不会再出现“近处透明、远处不透明”的反向效应。