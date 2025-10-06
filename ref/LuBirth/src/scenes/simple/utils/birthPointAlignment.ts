import * as THREE from 'three';
import { logger } from '../../../utils/logger';

/**
 * 出生点局部坐标系
 * 基于出生点的经纬度计算局部东(e)、北(n)、法向(p)向量
 */
export interface BirthPointLocalFrame {
  /** 地心到出生点的法向向量 */
  p: THREE.Vector3;
  /** 当地正北方向 */
  n: THREE.Vector3;
  /** 当地正东方向 */
  e: THREE.Vector3;
}

/**
 * 相机朝向参数
 */
export interface CameraOrientation {
  /** 偏航角 (yaw) - 绕世界Y轴旋转 */
  yaw: number;
  /** 俯仰角 (pitch) - 绕相机右轴旋转 */
  pitch: number;
  /** 滚转角 (roll) - 绕相机前轴旋转 */
  roll: number;
}

/**
 * 出生点对齐参数
 */
export interface BirthPointAlignmentParams {
  /** 出生点经度 (度) */
  longitudeDeg: number;
  /** 出生点纬度 (度) */
  latitudeDeg: number;
  /** 抬升角 (度) - 控制出生点在画面中的高度感 */
  alphaDeg: number;
}

/**
 * 计算出生点的局部坐标系
 * @param longitudeDeg 经度 (度)
 * @param latitudeDeg 纬度 (度)
 * @returns 局部坐标系 {p, n, e}
 */
export function calculateBirthPointLocalFrame(
  longitudeDeg: number,
  latitudeDeg: number
): BirthPointLocalFrame {
  const lat = THREE.MathUtils.degToRad(latitudeDeg);
  const lon = THREE.MathUtils.degToRad(longitudeDeg);
  
  // p: 地心到出生点的法向向量 (单位向量)  
  // 🚨 根本性修复：停止修改经度！出生点坐标应该保持标准地理坐标
  // 问题在于相机对齐逻辑，不是出生点坐标计算
  // 使用标准球面坐标系：0°经度=本初子午线，正X轴指向90°E
  
  // 🔧 关键修复：正确的球面坐标转换，匹配Three.js坐标系
  // Three.js坐标系：+X=东，+Y=上，+Z=南（向观察者）
  // 经度0°应该指向-Z方向（本初子午线），90°E指向+X方向
  // 标准球面到笛卡尔坐标转换：
  // x = cos(lat) * sin(lon)  （东西方向）
  // y = sin(lat)              （上下方向） 
  // z = -cos(lat) * cos(lon) （南北方向，注意负号）
  const p = new THREE.Vector3(
    Math.cos(lat) * Math.sin(lon),
    Math.sin(lat),
    -Math.cos(lat) * Math.cos(lon)
  );
  
  // n: 当地正北方向
  // 从全球北极(0,1,0)在出生点切平面的投影
  // 🔧 修复：坐标系统已修正，0°经度对应本初子午线
  const globalNorth = new THREE.Vector3(0, 1, 0);
  const n = globalNorth.clone().sub(p.clone().multiplyScalar(globalNorth.dot(p))).normalize();
  
  // e: 当地正东方向 = p × n
  const e = new THREE.Vector3().crossVectors(p, n).normalize();
  
  if (logger.isEnabled()) {
    logger.log('birthPoint/localFrame', {
      longitudeDeg,
      latitudeDeg,
      p: { x: +p.x.toFixed(4), y: +p.y.toFixed(4), z: +p.z.toFixed(4) },
      n: { x: +n.x.toFixed(4), y: +n.y.toFixed(4), z: +n.z.toFixed(4) },
      e: { x: +e.x.toFixed(4), y: +e.y.toFixed(4), z: +e.z.toFixed(4) }
    });
  }
  
  return { p, n, e };
}

/**
 * 计算相机朝向以对齐出生点
 * 统一口径：出生点对齐只动相机，从场景节点统一读取地球姿态
 * @param params 出生点对齐参数
 * @param scene Three.js场景对象，用于读取earthRoot.quaternion
 * @returns 相机朝向 {yaw, pitch, roll}
 */
