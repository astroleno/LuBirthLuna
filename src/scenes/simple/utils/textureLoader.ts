import React from 'react';
import * as THREE from 'three';

// 可选贴图加载器 - 直接移植自原Scene.tsx
export function useOptionalTexture(path?: string, enabled?: boolean) {
  const [tex, setTex] = React.useState<THREE.Texture | null>(null);
  
  React.useEffect(() => {
    if (!enabled || !path) { 
      setTex(null); 
      return; 
    }
    
    let canceled = false;
    const loader = new THREE.TextureLoader();
    
    loader.load(
      path,
      (t) => {
        if (canceled) return;
        t.colorSpace = THREE.SRGBColorSpace;
        t.wrapS = THREE.RepeatWrapping;
        t.wrapT = THREE.ClampToEdgeWrapping;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        t.magFilter = THREE.LinearFilter;
        t.anisotropy = 8;
        setTex(t);
      },
      undefined,
      () => { 
        if (!canceled) setTex(null); 
      }
    );
    
    return () => { 
      canceled = true; 
    };
  }, [path, enabled]);
  
  return tex;
}

// 首选可用贴图加载器 - 改进版，增加错误处理和重试机制
export function useFirstAvailableTexture(paths: string[], enabled?: boolean) {
  const [tex, setTex] = React.useState<THREE.Texture | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    if (!enabled) { 
      setTex(null); 
      setError(null);
      setLoading(false);
      return; 
    }
    
    let canceled = false;
    const loader = new THREE.TextureLoader();
    let idx = 0;
    const allPaths: string[] = [];
    let retryCount = 0;
    const MAX_RETRIES = 3; // 最多重试3次
    
    // 同时尝试相对路径和绝对路径
    for (const p of paths) {
      allPaths.push(p);
      if (p.startsWith('/')) allPaths.push(p.slice(1));
    }
    
    setLoading(true);
    setError(null);
    
    const tryNext = () => {
      if (canceled || idx >= allPaths.length) { 
        console.error('[TextureLoader] ❌ 所有路径尝试完毕，未找到可用纹理:', paths);
        setError('所有纹理路径均加载失败');
        setTex(null); 
        setLoading(false);
        return; 
      }
      
      const p = allPaths[idx++];
      if (!p) { 
        tryNext(); 
        return; 
      }
      
      console.log(`[TextureLoader] 尝试加载纹理: ${p}`);
      
      // 不添加时间戳，利用缓存
      const urlWithCache = p;
      
      loader.load(
        urlWithCache,
        (t) => {
          if (canceled) return;
          retryCount = 0; // 成功加载时重置重试计数器
          const img: any = t.image as any;
          const w = img?.width ?? 0;
          const h = img?.height ?? 0;

          // 对超大纹理做一次性缩放，避免超过GPU最大纹理尺寸（常见 8192）
          const MAX_SIZE = 8192; // 保守阈值，兼容多数设备
          if (w > MAX_SIZE || h > MAX_SIZE) {
            try {
              const scale = Math.min(MAX_SIZE / Math.max(1, w), MAX_SIZE / Math.max(1, h));
              const nw = Math.max(1, Math.floor(w * scale));
              const nh = Math.max(1, Math.floor(h * scale));
              const canvas = document.createElement('canvas');
              canvas.width = nw;
              canvas.height = nh;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, nw, nh);
                (t as any).image = canvas;
                (t as any).needsUpdate = true;
                console.warn(`[TextureLoader] 🔧 纹理过大，已自动缩放: ${w}x${h} → ${nw}x${nh} (${p})`);
              }
            } catch (e) {
              console.warn('[TextureLoader] 超大纹理缩放失败，继续使用原图（可能超出GPU限制）:', e);
            }
          }

          console.log(`[TextureLoader] ✅ 纹理加载成功: ${p}`, {
            width: (t.image as any)?.width,
            height: (t.image as any)?.height,
            src: (t.image as any)?.src || 'no-src',
            colorSpace: t.colorSpace,
            wrapS: t.wrapS,
            wrapT: t.wrapT
          });
          
          // 确保纹理配置正确
          t.colorSpace = THREE.SRGBColorSpace;
          t.wrapS = THREE.RepeatWrapping;
          t.wrapT = THREE.ClampToEdgeWrapping;
          t.minFilter = THREE.LinearMipmapLinearFilter;
          t.magFilter = THREE.LinearFilter;
          t.anisotropy = 16;
          t.needsUpdate = true;
          
          setTex(t);
          setError(null);
          setLoading(false);
        },
        (progress) => {
          if (progress.lengthComputable) {
            const percent = (progress.loaded / progress.total) * 100;
            console.log(`[TextureLoader] 📥 ${p} 加载进度: ${percent.toFixed(1)}%`);
          }
        },
        (error) => {
          console.error(`[TextureLoader] ❌ 纹理加载失败: ${p}`, error);
          if (!canceled) {
            retryCount++;
            if (retryCount <= MAX_RETRIES) {
              setTimeout(() => tryNext(), 200); // 延迟重试
            } else {
              console.error(`[TextureLoader] ❌ 已达到最大重试次数 ${MAX_RETRIES}，停止重试`);
              setError('纹理加载失败');
              setTex(null); 
              setLoading(false);
            }
          }
        }
      );
    };
    
    tryNext();
    
    return () => { 
      canceled = true; 
    };
  }, [enabled, paths]); // 移除JSON.stringify，使用数组引用比较
  
  // 调试信息
  React.useEffect(() => {
    console.log(`[TextureLoader] 纹理状态:`, {
      enabled,
      loading,
      hasError: !!error,
      hasTexture: !!tex,
      paths,
      error: error || 'none'
    });
  }, [enabled, loading, error, tex, paths]);
  
  return tex;
}

