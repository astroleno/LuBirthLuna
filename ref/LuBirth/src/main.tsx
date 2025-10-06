import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { runAutoTests } from './astro/autoTests';
import { runFullLightingValidation } from './astro/fullLightingAutoTest';
import { runMoonPhaseAutoTests } from './astro/moonPhaseAutoTests';
import { runMoonPhaseRenderValidation } from './astro/moonPhaseRenderValidation';

const root = createRoot(document.getElementById('root')!);
console.log('[Main] React root created');
root.render(<App />);
console.log('[Main] App render called');

// 可选：通过 URL 参数触发自动测试
try {
  const params = new URLSearchParams(window.location.search);
  if (params.get('autotest') === '1') {
    console.log('[Main] AutoTests triggered by query param');
    runAutoTests();
  }
  if (params.get('fulltest') === '1') {
    console.log('[Main] FullLightingAutoTest triggered by query param');
    const summary = runFullLightingValidation();
    const fn = (window as any).runNoTiltAutoTest;
    if (typeof fn === 'function') {
      try {
        fn(180).then((tilt:any) => {
          const fz = (window as any).runFixedSunAzimuthLockTest;
          const done = (az:any, seasonal:any) => {
            const merged = { when: new Date().toISOString(), summary, noTilt: tilt, fixedSunAz: az, seasonal };
            console.log('[FullTest+NoTilt:JSON]', JSON.stringify(merged, null, 2));
          };
          const fs = (window as any).runSeasonalAutoTest;
          const callSeasonal = (az:any) => {
            if (typeof fs === 'function') {
              fs().then((ss:any)=>done(az, ss)).catch((e:any)=>{ console.error('[FullTest] Seasonal integration failed:', e); done(az, null); });
            } else {
              done(az, null);
            }
          };
          
          if (typeof fz === 'function') {
            fz().then(callSeasonal).catch((e:any)=>{ console.error('[FullTest] FixedSunAz integration failed:', e); callSeasonal(null); });
          } else {
            callSeasonal(null);
          }
        });
      } catch (e) {
        console.error('[FullTest] NoTilt integration failed:', e);
      }
    }
  }
  // 提供一键测试函数到全局，便于控制台直接调用/复制
  (window as any).runSolarAutoTests = () => {
    try {
      const summary = runAutoTests();
      const payload = {
        when: new Date().toISOString(),
        summary
      };
      console.log('[AutoTest:OneClick] JSON below. Copy from console if needed.');
      console.log(JSON.stringify(payload, null, 2));
      return payload;
    } catch (e) {
      console.error('[AutoTest:OneClick] failed:', e);
      return null;
    }
  };
  (window as any).runSolarFullTests = async () => {
    try {
      const summary = runFullLightingValidation();
      const fn = (window as any).runNoTiltAutoTest;
      const tilt = typeof fn === 'function' ? await fn(180) : null;
      const fz = (window as any).runFixedSunAzimuthLockTest;
      const az = typeof fz === 'function' ? await fz() : null;
      const fs = (window as any).runSeasonalAutoTest;
      const seasonal = typeof fs === 'function' ? await fs() : null;
      const moonPhase = runMoonPhaseAutoTests();
      const payload = { when: new Date().toISOString(), summary, noTilt: tilt, fixedSunAz: az, seasonal, moonPhase };
      console.log('[FullTest+NoTilt:OneClick] JSON below. Copy from console if needed.');
      console.log(JSON.stringify(payload, null, 2));
      return payload;
    } catch (e) {
      console.error('[FullTest+NoTilt:OneClick] failed:', e);
      return null;
    }
  };
  (window as any).runMoonPhaseAutoTests = () => {
    try {
      return runMoonPhaseAutoTests();
    } catch (e) {
      console.error('[MoonPhaseTest:OneClick] failed:', e);
      return null;
    }
  };
  (window as any).runMoonPhaseRenderValidation = (year: number, month: number) => {
    try {
      return runMoonPhaseRenderValidation(year, month);
    } catch (e) {
      console.error('[MoonPhaseRenderValidation] failed:', e);
      return null;
    }
  };
  (window as any).runCameraPolarValidation = () => {
    try {
      const cam: any = (window as any).__R3F_Camera || null;
      // 在 SimpleTest 中我们可将当前相机临时挂到 window 以方便调试（若未挂载则尝试通过 three inspector 获取）
      const THREE = (window as any).THREE || undefined;
      if (!cam || !THREE) {
        console.warn('[CameraPolarValidation] camera or THREE not available on window.');
      }
      const camera = cam || null;
      const v = new (THREE?.Vector3 ?? (class { x=0;y=0;z=0; }))();
      if (camera && 'updateMatrixWorld' in camera) camera.updateMatrixWorld();
      const ndc = camera && THREE ? new THREE.Vector3(0, 0, 0).project(camera) : { x: 0, y: 0, z: 0 };
      const payload = {
        when: new Date().toISOString(),
        camera: camera ? {
          pos: camera.position?.toArray?.() ?? null,
          fov: camera.fov ?? null,
          near: camera.near ?? null,
          far: camera.far ?? null,
          view: (camera as any).view ?? null
        } : null,
        earthCenterNDC: {
          x: +(((ndc as any).x?.toFixed?.(4)) ?? 0),
          y: +(((ndc as any).y?.toFixed?.(4)) ?? 0)
        },
      };
      console.log('[CameraPolarValidation:JSON]', JSON.stringify(payload, null, 2));
      return payload;
    } catch (e) {
      console.error('[CameraPolarValidation] failed:', e);
      return null;
    }
  };

  // 出生点对齐诊断命令
  (window as any).runBirthAlignDiagnostics = (testLocations?: Array<{name: string, lon: number, lat: number, alpha?: number}>) => {
    try {
      const { calculateBirthPointLocalFrame, calculateCameraOrientationForBirthPoint } = require('./scenes/simple/utils/birthPointAlignment');
      const THREE = (window as any).THREE;
      if (!THREE) {
        console.error('[BirthAlignDiagnostics] THREE.js not available');
        return null;
      }

      // 默认测试集（内置样例：上海、北京、纽约、赤道边界等关键点）
      const defaultTestLocations = [
        { name: '上海', lon: 121.47, lat: 31.23, alpha: 10 },
        { name: '北京', lon: 116.41, lat: 39.90, alpha: 10 },
        { name: '纽约', lon: -74.01, lat: 40.71, alpha: 10 },
        { name: '伦敦', lon: -0.13, lat: 51.51, alpha: 10 },
        { name: '赤道本初子午线', lon: 0, lat: 0, alpha: 10 },
        { name: '赤道180度', lon: 180, lat: 0, alpha: 10 },
        { name: '赤道90E', lon: 90, lat: 0, alpha: 10 },
        { name: '赤道90W', lon: -90, lat: 0, alpha: 10 },
        { name: '北极边界80N', lon: 0, lat: 80, alpha: 10 },
        { name: '南极边界80S', lon: 0, lat: -80, alpha: 10 }
      ];

      const locations = testLocations || defaultTestLocations;
      // 兼容不同大小写的注入名
      const scene = (window as any).__R3F_Scene || (window as any).__R3F_SCENE;
      const results = locations.map(location => {
        try {
          // 计算世界坐标
          const { p: worldPoint } = calculateBirthPointLocalFrame(location.lon, location.lat);
          
          // 计算相机朝向（传入scene以获取地球姿态）
          const orientation = calculateCameraOrientationForBirthPoint({
            longitudeDeg: location.lon,
            latitudeDeg: location.lat,
            alphaDeg: location.alpha || 10
          }, scene);

          // 计算期望的屏幕位置（应该在中心）
          const expectedScreenX = 0.5;
          const expectedScreenY = 0.4; // 稍微偏上

          // 误差计算：假设相机直接朝向出生点，计算角度误差
          const expectedYaw = THREE.MathUtils.radToDeg(Math.atan2(worldPoint.x, -worldPoint.z));
          const yawError = Math.abs(orientation.yaw - expectedYaw);

          return {
            location,
            worldPoint: {
              x: +worldPoint.x.toFixed(4),
              y: +worldPoint.y.toFixed(4),
              z: +worldPoint.z.toFixed(4)
            },
            orientation: {
              yaw: +orientation.yaw.toFixed(2),
              pitch: +orientation.pitch.toFixed(2),
              roll: +orientation.roll.toFixed(2)
            },
            expectedYaw: +expectedYaw.toFixed(2),
            errors: {
              yawDeg: +yawError.toFixed(2)
            },
            isValid: yawError <= 0.5 // 验收标准：误差≤0.5°
          };
        } catch (e) {
          return {
            location,
            error: (e as Error).message
          };
        }
      });

      const payload = {
        when: new Date().toISOString(),
        testCount: results.length,
        passedCount: results.filter(r => r.isValid).length,
        results,
        earthQuaternion: scene ? (() => {
          try {
            const earthRoot = scene.getObjectByName('earthRoot');
            return earthRoot ? {
              x: +earthRoot.quaternion.x.toFixed(4),
              y: +earthRoot.quaternion.y.toFixed(4),
              z: +earthRoot.quaternion.z.toFixed(4),
              w: +earthRoot.quaternion.w.toFixed(4)
            } : null;
          } catch { return null; }
        })() : null
      };

      console.log('[BirthAlignTest:JSON]', JSON.stringify(payload, null, 2));
      return payload;
    } catch (e) {
      console.error('[BirthAlignDiagnostics] failed:', e);
      return null;
    }
  };
} catch {}