export function calculateCameraOrientationForBirthPoint(
  params: BirthPointAlignmentParams,
  scene?: THREE.Scene
): CameraOrientation {
  try {
    const { longitudeDeg, latitudeDeg, alphaDeg } = params;

    // 统一口径：对齐出生地=只动相机
    // 精确策略：用出生点法向 p 直接反解相机 yaw/pitch，使相机前向与 p 对齐（出生点居中）
    // 然后按 alphaDeg 轻微下倾（pitch -= alphaDeg）以把出生点抬到目标高度

    const { p } = calculateBirthPointLocalFrame(longitudeDeg, latitudeDeg);
    
    // 🔧 关键修复：统一从场景节点读取地球当前姿态
    let worldBirthPoint = p.clone();
    try {
      if (scene) {
        const earthRoot = scene.getObjectByName('earthRoot') as THREE.Object3D | undefined;
        let qEarth = new THREE.Quaternion();
        let quatSource = 'identity';
        if (earthRoot) {
          // 优先读取地球网格的世界四元数（Earth 组件将 yaw 应用于子 mesh）
          const earthMesh = earthRoot.getObjectByProperty('type', 'Mesh') as THREE.Object3D | undefined;
          if (earthMesh) {
            earthMesh.getWorldQuaternion(qEarth);
            quatSource = 'earthMesh(world)';
          } else {
            // 回退：读取组自身四元数（AlignOnDemand 可能写入到组）
            qEarth.copy(earthRoot.quaternion);
            quatSource = 'earthRoot(local)';
          }
          worldBirthPoint = p.clone().applyQuaternion(qEarth);
          console.log('[BirthPointAlignment] 读取地球姿态', {
            source: quatSource,
            originalP: { x: +p.x.toFixed(4), y: +p.y.toFixed(4), z: +p.z.toFixed(4) },
            earthQuat: { x: +qEarth.x.toFixed(4), y: +qEarth.y.toFixed(4), z: +qEarth.z.toFixed(4), w: +qEarth.w.toFixed(4) },
            rotatedP: { x: +worldBirthPoint.x.toFixed(4), y: +worldBirthPoint.y.toFixed(4), z: +worldBirthPoint.z.toFixed(4) }
          });
        } else {
          console.warn('[BirthPointAlignment] earthRoot 节点未找到，使用原始坐标');
        }
      } else {
        console.warn('[BirthPointAlignment] 未提供 scene 参数，使用原始坐标');
      }
    } catch (e) {
      console.warn('[BirthPointAlignment] 读取地球姿态失败，使用原始坐标:', e);
    }

    // 🔧 最终修复：基于positionUtils.ts的实际坐标系
    // positionUtils中: x = R*sin(az), z = R*cos(az)，其中az=0对应+Z方向
    // 出生点世界坐标: x = cos(lat)*sin(lon), z = -cos(lat)*cos(lon)
    // 要让相机看向出生点，方位角应该直接对应经度
    // 正确的相机极坐标（基于 positionUtils 的球面相机模型）：
    // - 相机位于 (R, az=yaw, el=pitch) 的球面上，并始终 lookAt(0,0,0)
    // - 要让出生点落在画面正中，需满足 unit(-cameraPos) 与 worldBirthPoint 对齐
    //   因此：yaw = atan2(w.x, w.z) + 180°；pitch = -asin(w.y)
    const yawRawDeg = THREE.MathUtils.radToDeg(Math.atan2(worldBirthPoint.x, worldBirthPoint.z));
    let yaw = yawRawDeg + 180.0;
    // 归一化到 [-180,180]
    while (yaw > 180) yaw -= 360;
    while (yaw < -180) yaw += 360;

    // 基础俯仰用于让出生点居中：取反号（相机在出生点反方向）
    let pitch = -THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(worldBirthPoint.y, -1, 1)));
    // 叠加构图抬升角：相机进一步下压，使目标在画面更高
    pitch -= alphaDeg;
    const roll = 0;

    const orientation: CameraOrientation = { yaw, pitch, roll };

    console.log('[BirthPointAlignment] 相机对齐计算', {
      params,
      orientation,
      originalP: { x:+p.x.toFixed(4), y:+p.y.toFixed(4), z:+p.z.toFixed(4) },
      worldP: { x:+worldBirthPoint.x.toFixed(4), y:+worldBirthPoint.y.toFixed(4), z:+worldBirthPoint.z.toFixed(4) },
      calculations: {
        yaw: `atan2(${worldBirthPoint.x.toFixed(4)}, ${worldBirthPoint.z.toFixed(4)}) + 180 = ${(yawRawDeg + 180).toFixed(2)}° → normalized ${yaw.toFixed(2)}°`,
        pitchBase: `-asin(${worldBirthPoint.y.toFixed(4)}) = ${(-THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(worldBirthPoint.y, -1, 1)))).toFixed(2)}°`,
        pitch: `pitchBase - ${alphaDeg}° = ${pitch.toFixed(2)}°`,
        roll: 0
      }
    });

    if (logger.isEnabled()) {
      logger.log('birthPoint/cameraOrientation', {
        params,
        orientation,
        approach: 'center-x with yaw; height by alpha tilt'
      });
    }

    return orientation;
  } catch (e) {
    console.error('[BirthPointAlignment] 计算相机朝向失败，回退为0旋转:', e);
    return { yaw: 0, pitch: 0, roll: 0 };
  }
}