// 分阶段纹理加载（低清优先，后台升级到高清）
// 设计目标：
// 1) 首屏尽快显示低清（默认识别含“2k”或体积更小的候选）
// 2) UI 稳定后延迟拉取高清（默认识别含“8k”的候选），成功后热替换并释放低清资源
// 3) 安全降级：高清失败则保持低清，不影响首屏
export function useStagedTextureFromPaths(
  paths: string[],
  enabled?: boolean,
  options?: { delayMs?: number }
) {
  const [tex, setTex] = React.useState<THREE.Texture | null>(null);
  const [upgraded, setUpgraded] = React.useState(false);

  // 选择低清与高清候选路径
  const { lowPaths, highPaths } = React.useMemo(() => {
    const low: string[] = [];
    const high: string[] = [];
    for (const p of paths) {
      const ps = [p, p.startsWith('/') ? p.slice(1) : undefined].filter(Boolean) as string[];
      if (/\b2k\b|_2k|2k_/i.test(p)) low.push(...ps); else if (/\b8k\b|_8k|8k_/i.test(p)) high.push(...ps); else low.push(...ps);
    }
    // 去重，保持顺序
    const dedup = (arr: string[]) => Array.from(new Set(arr));
    return { lowPaths: dedup(low), highPaths: dedup(high) };
  }, [paths]);

  // 先加载低清
  const lowTex = useFirstAvailableTexture(lowPaths, enabled);

  React.useEffect(() => {
    if (!enabled) {
      setTex(null);
      setUpgraded(false);
      return;
    }
    if (lowTex && !tex) setTex(lowTex);
  }, [enabled, lowTex]);

  // 延迟升级到高清
  React.useEffect(() => {
    if (!enabled) return;
    if (!lowTex) return; // 先确保有低清占位
    if (!highPaths?.length) return; // 无高清候选
    if (upgraded) return; // 已升级

    let canceled = false;
    const delayMs = Math.max(0, options?.delayMs ?? 5000); // 延长到5秒，让低清运行更久
    const timer = setTimeout(() => {
      if (canceled) return;
      try {
        const loader = new THREE.TextureLoader();
        // 顺序尝试高清路径，成功一个即替换
        let idx = 0;
        const tryNext = () => {
          if (canceled || idx >= highPaths.length) return;
          const p = highPaths[idx++];
          loader.load(
            p,
            (t) => {
              if (canceled) return;
              try {
                // 统一配置，保证观感一致
                t.colorSpace = THREE.SRGBColorSpace;
                t.wrapS = THREE.RepeatWrapping;
                t.wrapT = THREE.ClampToEdgeWrapping;
                t.minFilter = THREE.LinearMipmapLinearFilter;
                t.magFilter = THREE.LinearFilter;
                t.anisotropy = 16;
                t.needsUpdate = true;
                // 平滑替换纹理，减少GPU压力
                try {
                  const old = tex;

                  // 分步骤替换，避免GPU瞬时压力
                  setTimeout(() => {
                    setTex(t);
                    setUpgraded(true);

                    // 延迟释放旧纹理，确保GPU有时间处理
                    if (old && old !== t) {
                      setTimeout(() => {
                        try {
                          old.dispose?.();
                          console.log('[TextureLoader] 🗑️ 低清纹理已释放');
                        } catch {}
                      }, 100); // 100ms缓冲
                    }
                  }, 50); // 50ms缓冲启动

                } catch (e) {
                  console.warn('[TextureLoader] 升级替换时发生异常', e);
                  setTex(t);
                  setUpgraded(true);
                }
              } catch (e) {
                console.warn('[TextureLoader] 高清纹理参数配置失败，仍使用高清图', e);
                setTex(t);
                setUpgraded(true);
              }
            },
            undefined,
            () => {
              // 失败则尝试下一个高清候选
              tryNext();
            }
          );
        };
        tryNext();
      } catch (e) {
        console.warn('[TextureLoader] 启动高清升级失败，保持低清', e);
      }
    }, delayMs);

    return () => { canceled = true; clearTimeout(timer); };
  }, [enabled, lowTex, highPaths, upgraded, options?.delayMs, tex]);

  // 调试日志
  React.useEffect(() => {
    try {
      console.log('[TextureLoader] 分阶段纹理状态', {
        enabled,
        hasLow: !!lowTex,
        upgraded,
        currentWidth: (tex as any)?.image?.width,
        currentHeight: (tex as any)?.image?.height,
      });
    } catch {}
  }, [enabled, lowTex, upgraded, tex]);

  return tex;
}

