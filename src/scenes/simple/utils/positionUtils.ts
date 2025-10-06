import React from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';

// 相机控制工具 - 移除分层渲染逻辑
export function useCameraControl(composition: any) {
  const { camera, size, gl } = useThree();
  
  React.useEffect(() => {
    try {
      // 相机极坐标（最小接入）
      const R = composition?.cameraDistance ?? 12.0;
      const azDeg = composition?.cameraAzimuthDeg ?? 0;
      const elDeg = composition?.cameraElevationDeg ?? 0;
      const az = THREE.MathUtils.degToRad(azDeg);
      const el = THREE.MathUtils.degToRad(elDeg);

      // 计算相机Y位置偏移基于 earthTopY
      const earthTopScreen = composition?.earthTopY ?? 0.333;
      const vfov = THREE.MathUtils.degToRad(45);
      const t = Math.tan(vfov / 2);
      const targetTopNdcY = earthTopScreen * 2 - 1;
      const baseCameraY = -targetTopNdcY * R * t;

      // 第一步：定位相机 - 严格按照球坐标计算，确保相机在半径为 R 的球面上
      const x = R * Math.sin(az) * Math.cos(el);
      const y = R * Math.sin(el); 
      const z = R * Math.cos(az) * Math.cos(el);

      camera.position.set(x, y, z);
      camera.up.set(0, 1, 0);
      
      // 第二步：调整朝向 - 使用R倍率控制Y轴上下
      const lookAtRatio = composition?.lookAtDistanceRatio ?? 0;
      
      // 计算lookAt目标点：基于R的倍率，0=地心，正数=上方，负数=下方
      const lookAtX = 0;
      const lookAtY = lookAtRatio * R;
      const lookAtZ = 0;
      
      camera.lookAt(lookAtX, lookAtY, lookAtZ);
      
      // 设置近远平面
      camera.near = 0.01;
      camera.far = Math.max(400, R + 20);
      
      // 视口偏移（主点纵向偏移，-5..+5，上为正）
      const offsetY = composition?.viewOffsetY ?? 0;
      if (camera instanceof THREE.PerspectiveCamera) {
        if (Math.abs(offsetY) > 1e-6) {
          const fullW = size?.width ?? gl?.domElement?.width ?? 0;
          const fullH = size?.height ?? gl?.domElement?.height ?? 0;
          // 将 [-5,+5] 映射为像素偏移，正向上。PerspectiveCamera.setViewOffset 的 y 向下为正，因此取反。
          const yPx = Math.round((offsetY * 0.1) * fullH);
          const yParam = -yPx;
          camera.setViewOffset(fullW, fullH, 0, yParam, fullW, fullH);
        } else if ((camera as THREE.PerspectiveCamera).view !== null) {
          camera.clearViewOffset();
        }
      }
      
      camera.updateProjectionMatrix();

      // 明确的相机应用日志（用于确认“写入就必转”）
      console.log('[CameraApply]', {
        azDeg,
        elDeg,
        radius: R,
        position: camera.position.toArray(),
        lookAt: [lookAtX, lookAtY, lookAtZ]
      });
      
      // 调试信息
      if (new URLSearchParams(location.search).get('debug') === '1') {
        console.log('[SimpleCamera]', {
          position: camera.position.toArray(),
          target: [lookAtX, lookAtY, lookAtZ],
          actualDistance: camera.position.length(),
          fov: camera.fov,
          near: camera.near,
          far: camera.far,
          mode: 'position-then-orient',
          azDeg,
          elDeg,
          lookAtRatio,
          baseCameraY,
          viewOffsetY: composition?.viewOffsetY ?? 0,
          canvas: { w: size?.width, h: size?.height }
        });
      }
    } catch (error) {
      console.error('[SimpleCamera] Error:', error);
    }
  }, [camera, gl, size?.width, size?.height, composition?.cameraDistance, composition?.cameraAzimuthDeg, composition?.cameraElevationDeg, composition?.lookAtDistanceRatio, composition?.viewOffsetY]);
}

// 地球位置计算
export function useEarthPosition(composition: any, cameraDistance: number = 12.0) {
  return React.useMemo(() => {
    try {
      // 地球屏幕位置计算
      const earthTopScreen = Math.min(Math.max(composition?.earthTopY ?? 0.333, 0.05), 0.95);
      const earthScreenSize = Math.min(Math.max(composition?.earthSize ?? 0.33, 0.06), 3.0);
      
      // 计算地球世界位置
      const vfov = THREE.MathUtils.degToRad(45); // 默认FOV
      const t = Math.tan(vfov / 2);
      const targetTopNdcY = earthTopScreen * 2 - 1;
      const centerNdcY = targetTopNdcY - earthScreenSize;
      const earthY = centerNdcY * cameraDistance * t;
      
      return {
        position: [0, 0, 0] as [number, number, number],
        size: Math.max(0.05, earthScreenSize * cameraDistance * t),
        topScreen: earthTopScreen,
        screenSize: earthScreenSize
      };
    } catch (error) {
      console.error('[SimpleEarthPosition] Error:', error);
      return {
        position: [0, 0, 0] as [number, number, number],
        size: 2.0,
        topScreen: 0.333,
        screenSize: 0.33
      };
    }
  }, [composition?.earthTopY, composition?.earthSize, cameraDistance]);
}