/**
 * 将相机朝向转换为Three.js相机位置和旋转
 * @param orientation 相机朝向
 * @param cameraDistance 相机距离
 * @returns 相机位置和四元数
 */
export function applyCameraOrientation(
  orientation: CameraOrientation,
  cameraDistance: number
): { position: THREE.Vector3; quaternion: THREE.Quaternion } {
  const { yaw, pitch, roll } = orientation;
  
  // 1. 保持相机位置不变（使用默认位置）
  // 相机位置：距离地球中心cameraDistance，默认朝向
  const position = new THREE.Vector3(0, 0, cameraDistance);
  
  // 2. 计算相机旋转（只旋转朝向，不改变位置）
  const quaternion = new THREE.Quaternion();
  quaternion.setFromEuler(new THREE.Euler(
    THREE.MathUtils.degToRad(pitch),
    THREE.MathUtils.degToRad(yaw),
    THREE.MathUtils.degToRad(roll),
    'YXZ'
  ));
  
  // 3. 将旋转应用到相机位置
  position.applyQuaternion(quaternion);
  
  return { position, quaternion };
}

/**
 * α角与屏幕y位置的转换函数
 * @param alphaDeg 抬升角 (度)
 * @param fovY 垂直视场角 (度)
 * @returns 屏幕y位置 (0-1, 0=顶部, 1=底部)
 */
export function alphaToScreenY(alphaDeg: number, fovY: number = 45): number {
  const alpha = THREE.MathUtils.degToRad(alphaDeg);
  const fov = THREE.MathUtils.degToRad(fovY);
  
  // 小角度近似：y ≈ 0.5 - (α / fovY)
  const screenY = 0.5 - (alpha / fov);
  
  // 限制在合理范围内
  return Math.max(0.1, Math.min(0.9, screenY));
}

/**
 * 屏幕y位置转换为α角
 * @param screenY 屏幕y位置 (0-1, 0=顶部, 1=底部)
 * @param fovY 垂直视场角 (度)
 * @returns 抬升角 (度)
 */
export function screenYToAlpha(screenY: number, fovY: number = 45): number {
  const fov = THREE.MathUtils.degToRad(fovY);
  
  // 反向计算：α ≈ (0.5 - screenY) * fovY
  const alpha = (0.5 - screenY) * fov;
  
  // 限制在合理范围内
  return Math.max(5, Math.min(20, THREE.MathUtils.radToDeg(alpha)));
}

/**
 * 验证出生点对齐效果
 * @param birthPointWorld 出生点世界坐标
 * @param camera 相机
 * @param targetScreenY 目标屏幕y位置
 * @returns 验证结果
 */
export function validateBirthPointAlignment(
  birthPointWorld: THREE.Vector3,
  camera: THREE.Camera,
  targetScreenY: number
): {
  screenX: number;
  screenY: number;
  isAligned: boolean;
  errors: {
    centerLine: number; // 中央竖线偏差 (像素)
    height: number;     // 高度偏差 (像素)
    roll: number;       // 滚转角度 (度)
  };
} {
  // 将出生点投影到屏幕坐标
  const screenPoint = birthPointWorld.clone().project(camera);
  
  // 转换为屏幕坐标 (0-1)
  const screenX = (screenPoint.x + 1) * 0.5;
  const screenY = (screenPoint.y + 1) * 0.5;
  
  // 计算偏差
  const centerLineError = Math.abs(screenX - 0.5); // 中央竖线偏差
  const heightError = Math.abs(screenY - targetScreenY); // 高度偏差
  
  // 获取相机滚转角度
  const euler = new THREE.Euler().setFromQuaternion((camera as THREE.Object3D).quaternion, 'YXZ');
  const rollError = Math.abs(THREE.MathUtils.radToDeg(euler.z));
  
  const isAligned = centerLineError < 0.05 && heightError < 0.1 && rollError < 0.5;
  
  return {
    screenX,
    screenY,
    isAligned,
    errors: {
      centerLine: centerLineError,
      height: heightError,
      roll: rollError
    }
  };
}