// 色温转换工具函数 - 移植自原Scene.tsx
export function kelvinToRGB(k: number): THREE.Color {
  const t = k / 100;
  let r: number, g: number, b: number;
  
  if (t <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
    b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
    b = 255;
  }
  
  const clamp = (x: number) => Math.max(0, Math.min(255, x));
  return new THREE.Color(clamp(r) / 255, clamp(g) / 255, clamp(b) / 255);
}

// 纹理路径常量
export const TEXTURE_PATHS = {
  // 地球贴图
  earthDay: [
    '/textures/8k_earth_daymap.webp',
    '/textures/2k_earth_daymap.jpg'
  ],
  earthNight: [
    '/textures/8k_earth_nightmap.webp',
    '/textures/2k_earth_nightmap.jpg'
  ],
  earthNormal: [
    // 当前资源仅有 2k 正常贴图
    '/textures/2k_earth_normal_map.jpg'
  ],
  earthSpecular: [
    '/textures/8k_earth_specular_map.webp',
    '/textures/2k_earth_specular_map.jpg'
  ],
  earthDisplacement: [
    // 优先使用JPG格式的高度贴图
    '/textures/8k_earth_displacement_map.jpg',
    '/textures/8k_earth_displacement.jpg',
    '/textures/8k_earth_displacement_map.png',
    '/textures/2k_earth_displacement_map.jpg',
    '/textures/2k_earth_displacement.jpg',
    '/textures/2k_earth_displacement_map.png'
  ],
  earthClouds: [
    '/textures/8k_earth_clouds.webp',
    '/textures/2k_earth_clouds.jpg'
  ],
  
  // 月球贴图
  moon: [
    '/textures/2k_moon.jpg'
  ],
  moonNormal: [
    '/textures/2k_moon_normal.jpg'
  ],
  moonDisplacement: [
    '/textures/2k_moon_displacement.jpg',
    '/textures/moon_height_2k.jpg',
    '/textures/moon_height_2048x1024.jpg',
    '/textures/moon_height.jpg'
  ],
  
  // 星空贴图
  starsMilky: [
    '/textures/8k_stars_milky_way.webp',
    '/textures/2k_stars_milky_way.jpg'
  ]
};

