import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { SimpleComposition } from '../../../../types/SimpleComposition';
import { calculateBirthPointLocalFrame } from '../../utils/birthPointAlignment';

interface BirthPointMarkerProps {
  composition: SimpleComposition;
  earthSize: number;
}

/**
 * 出生点标记组件
 * 在测试阶段显示红色标记，指示出生点位置
 */
export function BirthPointMarker({ composition, earthSize }: BirthPointMarkerProps) {
  const markerRef = useRef<THREE.Mesh>(null);
  
  // 检查是否显示标记
  if (!composition?.enableBirthPointAlignment || !composition?.showBirthPointMarker) {
    return null;
  }
  
  const longitudeDeg = composition.birthPointLongitudeDeg ?? 0;
  const latitudeDeg = composition.birthPointLatitudeDeg ?? 0;
  const markerSize = composition.birthPointMarkerSize ?? 0.1;
  const markerColor = composition.birthPointMarkerColor ?? '#ff0000';
  
  // 计算出生点位置
  const localFrame = calculateBirthPointLocalFrame(longitudeDeg, latitudeDeg);
  // 让标记跟随地球自转：绕世界+Y按 composition.earthYawDeg 旋转
  const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(composition.earthYawDeg ?? 0));
  const birthPointPosition = localFrame.p.clone().applyQuaternion(qYaw).multiplyScalar(earthSize * 1.01); // 稍微高出地球表面
  
  // 创建标记几何体（椭圆形状）
  const markerGeometry = new THREE.SphereGeometry(markerSize, 16, 8);
  const markerMaterial = new THREE.MeshBasicMaterial({ 
    color: markerColor,
    transparent: true,
    opacity: 0.8
  });
  
  // 更新标记位置
  useFrame(() => {
    if (markerRef.current) {
      markerRef.current.position.copy(birthPointPosition);
      
      // 让标记始终面向相机
      markerRef.current.lookAt(0, 0, 0);
    }
  });
  
  return (
    <mesh ref={markerRef} geometry={markerGeometry} material={markerMaterial}>
      {/* 可以添加额外的视觉效果，比如发光效果 */}
    </mesh>
  );
}