// 🌙 月球屏幕锚定位置 - 返回屏幕参数，实际位置在Moon组件中每帧计算
export function useMoonPosition(composition: any, camera: THREE.Camera) {
  return React.useMemo(() => {
    try {
      const moonScreen = {
        x: composition?.moonScreenX ?? 0.5,  // 默认屏幕中心
        y: composition?.moonScreenY ?? 0.75, // 默认屏幕上方
        dist: composition?.moonDistance ?? 14
      };
      
      // 🌙 新策略：返回屏幕参数，让Moon组件每帧计算实际位置
      // 这样可以实现真正的屏幕锚定
      return {
        // 临时位置（会被Moon组件每帧更新）
        position: [0, 0, -moonScreen.dist] as [number, number, number],
        screen: moonScreen,
        distance: moonScreen.dist
      };
    } catch (error) {
      console.error('[MoonScreenConfig] Error:', error);
      return {
        position: [0, 2, -14] as [number, number, number],
        screen: { x: 0.5, y: 0.75, dist: 14 },
        distance: 14
      };
    }
  }, [composition?.moonScreenX, composition?.moonScreenY, composition?.moonDistance]); 
}

// 位置标记计算
export function useMarkerPosition(earthSize: number) {
  return React.useMemo(() => {
    try {
      // 位置标记：地球表面上方的小点（地球固定在原点）
      const markerPos = [
        0,
        0 + earthSize * 1.02,
        0
      ] as [number, number, number];
      
      return markerPos;
    } catch (error) {
      console.error('[SimpleMarkerPosition] Error:', error);
      return [0, 2.04, 0] as [number, number, number];
    }
  }, [earthSize]);
}

// 相机曝光控制
export function useExposureControl(composition: any) {
  const { gl } = useThree();
  
  React.useEffect(() => {
    try {
      const exposure = Math.min(Math.max(composition?.exposure ?? 1.0, 0.2), 3.0);
      if (gl) {
        gl.toneMappingExposure = exposure;
      }
      
      if (new URLSearchParams(location.search).get('debug') === '1') {
        console.log('[SimpleExposure]', { exposure });
      }
    } catch (error) {
      console.error('[SimpleExposure] Error:', error);
    }
  }, [gl, composition?.exposure]);
}

// 🌙 屏幕锚定位置计算 - 每帧更新以跟随相机
export function getScreenAnchoredPosition(
  screenX: number, 
  screenY: number, 
  distance: number,
  camera: THREE.Camera
): THREE.Vector3 {
  try {
    // 确保相机矩阵是最新的
    camera.updateMatrixWorld();
    
    // 将屏幕坐标转换为NDC坐标
    const ndcX = (screenX - 0.5) * 2;
    const ndcY = (screenY - 0.5) * 2;
    const ndcZ = 0.5; // 中间深度
    
    // 创建NDC空间的点并反投影到世界空间
    const ndcPoint = new THREE.Vector3(ndcX, ndcY, ndcZ);
    const worldPoint = ndcPoint.unproject(camera);
    
    // 计算从相机到屏幕点的方向
    const direction = worldPoint.sub(camera.position).normalize();
    
    // 沿方向移动指定距离得到最终位置
    const finalPosition = camera.position.clone().add(direction.multiplyScalar(distance));
    
    return finalPosition;
  } catch (error) {
    console.error('[ScreenAnchoredPosition] Error:', error);
    // 兜底：相机前方固定位置
    return camera.position.clone().add(new THREE.Vector3(0, 0, -distance));
  }
}

// 位置验证工具
export function validatePositionParams(composition: any) {
  const errors: string[] = [];
  
  if (composition.earthSize < 0.06 || composition.earthSize > 3.0) {
    errors.push('earthSize should be between 0.06 and 3.0');
  }
  
  if (composition.moonDistance < 1 || composition.moonDistance > 50) {
    errors.push('moonDistance should be between 1 and 50');
  }
  
  if (composition.cameraDistance < 3 || composition.cameraDistance > 50) {
    errors.push('cameraDistance should be between 3 and 50');
  }
  
  return errors;
}

// 位置预设
export const POSITION_PRESETS = {
  closeUp: {
    earthSize: 3.0,
    moonDistance: 5.0,
    cameraDistance: 8.0
  },
  medium: {
    earthSize: 2.0,
    moonDistance: 8.0,
    cameraDistance: 12.0
  },
  distant: {
    earthSize: 1.0,
    moonDistance: 15.0,
    cameraDistance: 20.0
  },
  eclipse: {
    earthSize: 2.5,
    moonDistance: 4.0,
    cameraDistance: 10.0
  }
};

// 应用位置预设
export function applyPositionPreset(composition: any, presetName: keyof typeof POSITION_PRESETS) {
  const preset = POSITION_PRESETS[presetName];
  return {
    ...composition,
    earthSize: preset.earthSize,
    moonDistance: preset.moonDistance,
    cameraDistance: preset.cameraDistance
  };
}
