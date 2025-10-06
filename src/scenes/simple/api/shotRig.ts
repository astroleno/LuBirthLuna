import * as THREE from 'three';
import { logger } from '../../../utils/logger';

export type ShotRigParams = {
  targetLatDeg: number; // 目标纬度，例如 80（表示80°N）
  targetLonDeg: number; // 目标经度，例如 180（表示经度在国际日期变更线附近）
};

// 创建一个ShotRig：包含一个组（地球与相机可统一旋转）以及一个帮助方法将指定经纬度旋到屏幕中心
export function createShotRig(): { rig: THREE.Group; alignToLatLon: (earth: THREE.Object3D, camera: THREE.Camera, params: ShotRigParams) => void } {
  const rig = new THREE.Group();

  // 将地球上经纬度转换为球面点
  function latLonToVector3(radius: number, latDeg: number, lonDeg: number): THREE.Vector3 {
    // 统一口径：lon=0 → +Z
    const lat = THREE.MathUtils.degToRad(latDeg);
    const lon = THREE.MathUtils.degToRad(lonDeg);
    const x = radius * Math.cos(lat) * Math.sin(lon);
    const y = radius * Math.sin(lat);
    const z = radius * Math.cos(lat) * Math.cos(lon);
    return new THREE.Vector3(x, y, z);
  }

  function alignToLatLon(earth: THREE.Object3D, camera: THREE.Camera, params: ShotRigParams) {
    try {
      // 1) 估计地球半径（按缩放最大分量）
      const radius = Math.max(earth.scale.x, earth.scale.y, earth.scale.z) || 1;
      const surface = latLonToVector3(radius, params.targetLatDeg, params.targetLonDeg).normalize();

      // 2) 第一步：将该地面法线旋到世界+Y（让目标点到屏幕上沿）
      const q1 = new THREE.Quaternion().setFromUnitVectors(surface, new THREE.Vector3(0, 1, 0));
      earth.quaternion.premultiply(q1);

      // 3) 第二步：绕世界+Y旋转，使经度方向（东向切线）指向屏幕中心（使目标点位于正上、经线指向-Z）
      // 经过q1后，目标点在+Y；其局部“东向”可以用 worldEast = normalize(cross(+Y, 原始法线))，再旋到-Z
      const originalNormal = surface.clone();
      const worldUp = new THREE.Vector3(0, 1, 0);
      const east = new THREE.Vector3().crossVectors(worldUp, originalNormal).normalize();
      // 目标屏幕前向取 -Z（right-handed 摄像机常见朝 -Z 看原点）
      const screenForward = new THREE.Vector3(0, 0, -1);
      // 旋转角度 = 东向在XZ平面投影与 -Z 的夹角
      const eastXZ = new THREE.Vector3(east.x, 0, east.z).normalize();
      let yaw = Math.atan2(eastXZ.x, -eastXZ.z); // 将east指向-Z
      const q2 = new THREE.Quaternion().setFromAxisAngle(worldUp, -yaw);
      earth.quaternion.premultiply(q2);

      // 4) 相机对准地球中心
      if ('lookAt' in camera) (camera as THREE.PerspectiveCamera).lookAt(0, 0, 0);
    } catch (err) {
      if (logger.isEnabled()) logger.error('align/latlon-fail', String(err));
    }
  }

  return { rig, alignToLatLon };
}

// 仅绕世界Y轴旋转，使指定经度的经线对齐到屏幕中心（保持俯仰不变）
export function alignLongitudeOnly(earth: THREE.Object3D, camera: THREE.Camera, targetLonDeg: number) {
  try {
    const worldUp = new THREE.Vector3(0, 1, 0);

    // 🔧 关键修复：期望方向：相机位置指向原点的XZ方向（更稳定）
    const camPos = new THREE.Vector3();
    (camera as THREE.Object3D).getWorldPosition(camPos);
    const desiredXZ = new THREE.Vector3(-camPos.x, 0, -camPos.z).normalize();
    if (!isFinite(desiredXZ.x) || !isFinite(desiredXZ.z)) {
      if (logger.isEnabled()) logger.warn('align/skip-invalid-camera');
      return;
    }

    // 目标经度在赤道平面的方向（地球局部）→ 映射到世界后取XZ
    const lonRad = THREE.MathUtils.degToRad(targetLonDeg);
    // 经线的径向方向（与 lat=0 的法向一致）：(sin(lon), 0, cos(lon))
    const equatorDirLocal = new THREE.Vector3(Math.sin(lonRad), 0, Math.cos(lonRad));
    const equatorDirWorld = equatorDirLocal.clone().applyQuaternion(earth.quaternion);
    const currentXZ = new THREE.Vector3(equatorDirWorld.x, 0, equatorDirWorld.z).normalize();

    // 计算从 currentXZ 旋到 desiredXZ 的角度（绕世界Y）
    const dot = THREE.MathUtils.clamp(currentXZ.dot(desiredXZ), -1, 1);
    const crossY = currentXZ.x * desiredXZ.z - currentXZ.z * desiredXZ.x; // (current × desired).y
    const theta = Math.atan2(crossY, dot);

    // 确保可更新并记录四元数
    (earth as any).matrixAutoUpdate = true;
    const before = earth.quaternion.clone();

    if (!isNaN(theta) && isFinite(theta) && Math.abs(theta) > 1e-6) {
      // 🔧 关键修复：使用rotateOnWorldAxis确保绕世界Y轴旋转
      earth.rotateOnWorldAxis(worldUp, theta);
      earth.updateMatrixWorld(true);
      
      if (logger.isEnabled()) logger.log('align/success', {
        targetLonDeg,
        camPos: { x: +camPos.x.toFixed(3), y: +camPos.y.toFixed(3), z: +camPos.z.toFixed(3) },
        desiredXZ: { x: +desiredXZ.x.toFixed(3), z: +desiredXZ.z.toFixed(3) },
        currentXZ: { x: +currentXZ.x.toFixed(3), z: +currentXZ.z.toFixed(3) },
        thetaDeg: +THREE.MathUtils.radToDeg(theta).toFixed(2),
        quatBefore: { x: +before.x.toFixed(4), y: +before.y.toFixed(4), z: +before.z.toFixed(4), w: +before.w.toFixed(4) },
        quatAfter: { x: +earth.quaternion.x.toFixed(4), y: +earth.quaternion.y.toFixed(4), z: +earth.quaternion.z.toFixed(4), w: +earth.quaternion.w.toFixed(4) }
      });
    } else {
      if (logger.isEnabled()) logger.log('align/skip', {
        targetLonDeg,
        thetaDeg: +THREE.MathUtils.radToDeg(theta).toFixed(2),
        reason: Math.abs(theta) <= 1e6 ? '角度太小' : '计算异常'
      });
    }
  } catch (err) {
    if (logger.isEnabled()) logger.error('align/fail', String(err));
  }
}

