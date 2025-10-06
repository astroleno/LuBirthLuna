/**
 * 相机跟随机制实现示例
 * 让月球始终跟随主相机，保持固定屏幕位置
 */

import * as THREE from 'three';
import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';

/**
 * 相机跟随月球组件
 * 将月球固定在屏幕的指定位置，不受3D场景影响
 */
export function CameraFollowingMoon({ 
  // 屏幕位置 (0-1)
  screenX = 0.8,  // 右侧
  screenY = 0.8,  // 上方
  
  // 月球参数
  radius = 0.5,
  distance = 5,
  
  // 月相参数
  currentDate = new Date().toISOString(),
  observerLat = 39.9,
  observerLon = 116.4,
  
  // 外观参数
  moonColor = '#e8e8e8',
  sunIntensity = 1.2
}: {
  screenX?: number;
  screenY?: number;
  radius?: number;
  distance?: number;
  currentDate?: string;
  observerLat?: number;
  observerLon?: number;
  moonColor?: string;
  sunIntensity?: number;
}) {
  
  const { camera, size } = useThree();
  const moonRef = useRef<THREE.Mesh>(null);
  
  // 月球材质 - 使用简化的月相着色器
  const moonMaterial = React.useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        radius: { value: radius },
        sunIntensity: { value: sunIntensity },
        moonColor: { value: new THREE.Color(moonColor) }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float radius;
        uniform float sunIntensity;
        uniform vec3 moonColor;
        
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        // 简化的月相计算
        float calculateMoonPhase(float time) {
          // 29.53天的月相周期
          float cycle = 29.53 * 24.0 * 3600.0;
          float phase = mod(time, cycle) / cycle;
          return phase * 2.0 * 3.14159;
        }
        
        void main() {
          // 计算月相角度
          float phaseAngle = calculateMoonPhase(time);
          
          // 计算太阳方向（基于月相）
          vec3 sunDir = vec3(sin(phaseAngle), -cos(phaseAngle), 0.0);
          
          // 计算光照
          float diff = max(dot(vNormal, sunDir), 0.0);
          
          // 基础月球颜色
          vec3 baseColor = moonColor;
          
          // 应用光照
          vec3 litColor = baseColor * (0.1 + 0.9 * diff * sunIntensity);
          
          // 添加一些纹理效果
          float craterPattern = sin(vUv.x * 20.0) * sin(vUv.y * 20.0) * 0.1;
          litColor += craterPattern;
          
          // 边缘光晕
          float rim = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
          litColor += rim * 0.2;
          
          gl_FragColor = vec4(litColor, 1.0);
        }
      `,
      transparent: false
    });
  }, [radius, moonColor, sunIntensity]);
  
  // 更新月球位置和朝向
  useFrame(({ clock }) => {
    if (!moonRef.current) return;
    
    // 更新时间uniform
    moonMaterial.uniforms.time.value = clock.getElapsedTime();
    
    // 计算屏幕位置对应的世界坐标
    const screenPos = new THREE.Vector3(
      (screenX - 0.5) * 2,  // -1 到 1
      -(screenY - 0.5) * 2, // -1 到 1 (Y轴翻转)
      0.5                   // 在相机前方
    );
    
    // 转换到世界坐标
    screenPos.unproject(camera);
    
    // 计算从相机到目标位置的方向
    const direction = screenPos.sub(camera.position).normalize();
    
    // 设置月球位置（在相机前方固定距离）
    moonRef.current.position.copy(camera.position).add(direction.multiplyScalar(distance));
    
    // 月球始终面向相机
    moonRef.current.lookAt(camera.position);
  });
  
  return (
    <mesh ref={moonRef} material={moonMaterial}>
      <sphereGeometry args={[radius, 32, 32]} />
    </mesh>
  );
}

/**
 * 使用示例组件
 * 展示如何在主场景中使用CameraFollowingMoon
 */
export function CameraFollowingMoonExample() {
  return (
    <>
      {/* 你的主场景内容 */}
      
      {/* 相机跟随月球 */}
      <CameraFollowingMoon 
        screenX={0.85}    // 屏幕右侧85%位置
        screenY={0.85}    // 屏幕上方85%位置
        radius={0.3}      // 月球半径
        distance={4}      // 距离相机4个单位
        currentDate={new Date().toISOString()}
        sunIntensity={1.0}
      />
      
      {/* 可以添加多个月球在不同位置 */}
      <CameraFollowingMoon 
        screenX={0.15}    // 屏幕左侧
        screenY={0.85}    // 屏幕上方
        radius={0.2}      // 更小的月球
        distance={3}      // 更近的距离
        sunIntensity={0.8}
      />
    </>
  );
}

/**
 * 工具函数：将屏幕坐标转换为世界坐标
 */
export function screenToWorld(screenX: number, screenY: number, camera: THREE.Camera, distance: number = 5): THREE.Vector3 {
  const vector = new THREE.Vector3(
    (screenX - 0.5) * 2,
    -(screenY - 0.5) * 2,
    0.5
  );
  
  vector.unproject(camera);
  vector.sub(camera.position).normalize();
  vector.multiplyScalar(distance);
  
  return vector.add(camera.position);
}

/**
 * 工具函数：计算月相角度（基于时间）
 */
export function calculatePhaseAngle(date: Date): number {
  // 使用已知的月相周期
  const LUNAR_CYCLE = 29.53 * 24 * 60 * 60 * 1000; // 毫秒
  const knownNewMoon = new Date('2024-01-11T00:00:00Z').getTime(); // 已知新月时间
  
  const timeSinceNewMoon = date.getTime() - knownNewMoon;
  const phaseAngle = ((timeSinceNewMoon % LUNAR_CYCLE) / LUNAR_CYCLE) * 2 * Math.PI;
  
  return phaseAngle;
}

export default CameraFollowingMoon;