// 纹理加载状态管理
export function useTextureLoader(config: { useTextures: boolean; useClouds?: boolean; useMilkyWay?: boolean; stagedLowFirst?: boolean }) {
  const useTex = !!config?.useTextures;
  
  // 调试信息：暂时注释掉以减少日志噪音
  // console.log('[TextureLoader] 开始加载纹理，配置:', {
  //   useTextures: useTex,
  //   useClouds: !!config?.useClouds,
  //   useMilkyWay: !!config?.useMilkyWay
  // });
  
  // 使用useMemo缓存路径数组，确保引用稳定
  const earthDayPaths = React.useMemo(() => TEXTURE_PATHS.earthDay, []);
  const earthNightPaths = React.useMemo(() => TEXTURE_PATHS.earthNight, []);
  const earthNormalPaths = React.useMemo(() => TEXTURE_PATHS.earthNormal, []);
  const earthSpecularPaths = React.useMemo(() => TEXTURE_PATHS.earthSpecular, []);
  const earthDisplacementPaths = React.useMemo(() => TEXTURE_PATHS.earthDisplacement, []);
  const earthCloudsPaths = React.useMemo(() => TEXTURE_PATHS.earthClouds, []);
  const moonPaths = React.useMemo(() => TEXTURE_PATHS.moon, []);
  const moonNormalPaths = React.useMemo(() => TEXTURE_PATHS.moonNormal, []);
  const moonDisplacementPaths = React.useMemo(() => TEXTURE_PATHS.moonDisplacement, []);
  const starsMilkyPaths = React.useMemo(() => TEXTURE_PATHS.starsMilky, []);
  
  const useStaged = !!config?.stagedLowFirst;

  // 地球贴图（分阶段加载 - 大幅分散8k升级时间，减少GPU压力）
  const earthMap = useStaged ? useStagedTextureFromPaths(earthDayPaths, useTex, { delayMs: 15000 }) : useFirstAvailableTexture(earthDayPaths, useTex);
  const earthNight = useStaged ? useStagedTextureFromPaths(earthNightPaths, useTex, { delayMs: 18000 }) : useFirstAvailableTexture(earthNightPaths, useTex);
  const earthNormal = useStaged ? useStagedTextureFromPaths(earthNormalPaths, useTex, { delayMs: 21000 }) : useFirstAvailableTexture(earthNormalPaths, useTex);
  const earthSpecular = useStaged ? useStagedTextureFromPaths(earthSpecularPaths, useTex, { delayMs: 24000 }) : useFirstAvailableTexture(earthSpecularPaths, useTex);
  const earthDisplacement = useStaged ? useStagedTextureFromPaths(earthDisplacementPaths, useTex, { delayMs: 27000 }) : useFirstAvailableTexture(earthDisplacementPaths, useTex);
  const earthClouds = useStaged ? useStagedTextureFromPaths(earthCloudsPaths, useTex && !!config?.useClouds, { delayMs: 30000 }) : useFirstAvailableTexture(earthCloudsPaths, useTex && !!config?.useClouds);

  // 月球贴图（也采用分阶段）
  const moonMap = useStaged ? useStagedTextureFromPaths(moonPaths, useTex, { delayMs: 1500 }) : useFirstAvailableTexture(moonPaths, useTex);
  const moonNormalMap = useStaged ? useStagedTextureFromPaths(moonNormalPaths, useTex, { delayMs: 1700 }) : useFirstAvailableTexture(moonNormalPaths, useTex);
  const moonDisplacementMap = useStaged ? useStagedTextureFromPaths(moonDisplacementPaths, useTex, { delayMs: 1900 }) : useFirstAvailableTexture(moonDisplacementPaths, useTex);

  // 星空贴图：直接采用“高优先（8k优先）”策略，不走分阶段
  const starsMilky = useFirstAvailableTexture(starsMilkyPaths, useTex && !!config?.useMilkyWay);
  
  // 监控纹理加载状态
  React.useEffect(() => {
    console.log('[TextureLoader] 纹理加载状态:', {
      earthMap: earthMap ? '✅' : '❌',
      earthNight: earthNight ? '✅' : '❌',
      earthNormal: earthNormal ? '✅' : '❌',
      earthSpecular: earthSpecular ? '✅' : '❌',
      earthDisplacement: earthDisplacement ? '✅' : '❌',
      earthClouds: earthClouds ? '✅' : '❌',
      moonMap: moonMap ? '✅' : '❌',
      moonNormalMap: moonNormalMap ? '✅' : '❌',
      moonDisplacementMap: moonDisplacementMap ? '✅' : '❌',
      starsMilky: starsMilky ? '✅' : '❌'
    });

    // 当关键纹理就绪时，派发一次全局事件，供 LoadingOverlay 使用
    try {
      const essentialsReady = !!(earthMap && moonMap);
      if (essentialsReady) {
        try { (window as any).__lubirthAssetsReady = true; } catch {}
        // 使用微任务确保先完成一次渲染提交
        Promise.resolve().then(() => {
          try {
            const ev = new CustomEvent('lubirth:assets-ready');
            window.dispatchEvent(ev);
            console.log('[TextureLoader] 🔔 dispatched lubirth:assets-ready');
          } catch (e) {
            console.warn('[TextureLoader] dispatch ready event failed:', e);
          }
        });
      }
    } catch {}
  }, [earthMap, earthNight, earthNormal, earthSpecular, earthClouds, moonMap, moonNormalMap, moonDisplacementMap, starsMilky]);
  
  return {
    earthMap,
    earthNight,
    earthNormal,
    earthSpecular,
    earthDisplacement,
    earthClouds,
    moonMap,
    moonNormalMap,
    moonDisplacementMap,
    starsMilky
  };
}
